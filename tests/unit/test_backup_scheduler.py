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

    def test_cleanup_old_backups_success(self, scheduler, test_server):
        """Test successful backup cleanup."""
        # Add a schedule
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 7,  # 7 days retention
            "enabled": True,
        }
        scheduler.add_schedule(test_server.id, schedule_config)

        # Mock backup directory and files
        with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
            "os.path.join"
        ) as mock_join, patch("os.stat") as mock_stat, patch("os.remove") as mock_remove:
            mock_exists.return_value = True
            mock_listdir.return_value = [
                "testserver_backup_20240101_120000.tar.gz",  # Old backup
                "testserver_backup_20240108_120000.tar.gz",  # Recent backup
            ]
            mock_join.side_effect = lambda *args: "/".join(args)

            # Mock file stats - old file (8 days ago), recent file (1 day ago)
            old_time = datetime.now().timestamp() - (8 * 24 * 3600)  # 8 days ago
            recent_time = datetime.now().timestamp() - (1 * 24 * 3600)  # 1 day ago

            def mock_stat_side_effect(path):
                mock_stat_obj = Mock()
                if "20240101" in path:  # Old backup
                    mock_stat_obj.st_size = 1024
                    mock_stat_obj.st_mtime = old_time
                else:  # Recent backup
                    mock_stat_obj.st_size = 2048
                    mock_stat_obj.st_mtime = recent_time
                return mock_stat_obj

            mock_stat.side_effect = mock_stat_side_effect

            result = scheduler.cleanup_old_backups(test_server.id)

            assert result["success"] is True
            assert result["removed_count"] == 1  # Only old backup should be removed
            assert result["remaining_backups"] == 1

            # Verify that os.remove was called for the old backup
            mock_remove.assert_called_once_with(
                "backups/testserver/testserver_backup_20240101_120000.tar.gz"
            )

    def test_cleanup_old_backups_no_schedule(self, scheduler, test_server):
        """Test backup cleanup when no schedule exists."""
        result = scheduler.cleanup_old_backups(test_server.id)

        assert result["success"] is False
        assert "No backup schedule found" in result["error"]

    def test_cleanup_old_backups_no_backup_dir(self, scheduler, test_server):
        """Test backup cleanup when backup directory doesn't exist."""
        # Add a schedule
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 7,
            "enabled": True,
        }
        scheduler.add_schedule(test_server.id, schedule_config)

        with patch("os.path.exists") as mock_exists:
            mock_exists.return_value = False

            result = scheduler.cleanup_old_backups(test_server.id)

            assert result["success"] is True
            assert result["removed_count"] == 0
            assert "No backup directory found" in result["message"]

    def test_cleanup_old_backups_preserve_minimum(self, scheduler, test_server):
        """Test that cleanup preserves at least one backup."""
        # Add a schedule
        schedule_config = {
            "schedule_type": "daily",
            "schedule_time": time(2, 30),
            "retention_days": 7,
            "enabled": True,
        }
        scheduler.add_schedule(test_server.id, schedule_config)

        with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
            "os.path.join"
        ) as mock_join, patch("os.stat") as mock_stat, patch("os.remove") as mock_remove:
            mock_exists.return_value = True
            mock_listdir.return_value = [
                "testserver_backup_20240101_120000.tar.gz",  # Only one backup
            ]
            mock_join.side_effect = lambda *args: "/".join(args)

            # Mock file stats - old file (8 days ago)
            old_time = datetime.now().timestamp() - (8 * 24 * 3600)
            mock_stat_obj = Mock()
            mock_stat_obj.st_size = 1024
            mock_stat_obj.st_mtime = old_time
            mock_stat.return_value = mock_stat_obj

            result = scheduler.cleanup_old_backups(test_server.id)

            assert result["success"] is True
            assert result["removed_count"] == 0  # Should preserve the only backup
            assert "Preserving minimum backups" in result["message"]
            mock_remove.assert_not_called()

    def test_apply_retention_policies(self, scheduler):
        """Test retention policy application."""
        # Create mock backup files
        now = datetime.now().timestamp()
        old_time = now - (10 * 24 * 3600)  # 10 days ago
        recent_time = now - (3 * 24 * 3600)  # 3 days ago

        backup_files = [
            {
                "filename": "testserver_backup_old.tar.gz",
                "filepath": "/backups/testserver/testserver_backup_old.tar.gz",
                "size": 1024,
                "mtime": old_time,
                "created": datetime.fromtimestamp(old_time),
            },
            {
                "filename": "testserver_backup_recent.tar.gz",
                "filepath": "/backups/testserver/testserver_backup_recent.tar.gz",
                "size": 2048,
                "mtime": recent_time,
                "created": datetime.fromtimestamp(recent_time),
            },
        ]

        with patch("os.remove") as mock_remove:
            result = scheduler._apply_retention_policies(backup_files, 7)  # 7 days retention

            assert result["removed_count"] == 1
            assert "testserver_backup_old.tar.gz" in result["removed_files"]
            mock_remove.assert_called_once()

    def test_check_disk_space_normal_usage(self, scheduler):
        """Test disk space check with normal usage."""
        backup_files = [
            {"filename": "backup1.tar.gz", "filepath": "/backup1.tar.gz"},
            {"filename": "backup2.tar.gz", "filepath": "/backup2.tar.gz"},
        ]

        with patch("psutil.disk_usage") as mock_disk_usage:
            # Mock normal disk usage (50%)
            mock_usage = Mock()
            mock_usage.free = 50 * (1024**3)  # 50 GB free
            mock_usage.total = 100 * (1024**3)  # 100 GB total
            mock_usage.used = 50 * (1024**3)  # 50 GB used
            mock_disk_usage.return_value = mock_usage

            result = scheduler._check_disk_space_and_cleanup("/backups", backup_files)

            assert result["removed_count"] == 0
            assert result["triggered"] is False
            assert result["usage_percent"] == 50.0

    def test_check_disk_space_emergency_cleanup(self, scheduler):
        """Test disk space check with emergency cleanup."""
        backup_files = [
            {"filename": "backup1.tar.gz", "filepath": "/backup1.tar.gz"},
            {"filename": "backup2.tar.gz", "filepath": "/backup2.tar.gz"},
            {"filename": "backup3.tar.gz", "filepath": "/backup3.tar.gz"},
            {"filename": "backup4.tar.gz", "filepath": "/backup4.tar.gz"},
        ]

        with patch("psutil.disk_usage") as mock_disk_usage, patch("os.remove") as mock_remove:
            # Mock high disk usage (95%)
            mock_usage = Mock()
            mock_usage.free = 5 * (1024**3)  # 5 GB free
            mock_usage.total = 100 * (1024**3)  # 100 GB total
            mock_usage.used = 95 * (1024**3)  # 95 GB used
            mock_disk_usage.return_value = mock_usage

            result = scheduler._check_disk_space_and_cleanup("/backups", backup_files)

            assert result["removed_count"] == 1  # Should keep only 3 most recent
            assert result["triggered"] is True
            assert result["usage_percent"] == 95.0
            mock_remove.assert_called_once()

    def test_get_backup_files(self, scheduler):
        """Test getting backup files with metadata."""
        with patch("os.listdir") as mock_listdir, patch("os.path.join") as mock_join, patch(
            "os.stat"
        ) as mock_stat:
            mock_listdir.return_value = [
                "testserver_backup_20240101_120000.tar.gz",
                "testserver_backup_20240102_120000.tar.gz",
                "other_file.txt",  # Should be ignored
            ]
            mock_join.side_effect = lambda *args: "/".join(args)

            # Mock file stats
            mock_stat_obj = Mock()
            mock_stat_obj.st_size = 1024
            expected_timestamp = datetime.now().timestamp()
            mock_stat_obj.st_mtime = expected_timestamp
            mock_stat.return_value = mock_stat_obj

            result = scheduler._get_backup_files("/backups/testserver", "testserver")

            assert len(result) == 2  # Only backup files
            assert all("testserver_backup_" in file["filename"] for file in result)
            assert all(file["filename"].endswith(".tar.gz") for file in result)
            assert result[0]["size"] == 1024
            assert result[0]["mtime"] == expected_timestamp
