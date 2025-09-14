"""
Unit tests for backup monitoring and alerting functionality.

Tests the backup monitoring capabilities including:
- Backup metrics tracking
- Alert rule management
- Health dashboard functionality
- Backup failure detection and alerting
"""

from datetime import datetime, time
from unittest.mock import MagicMock, Mock, patch

import pytest

from app.alerts import (
    AlertManager,
    ThresholdAlert,
    check_backup_alerts,
    trigger_backup_corruption_alert,
    trigger_backup_failure_alert,
    trigger_backup_verification_failure_alert,
)
from app.backup_scheduler import BackupScheduler
from app.monitoring import (
    calculate_backup_health_score,
    generate_backup_recommendations,
    get_backup_alert_status,
    get_backup_health_dashboard,
    get_backup_metrics,
    get_backup_schedule_status,
    get_recent_backup_history,
)


class TestBackupMonitoring:
    """Test cases for backup monitoring functionality."""

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
        from app.models import User

        with app.app_context():
            user = User(username="testuser", password_hash="testhash", is_admin=True)
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)
            return user

    @pytest.fixture
    def test_server(self, app, test_user):
        """Create test server."""
        from app.extensions import db
        from app.models import Server

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
            db.session.refresh(server)
            return server

    def test_backup_metrics_initialization(self, scheduler):
        """Test backup metrics initialization."""
        assert scheduler.metrics["total_backups"] == 0
        assert scheduler.metrics["successful_backups"] == 0
        assert scheduler.metrics["failed_backups"] == 0
        assert scheduler.metrics["corrupted_backups"] == 0
        assert scheduler.metrics["verification_failures"] == 0
        assert scheduler.metrics["schedule_execution_failures"] == 0
        assert scheduler.metrics["total_backup_size_bytes"] == 0
        assert scheduler.metrics["average_backup_duration"] == 0.0
        assert scheduler.metrics["last_backup_time"] is None

    def test_update_backup_metrics_success(self, scheduler, test_server):
        """Test updating metrics for successful backup."""
        backup_result = {
            "success": True,
            "size": 1024000,  # 1MB
            "duration": 30.5,
            "verification_details": {"overall_valid": True, "corruption_detected": False},
        }

        scheduler.update_backup_metrics(backup_result, test_server.id)

        assert scheduler.metrics["total_backups"] == 1
        assert scheduler.metrics["successful_backups"] == 1
        assert scheduler.metrics["failed_backups"] == 0
        assert scheduler.metrics["total_backup_size_bytes"] == 1024000
        assert scheduler.metrics["average_backup_duration"] == 30.5
        assert scheduler.metrics["last_backup_time"] is not None

    def test_update_backup_metrics_failure(self, scheduler, test_server):
        """Test updating metrics for failed backup."""
        backup_result = {
            "success": False,
            "error": "Disk full",
            "verification_details": {"overall_valid": False},
        }

        with patch("app.backup_scheduler.trigger_backup_failure_alert") as mock_alert:
            scheduler.update_backup_metrics(backup_result, test_server.id)

            assert scheduler.metrics["total_backups"] == 1
            assert scheduler.metrics["successful_backups"] == 0
            assert scheduler.metrics["failed_backups"] == 1
            mock_alert.assert_called_once_with(test_server.id, "Disk full", {"scheduled": True})

    def test_update_backup_metrics_corruption(self, scheduler, test_server):
        """Test updating metrics for corrupted backup."""
        backup_result = {
            "success": True,
            "size": 1024000,
            "duration": 30.5,
            "verification_details": {
                "overall_valid": True,
                "corruption_detected": True,
            },
            "backup_file": "/backups/testserver/testserver_backup.tar.gz",
        }

        with patch("app.backup_scheduler.trigger_backup_corruption_alert") as mock_alert:
            scheduler.update_backup_metrics(backup_result, test_server.id)

            assert scheduler.metrics["corrupted_backups"] == 1
            mock_alert.assert_called_once()

    def test_update_backup_metrics_verification_failure(self, scheduler, test_server):
        """Test updating metrics for verification failure."""
        backup_result = {
            "success": True,
            "size": 1024000,
            "duration": 30.5,
            "verification_details": {
                "overall_valid": False,
                "error": "Checksum mismatch",
            },
            "backup_file": "/backups/testserver/testserver_backup.tar.gz",
        }

        with patch("app.backup_scheduler.trigger_backup_verification_failure_alert") as mock_alert:
            scheduler.update_backup_metrics(backup_result, test_server.id)

            assert scheduler.metrics["verification_failures"] == 1
            mock_alert.assert_called_once()

    def test_update_average_duration(self, scheduler):
        """Test average duration calculation."""
        # First backup - simulate the state after successful_backups is incremented
        scheduler.metrics["successful_backups"] = 1
        scheduler.metrics["average_backup_duration"] = 0.0  # Initial state
        scheduler._update_average_duration(20.0)

        assert scheduler.metrics["average_backup_duration"] == 20.0

        # Second backup - simulate adding another backup
        scheduler.metrics["successful_backups"] = 2
        scheduler._update_average_duration(30.0)

        assert scheduler.metrics["average_backup_duration"] == 25.0

    def test_update_success_rates(self, scheduler):
        """Test success rate calculation."""
        scheduler.metrics["total_backups"] = 10
        scheduler.metrics["successful_backups"] = 8

        scheduler._update_success_rates()

        assert scheduler.metrics["backup_trends"]["daily_success_rate"] == 80.0

    def test_update_disk_usage_metrics(self, scheduler):
        """Test disk usage metrics update."""
        with patch("os.path.exists") as mock_exists, patch("psutil.disk_usage") as mock_disk_usage:
            mock_exists.return_value = True
            mock_usage = Mock()
            mock_usage.used = 50 * (1024**3)  # 50 GB
            mock_usage.total = 100 * (1024**3)  # 100 GB
            mock_disk_usage.return_value = mock_usage

            scheduler._update_disk_usage_metrics()

            assert scheduler.metrics["disk_usage_percent"] == 50.0

    def test_check_backup_alerts(self, scheduler):
        """Test backup alert checking."""
        scheduler.metrics["failed_backups"] = 5
        scheduler.metrics["corrupted_backups"] = 1
        scheduler.metrics["schedule_execution_failures"] = 2
        scheduler.metrics["verification_failures"] = 3
        scheduler.metrics["disk_usage_percent"] = 90.0

        with patch("app.backup_scheduler.check_backup_alerts") as mock_check:
            scheduler._check_backup_alerts()

            mock_check.assert_called_once()
            call_args = mock_check.call_args[0][0]
            assert call_args["failure_count"] == 5
            assert call_args["corruption_detected"] is True
            assert call_args["schedule_failure_count"] == 2
            assert call_args["verification_failure_count"] == 3
            assert call_args["backup_disk_usage_percent"] == 90.0

    def test_get_backup_metrics(self, scheduler):
        """Test getting backup metrics."""
        scheduler.metrics["total_backups"] = 10
        scheduler.metrics["successful_backups"] = 8
        scheduler.metrics["failed_backups"] = 2

        metrics = scheduler.get_backup_metrics()

        assert metrics["status"] == "healthy"
        assert "timestamp" in metrics
        assert metrics["metrics"]["total_backups"] == 10
        assert metrics["health_summary"]["success_rate"] == 80.0

    def test_record_schedule_execution_failure(self, scheduler, test_server):
        """Test recording schedule execution failure."""
        with patch("app.backup_scheduler.trigger_backup_failure_alert") as mock_alert:
            scheduler.record_schedule_execution_failure(test_server.id, "Test error")

            assert scheduler.metrics["schedule_execution_failures"] == 1
            mock_alert.assert_called_once_with(test_server.id, "Test error", {"scheduled": True})


