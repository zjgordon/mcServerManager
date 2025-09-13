"""
Unit tests for backup scheduler module.

Tests the core functionality of the BackupScheduler class including:
- Schedule management (add, remove, update)
- Scheduler lifecycle (start, stop)
- Error handling and validation
- Status monitoring
"""

from datetime import datetime, time
from unittest.mock import MagicMock, Mock, patch

import pytest

from app.backup_scheduler import BackupScheduler
from app.models import BackupSchedule, Server, User


class TestBackupScheduler:
    """Test cases for BackupScheduler class."""

    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        from flask import Flask

        from app.extensions import db, login_manager

        app = Flask(__name__)
        app.config["TESTING"] = True
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["SECRET_KEY"] = "test-secret-key"

        db.init_app(app)
        login_manager.init_app(app)

        with app.app_context():
            db.create_all()
            yield app

    @pytest.fixture
    def scheduler(self, app):
        """Create BackupScheduler instance."""
        return BackupScheduler(app)

    @pytest.fixture
    def test_user(self, app):
        """Create test user."""
        from app.extensions import db

        with app.app_context():
            user = User(username="testuser", password_hash="testhash", is_admin=True)
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)  # Ensure user is bound to session
            return user

    @pytest.fixture
    def test_server(self, app, test_user):
        """Create test server."""
        from app.extensions import db

        with app.app_context():
            server = Server(
                server_name="testserver",
                version="1.20.1",
                port=25565,
                status="Stopped",
                memory_mb=1024,
                owner_id=test_user.id,
            )
            db.session.add(server)
            db.session.commit()
            db.session.refresh(server)  # Ensure server is bound to session
            return server

    def test_init_without_app(self):
        """Test scheduler initialization without app."""
        scheduler = BackupScheduler()
        assert scheduler.scheduler is None
        assert scheduler.app is None
        assert scheduler.logger is not None

    def test_init_with_app(self, app):
        """Test scheduler initialization with app."""
        scheduler = BackupScheduler(app)
        assert scheduler.app == app
        assert scheduler.scheduler is not None
        assert scheduler.logger is not None

    def test_init_app(self, app):
        """Test init_app method."""
        scheduler = BackupScheduler()
        scheduler.init_app(app)

        assert scheduler.app == app
        assert scheduler.scheduler is not None

    def test_add_schedule_success(self, scheduler, test_server):
        """Test successful schedule addition."""
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),  # 2:30 AM
            "retention_days": 30,
            "enabled": True,
        }

        with patch.object(scheduler, "_add_scheduler_job") as mock_add_job:
            result = scheduler.add_schedule(test_server.id, schedule_config)

            assert result is True
            mock_add_job.assert_called_once()

            # Verify database record was created
            backup_schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
            assert backup_schedule is not None
            assert backup_schedule.schedule_type == "daily"
            assert backup_schedule.schedule_time == time(2, 30)
            assert backup_schedule.retention_days == 30
            assert backup_schedule.enabled is True

    def test_add_schedule_server_not_found(self, scheduler):
        """Test adding schedule for non-existent server."""
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }

        result = scheduler.add_schedule(999, schedule_config)
        assert result is False

    def test_add_schedule_invalid_config(self, scheduler, test_server):
        """Test adding schedule with invalid configuration."""
        # Missing required fields
        invalid_config = {
            "schedule_type": "daily"
            # Missing schedule_time
        }

        result = scheduler.add_schedule(test_server.id, invalid_config)
        assert result is False

    def test_add_schedule_invalid_schedule_type(self, scheduler, test_server):
        """Test adding schedule with invalid schedule type."""
        schedule_config = {
            "schedule_type": "invalid",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }

        result = scheduler.add_schedule(test_server.id, schedule_config)
        assert result is False

    def test_add_schedule_invalid_retention_days(self, scheduler, test_server):
        """Test adding schedule with invalid retention days."""
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 500,  # Invalid: > 365
            "enabled": True,
        }

        result = scheduler.add_schedule(test_server.id, schedule_config)
        assert result is False

    def test_remove_schedule_success(self, scheduler, test_server):
        """Test successful schedule removal."""
        # First add a schedule
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }
        scheduler.add_schedule(test_server.id, schedule_config)

        # Mock scheduler job removal
        with patch.object(scheduler.scheduler, "get_job") as mock_get_job, patch.object(
            scheduler.scheduler, "remove_job"
        ) as mock_remove_job:
            mock_get_job.return_value = Mock()  # Job exists

            result = scheduler.remove_schedule(test_server.id)

            assert result is True
            mock_remove_job.assert_called_once_with(f"backup_{test_server.id}")

            # Verify database record was removed
            backup_schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
            assert backup_schedule is None

    def test_remove_schedule_not_found(self, scheduler, test_server):
        """Test removing non-existent schedule."""
        result = scheduler.remove_schedule(test_server.id)
        assert result is True  # Not an error if no schedule exists

    def test_update_schedule_success(self, scheduler, test_server):
        """Test successful schedule update."""
        # First add a schedule
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }
        scheduler.add_schedule(test_server.id, schedule_config)

        # Update the schedule
        updated_config = {
            "schedule_type": "weekly",
            "schedule_time": time(3, 0),
            "retention_days": 60,
            "enabled": True,
        }

        with patch.object(scheduler.scheduler, "get_job") as mock_get_job, patch.object(
            scheduler.scheduler, "remove_job"
        ) as mock_remove_job, patch.object(scheduler, "_add_scheduler_job") as mock_add_job:
            mock_get_job.return_value = Mock()  # Job exists

            result = scheduler.update_schedule(test_server.id, updated_config)

            assert result is True
            mock_remove_job.assert_called_once_with(f"backup_{test_server.id}")
            mock_add_job.assert_called_once()

            # Verify database record was updated
            backup_schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
            assert backup_schedule.schedule_type == "weekly"
            assert backup_schedule.schedule_time == time(3, 0)
            assert backup_schedule.retention_days == 60

    def test_update_schedule_not_found(self, scheduler, test_server):
        """Test updating non-existent schedule."""
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }

        result = scheduler.update_schedule(test_server.id, schedule_config)
        assert result is False

    def test_start_scheduler_success(self, scheduler):
        """Test successful scheduler start."""
        with patch.object(scheduler.scheduler, "start") as mock_start, patch.object(
            scheduler, "_load_existing_schedules"
        ) as mock_load:
            result = scheduler.start_scheduler()

            assert result is True
            mock_start.assert_called_once()
            mock_load.assert_called_once()

    def test_start_scheduler_not_initialized(self):
        """Test starting scheduler when not initialized."""
        scheduler = BackupScheduler()  # No app provided
        result = scheduler.start_scheduler()
        assert result is False

    def test_start_scheduler_already_running(self, scheduler):
        """Test starting scheduler when already running."""
        # Start the scheduler first
        scheduler.scheduler.start()

        # Now try to start again - should return True but not call start again
        with patch.object(scheduler.scheduler, "start") as mock_start:
            result = scheduler.start_scheduler()

            assert result is True
            # start should not be called again since scheduler is already running
            mock_start.assert_not_called()

    def test_stop_scheduler_success(self, scheduler):
        """Test successful scheduler stop."""
        with patch.object(scheduler.scheduler, "shutdown") as mock_shutdown:
            # Start scheduler first
            scheduler.scheduler.start()

            result = scheduler.stop_scheduler()

            assert result is True
            mock_shutdown.assert_called_once()

    def test_stop_scheduler_not_running(self, scheduler):
        """Test stopping scheduler when not running."""
        with patch.object(scheduler.scheduler, "shutdown") as mock_shutdown:
            # Don't start scheduler - it's not running
            result = scheduler.stop_scheduler()

            assert result is True
            # shutdown should not be called if scheduler is not running
            mock_shutdown.assert_not_called()

    def test_get_schedule_status_success(self, scheduler, test_server):
        """Test getting schedule status successfully."""
        # Add a schedule
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }
        scheduler.add_schedule(test_server.id, schedule_config)

        # Mock scheduler job
        mock_job = Mock()
        mock_job.next_run_time = datetime(2024, 1, 1, 2, 30)

        with patch.object(scheduler.scheduler, "get_job") as mock_get_job:
            mock_get_job.return_value = mock_job

            status = scheduler.get_schedule_status(test_server.id)

            assert status is not None
            assert status["server_id"] == test_server.id
            assert status["schedule_type"] == "daily"
            assert status["schedule_time"] == "02:30:00"
            assert status["retention_days"] == 30
            assert status["enabled"] is True
            assert status["scheduled"] is True
            assert status["next_run"] == "2024-01-01T02:30:00"

    def test_get_schedule_status_not_found(self, scheduler, test_server):
        """Test getting status for non-existent schedule."""
        status = scheduler.get_schedule_status(test_server.id)
        assert status is None

    def test_validate_schedule_config_valid(self, scheduler):
        """Test valid schedule configuration validation."""
        config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }

        result = scheduler._validate_schedule_config(config)
        assert result is True

    def test_validate_schedule_config_missing_fields(self, scheduler):
        """Test schedule configuration validation with missing fields."""
        config = {
            "schedule_type": "daily"
            # Missing schedule_time
        }

        result = scheduler._validate_schedule_config(config)
        assert result is False

    def test_validate_schedule_config_invalid_type(self, scheduler):
        """Test schedule configuration validation with invalid type."""
        config = {"schedule_type": "invalid", "schedule_time": time(2, 30)}

        result = scheduler._validate_schedule_config(config)
        assert result is False

    def test_validate_schedule_config_invalid_retention(self, scheduler):
        """Test schedule configuration validation with invalid retention."""
        config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 500,  # Invalid: > 365
        }

        result = scheduler._validate_schedule_config(config)
        assert result is False

    def test_create_trigger_daily(self, scheduler, test_server):
        """Test creating daily trigger."""
        backup_schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="daily",
            schedule_time=time(2, 30),
            retention_days=30,
            enabled=True,
        )

        trigger = scheduler._create_trigger(backup_schedule)
        assert trigger is not None

    def test_create_trigger_weekly(self, scheduler, test_server):
        """Test creating weekly trigger."""
        backup_schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="weekly",
            schedule_time=time(2, 30),
            retention_days=30,
            enabled=True,
        )

        trigger = scheduler._create_trigger(backup_schedule)
        assert trigger is not None

    def test_create_trigger_monthly(self, scheduler, test_server):
        """Test creating monthly trigger."""
        backup_schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="monthly",
            schedule_time=time(2, 30),
            retention_days=30,
            enabled=True,
        )

        trigger = scheduler._create_trigger(backup_schedule)
        assert trigger is not None

    def test_create_trigger_invalid_type(self, scheduler, test_server):
        """Test creating trigger with invalid schedule type."""
        backup_schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="invalid",
            schedule_time=time(2, 30),
            retention_days=30,
            enabled=True,
        )

        with pytest.raises(ValueError):
            scheduler._create_trigger(backup_schedule)

    def test_execute_backup_success(self, scheduler, test_server):
        """Test successful backup execution."""
        # Add a schedule
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 30,
            "enabled": True,
        }
        scheduler.add_schedule(test_server.id, schedule_config)

        # Execute backup
        scheduler._execute_backup(test_server.id)

        # Verify last_backup was updated
        backup_schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
        assert backup_schedule.last_backup is not None

    def test_execute_backup_schedule_not_found(self, scheduler, test_server):
        """Test backup execution when schedule not found."""
        # Execute backup without creating schedule
        scheduler._execute_backup(test_server.id)

        # Should not raise exception, just log error
        backup_schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
        assert backup_schedule is None
