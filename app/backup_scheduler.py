"""
Backup scheduler module for automated backup management.

This module provides comprehensive backup scheduling capabilities including:
- APScheduler integration for task scheduling
- Backup schedule management (add, remove, update)
- Error handling and logging
- Schedule status monitoring
- Backup execution with verification and compression
"""

import base64
import bz2
import gzip
import hashlib
import logging
import lzma
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
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from flask import current_app

from .alerts import (
    check_backup_alerts,
    trigger_backup_corruption_alert,
    trigger_backup_failure_alert,
    trigger_backup_verification_failure_alert,
)
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

        # Compression and encryption settings
        self.compression_method = "gzip"  # gzip, bzip2, lzma, none
        self.encryption_enabled = False
        self.encryption_key = None
        self.encryption_password = None

        # Monitoring metrics
        self.metrics = {
            "total_backups": 0,
            "successful_backups": 0,
            "failed_backups": 0,
            "corrupted_backups": 0,
            "verification_failures": 0,
            "schedule_execution_failures": 0,
            "total_backup_size_bytes": 0,
            "average_backup_duration": 0.0,
            "last_backup_time": None,
            "backup_trends": {
                "daily_success_rate": 0.0,
                "weekly_success_rate": 0.0,
                "monthly_success_rate": 0.0,
            },
            "disk_usage_percent": 0.0,
            "alert_history": [],
        }

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

            # Update metrics and check for alerts
            self.update_backup_metrics(backup_result, server_id)

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
            # Record schedule execution failure
            self.record_schedule_execution_failure(server_id, str(e))

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
        extension = self._get_backup_extension()
        backup_filename = f"{server.server_name}_backup_{timestamp}{extension}"
        backup_filepath = os.path.join(backup_dir, backup_filename)

        was_running = False
        original_status = server.status
        original_pid = server.pid

        try:
            # Step 1: Stop server if running
            was_running = self._stop_server_for_backup(server)

            # Step 2: Create backup archive with retry logic and performance tracking
            backup_created = False
            last_error = None
            compression_start_time = 0
            compression_duration = 0
            encryption_duration = 0

            for attempt in range(max_retries):
                try:
                    # Track compression performance
                    compression_start_time = time.time()
                    if self._create_backup_archive(server_dir, backup_filepath):
                        compression_duration = time.time() - compression_start_time
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

            # Step 3: Verify backup integrity with comprehensive verification
            verification_result = self.verify_backup_comprehensive(
                backup_filepath, server_id, include_restore_test=False
            )
            if not verification_result["overall_valid"]:
                # Attempt repair if possible
                repair_result = self.repair_backup_if_possible(backup_filepath, server_id)
                if not repair_result["repair_successful"]:
                    # Clean up invalid backup
                    try:
                        os.remove(backup_filepath)
                    except OSError:
                        pass
                    return {
                        "success": False,
                        "error": f"Backup verification failed: {verification_result.get('error', 'Verification failed')}",
                        "verification_details": verification_result,
                        "repair_attempted": repair_result["repair_attempted"],
                    }

            # Step 4: Get backup metadata
            backup_size = os.path.getsize(backup_filepath)
            backup_checksum = verification_result.get("archive_integrity", {}).get("checksum")

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
                "verification_details": verification_result,
                "quality_score": verification_result.get("quality_score", {}).get("score", 0),
                "quality_level": verification_result.get("quality_score", {}).get(
                    "quality_level", "Unknown"
                ),
                "compression_method": self.compression_method,
                "encryption_enabled": self.encryption_enabled,
                "compression_duration": compression_duration,
                "encryption_duration": encryption_duration,
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

    def configure_compression(self, method: str) -> bool:
        """
        Configure compression method for backups.

        Args:
            method: Compression method ('gzip', 'bzip2', 'lzma', 'none')

        Returns:
            bool: True if configuration successful, False otherwise
        """
        valid_methods = ["gzip", "bzip2", "lzma", "none"]
        if method not in valid_methods:
            self.logger.error(
                f"Invalid compression method: {method}",
                {"event_type": "config_error", "method": method, "valid_methods": valid_methods},
            )
            return False

        self.compression_method = method
        self.logger.info(
            f"Compression method set to: {method}",
            {"event_type": "compression_configured", "method": method},
        )
        return True

    def configure_encryption(self, enabled: bool, password: str = None, key: str = None) -> bool:
        """
        Configure encryption for backups.

        Args:
            enabled: Whether to enable encryption
            password: Password for key derivation (optional if key provided)
            key: Pre-generated encryption key (optional if password provided)

        Returns:
            bool: True if configuration successful, False otherwise
        """
        if not enabled:
            self.encryption_enabled = False
            self.encryption_key = None
            self.encryption_password = None
            self.logger.info("Encryption disabled", {"event_type": "encryption_configured"})
            return True

        if not password and not key:
            self.logger.error(
                "Either password or key must be provided for encryption",
                {"event_type": "config_error", "error": "missing_credentials"},
            )
            return False

        try:
            if key:
                # Use provided key
                self.encryption_key = key.encode() if isinstance(key, str) else key
            else:
                # Derive key from password
                self.encryption_key = self._derive_key_from_password(password)

            self.encryption_enabled = True
            self.encryption_password = password

            self.logger.info(
                "Encryption configured successfully",
                {"event_type": "encryption_configured", "key_provided": bool(key)},
            )
            return True

        except Exception as e:
            self.logger.error(
                f"Failed to configure encryption: {str(e)}",
                {"event_type": "config_error", "error": str(e)},
            )
            return False

    def _derive_key_from_password(self, password: str) -> bytes:
        """Derive encryption key from password using PBKDF2."""
        salt = b"mcservermanager_backup_salt"  # In production, use random salt
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key

    def _compress_data(self, data: bytes, method: str) -> bytes:
        """
        Compress data using specified method.

        Args:
            data: Data to compress
            method: Compression method ('gzip', 'bzip2', 'lzma', 'none')

        Returns:
            bytes: Compressed data
        """
        if method == "none":
            return data
        elif method == "gzip":
            return gzip.compress(data, compresslevel=6)
        elif method == "bzip2":
            return bz2.compress(data, compresslevel=6)
        elif method == "lzma":
            return lzma.compress(data, preset=6)
        else:
            raise ValueError(f"Unsupported compression method: {method}")

    def _decompress_data(self, data: bytes, method: str) -> bytes:
        """
        Decompress data using specified method.

        Args:
            data: Compressed data
            method: Compression method ('gzip', 'bzip2', 'lzma', 'none')

        Returns:
            bytes: Decompressed data
        """
        if method == "none":
            return data
        elif method == "gzip":
            return gzip.decompress(data)
        elif method == "bzip2":
            return bz2.decompress(data)
        elif method == "lzma":
            return lzma.decompress(data)
        else:
            raise ValueError(f"Unsupported compression method: {method}")

    def _encrypt_data(self, data: bytes) -> bytes:
        """
        Encrypt data using configured encryption key.

        Args:
            data: Data to encrypt

        Returns:
            bytes: Encrypted data
        """
        if not self.encryption_enabled or not self.encryption_key:
            return data

        fernet = Fernet(self.encryption_key)
        return fernet.encrypt(data)

    def _decrypt_data(self, data: bytes) -> bytes:
        """
        Decrypt data using configured encryption key.

        Args:
            data: Encrypted data

        Returns:
            bytes: Decrypted data
        """
        if not self.encryption_enabled or not self.encryption_key:
            return data

        fernet = Fernet(self.encryption_key)
        return fernet.decrypt(data)

    def _get_backup_extension(self) -> str:
        """Get file extension based on compression method."""
        if self.compression_method == "gzip":
            return ".tar.gz"
        elif self.compression_method == "bzip2":
            return ".tar.bz2"
        elif self.compression_method == "lzma":
            return ".tar.xz"
        else:
            return ".tar"

    def _create_backup_archive(self, server_dir: str, backup_filepath: str) -> bool:
        """Create compressed and optionally encrypted backup archive."""
        if not os.path.exists(server_dir):
            raise FileNotFoundError(f"Server directory not found: {server_dir}")

        try:
            # Create tar archive first
            temp_tar_path = backup_filepath + ".temp"

            # Determine tar mode based on compression
            if self.compression_method == "gzip":
                tar_mode = "w:gz"
            elif self.compression_method == "bzip2":
                tar_mode = "w:bz2"
            elif self.compression_method == "lzma":
                tar_mode = "w:xz"
            else:
                tar_mode = "w"

            # Create tar archive
            with tarfile.open(temp_tar_path, tar_mode) as tar:
                tar.add(server_dir, arcname=os.path.basename(server_dir), recursive=True)

            # Read the tar file
            with open(temp_tar_path, "rb") as f:
                tar_data = f.read()

            # Apply compression if not handled by tar
            if self.compression_method != "none" and tar_mode == "w":
                compressed_data = self._compress_data(tar_data, self.compression_method)
            else:
                compressed_data = tar_data

            # Apply encryption if enabled
            if self.encryption_enabled:
                encrypted_data = self._encrypt_data(compressed_data)
            else:
                encrypted_data = compressed_data

            # Write final backup file
            with open(backup_filepath, "wb") as f:
                f.write(encrypted_data)

            # Clean up temp file
            os.remove(temp_tar_path)

            # Verify archive was created and has content
            if not os.path.exists(backup_filepath) or os.path.getsize(backup_filepath) == 0:
                raise ValueError("Backup archive is empty or not created")

            return True

        except Exception:
            # Clean up failed backup files
            try:
                if os.path.exists(backup_filepath):
                    os.remove(backup_filepath)
                temp_tar_path = backup_filepath + ".temp"
                if os.path.exists(temp_tar_path):
                    os.remove(temp_tar_path)
            except OSError:
                pass
            raise

    def _verify_backup_integrity(self, backup_filepath: str) -> Dict[str, Any]:
        """Verify backup archive integrity using comprehensive verification methods."""
        try:
            # Calculate multiple checksums
            from .utils import calculate_file_checksums

            checksums = calculate_file_checksums(backup_filepath, ["md5", "sha256"])

            if not checksums:
                return {
                    "valid": False,
                    "error": "Failed to calculate checksums",
                    "checksum": None,
                    "verification_details": {},
                }

            # Verify archive can be opened and has content
            try:
                with tarfile.open(backup_filepath, "r:gz") as tar:
                    members = tar.getmembers()
                    if not members:
                        return {
                            "valid": False,
                            "error": "Archive is empty",
                            "checksum": checksums.get("sha256"),
                            "verification_details": {"archive_member_count": 0},
                        }

                    # Check if we can extract the first member (basic integrity test)
                    first_member = members[0]
                    if not first_member.isfile() and not first_member.isdir():
                        return {
                            "valid": False,
                            "error": "Archive contains invalid members",
                            "checksum": checksums.get("sha256"),
                            "verification_details": {"invalid_members": True},
                        }

            except (tarfile.TarError, OSError) as tar_error:
                return {
                    "valid": False,
                    "error": f"Archive corruption detected: {str(tar_error)}",
                    "checksum": checksums.get("sha256"),
                    "verification_details": {"tar_error": str(tar_error)},
                }

            return {
                "valid": True,
                "checksum": checksums.get("sha256"),
                "checksums": checksums,
                "verification_details": {
                    "archive_member_count": len(members),
                    "archive_readable": True,
                },
            }

        except Exception as verify_error:
            return {
                "valid": False,
                "error": f"Integrity verification failed: {str(verify_error)}",
                "checksum": None,
                "verification_details": {"error": str(verify_error)},
            }

    def cleanup_old_backups(self, server_id: int) -> Dict[str, Any]:
        """
        Clean up old backups based on retention policies with safety checks.

        Args:
            server_id: ID of the server to clean up backups for

        Returns:
            Dict containing cleanup results and statistics
        """
        try:
            backup_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
            if not backup_schedule:
                return {"success": False, "error": "No backup schedule found"}

            server = Server.query.get(server_id)
            if not server:
                return {"success": False, "error": "Server not found"}

            backup_dir = os.path.join("backups", server.server_name)
            if not os.path.exists(backup_dir):
                return {"success": True, "message": "No backup directory found", "removed_count": 0}

            # Get all backup files for this server
            backup_files = self._get_backup_files(backup_dir, server.server_name)
            if len(backup_files) <= 1:
                return {
                    "success": True,
                    "message": "Preserving minimum backups",
                    "removed_count": 0,
                }

            # Apply retention policies
            retention_result = self._apply_retention_policies(
                backup_files, backup_schedule.retention_days
            )

            # Check disk space and apply emergency cleanup if needed
            disk_result = self._check_disk_space_and_cleanup(backup_dir, backup_files)

            # Combine results
            total_removed = retention_result["removed_count"] + disk_result["removed_count"]

            self.logger.info(
                f"Backup cleanup completed for server {server_id}",
                {
                    "event_type": "backup_cleanup_completed",
                    "server_id": server_id,
                    "total_removed": total_removed,
                    "retention_removed": retention_result["removed_count"],
                    "disk_cleanup_removed": disk_result["removed_count"],
                    "remaining_backups": len(backup_files) - total_removed,
                },
            )

            return {
                "success": True,
                "removed_count": total_removed,
                "retention_removed": retention_result["removed_count"],
                "disk_cleanup_removed": disk_result["removed_count"],
                "remaining_backups": len(backup_files) - total_removed,
            }

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "backup_error",
                    "server_id": server_id,
                    "action": "cleanup_old_backups",
                },
            )
            return {"success": False, "error": str(e)}

    def _cleanup_old_backups(self, server_id: int, backup_dir: str):
        """Legacy method - redirects to new cleanup_old_backups."""
        result = self.cleanup_old_backups(server_id)
        if not result["success"]:
            self.logger.error(
                f"Backup cleanup failed for server {server_id}: {result.get('error')}",
                {"event_type": "backup_cleanup_error", "server_id": server_id},
            )

    def _get_backup_files(self, backup_dir: str, server_name: str) -> List[Dict[str, Any]]:
        """Get list of backup files with metadata."""
        backup_files = []

        for filename in os.listdir(backup_dir):
            if filename.endswith(".tar.gz") and (
                filename.startswith(f"{server_name}_backup_")
                or (filename.startswith(f"{server_name}_") and "_backup_" not in filename)
            ):
                filepath = os.path.join(backup_dir, filename)
                try:
                    stat = os.stat(filepath)
                    backup_files.append(
                        {
                            "filename": filename,
                            "filepath": filepath,
                            "size": stat.st_size,
                            "mtime": stat.st_mtime,
                            "created": datetime.fromtimestamp(stat.st_mtime),
                        }
                    )
                except OSError:
                    continue

        # Sort by modification time (newest first)
        backup_files.sort(key=lambda x: x["mtime"], reverse=True)
        return backup_files

    def _apply_retention_policies(
        self, backup_files: List[Dict[str, Any]], retention_days: int
    ) -> Dict[str, Any]:
        """Apply retention policies to backup files."""
        cutoff_time = datetime.utcnow().timestamp() - (retention_days * 24 * 3600)
        removed_count = 0
        removed_files = []

        for backup_file in backup_files:
            # Safety check: Always keep at least one backup
            if len(backup_files) - removed_count <= 1:
                break

            # Apply time-based retention
            if backup_file["mtime"] < cutoff_time:
                try:
                    os.remove(backup_file["filepath"])
                    removed_count += 1
                    removed_files.append(backup_file["filename"])

                    self.logger.info(
                        f"Removed old backup: {backup_file['filename']}",
                        {
                            "event_type": "backup_removed",
                            "filename": backup_file["filename"],
                            "reason": "retention_policy",
                            "age_days": (datetime.utcnow().timestamp() - backup_file["mtime"])
                            / (24 * 3600),
                        },
                    )
                except OSError as e:
                    self.logger.warning(
                        f"Failed to remove backup {backup_file['filename']}: {e}",
                        {
                            "event_type": "backup_removal_failed",
                            "filename": backup_file["filename"],
                        },
                    )

        return {
            "removed_count": removed_count,
            "removed_files": removed_files,
        }

    def _check_disk_space_and_cleanup(
        self, backup_dir: str, backup_files: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check disk space and perform emergency cleanup if needed."""
        try:
            # Get disk usage
            disk_usage = psutil.disk_usage(backup_dir)
            free_space_gb = disk_usage.free / (1024**3)
            total_space_gb = disk_usage.total / (1024**3)
            usage_percent = (disk_usage.used / disk_usage.total) * 100

            # Emergency cleanup threshold: 90% disk usage
            if usage_percent > 90:
                self.logger.warning(
                    f"High disk usage detected: {usage_percent:.1f}%",
                    {
                        "event_type": "disk_space_warning",
                        "usage_percent": usage_percent,
                        "free_space_gb": free_space_gb,
                        "total_space_gb": total_space_gb,
                    },
                )

                # Keep only the 3 most recent backups in emergency cleanup
                emergency_kept = 3
                removed_count = 0
                removed_files = []

                for i, backup_file in enumerate(backup_files):
                    if i >= emergency_kept:
                        try:
                            os.remove(backup_file["filepath"])
                            removed_count += 1
                            removed_files.append(backup_file["filename"])

                            self.logger.warning(
                                f"Emergency cleanup removed backup: {backup_file['filename']}",
                                {
                                    "event_type": "emergency_backup_removal",
                                    "filename": backup_file["filename"],
                                    "reason": "disk_space_critical",
                                    "usage_percent": usage_percent,
                                },
                            )
                        except OSError as e:
                            self.logger.warning(
                                f"Failed to remove backup {backup_file['filename']} in emergency cleanup: {e}",
                                {
                                    "event_type": "emergency_cleanup_failed",
                                    "filename": backup_file["filename"],
                                },
                            )

                return {
                    "removed_count": removed_count,
                    "removed_files": removed_files,
                    "triggered": True,
                    "usage_percent": usage_percent,
                }

            return {"removed_count": 0, "triggered": False, "usage_percent": usage_percent}

        except Exception as e:
            self.logger.error(
                f"Disk space check failed: {e}",
                {"event_type": "disk_space_check_error", "error": str(e)},
            )
            return {"removed_count": 0, "triggered": False, "error": str(e)}

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

    def verify_backup_comprehensive(
        self, backup_filepath: str, server_id: int = None, include_restore_test: bool = False
    ) -> Dict[str, Any]:
        """
        Perform comprehensive backup verification with multiple methods.

        Args:
            backup_filepath: Path to the backup file to verify
            server_id: ID of the server (for logging context)
            include_restore_test: Whether to perform restore test verification

        Returns:
            Dict containing comprehensive verification results
        """
        verification_start_time = time.time()

        try:
            self.logger.info(
                f"Starting comprehensive backup verification for {backup_filepath}",
                {
                    "event_type": "backup_verification_started",
                    "backup_file": backup_filepath,
                    "server_id": server_id,
                    "include_restore_test": include_restore_test,
                },
            )

            # Initialize verification results
            verification_results = {
                "backup_file": backup_filepath,
                "server_id": server_id,
                "verification_timestamp": datetime.utcnow().isoformat(),
                "verification_methods": [],
                "overall_valid": True,
                "quality_score": 0,
                "corruption_detected": False,
                "errors": [],
            }

            # 1. File system integrity checks
            from .utils import verify_file_integrity

            file_integrity = verify_file_integrity(backup_filepath)
            verification_results["file_integrity"] = file_integrity
            verification_results["verification_methods"].append("file_integrity")

            if not file_integrity["valid"]:
                verification_results["overall_valid"] = False
                verification_results["corruption_detected"] = True
                verification_results["errors"].append(
                    f"File integrity check failed: {file_integrity.get('error')}"
                )

            # 2. Archive integrity verification
            archive_integrity = self._verify_backup_integrity(backup_filepath)
            verification_results["archive_integrity"] = archive_integrity
            verification_results["verification_methods"].append("archive_integrity")

            if not archive_integrity["valid"]:
                verification_results["overall_valid"] = False
                verification_results["corruption_detected"] = True
                verification_results["errors"].append(
                    f"Archive integrity check failed: {archive_integrity.get('error')}"
                )

            # 3. Minecraft world file validation (if server_id provided)
            if server_id:
                try:
                    server = Server.query.get(server_id)
                    if server:
                        from .utils import validate_minecraft_world_files

                        server_dir = os.path.join("servers", server.server_name)
                        world_validation = validate_minecraft_world_files(server_dir)
                        verification_results["world_validation"] = world_validation
                        verification_results["verification_methods"].append("world_validation")

                        if not world_validation["valid"]:
                            verification_results["overall_valid"] = False
                            verification_results["errors"].append(
                                f"World validation failed: {world_validation.get('error', 'Missing or corrupted world files')}"
                            )
                except Exception as e:
                    verification_results["world_validation"] = {
                        "valid": False,
                        "error": f"World validation error: {str(e)}",
                    }
                    verification_results["errors"].append(f"World validation error: {str(e)}")

            # 4. Optional restore test verification
            if include_restore_test:
                try:
                    from .utils import test_backup_restore

                    restore_test = test_backup_restore(backup_filepath)
                    verification_results["restore_test"] = restore_test
                    verification_results["verification_methods"].append("restore_test")

                    if not restore_test["valid"]:
                        verification_results["overall_valid"] = False
                        verification_results["errors"].append(
                            f"Restore test failed: {restore_test.get('error')}"
                        )
                except Exception as e:
                    verification_results["restore_test"] = {
                        "valid": False,
                        "error": f"Restore test error: {str(e)}",
                    }
                    verification_results["errors"].append(f"Restore test error: {str(e)}")

            # 5. Generate quality score
            from .utils import generate_backup_quality_score

            quality_score = generate_backup_quality_score(verification_results)
            verification_results["quality_score"] = quality_score

            # 6. Generate validation report
            verification_results["validation_report"] = self._generate_validation_report(
                verification_results
            )

            verification_duration = time.time() - verification_start_time
            verification_results["verification_duration"] = verification_duration

            # Log verification results
            self.logger.info(
                f"Backup verification completed for {backup_filepath}",
                {
                    "event_type": "backup_verification_completed",
                    "backup_file": backup_filepath,
                    "server_id": server_id,
                    "overall_valid": verification_results["overall_valid"],
                    "quality_score": quality_score["score"],
                    "quality_level": quality_score["quality_level"],
                    "corruption_detected": verification_results["corruption_detected"],
                    "verification_methods": verification_results["verification_methods"],
                    "verification_duration": verification_duration,
                },
            )

            return verification_results

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "backup_verification_error",
                    "backup_file": backup_filepath,
                    "server_id": server_id,
                    "action": "verify_backup_comprehensive",
                },
            )
            return {
                "backup_file": backup_filepath,
                "server_id": server_id,
                "overall_valid": False,
                "error": f"Verification failed: {str(e)}",
                "corruption_detected": True,
                "verification_methods": [],
                "quality_score": {"score": 0, "quality_level": "Unknown"},
            }

    def _generate_validation_report(self, verification_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a detailed validation report from verification results."""
        try:
            report = {
                "summary": {
                    "overall_status": "PASS" if verification_results["overall_valid"] else "FAIL",
                    "quality_score": verification_results["quality_score"]["score"],
                    "quality_level": verification_results["quality_score"]["quality_level"],
                    "corruption_detected": verification_results["corruption_detected"],
                    "verification_methods_used": verification_results["verification_methods"],
                },
                "details": {},
                "recommendations": [],
            }

            # File integrity details
            if "file_integrity" in verification_results:
                file_integrity = verification_results["file_integrity"]
                report["details"]["file_integrity"] = {
                    "status": "PASS" if file_integrity["valid"] else "FAIL",
                    "checksums": file_integrity.get("checksums", {}),
                    "corruption_detected": file_integrity.get("corruption_detected", False),
                }
                if not file_integrity["valid"]:
                    report["recommendations"].append(
                        "File integrity check failed - backup may be corrupted"
                    )

            # Archive integrity details
            if "archive_integrity" in verification_results:
                archive_integrity = verification_results["archive_integrity"]
                report["details"]["archive_integrity"] = {
                    "status": "PASS" if archive_integrity["valid"] else "FAIL",
                    "checksum": archive_integrity.get("checksum"),
                    "verification_details": archive_integrity.get("verification_details", {}),
                }
                if not archive_integrity["valid"]:
                    report["recommendations"].append(
                        "Archive integrity check failed - backup archive is corrupted"
                    )

            # World validation details
            if "world_validation" in verification_results:
                world_validation = verification_results["world_validation"]
                report["details"]["world_validation"] = {
                    "status": "PASS" if world_validation["valid"] else "FAIL",
                    "world_files": world_validation.get("world_files", []),
                    "missing_files": world_validation.get("missing_files", []),
                    "corrupted_files": world_validation.get("corrupted_files", []),
                    "region_file_count": world_validation.get("region_file_count", 0),
                }
                if not world_validation["valid"]:
                    missing_count = len(world_validation.get("missing_files", []))
                    corrupted_count = len(world_validation.get("corrupted_files", []))
                    if missing_count > 0:
                        report["recommendations"].append(
                            f"World validation failed - {missing_count} missing files"
                        )
                    if corrupted_count > 0:
                        report["recommendations"].append(
                            f"World validation failed - {corrupted_count} corrupted files"
                        )

            # Restore test details
            if "restore_test" in verification_results:
                restore_test = verification_results["restore_test"]
                report["details"]["restore_test"] = {
                    "status": "PASS" if restore_test["valid"] else "FAIL",
                    "extracted_files_count": len(restore_test.get("extracted_files", [])),
                    "missing_server_files": restore_test.get("missing_server_files", []),
                    "world_validation": restore_test.get("world_validation", {}),
                }
                if not restore_test["valid"]:
                    report["recommendations"].append(
                        "Restore test failed - backup cannot be properly restored"
                    )

            # Add general recommendations based on quality score
            quality_score = verification_results["quality_score"]["score"]
            if quality_score < 60:
                report["recommendations"].append(
                    "Backup quality is poor - consider creating a new backup"
                )
            elif quality_score < 80:
                report["recommendations"].append("Backup quality is fair - monitor for issues")

            return report

        except Exception as e:
            self.logger.error(f"Error generating validation report: {str(e)}")
            return {
                "summary": {"overall_status": "ERROR", "error": str(e)},
                "details": {},
                "recommendations": ["Unable to generate detailed report"],
            }

    def repair_backup_if_possible(
        self, backup_filepath: str, server_id: int = None
    ) -> Dict[str, Any]:
        """
        Attempt to repair backup if corruption is detected and repair is possible.

        Args:
            backup_filepath: Path to the backup file to repair
            server_id: ID of the server (for logging context)

        Returns:
            Dict containing repair attempt results
        """
        try:
            self.logger.info(
                f"Attempting backup repair for {backup_filepath}",
                {
                    "event_type": "backup_repair_started",
                    "backup_file": backup_filepath,
                    "server_id": server_id,
                },
            )

            repair_results = {
                "backup_file": backup_filepath,
                "server_id": server_id,
                "repair_attempted": False,
                "repair_successful": False,
                "repair_methods": [],
                "errors": [],
            }

            # Check if backup file exists
            if not os.path.exists(backup_filepath):
                repair_results["errors"].append("Backup file does not exist")
                return repair_results

            # Try to repair tar.gz archive
            try:
                # Test if we can read the archive
                with tarfile.open(backup_filepath, "r:gz") as tar:
                    tar.getmembers()

                # If we can read it, the archive is not corrupted
                repair_results["repair_attempted"] = True
                repair_results["repair_successful"] = True
                repair_results["repair_methods"].append("archive_readable")

                self.logger.info(
                    f"Backup archive is readable - no repair needed for {backup_filepath}",
                    {
                        "event_type": "backup_repair_successful",
                        "backup_file": backup_filepath,
                        "server_id": server_id,
                    },
                )

            except (tarfile.TarError, OSError) as e:
                # Archive is corrupted, try to repair
                repair_results["repair_attempted"] = True
                repair_results["errors"].append(f"Archive corruption detected: {str(e)}")

                # For now, we can't repair corrupted tar.gz files
                # In the future, we could implement more sophisticated repair methods
                repair_results["errors"].append(
                    "Archive repair not implemented - backup is not recoverable"
                )

                self.logger.warning(
                    f"Backup archive is corrupted and cannot be repaired: {backup_filepath}",
                    {
                        "event_type": "backup_repair_failed",
                        "backup_file": backup_filepath,
                        "server_id": server_id,
                        "error": str(e),
                    },
                )

            return repair_results

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "backup_repair_error",
                    "backup_file": backup_filepath,
                    "server_id": server_id,
                    "action": "repair_backup_if_possible",
                },
            )
            return {
                "backup_file": backup_filepath,
                "server_id": server_id,
                "repair_attempted": False,
                "repair_successful": False,
                "errors": [f"Repair attempt failed: {str(e)}"],
            }

    def restore_backup(
        self, backup_filepath: str, restore_dir: str, password: str = None, key: str = None
    ) -> Dict[str, Any]:
        """
        Restore a backup by decrypting and decompressing it.

        Args:
            backup_filepath: Path to the backup file to restore
            restore_dir: Directory to restore the backup to
            password: Password for decryption (if encrypted with password)
            key: Encryption key for decryption (if encrypted with key)

        Returns:
            Dict containing restore results
        """
        try:
            self.logger.info(
                f"Starting backup restore from {backup_filepath}",
                {
                    "event_type": "backup_restore_started",
                    "backup_file": backup_filepath,
                    "restore_dir": restore_dir,
                },
            )

            if not os.path.exists(backup_filepath):
                return {"success": False, "error": "Backup file not found"}

            # Process backup file (decrypt and decompress)
            processed_data = self._process_backup_for_restore(backup_filepath, password, key)
            if not processed_data["success"]:
                return processed_data

            # Extract tar archive
            return self._extract_backup_archive(
                processed_data["data"], restore_dir, backup_filepath
            )

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "backup_restore_error",
                    "backup_file": backup_filepath,
                    "restore_dir": restore_dir,
                    "action": "restore_backup",
                },
            )
            return {"success": False, "error": f"Restore failed: {str(e)}"}

    def _process_backup_for_restore(
        self, backup_filepath: str, password: str = None, key: str = None
    ) -> Dict[str, Any]:
        """Process backup file for restoration (decrypt and decompress)."""
        try:
            # Read backup file
            with open(backup_filepath, "rb") as f:
                backup_data = f.read()

            # Decrypt if needed
            decrypted_data = self._decrypt_backup_data(backup_data, password, key)
            if not decrypted_data["success"]:
                return decrypted_data

            # Decompress if needed
            decompressed_data = self._decompress_backup_data(
                decrypted_data["data"], backup_filepath
            )
            if not decompressed_data["success"]:
                return decompressed_data

            return {"success": True, "data": decompressed_data["data"]}

        except Exception as e:
            return {"success": False, "error": f"Backup processing failed: {str(e)}"}

    def _decrypt_backup_data(
        self, backup_data: bytes, password: str = None, key: str = None
    ) -> Dict[str, Any]:
        """Decrypt backup data if encryption is enabled."""
        if not (self.encryption_enabled or password or key):
            return {"success": True, "data": backup_data}

        try:
            if key:
                temp_key = key.encode() if isinstance(key, str) else key
            elif password:
                temp_key = self._derive_key_from_password(password)
            else:
                temp_key = self.encryption_key

            fernet = Fernet(temp_key)
            decrypted_data = fernet.decrypt(backup_data)
            return {"success": True, "data": decrypted_data}
        except Exception as e:
            return {"success": False, "error": f"Decryption failed: {str(e)}"}

    def _decompress_backup_data(self, data: bytes, backup_filepath: str) -> Dict[str, Any]:
        """Decompress backup data based on file extension."""
        try:
            if backup_filepath.endswith(".gz"):
                decompressed_data = self._decompress_data(data, "gzip")
            elif backup_filepath.endswith(".bz2"):
                decompressed_data = self._decompress_data(data, "bzip2")
            elif backup_filepath.endswith(".xz"):
                decompressed_data = self._decompress_data(data, "lzma")
            else:
                decompressed_data = data
            return {"success": True, "data": decompressed_data}
        except Exception as e:
            return {"success": False, "error": f"Decompression failed: {str(e)}"}

    def _extract_backup_archive(
        self, data: bytes, restore_dir: str, backup_filepath: str
    ) -> Dict[str, Any]:
        """Extract tar archive to restore directory."""
        try:
            os.makedirs(restore_dir, exist_ok=True)

            # Write data to temp file
            temp_tar_path = os.path.join(restore_dir, "temp_restore.tar")
            with open(temp_tar_path, "wb") as f:
                f.write(data)

            # Extract tar archive
            with tarfile.open(temp_tar_path, "r") as tar:
                tar.extractall(restore_dir)

            # Clean up temp file
            os.remove(temp_tar_path)

            self.logger.info(
                f"Backup restore completed successfully to {restore_dir}",
                {
                    "event_type": "backup_restore_completed",
                    "backup_file": backup_filepath,
                    "restore_dir": restore_dir,
                },
            )

            return {
                "success": True,
                "restore_dir": restore_dir,
                "message": "Backup restored successfully",
            }

        except Exception as e:
            return {"success": False, "error": f"Archive extraction failed: {str(e)}"}

    def get_compression_info(self) -> Dict[str, Any]:
        """Get current compression configuration information."""
        return {
            "compression_method": self.compression_method,
            "encryption_enabled": self.encryption_enabled,
            "supported_compression_methods": ["gzip", "bzip2", "lzma", "none"],
            "compression_extension": self._get_backup_extension(),
        }

    def generate_encryption_key(self) -> str:
        """Generate a new encryption key for backup encryption."""
        key = Fernet.generate_key()
        return key.decode()

    def update_backup_metrics(self, backup_result: Dict[str, Any], server_id: int = None):
        """Update backup metrics based on backup result."""
        try:
            self.metrics["total_backups"] += 1
            self.metrics["last_backup_time"] = datetime.utcnow().isoformat()

            if backup_result.get("success", False):
                self.metrics["successful_backups"] += 1

                # Update size metrics
                if "size" in backup_result:
                    self.metrics["total_backup_size_bytes"] += backup_result["size"]

                # Update duration metrics
                if "duration" in backup_result:
                    self._update_average_duration(backup_result["duration"])

                # Check for corruption
                if backup_result.get("verification_details", {}).get("corruption_detected", False):
                    self.metrics["corrupted_backups"] += 1
                    if server_id:
                        trigger_backup_corruption_alert(
                            server_id,
                            backup_result.get("backup_file", "unknown"),
                            backup_result.get("verification_details", {}),
                        )
            else:
                self.metrics["failed_backups"] += 1
                if server_id:
                    trigger_backup_failure_alert(
                        server_id, backup_result.get("error", "Unknown error"), {"scheduled": True}
                    )

            # Update verification failure metrics
            if backup_result.get("verification_details", {}).get("overall_valid", False) is False:
                self.metrics["verification_failures"] += 1
                if server_id:
                    trigger_backup_verification_failure_alert(
                        server_id,
                        backup_result.get("backup_file", "unknown"),
                        backup_result.get("verification_details", {}).get(
                            "error", "Verification failed"
                        ),
                    )

            # Update success rates
            self._update_success_rates()

            # Update disk usage
            self._update_disk_usage_metrics()

            # Check for alerts
            self._check_backup_alerts()

        except Exception as e:
            self.logger.error_tracking(
                e,
                {
                    "event_type": "metrics_update_error",
                    "server_id": server_id,
                    "action": "update_backup_metrics",
                },
            )

    def _update_average_duration(self, duration: float):
        """Update average backup duration."""
        if self.metrics["successful_backups"] > 0:
            current_avg = self.metrics["average_backup_duration"]
            new_avg = (
                (current_avg * (self.metrics["successful_backups"] - 1)) + duration
            ) / self.metrics["successful_backups"]
            self.metrics["average_backup_duration"] = round(new_avg, 2)

    def _update_success_rates(self):
        """Update backup success rate trends."""
        if self.metrics["total_backups"] > 0:
            success_rate = (
                self.metrics["successful_backups"] / self.metrics["total_backups"]
            ) * 100
            self.metrics["backup_trends"]["daily_success_rate"] = round(success_rate, 2)
            # TODO: Implement weekly and monthly calculations based on historical data

    def _update_disk_usage_metrics(self):
        """Update backup disk usage metrics."""
        try:
            import psutil

            backup_dir = "backups"
            if os.path.exists(backup_dir):
                disk_usage = psutil.disk_usage(backup_dir)
                self.metrics["disk_usage_percent"] = round(
                    (disk_usage.used / disk_usage.total) * 100, 2
                )
        except Exception as e:
            self.logger.debug(f"Could not update disk usage metrics: {e}")

    def _check_backup_alerts(self):
        """Check backup metrics against alert rules."""
        try:
            backup_metrics = {
                "failure_count": self.metrics["failed_backups"],
                "time_window": 3600,  # 1 hour window
                "corruption_detected": self.metrics["corrupted_backups"] > 0,
                "schedule_failure_count": self.metrics["schedule_execution_failures"],
                "verification_failure_count": self.metrics["verification_failures"],
                "backup_disk_usage_percent": self.metrics["disk_usage_percent"],
            }
            check_backup_alerts(backup_metrics)
        except Exception as e:
            self.logger.error_tracking(
                e,
                {"event_type": "alert_check_error", "action": "check_backup_alerts"},
            )

    def get_backup_metrics(self) -> Dict[str, Any]:
        """Get current backup monitoring metrics."""
        return {
            "status": "healthy" if self.metrics["failed_backups"] < 3 else "warning",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": self.metrics.copy(),
            "health_summary": {
                "success_rate": round(
                    (self.metrics["successful_backups"] / max(self.metrics["total_backups"], 1))
                    * 100,
                    2,
                ),
                "corruption_rate": round(
                    (self.metrics["corrupted_backups"] / max(self.metrics["total_backups"], 1))
                    * 100,
                    2,
                ),
                "verification_failure_rate": round(
                    (self.metrics["verification_failures"] / max(self.metrics["total_backups"], 1))
                    * 100,
                    2,
                ),
            },
        }

    def record_schedule_execution_failure(self, server_id: int, error_message: str):
        """Record a schedule execution failure."""
        self.metrics["schedule_execution_failures"] += 1
        trigger_backup_failure_alert(server_id, error_message, {"scheduled": True})
        self.logger.error(
            f"Schedule execution failure for server {server_id}: {error_message}",
            {
                "event_type": "schedule_execution_failure",
                "server_id": server_id,
                "error": error_message,
            },
        )


# Global scheduler instance
backup_scheduler = BackupScheduler()
