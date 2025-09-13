"""
Integration tests for backup management API endpoints.

Tests all backup API endpoints including schedule management,
backup triggering, history retrieval, and status checking.
"""

import json
import os
import tempfile
from datetime import datetime
from datetime import time as dt_time
from unittest.mock import patch

import pytest

from app.models import BackupSchedule, Server, User


class TestBackupAPI:
    """Test suite for backup management API endpoints."""

    def test_list_schedules_authenticated(self, client, admin_user, test_server):
        """Test listing backup schedules with authentication."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create a backup schedule
        schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="daily",
            schedule_time=dt_time(2, 0),  # 2:00 AM
            retention_days=30,
            enabled=True,
        )
        from app.extensions import db

        db.session.add(schedule)
        db.session.commit()

        # Test GET /api/backups/schedules
        response = client.get("/api/backups/schedules")
        assert response.status_code == 200

        data = response.get_json()
        assert data["success"] is True
        assert data["count"] == 1
        assert len(data["schedules"]) == 1

        schedule_data = data["schedules"][0]
        assert schedule_data["server_id"] == test_server.id
        assert schedule_data["server_name"] == test_server.server_name
        assert schedule_data["schedule_type"] == "daily"
        assert schedule_data["schedule_time"] == "02:00:00"
        assert schedule_data["retention_days"] == 30
        assert schedule_data["enabled"] is True

    def test_list_schedules_unauthenticated(self, client):
        """Test listing backup schedules without authentication."""
        response = client.get("/api/backups/schedules")
        assert response.status_code == 401

        data = response.get_json()
        assert data["error"] == "Authentication required"

    def test_list_schedules_user_access(self, client, test_user, test_server):
        """Test that regular users can only see their own server schedules."""
        # Login as regular user
        client.post(
            "/login",
            data={"username": "testuser", "password": "testpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create a schedule for user's server
        schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="daily",
            schedule_time=dt_time(2, 0),
            retention_days=30,
            enabled=True,
        )
        from app.extensions import db

        db.session.add(schedule)
        db.session.commit()

        # Test that user can see their own schedule
        response = client.get("/api/backups/schedules")
        assert response.status_code == 200

        data = response.get_json()
        assert data["success"] is True
        assert data["count"] == 1

    def test_create_schedule_success(self, client, admin_user, test_server):
        """Test creating a new backup schedule."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test POST /api/backups/schedules
        schedule_data = {
            "server_id": test_server.id,
            "schedule_type": "daily",
            "schedule_time": "02:30",
            "retention_days": 14,
            "enabled": True,
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(schedule_data),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["message"] == "Backup schedule created successfully"

        schedule = data["schedule"]
        assert schedule["server_id"] == test_server.id
        assert schedule["server_name"] == test_server.server_name
        assert schedule["schedule_type"] == "daily"
        assert schedule["schedule_time"] == "02:30:00"
        assert schedule["retention_days"] == 14
        assert schedule["enabled"] is True

    def test_create_schedule_invalid_data(self, client, admin_user, test_server):
        """Test creating a backup schedule with invalid data."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test with invalid schedule_type
        invalid_data = {
            "server_id": test_server.id,
            "schedule_type": "invalid",
            "schedule_time": "02:30",
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(invalid_data),
            content_type="application/json",
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["error"] == "schedule_type must be one of: daily, weekly, monthly"

    def test_create_schedule_duplicate(self, client, admin_user, test_server):
        """Test creating a duplicate backup schedule."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create first schedule
        schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="daily",
            schedule_time=dt_time(2, 0),
            retention_days=30,
            enabled=True,
        )
        from app.extensions import db

        db.session.add(schedule)
        db.session.commit()

        # Try to create duplicate schedule
        schedule_data = {
            "server_id": test_server.id,
            "schedule_type": "weekly",
            "schedule_time": "03:00",
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(schedule_data),
            content_type="application/json",
        )

        assert response.status_code == 409
        data = response.get_json()
        assert data["error"] == "Backup schedule already exists for this server"

    def test_get_schedule_success(self, client, admin_user, test_server):
        """Test getting a backup schedule."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create a backup schedule
        schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="weekly",
            schedule_time=dt_time(1, 30),
            retention_days=7,
            enabled=False,
        )
        from app.extensions import db

        db.session.add(schedule)
        db.session.commit()

        # Test GET /api/backups/schedules/<server_id>
        response = client.get(f"/api/backups/schedules/{test_server.id}")
        assert response.status_code == 200

        data = response.get_json()
        assert data["success"] is True

        schedule_data = data["schedule"]
        assert schedule_data["server_id"] == test_server.id
        assert schedule_data["server_name"] == test_server.server_name
        assert schedule_data["schedule_type"] == "weekly"
        assert schedule_data["schedule_time"] == "01:30:00"
        assert schedule_data["retention_days"] == 7
        assert schedule_data["enabled"] is False

    def test_get_schedule_not_found(self, client, admin_user, test_server):
        """Test getting a backup schedule that doesn't exist."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test GET /api/backups/schedules/<server_id> for non-existent schedule
        response = client.get(f"/api/backups/schedules/{test_server.id}")
        assert response.status_code == 404

        data = response.get_json()
        assert data["error"] == "No backup schedule found for this server"

    def test_update_schedule_success(self, client, admin_user, test_server):
        """Test updating a backup schedule."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create a backup schedule
        schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="daily",
            schedule_time=dt_time(2, 0),
            retention_days=30,
            enabled=True,
        )
        from app.extensions import db

        db.session.add(schedule)
        db.session.commit()

        # Test PUT /api/backups/schedules/<server_id>
        update_data = {
            "schedule_type": "weekly",
            "schedule_time": "03:45",
            "retention_days": 14,
            "enabled": False,
        }

        response = client.put(
            f"/api/backups/schedules/{test_server.id}",
            data=json.dumps(update_data),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["message"] == "Backup schedule updated successfully"

        schedule_data = data["schedule"]
        assert schedule_data["schedule_type"] == "weekly"
        assert schedule_data["schedule_time"] == "03:45:00"
        assert schedule_data["retention_days"] == 14
        assert schedule_data["enabled"] is False

    def test_delete_schedule_success(self, client, admin_user, test_server):
        """Test deleting a backup schedule."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create a backup schedule
        schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="daily",
            schedule_time=dt_time(2, 0),
            retention_days=30,
            enabled=True,
        )
        from app.extensions import db

        db.session.add(schedule)
        db.session.commit()

        # Test DELETE /api/backups/schedules/<server_id>
        response = client.delete(f"/api/backups/schedules/{test_server.id}")
        assert response.status_code == 200

        data = response.get_json()
        assert data["success"] is True
        assert data["message"] == "Backup schedule deleted successfully"

        # Verify schedule was deleted
        deleted_schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
        assert deleted_schedule is None

    def test_trigger_backup_success(self, client, admin_user, test_server):
        """Test triggering a manual backup."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock the backup execution
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250109_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250109_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            # Test POST /api/backups/<server_id>/trigger
            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 200

            data = response.get_json()
            assert data["success"] is True
            assert data["message"] == "Manual backup completed successfully"

            backup_data = data["backup"]
            assert backup_data["server_id"] == test_server.id
            assert backup_data["server_name"] == test_server.server_name
            assert backup_data["size"] == 1048576
            assert backup_data["checksum"] == "abc123def456"
            assert backup_data["duration"] == 45.2

    def test_trigger_backup_failure(self, client, admin_user, test_server):
        """Test triggering a backup that fails."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock the backup execution to fail
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": False,
                "error": "Server directory not found",
            }

            # Test POST /api/backups/<server_id>/trigger
            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 500

            data = response.get_json()
            assert data["success"] is False
            assert "Server directory not found" in data["error"]

    def test_get_backup_history_success(self, client, admin_user, test_server):
        """Test getting backup history for a server."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock backup directory and files
        with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
            "os.stat"
        ) as mock_stat:
            mock_exists.return_value = True
            mock_listdir.return_value = [f"{test_server.server_name}_backup_20250109_143000.tar.gz"]
            mock_stat.return_value = type(
                "Stat", (), {"st_size": 1048576, "st_mtime": 1704792600}
            )()

            # Test GET /api/backups/<server_id>/history
            response = client.get(f"/api/backups/{test_server.id}/history")
            assert response.status_code == 200

            data = response.get_json()
            assert data["success"] is True
            assert data["server_id"] == test_server.id
            assert data["server_name"] == test_server.server_name
            assert data["count"] == 1
            assert len(data["backups"]) == 1

            backup = data["backups"][0]
            assert backup["filename"] == f"{test_server.server_name}_backup_20250109_143000.tar.gz"
            assert backup["size"] == 1048576
            assert backup["size_mb"] == 1.0

    def test_get_backup_history_no_directory(self, client, admin_user, test_server):
        """Test getting backup history when no backup directory exists."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock backup directory to not exist
        with patch("os.path.exists") as mock_exists:
            mock_exists.return_value = False

            # Test GET /api/backups/<server_id>/history
            response = client.get(f"/api/backups/{test_server.id}/history")
            assert response.status_code == 200

            data = response.get_json()
            assert data["success"] is True
            assert data["count"] == 0
            assert data["message"] == "No backup directory found"

    def test_get_backup_status_with_schedule(self, client, admin_user, test_server):
        """Test getting backup status when schedule exists."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create a backup schedule
        schedule = BackupSchedule(
            server_id=test_server.id,
            schedule_type="daily",
            schedule_time=dt_time(2, 0),
            retention_days=30,
            enabled=True,
            last_backup=datetime.now(),
        )
        from app.extensions import db

        db.session.add(schedule)
        db.session.commit()

        # Mock the backup scheduler status method
        with patch("app.backup_scheduler.backup_scheduler.get_schedule_status") as mock_status:
            mock_status.return_value = {
                "server_id": test_server.id,
                "schedule_type": "daily",
                "schedule_time": "02:00:00",
                "retention_days": 30,
                "enabled": True,
                "last_backup": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
                "scheduled": True,
                "next_run": (
                    datetime.now().replace(hour=2, minute=0, second=0, microsecond=0)
                ).isoformat(),
            }

            # Test GET /api/backups/<server_id>/status
            response = client.get(f"/api/backups/{test_server.id}/status")
            assert response.status_code == 200

            data = response.get_json()
            assert data["success"] is True
            assert data["status"]["has_schedule"] is True
            assert data["status"]["server_name"] == test_server.server_name
            assert data["status"]["schedule_type"] == "daily"

    def test_get_backup_status_no_schedule(self, client, admin_user, test_server):
        """Test getting backup status when no schedule exists."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock the backup scheduler status method to return None
        with patch("app.backup_scheduler.backup_scheduler.get_schedule_status") as mock_status:
            mock_status.return_value = None

            # Test GET /api/backups/<server_id>/status
            response = client.get(f"/api/backups/{test_server.id}/status")
            assert response.status_code == 200

            data = response.get_json()
            assert data["success"] is True
            assert data["has_schedule"] is False
            assert data["message"] == "No backup schedule configured"

    def test_server_access_control(self, client, test_user, admin_user):
        """Test that users can only access their own servers."""
        # Create another user's server
        other_server = Server(
            server_name="other_server",
            version="1.20.1",
            port=25566,
            status="Stopped",
            memory_mb=1024,
            owner_id=admin_user.id,
        )
        from app.extensions import db

        db.session.add(other_server)
        db.session.commit()

        # Login as regular user
        client.post(
            "/login",
            data={"username": "testuser", "password": "testpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Try to access other user's server
        response = client.get(f"/api/backups/schedules/{other_server.id}")
        assert response.status_code == 404

        data = response.get_json()
        assert data["error"] == "Server not found or access denied"

    def test_rate_limiting(self, client, admin_user, test_server):
        """Test that rate limiting works on API endpoints."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test rate limiting on schedule creation (5 attempts per 5 minutes)
        for i in range(6):  # Try 6 times to trigger rate limit
            schedule_data = {
                "server_id": test_server.id,
                "schedule_type": "daily",
                "schedule_time": "02:30",
            }

            response = client.post(
                "/api/backups/schedules",
                data=json.dumps(schedule_data),
                content_type="application/json",
            )

            if i < 5:
                # First 5 attempts should succeed (or fail with validation, not rate limit)
                assert response.status_code != 429
            else:
                # 6th attempt should be rate limited
                assert response.status_code == 429
