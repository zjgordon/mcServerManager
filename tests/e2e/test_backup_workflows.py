"""
End-to-end tests for backup workflows.

Tests complete backup workflows from schedule creation to backup execution,
verification, and restoration including UI interactions and API endpoints.
"""

import json
import os
import tempfile
import time
from datetime import datetime
from datetime import time as dt_time
from unittest.mock import patch

import pytest

from app.models import BackupSchedule, Server, User


class TestBackupWorkflows:
    """Test complete backup workflows end-to-end."""

    def test_complete_backup_workflow_schedule_creation_to_execution(
        self, client, admin_user, test_server
    ):
        """Test complete workflow from schedule creation to backup execution."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Step 1: Create backup schedule via API
        schedule_data = {
            "server_id": test_server.id,
            "schedule_type": "daily",
            "schedule_time": "02:30",
            "retention_days": 7,
            "enabled": True,
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(schedule_data),
            content_type="application/json",
        )
        assert response.status_code == 201
        schedule_response = response.get_json()
        assert schedule_response["success"] is True

        # Step 2: Verify schedule was created in database
        from app.extensions import db

        schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
        assert schedule is not None
        assert schedule.schedule_type == "daily"
        assert schedule.retention_days == 7
        assert schedule.enabled is True

        # Step 3: Trigger manual backup via API
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

            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 200
            backup_response = response.get_json()
            assert backup_response["success"] is True
            assert backup_response["message"] == "Manual backup completed successfully"

        # Step 4: Check backup status via API
        response = client.get(f"/api/backups/{test_server.id}/status")
        assert response.status_code == 200
        status_response = response.get_json()
        assert status_response["success"] is True
        assert status_response["status"]["has_schedule"] is True

        # Step 5: Get backup history via API
        with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
            "os.stat"
        ) as mock_stat:
            mock_exists.return_value = True
            mock_listdir.return_value = [f"{test_server.server_name}_backup_20250109_143000.tar.gz"]
            mock_stat.return_value = type(
                "Stat", (), {"st_size": 1048576, "st_mtime": 1704792600}
            )()

            response = client.get(f"/api/backups/{test_server.id}/history")
            assert response.status_code == 200
            history_response = response.get_json()
            assert history_response["success"] is True
            assert history_response["count"] == 1

    def test_backup_schedule_update_workflow(self, client, admin_user, test_server):
        """Test workflow for updating backup schedule."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Step 1: Create initial schedule
        initial_schedule = {
            "server_id": test_server.id,
            "schedule_type": "daily",
            "schedule_time": "02:30",
            "retention_days": 7,
            "enabled": True,
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(initial_schedule),
            content_type="application/json",
        )
        assert response.status_code == 201

        # Step 2: Update schedule
        updated_schedule = {
            "schedule_type": "weekly",
            "schedule_time": "03:45",
            "retention_days": 14,
            "enabled": False,
        }

        response = client.put(
            f"/api/backups/schedules/{test_server.id}",
            data=json.dumps(updated_schedule),
            content_type="application/json",
        )
        assert response.status_code == 200
        update_response = response.get_json()
        assert update_response["success"] is True

        # Step 3: Verify schedule was updated in database
        from app.extensions import db

        schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
        assert schedule.schedule_type == "weekly"
        assert schedule.retention_days == 14
        assert schedule.enabled is False

    def test_backup_schedule_deletion_workflow(self, client, admin_user, test_server):
        """Test workflow for deleting backup schedule."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Step 1: Create schedule
        schedule_data = {
            "server_id": test_server.id,
            "schedule_type": "daily",
            "schedule_time": "02:30",
            "retention_days": 7,
            "enabled": True,
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(schedule_data),
            content_type="application/json",
        )
        assert response.status_code == 201

        # Step 2: Delete schedule
        response = client.delete(f"/api/backups/schedules/{test_server.id}")
        assert response.status_code == 200
        delete_response = response.get_json()
        assert delete_response["success"] is True

        # Step 3: Verify schedule was deleted from database
        from app.extensions import db

        schedule = BackupSchedule.query.filter_by(server_id=test_server.id).first()
        assert schedule is None

    def test_backup_restore_workflow(self, client, admin_user, test_server):
        """Test complete backup restore workflow."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Step 1: Get available backups
        with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
            "os.stat"
        ) as mock_stat:
            mock_exists.return_value = True
            mock_listdir.return_value = [f"{test_server.server_name}_backup_20250109_143000.tar.gz"]
            mock_stat.return_value = type(
                "Stat", (), {"st_size": 1048576, "st_mtime": 1704792600}
            )()

            response = client.get(f"/api/backups/{test_server.id}/available")
            assert response.status_code == 200
            available_response = response.get_json()
            assert available_response["success"] is True
            assert available_response["count"] == 1

            backup_filename = available_response["backups"][0]["filename"]

        # Step 2: Preview restore (without confirmation)
        restore_data = {
            "backup_filename": backup_filename,
            "confirm": False,
        }

        with patch("os.path.exists") as mock_exists, patch("os.stat") as mock_stat:
            mock_exists.return_value = True
            mock_stat.return_value = type(
                "Stat", (), {"st_size": 1048576, "st_mtime": 1704792600}
            )()

            response = client.post(
                f"/api/backups/{test_server.id}/restore",
                data=json.dumps(restore_data),
                content_type="application/json",
            )
            assert response.status_code == 200
            preview_response = response.get_json()
            assert preview_response["success"] is True
            assert preview_response["preview"] is True
            assert "confirmation required" in preview_response["message"]

        # Step 3: Confirm restore
        restore_data["confirm"] = True

        with patch("os.path.exists") as mock_exists, patch("os.stat") as mock_stat, patch(
            "app.backup_scheduler.backup_scheduler.restore_backup"
        ) as mock_restore:
            mock_exists.return_value = True
            mock_stat.return_value = type(
                "Stat", (), {"st_size": 1048576, "st_mtime": 1704792600}
            )()
            mock_restore.return_value = {
                "success": True,
                "restore_dir": f"/servers/{test_server.server_name}",
                "message": "Backup restored successfully",
            }

            response = client.post(
                f"/api/backups/{test_server.id}/restore",
                data=json.dumps(restore_data),
                content_type="application/json",
            )
            assert response.status_code == 200
            restore_response = response.get_json()
            assert restore_response["success"] is True
            assert restore_response["message"] == "Backup restored successfully"

    def test_backup_workflow_with_user_permissions(self, client, regular_user, admin_user):
        """Test backup workflow with user permission restrictions."""
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
            data={"username": "testuser", "password": "userpass123"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Step 1: Try to access other user's server - should fail
        response = client.get(f"/api/backups/schedules/{other_server.id}")
        assert response.status_code == 403
        error_response = response.get_json()
        assert "Admin privileges required" in error_response["error"]

        # Step 2: Try to trigger backup on other user's server - should fail
        response = client.post(f"/api/backups/{other_server.id}/trigger")
        assert response.status_code == 404

        # Step 3: Admin can access all servers
        # First logout the regular user
        client.get("/logout")
        # Then login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        response = client.get(f"/api/backups/schedules/{other_server.id}")
        # Should return 404 because no schedule exists, not access denied
        assert response.status_code == 404
        error_response = response.get_json()
        assert "No backup schedule found for this server" in error_response["error"]

    def test_backup_workflow_error_handling(self, client, admin_user, test_server):
        """Test backup workflow error handling and edge cases."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Step 1: Try to create schedule for non-existent server
        invalid_schedule = {
            "server_id": 99999,
            "schedule_type": "daily",
            "schedule_time": "02:30",
            "retention_days": 7,
            "enabled": True,
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(invalid_schedule),
            content_type="application/json",
        )
        assert response.status_code == 404
        error_response = response.get_json()
        assert "Server not found or access denied" in error_response["error"]

        # Step 2: Try to create schedule with invalid data
        invalid_data = {
            "server_id": test_server.id,
            "schedule_type": "invalid",
            "schedule_time": "25:70",  # Invalid time
            "retention_days": 500,  # Invalid retention
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(invalid_data),
            content_type="application/json",
        )
        assert response.status_code == 400
        error_response = response.get_json()
        assert "error" in error_response

        # Step 3: Try to trigger backup on non-existent server
        response = client.post("/api/backups/99999/trigger")
        assert response.status_code == 404

    def test_backup_workflow_performance_large_backup(self, client, admin_user, test_server):
        """Test backup workflow with large backup simulation."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create schedule
        schedule_data = {
            "server_id": test_server.id,
            "schedule_type": "daily",
            "schedule_time": "02:30",
            "retention_days": 7,
            "enabled": True,
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(schedule_data),
            content_type="application/json",
        )
        assert response.status_code == 201

        # Trigger large backup simulation
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250109_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250109_143000.tar.gz",
                "size": 1073741824,  # 1GB backup
                "checksum": "large_backup_checksum",
                "duration": 120.5,  # 2 minutes
                "was_running": True,
            }

            start_time = time.time()
            response = client.post(f"/api/backups/{test_server.id}/trigger")
            end_time = time.time()

            assert response.status_code == 200
            backup_response = response.get_json()
            assert backup_response["success"] is True
            assert backup_response["backup"]["size"] == 1073741824
            assert backup_response["backup"]["duration"] == 120.5
            assert backup_response["backup"]["was_running"] is True

            # Verify reasonable response time (should be fast since we're mocking)
            assert (end_time - start_time) < 1.0

    def test_backup_workflow_concurrent_operations(self, client, admin_user, test_server):
        """Test backup workflow with concurrent operations."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Create schedule
        schedule_data = {
            "server_id": test_server.id,
            "schedule_type": "daily",
            "schedule_time": "02:30",
            "retention_days": 7,
            "enabled": True,
        }

        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(schedule_data),
            content_type="application/json",
        )
        assert response.status_code == 201

        # Try to create duplicate schedule - should fail
        response = client.post(
            "/api/backups/schedules",
            data=json.dumps(schedule_data),
            content_type="application/json",
        )
        assert response.status_code == 409
        error_response = response.get_json()
        assert "Backup schedule already exists" in error_response["error"]

        # Trigger multiple backups concurrently
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

            # Multiple concurrent backup requests
            response1 = client.post(f"/api/backups/{test_server.id}/trigger")
            response2 = client.post(f"/api/backups/{test_server.id}/trigger")

            # Both should succeed (rate limiting might apply in real scenario)
            assert response1.status_code == 200
            assert response2.status_code == 200
