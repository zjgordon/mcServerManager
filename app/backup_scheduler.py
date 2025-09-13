"""
Backup scheduler module for automated backup management.

This module provides comprehensive backup scheduling capabilities including:
- APScheduler integration for task scheduling
- Backup schedule management (add, remove, update)
- Error handling and logging
- Schedule status monitoring
- Backup execution with verification and compression
"""

import gzip
import hashlib
import logging
import os
import shutil
import subprocess
import tarfile
import time
from datetime import datetime
from datetime import time as dt_time
from typing import Any, Dict, List, Optional

import psutil
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from flask import current_app

from .extensions import db
from .logging import StructuredLogger
from .models import BackupSchedule, Server


class BackupScheduler:
    """Backup scheduler for managing automated server backups."""

    def __init__(self, app=None):
        """Initialize the backup scheduler."""
        self.scheduler = None
        self.logger = StructuredLogger("backup_scheduler")
        self.app = app

        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize the scheduler with Flask app context."""
        self.app = app

        # Configure scheduler
        self.scheduler = BackgroundScheduler(
            timezone=app.config.get("TIMEZONE", "UTC"),
            job_defaults={
                "coalesce": True,
                "max_instances": 1,
                "misfire_grace_time": 300,  # 5 minutes
            },
        )

        self.logger.info(
            "Backup scheduler initialized",
            {"event_type": "scheduler_init", "timezone": app.config.get("TIMEZONE", "UTC")},
        )

    def add_schedule(self, server_id: int, schedule_config: Dict[str, Any]) -> bool:
        """
        Add a new backup schedule for a server.

        Args:
            server_id: ID of the server to schedule backups for
            schedule_config: Dictionary containing schedule configuration
                - schedule_type: 'daily', 'weekly', or 'monthly'
                - schedule_time: Time object for when to run backups
                - retention_days: Number of days to retain backups (1-365)
                - enabled: Boolean to enable/disable the schedule

        Returns:
            bool: True if schedule was added successfully, False otherwise
        """
        try:
            # Validate server exists
            server = Server.query.get(server_id)
            if not server:
                self.logger.error(
                    f"Server {server_id} not found",
                    {
                        "event_type": "schedule_error",
                        "server_id": server_id,
                        "error": "server_not_found",
                    },
                )
                return False

            # Validate schedule configuration
            if not self._validate_schedule_config(schedule_config):
                return False

            # Create backup schedule record
            backup_schedule = BackupSchedule(
                server_id=server_id,
                schedule_type=schedule_config["schedule_type"],
                schedule_time=schedule_config["schedule_time"],
                retention_days=schedule_config.get("retention_days", 30),
                enabled=schedule_config.get("enabled", True),
            )

            # Validate the model
            validation_errors = backup_schedule.validate()
            if validation_errors:
                self.logger.error(
                    f"Schedule validation failed: {validation_errors}",
                    {
                        "event_type": "schedule_error",
                        "server_id": server_id,
                        "errors": validation_errors,
                    },
                )
                return False

            # Save to database
            db.session.add(backup_schedule)
            db.session.commit()

            # Add job to scheduler if enabled
            if backup_schedule.enabled:
                self._add_scheduler_job(backup_schedule)

            self.logger.info(
                f"Backup schedule added for server {server_id}",
                {
                    "event_type": "schedule_added",
                    "server_id": server_id,
                    "schedule_type": backup_schedule.schedule_type,
                    "schedule_time": str(backup_schedule.schedule_time),
                    "retention_days": backup_schedule.retention_days,
                },
            )

            return True

        except Exception as e:
            self.logger.error_tracking(
                e,
                {"event_type": "schedule_error", "server_id": server_id, "action": "add_schedule"},
            )
            db.session.rollback()
            return False

    def remove_schedule(self, server_id: int) -> bool:
        """
        Remove backup schedule for a server.

        Args:
            server_id: ID of the server to remove schedule for

        Returns:
            bool: True if schedule was removed successfully, False otherwise
        """
        try:
            # Find existing schedule
            backup_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
            if not backup_schedule:
                self.logger.warning(
                    f"No backup schedule found for server {server_id}",
                    {"event_type": "schedule_warning", "server_id": server_id},
                )
                return True  # Not an error if no schedule exists

            # Remove from scheduler
            job_id = f"backup_{server_id}"
            if self.scheduler and self.scheduler.get_job(job_id):
                self.scheduler.remove_job(job_id)

            # Remove from database
            db.session.delete(backup_schedule)
            db.session.commit()

            self.logger.info(
                f"Backup schedule removed for server {server_id}",
                {"event_type": "schedule_removed", "server_id": server_id},
            )

            return True

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "schedule_error",
                    "server_id": server_id,
                    "action": "remove_schedule",
                },
            )
            db.session.rollback()
            return False

    def update_schedule(self, server_id: int, schedule_config: Dict[str, Any]) -> bool:
        """
        Update backup schedule for a server.

        Args:
            server_id: ID of the server to update schedule for
            schedule_config: Dictionary containing updated schedule configuration

        Returns:
            bool: True if schedule was updated successfully, False otherwise
        """
        try:
            # Find existing schedule
            backup_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
            if not backup_schedule:
                self.logger.error(
                    f"No backup schedule found for server {server_id}",
                    {
                        "event_type": "schedule_error",
                        "server_id": server_id,
                        "error": "schedule_not_found",
                    },
                )
                return False

            # Validate new configuration
            if not self._validate_schedule_config(schedule_config):
                return False

            # Update schedule fields
            backup_schedule.schedule_type = schedule_config["schedule_type"]
            backup_schedule.schedule_time = schedule_config["schedule_time"]
            backup_schedule.retention_days = schedule_config.get("retention_days", 30)
            backup_schedule.enabled = schedule_config.get("enabled", True)

            # Validate the updated model
            validation_errors = backup_schedule.validate()
            if validation_errors:
                self.logger.error(
                    f"Schedule validation failed: {validation_errors}",
                    {
                        "event_type": "schedule_error",
                        "server_id": server_id,
                        "errors": validation_errors,
                    },
                )
                return False

            # Update scheduler job
            job_id = f"backup_{server_id}"
            if self.scheduler and self.scheduler.get_job(job_id):
                self.scheduler.remove_job(job_id)

            if backup_schedule.enabled:
                self._add_scheduler_job(backup_schedule)

            # Save changes
            db.session.commit()

            self.logger.info(
                f"Backup schedule updated for server {server_id}",
                {
                    "event_type": "schedule_updated",
                    "server_id": server_id,
                    "schedule_type": backup_schedule.schedule_type,
                    "schedule_time": str(backup_schedule.schedule_time),
                    "retention_days": backup_schedule.retention_days,
                    "enabled": backup_schedule.enabled,
                },
            )

            return True

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "schedule_error",
                    "server_id": server_id,
                    "action": "update_schedule",
                },
            )
            db.session.rollback()
            return False

    def start_scheduler(self) -> bool:
        """
        Start the backup scheduler.

        Returns:
            bool: True if scheduler started successfully, False otherwise
        """
        try:
            if not self.scheduler:
                self.logger.error(
                    "Scheduler not initialized",
                    {"event_type": "scheduler_error", "error": "scheduler_not_initialized"},
                )
                return False

            if self.scheduler.running:
                self.logger.warning(
                    "Scheduler already running", {"event_type": "scheduler_warning"}
                )
                return True

            # Load existing schedules from database
            self._load_existing_schedules()

            # Start scheduler
            self.scheduler.start()

            self.logger.info(
                "Backup scheduler started",
                {"event_type": "scheduler_started", "job_count": len(self.scheduler.get_jobs())},
            )

            return True

        except Exception as e:
            self.logger.error_tracking(
                e, {"event_type": "scheduler_error", "action": "start_scheduler"}
            )
            return False

    def stop_scheduler(self) -> bool:
        """
        Stop the backup scheduler.

        Returns:
            bool: True if scheduler stopped successfully, False otherwise
        """
        try:
            if not self.scheduler:
                self.logger.warning(
                    "Scheduler not initialized", {"event_type": "scheduler_warning"}
                )
                return True

            if not self.scheduler.running:
                self.logger.warning("Scheduler not running", {"event_type": "scheduler_warning"})
                return True

            # Stop scheduler
            self.scheduler.shutdown()

            self.logger.info("Backup scheduler stopped", {"event_type": "scheduler_stopped"})

            return True

        except Exception as e:
            self.logger.error_tracking(
                e, {"event_type": "scheduler_error", "action": "stop_scheduler"}
            )
            return False

    def get_schedule_status(self, server_id: int) -> Optional[Dict[str, Any]]:
        """
        Get status of backup schedule for a server.

        Args:
            server_id: ID of the server to get schedule status for

        Returns:
            Dict containing schedule status or None if not found
        """
        try:
            # Get schedule from database
            backup_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
            if not backup_schedule:
                return None

            # Check if job is scheduled
            job_id = f"backup_{server_id}"
            job = self.scheduler.get_job(job_id) if self.scheduler else None

            status = {
                "server_id": server_id,
                "schedule_type": backup_schedule.schedule_type,
                "schedule_time": str(backup_schedule.schedule_time),
                "retention_days": backup_schedule.retention_days,
                "enabled": backup_schedule.enabled,
                "last_backup": backup_schedule.last_backup.isoformat()
                if backup_schedule.last_backup
                else None,
                "created_at": backup_schedule.created_at.isoformat(),
                "scheduled": job is not None,
                "next_run": job.next_run_time.isoformat() if job and job.next_run_time else None,
            }

            return status

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "schedule_error",
                    "server_id": server_id,
                    "action": "get_schedule_status",
                },
            )
            return None

    def _validate_schedule_config(self, config: Dict[str, Any]) -> bool:
        """Validate schedule configuration."""
        required_fields = ["schedule_type", "schedule_time"]

        # Check required fields
        for field in required_fields:
            if field not in config:
                self.logger.error(
                    f"Missing required field: {field}",
                    {"event_type": "schedule_error", "error": "missing_field", "field": field},
                )
                return False

        # Validate schedule_type
        if config["schedule_type"] not in ["daily", "weekly", "monthly"]:
            self.logger.error(
                f"Invalid schedule_type: {config['schedule_type']}",
                {
                    "event_type": "schedule_error",
                    "error": "invalid_schedule_type",
                    "schedule_type": config["schedule_type"],
                },
            )
            return False

        # Validate schedule_time
        if not isinstance(config["schedule_time"], dt_time):
            self.logger.error(
                "schedule_time must be a time object",
                {"event_type": "schedule_error", "error": "invalid_schedule_time"},
            )
            return False

        # Validate retention_days if provided
        if "retention_days" in config:
            retention = config["retention_days"]
            if not isinstance(retention, int) or retention < 1 or retention > 365:
                self.logger.error(
                    f"Invalid retention_days: {retention}",
                    {
                        "event_type": "schedule_error",
                        "error": "invalid_retention_days",
                        "retention_days": retention,
                    },
                )
                return False

        return True

    def _add_scheduler_job(self, backup_schedule: BackupSchedule):
        """Add a job to the scheduler."""
        if not self.scheduler:
            return

        job_id = f"backup_{backup_schedule.server_id}"

        # Create trigger based on schedule type
        trigger = self._create_trigger(backup_schedule)

        # Add job to scheduler
        self.scheduler.add_job(
            func=self._execute_backup,
            trigger=trigger,
            id=job_id,
            args=[backup_schedule.server_id],
            replace_existing=True,
        )

    def _create_trigger(self, backup_schedule: BackupSchedule):
        """Create appropriate trigger for the schedule."""
        schedule_time = backup_schedule.schedule_time

        if backup_schedule.schedule_type == "daily":
            return CronTrigger(hour=schedule_time.hour, minute=schedule_time.minute)
        elif backup_schedule.schedule_type == "weekly":
            return CronTrigger(
                day_of_week=0, hour=schedule_time.hour, minute=schedule_time.minute
            )  # Sunday
        elif backup_schedule.schedule_type == "monthly":
            return CronTrigger(
                day=1, hour=schedule_time.hour, minute=schedule_time.minute
            )  # 1st of month
        else:
            raise ValueError(f"Unsupported schedule type: {backup_schedule.schedule_type}")

    def _load_existing_schedules(self):
        """Load existing schedules from database into scheduler."""
        try:
            schedules = BackupSchedule.query.filter_by(enabled=True).all()

            for schedule in schedules:
                self._add_scheduler_job(schedule)

            self.logger.info(
                f"Loaded {len(schedules)} existing backup schedules",
                {"event_type": "schedules_loaded", "count": len(schedules)},
            )

        except Exception as e:
            self.logger.error_tracking(
                e, {"event_type": "schedule_error", "action": "load_existing_schedules"}
            )

    def _execute_backup(self, server_id: int):
        """Execute backup for a server with verification and compression."""
        backup_start_time = datetime.utcnow()
        backup_size = 0
        backup_checksum = None

        try:
            self.logger.info(
                f"Starting backup execution for server {server_id}",
                {
                    "event_type": "backup_started",
                    "server_id": server_id,
                    "start_time": backup_start_time.isoformat(),
                },
            )

            # Get server and backup schedule
            server = Server.query.get(server_id)
            if not server:
                raise ValueError(f"Server {server_id} not found")

            backup_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
            if not backup_schedule:
                raise ValueError(f"Backup schedule not found for server {server_id}")

            # Execute the backup
            backup_result = self.execute_backup_job(server_id)

            if backup_result["success"]:
                backup_size = backup_result.get("size", 0)
                backup_checksum = backup_result.get("checksum")

                self.logger.info(
                    f"Backup completed successfully for server {server_id}",
                    {
                        "event_type": "backup_completed",
                        "server_id": server_id,
                        "backup_file": backup_result.get("backup_file"),
                        "backup_size": backup_size,
                        "checksum": backup_checksum,
                        "duration_seconds": backup_result.get("duration", 0),
                    },
                )
            else:
                self.logger.error(
                    f"Backup failed for server {server_id}: {backup_result.get('error')}",
                    {
                        "event_type": "backup_failed",
                        "server_id": server_id,
                        "error": backup_result.get("error"),
                    },
                )

        except Exception as e:
            self.logger.error_tracking(
                e,
                {"event_type": "backup_error", "server_id": server_id, "action": "execute_backup"},
            )

        finally:
            # Update backup schedule with results
            try:
                if backup_schedule:
                    backup_schedule.last_backup = backup_start_time
                    db.session.commit()
            except Exception as e:
                self.logger.error_tracking(
                    e,
                    {
                        "event_type": "backup_error",
                        "server_id": server_id,
                        "action": "update_schedule",
                    },
                )

    def execute_backup_job(self, server_id: int, max_retries: int = 3) -> Dict[str, Any]:
        """
        Execute backup job for a server with comprehensive error handling and verification.

        Args:
            server_id: ID of the server to backup
            max_retries: Maximum number of retry attempts

        Returns:
            Dict containing backup result with success status, file path, size, checksum, etc.
        """
        backup_start_time = time.time()
        server = Server.query.get(server_id)

        if not server:
            return {"success": False, "error": f"Server {server_id} not found"}

        server_dir = os.path.join("servers", server.server_name)
        backup_dir = os.path.join("backups", server.server_name)

        # Ensure backup directory exists
        os.makedirs(backup_dir, exist_ok=True)

        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"{server.server_name}_backup_{timestamp}.tar.gz"
        backup_filepath = os.path.join(backup_dir, backup_filename)

        was_running = False
        original_status = server.status
        original_pid = server.pid

        try:
            # Step 1: Stop server if running
            was_running = self._stop_server_for_backup(server)

            # Step 2: Create backup archive with retry logic
            backup_created = False
            last_error = None

            for attempt in range(max_retries):
                try:
                    if self._create_backup_archive(server_dir, backup_filepath):
                        backup_created = True
                        break
                except Exception as e:
                    last_error = str(e)
                    self.logger.warning(
                        f"Backup attempt {attempt + 1} failed for server {server_id}: {last_error}",
                        {
                            "event_type": "backup_retry",
                            "server_id": server_id,
                            "attempt": attempt + 1,
                            "error": last_error,
                        },
                    )
                    if attempt < max_retries - 1:
                        time.sleep(2**attempt)  # Exponential backoff

            if not backup_created:
                return {
                    "success": False,
                    "error": f"Failed to create backup after {max_retries} attempts: {last_error}",
                }

            # Step 3: Verify backup integrity
            verification_result = self._verify_backup_integrity(backup_filepath)
            if not verification_result["valid"]:
                # Clean up invalid backup
                try:
                    os.remove(backup_filepath)
                except OSError:
                    pass
                return {
                    "success": False,
                    "error": f"Backup verification failed: {verification_result['error']}",
                }

            # Step 4: Get backup metadata
            backup_size = os.path.getsize(backup_filepath)
            backup_checksum = verification_result["checksum"]

            # Step 5: Clean up old backups based on retention policy
            self._cleanup_old_backups(server_id, backup_dir)

            backup_duration = time.time() - backup_start_time

            return {
                "success": True,
                "backup_file": backup_filepath,
                "backup_filename": backup_filename,
                "size": backup_size,
                "checksum": backup_checksum,
                "duration": backup_duration,
                "was_running": was_running,
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

        finally:
            # Step 6: Restart server if it was running
            if was_running and original_status == "Running":
                try:
                    self._restart_server_after_backup(server, original_pid)
                except Exception as e:
                    self.logger.error_tracking(
                        e,
                        {
                            "event_type": "backup_error",
                            "server_id": server_id,
                            "action": "restart_server",
                        },
                    )

    def _stop_server_for_backup(self, server: Server) -> bool:
        """Stop server for backup if it's running."""
        if server.status != "Running" or not server.pid:
            return False

        try:
            process = psutil.Process(server.pid)
            process.terminate()

            # Wait for graceful shutdown
            try:
                process.wait(timeout=10)
            except psutil.TimeoutExpired:
                # Force kill if graceful shutdown fails
                process.kill()
                process.wait(timeout=5)

            # Update server status
            server.status = "Stopped"
            server.pid = None
            db.session.commit()

            self.logger.info(
                f"Server {server.server_name} stopped for backup",
                {"event_type": "server_stopped", "server_id": server.id},
            )

            return True

        except psutil.NoSuchProcess:
            # Process already stopped
            server.status = "Stopped"
            server.pid = None
            db.session.commit()
            return False
        except Exception as e:
            self.logger.error_tracking(
                e,
                {"event_type": "backup_error", "server_id": server.id, "action": "stop_server"},
            )
            raise

    def _create_backup_archive(self, server_dir: str, backup_filepath: str) -> bool:
        """Create compressed backup archive."""
        if not os.path.exists(server_dir):
            raise FileNotFoundError(f"Server directory not found: {server_dir}")

        try:
            # Create tar.gz archive
            with tarfile.open(backup_filepath, "w:gz", compresslevel=6) as tar:
                tar.add(server_dir, arcname=os.path.basename(server_dir), recursive=True)

            # Verify archive was created and has content
            if not os.path.exists(backup_filepath) or os.path.getsize(backup_filepath) == 0:
                raise ValueError("Backup archive is empty or not created")

            return True

        except Exception:
            # Clean up failed backup file
            try:
                if os.path.exists(backup_filepath):
                    os.remove(backup_filepath)
            except OSError:
                pass
            raise

    def _verify_backup_integrity(self, backup_filepath: str) -> Dict[str, Any]:
        """Verify backup archive integrity using checksums."""
        try:
            # Calculate SHA256 checksum
            sha256_hash = hashlib.sha256()
            with open(backup_filepath, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)
            checksum = sha256_hash.hexdigest()

            # Verify archive can be opened and has content
            try:
                with tarfile.open(backup_filepath, "r:gz") as tar:
                    members = tar.getmembers()
                    if not members:
                        return {"valid": False, "error": "Archive is empty", "checksum": checksum}

                    # Check if we can extract the first member (basic integrity test)
                    first_member = members[0]
                    if not first_member.isfile() and not first_member.isdir():
                        return {
                            "valid": False,
                            "error": "Archive contains invalid members",
                            "checksum": checksum,
                        }

            except (tarfile.TarError, OSError) as tar_error:
                return {
                    "valid": False,
                    "error": f"Archive corruption detected: {str(tar_error)}",
                    "checksum": checksum,
                }

            return {"valid": True, "checksum": checksum}

        except Exception as verify_error:
            return {
                "valid": False,
                "error": f"Integrity verification failed: {str(verify_error)}",
                "checksum": None,
            }

    def _cleanup_old_backups(self, server_id: int, backup_dir: str):
        """Clean up old backups based on retention policy."""
        try:
            backup_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
            if not backup_schedule:
                return

            retention_days = backup_schedule.retention_days
            cutoff_time = datetime.utcnow().timestamp() - (retention_days * 24 * 3600)

            if not os.path.exists(backup_dir):
                return

            removed_count = 0
            for filename in os.listdir(backup_dir):
                if filename.endswith(".tar.gz") and filename.startswith(
                    f"server_{server_id}_backup_"
                ):
                    filepath = os.path.join(backup_dir, filename)
                    try:
                        file_mtime = os.path.getmtime(filepath)
                        if file_mtime < cutoff_time:
                            os.remove(filepath)
                            removed_count += 1
                    except OSError:
                        continue

            if removed_count > 0:
                self.logger.info(
                    f"Cleaned up {removed_count} old backups for server {server_id}",
                    {
                        "event_type": "backup_cleanup",
                        "server_id": server_id,
                        "removed_count": removed_count,
                    },
                )

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "backup_error",
                    "server_id": server_id,
                    "action": "cleanup_old_backups",
                },
            )

    def _restart_server_after_backup(self, server: Server, original_pid: Optional[int]):
        """Restart server after backup completion."""
        try:
            server_dir = os.path.join("servers", server.server_name)
            server_jar_path = os.path.join(server_dir, "server.jar")

            if not os.path.exists(server_jar_path):
                raise FileNotFoundError(f"Server JAR not found: {server_jar_path}")

            # Build command with server's memory allocation
            memory_mb = server.memory_mb
            command = [
                "java",
                f"-Xms{memory_mb}M",
                f"-Xmx{memory_mb}M",
                "-jar",
                "server.jar",
                "nogui",
            ]

            # Start server process
            process = subprocess.Popen(
                command,
                cwd=server_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            # Update server status
            server.status = "Running"
            server.pid = process.pid
            db.session.commit()

            self.logger.info(
                f"Server {server.server_name} restarted after backup with PID {process.pid}",
                {"event_type": "server_restarted", "server_id": server.id, "pid": process.pid},
            )

        except Exception:
            # Update status to indicate restart failure
            server.status = "Stopped"
            server.pid = None
            db.session.commit()
            raise


# Global scheduler instance
backup_scheduler = BackupScheduler()