class TestBackupAlerting:
    """Test cases for backup alerting functionality."""

    def test_backup_alert_rules_initialization(self):
        """Test backup alert rules are properly initialized."""
        alert_manager = AlertManager()

        # Check that backup-specific alert rules exist
        assert "backup_failure_rate" in alert_manager.alert_rules
        assert "backup_corruption_detected" in alert_manager.alert_rules
        assert "backup_schedule_execution_failure" in alert_manager.alert_rules
        assert "backup_verification_failure" in alert_manager.alert_rules
        assert "backup_disk_space_warning" in alert_manager.alert_rules
        assert "backup_disk_space_critical" in alert_manager.alert_rules

    def test_check_backup_alerts_failure_rate(self):
        """Test backup failure rate alert checking."""
        backup_metrics = {
            "failure_count": 5,
            "time_window": 3600,
        }

        with patch("app.alerts.alert_manager") as mock_alert_manager:
            check_backup_alerts(backup_metrics)

            mock_alert_manager.check_alert.assert_called_with(
                "backup_failure_rate", 5, backup_metrics
            )

    def test_check_backup_alerts_corruption(self):
        """Test backup corruption alert checking."""
        backup_metrics = {
            "corruption_detected": True,
        }

        with patch("app.alerts.alert_manager") as mock_alert_manager:
            check_backup_alerts(backup_metrics)

            mock_alert_manager.check_alert.assert_called_with(
                "backup_corruption_detected", 1, backup_metrics
            )

    def test_check_backup_alerts_disk_space(self):
        """Test backup disk space alert checking."""
        backup_metrics = {
            "backup_disk_usage_percent": 90.0,
        }

        with patch("app.alerts.alert_manager") as mock_alert_manager:
            check_backup_alerts(backup_metrics)

            # Should check both warning and critical thresholds
            assert mock_alert_manager.check_alert.call_count == 2

    def test_trigger_backup_failure_alert(self):
        """Test triggering backup failure alert."""
        with patch("app.alerts.trigger_manual_alert") as mock_trigger:
            trigger_backup_failure_alert(123, "Test error", {"test": "context"})

            mock_trigger.assert_called_once()
            call_args = mock_trigger.call_args[0]
            assert call_args[0] == "backup_failure"
            assert "Backup failed for server 123" in call_args[1]
            assert call_args[2]["server_id"] == 123
            assert call_args[2]["error_message"] == "Test error"

    def test_trigger_backup_corruption_alert(self):
        """Test triggering backup corruption alert."""
        with patch("app.alerts.trigger_manual_alert") as mock_trigger:
            trigger_backup_corruption_alert(
                123, "/backup/file.tar.gz", {"corruption_type": "checksum"}
            )

            mock_trigger.assert_called_once()
            call_args = mock_trigger.call_args[0]
            assert call_args[0] == "backup_corruption_detected"
            assert "Backup corruption detected for server 123" in call_args[1]
            assert call_args[2]["server_id"] == 123
            assert call_args[2]["backup_file"] == "/backup/file.tar.gz"

    def test_trigger_backup_verification_failure_alert(self):
        """Test triggering backup verification failure alert."""
        with patch("app.alerts.trigger_manual_alert") as mock_trigger:
            trigger_backup_verification_failure_alert(
                123, "/backup/file.tar.gz", "Checksum mismatch"
            )

            mock_trigger.assert_called_once()
            call_args = mock_trigger.call_args[0]
            assert call_args[0] == "backup_verification_failure"
            assert "Backup verification failed for server 123" in call_args[1]
            assert call_args[2]["server_id"] == 123
            assert call_args[2]["verification_error"] == "Checksum mismatch"


