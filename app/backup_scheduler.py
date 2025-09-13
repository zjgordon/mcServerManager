"""
Backup scheduler module for automated backup management.

This module provides comprehensive backup scheduling capabilities including:
- APScheduler integration for task scheduling
- Backup schedule management (add, remove, update)
- Error handling and logging
- Schedule status monitoring
"""

import logging
from datetime import datetime, time
from typing import Any, Dict, List, Optional

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
        if not isinstance(config["schedule_time"], time):
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
        """Execute backup for a server (placeholder implementation)."""
        try:
            self.logger.info(
                f"Executing backup for server {server_id}",
                {"event_type": "backup_executed", "server_id": server_id},
            )

            # Update last_backup timestamp
            backup_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
            if backup_schedule:
                backup_schedule.last_backup = datetime.utcnow()
                db.session.commit()

            # TODO: Implement actual backup logic here
            # This would involve:
            # 1. Stopping the server
            # 2. Creating backup archive
            # 3. Starting the server
            # 4. Cleaning up old backups based on retention policy

        except Exception as e:
            self.logger.error_tracking(
                e,
                {"event_type": "backup_error", "server_id": server_id, "action": "execute_backup"},
            )


# Global scheduler instance
backup_scheduler = BackupScheduler()