class TestBackupHealthDashboard:
    """Test cases for backup health dashboard functionality."""

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

    def test_get_backup_metrics(self, app):
        """Test getting backup metrics."""
        with app.app_context():
            with patch("app.monitoring.backup_scheduler") as mock_scheduler:
                mock_scheduler.get_backup_metrics.return_value = {
                    "status": "healthy",
                    "timestamp": "2024-01-01T00:00:00",
                    "metrics": {
                        "total_backups": 10,
                        "successful_backups": 8,
                        "disk_usage_percent": 50.0,
                    },
                    "health_summary": {"success_rate": 80.0},
                }

                with patch("app.monitoring.check_disk_space") as mock_disk_check:
                    mock_disk_check.return_value = {"status": "healthy", "usage_percent": 50.0}

                    with patch("app.monitoring.get_backup_schedule_status") as mock_schedule:
                        mock_schedule.return_value = {"total_schedules": 5}

                        with patch("app.monitoring.get_backup_alert_status") as mock_alerts:
                            mock_alerts.return_value = {"active_backup_alerts": 0}

                            metrics = get_backup_metrics()

                            assert metrics["status"] == "healthy"
                            assert "backup_operations" in metrics
                            assert "disk_usage" in metrics
                            assert "schedule_status" in metrics
                            assert "alert_status" in metrics

    def test_get_backup_schedule_status(self, app):
        """Test getting backup schedule status."""
        with app.app_context():
            from app.extensions import db
            from app.models import BackupSchedule, Server, User

            # Create test data
            user = User(username="testuser", password_hash="testhash", is_admin=True)
            db.session.add(user)
            db.session.commit()

            server = Server(
                server_name="testserver",
                version="1.20.1",
                port=25565,
                status="Stopped",
                memory_mb=1024,
                owner_id=user.id,
            )
            db.session.add(server)
            db.session.commit()

            schedule = BackupSchedule(
                server_id=server.id,
                schedule_type="daily",
                schedule_time=time(2, 30),
                retention_days=30,
                enabled=True,
            )
            db.session.add(schedule)
            db.session.commit()

            status = get_backup_schedule_status()

            assert status["total_schedules"] == 1
            assert status["enabled_schedules"] == 1
            assert status["disabled_schedules"] == 0
            assert len(status["schedules"]) == 1
            assert status["schedules"][0]["server_name"] == "testserver"

    def test_get_backup_alert_status(self, app):
        """Test getting backup alert status."""
        with app.app_context():
            with patch("app.alerts.alert_manager") as mock_alert_manager:
                mock_alert_manager.get_active_alerts.return_value = [
                    {"rule_name": "backup_failure_rate", "threshold": 3},
                    {"rule_name": "high_cpu_usage", "threshold": 80},  # Non-backup alert
                ]
                mock_alert_manager.alert_rules = {
                    "backup_failure_rate": Mock(),
                    "backup_corruption_detected": Mock(),
                    "backup_schedule_execution_failure": Mock(),
                    "backup_verification_failure": Mock(),
                    "backup_disk_space_warning": Mock(),
                    "backup_disk_space_critical": Mock(),
                }

                status = get_backup_alert_status()

                assert status["active_backup_alerts"] == 1
                assert len(status["alerts"]) == 1
                assert status["alerts"][0]["rule_name"] == "backup_failure_rate"
                assert status["alert_rules"]["backup_failure_rate"] is True

    def test_calculate_backup_health_score_healthy(self):
        """Test health score calculation for healthy system."""
        backup_metrics = {
            "backup_operations": {
                "total_backups": 100,
                "failed_backups": 5,
                "corrupted_backups": 1,
                "verification_failures": 2,
            },
            "disk_usage": {"usage_percent": 50.0},
            "alert_status": {"active_backup_alerts": 0},
        }

        score = calculate_backup_health_score(backup_metrics)

        # Should be high score for healthy system (79 with current penalty calculation)
        assert score >= 75

    def test_calculate_backup_health_score_unhealthy(self):
        """Test health score calculation for unhealthy system."""
        backup_metrics = {
            "backup_operations": {
                "total_backups": 100,
                "failed_backups": 50,  # 50% failure rate
                "corrupted_backups": 10,  # 10% corruption rate
                "verification_failures": 20,  # 20% verification failure rate
            },
            "disk_usage": {"usage_percent": 95.0},  # Critical disk usage
            "alert_status": {"active_backup_alerts": 5},  # Multiple alerts
        }

        score = calculate_backup_health_score(backup_metrics)

        # Should be low score for unhealthy system
        assert score < 50

    def test_generate_backup_recommendations_healthy(self):
        """Test generating recommendations for healthy system."""
        backup_metrics = {
            "backup_operations": {
                "total_backups": 100,
                "failed_backups": 5,
                "corrupted_backups": 1,
            },
            "disk_usage": {"usage_percent": 50.0},
            "alert_status": {"active_backup_alerts": 0},
        }

        recommendations = generate_backup_recommendations(backup_metrics)

        assert len(recommendations) == 1
        assert "healthy" in recommendations[0].lower()

    def test_generate_backup_recommendations_unhealthy(self):
        """Test generating recommendations for unhealthy system."""
        backup_metrics = {
            "backup_operations": {
                "total_backups": 100,
                "failed_backups": 30,  # 30% failure rate
                "corrupted_backups": 10,  # 10% corruption rate
            },
            "disk_usage": {"usage_percent": 95.0},  # Critical disk usage
            "alert_status": {"active_backup_alerts": 3},
        }

        recommendations = generate_backup_recommendations(backup_metrics)

        assert len(recommendations) >= 3
        assert any("failure rate" in rec.lower() for rec in recommendations)
        assert any("corruption" in rec.lower() for rec in recommendations)
        assert any("disk usage" in rec.lower() for rec in recommendations)

    def test_get_recent_backup_history(self, app):
        """Test getting recent backup history."""
        with app.app_context():
            with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
                "os.path.join"
            ) as mock_join, patch("os.stat") as mock_stat, patch("glob.glob") as mock_glob, patch(
                "os.path.isdir"
            ) as mock_isdir:
                mock_exists.return_value = True
                mock_listdir.return_value = ["testserver"]
                mock_join.side_effect = lambda *args: "/".join(args)
                mock_isdir.return_value = True
                mock_glob.return_value = [
                    "/backups/testserver/testserver_backup_20240101_120000.tar.gz",
                    "/backups/testserver/testserver_backup_20240102_120000.tar.gz",
                ]

                # Mock file stats
                mock_stat_obj = Mock()
                mock_stat_obj.st_size = 1024000
                mock_stat_obj.st_mtime = datetime.now().timestamp()
                mock_stat.return_value = mock_stat_obj

                history = get_recent_backup_history(limit=5)

                assert len(history) == 2
                assert all("testserver_backup_" in backup["backup_file"] for backup in history)
                assert all(backup["backup_file"].endswith(".tar.gz") for backup in history)

    def test_get_backup_health_dashboard(self, app):
        """Test getting comprehensive backup health dashboard."""
        with app.app_context():
            with patch("app.monitoring.get_backup_metrics") as mock_metrics, patch(
                "app.monitoring.get_system_metrics"
            ) as mock_system, patch(
                "app.monitoring.calculate_backup_health_score"
            ) as mock_score, patch(
                "app.monitoring.get_recent_backup_history"
            ) as mock_history, patch(
                "app.monitoring.generate_backup_recommendations"
            ) as mock_recommendations:
                mock_metrics.return_value = {"status": "healthy", "backup_operations": {}}
                mock_system.return_value = {"cpu": {"usage_percent": 50.0}}
                mock_score.return_value = 85
                mock_history.return_value = []
                mock_recommendations.return_value = ["System is healthy"]

                dashboard = get_backup_health_dashboard()

                assert dashboard["status"] == "healthy"
                assert dashboard["health_score"] == 85
                assert "backup_metrics" in dashboard
                assert "system_metrics" in dashboard
                assert "recent_backups" in dashboard
                assert "recommendations" in dashboard
