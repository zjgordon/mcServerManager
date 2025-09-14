"""
Integration tests for unified backup functionality.

Tests backup creation from both table/card buttons and management page,
verifies all backups appear in backup management history, tests backup
trigger button works without JSON.parse errors, validates backup file
naming consistency across interfaces, and tests error handling for
various failure scenarios.
"""

import json
import os
import tempfile
from datetime import datetime
from datetime import time as dt_time
from unittest.mock import MagicMock, patch

import pytest

from app.models import BackupSchedule, Server, User


class TestBackupUnification:
    """Test suite for unified backup functionality across all interfaces."""

    def test_backup_creation_table_card_buttons(self, client, admin_user, test_server):
        """Test backup creation from table/card backup buttons."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock backup execution with unified naming convention
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class:
            mock_backup_instance = mock_backup_class.return_value
            mock_backup_instance.execute_backup_job.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            # Test backup via table/card button (POST to /backup/<server_id>)
            response = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},  # CSRF token for form submission
                follow_redirects=True,
            )

            # Should redirect back to home page with success message
            assert response.status_code == 200
            # Check for success message in the response
            assert b"Backup of" in response.data or b"completed successfully" in response.data

            # Verify backup was called with correct server_id
            mock_backup_instance.execute_backup_job.assert_called_once_with(test_server.id)

    def test_backup_creation_management_page(self, client, admin_user, test_server):
        """Test backup creation from backup management page."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock backup execution with unified naming convention
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            # Test backup via management page API (POST to /api/backups/<server_id>/trigger)
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

            # Verify backup was called with correct server_id
            mock_backup.assert_called_once_with(test_server.id)

    def test_backup_history_shows_all_backups(self, client, admin_user, test_server):
        """Test that backup history shows backups from both interfaces."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Mock backup directory with files from both interfaces
        backup_files = [
            f"{test_server.server_name}_backup_20250114_143000.tar.gz",  # From management page
            f"{test_server.server_name}_backup_20250114_144500.tar.gz",  # From table/card button
            f"{test_server.server_name}_backup_20250114_150000.tar.gz",  # From management page
        ]

        with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
            "os.stat"
        ) as mock_stat:
            mock_exists.return_value = True
            mock_listdir.return_value = backup_files
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
            assert data["count"] == 3
            assert len(data["backups"]) == 3

            # Verify all backup files are listed with correct naming convention
            backup_filenames = [backup["filename"] for backup in data["backups"]]
            for filename in backup_files:
                assert filename in backup_filenames
                # Verify naming convention: {server_name}_backup_{timestamp}.tar.gz
                assert filename.startswith(f"{test_server.server_name}_backup_")
                assert filename.endswith(".tar.gz")

    def test_backup_trigger_no_json_parse_errors(self, client, admin_user, test_server):
        """Test backup trigger button works without JSON.parse errors."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test successful backup trigger
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 200

            # Verify response is valid JSON
            data = response.get_json()
            assert data is not None
            assert data["success"] is True
            assert "backup" in data

        # Test backup trigger with error - should still return valid JSON
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": False,
                "error": "Server directory not found",
            }

            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 500

            # Verify error response is valid JSON
            data = response.get_json()
            assert data is not None
            assert data["success"] is False
            assert "error" in data

    def test_backup_file_naming_consistency(self, client, admin_user, test_server):
        """Test backup file naming consistency across all interfaces."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test table/card button backup naming
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            # Trigger via table/card button
            response = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify naming convention: {server_name}_backup_{timestamp}.tar.gz
            backup_filename = mock_backup.return_value["backup_filename"]
            assert backup_filename.startswith(f"{test_server.server_name}_backup_")
            assert backup_filename.endswith(".tar.gz")
            assert "_backup_" in backup_filename

        # Test management page backup naming
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_144500.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_144500.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            # Trigger via management page API
            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 200

            # Verify naming convention: {server_name}_backup_{timestamp}.tar.gz
            backup_filename = mock_backup.return_value["backup_filename"]
            assert backup_filename.startswith(f"{test_server.server_name}_backup_")
            assert backup_filename.endswith(".tar.gz")
            assert "_backup_" in backup_filename

        # Test that both naming patterns are recognized by backup history
        backup_files = [
            f"{test_server.server_name}_backup_20250114_143000.tar.gz",  # New pattern
            f"{test_server.server_name}_20250114_144500.tar.gz",  # Old pattern (backward compatibility)
        ]

        with patch("os.path.exists") as mock_exists, patch("os.listdir") as mock_listdir, patch(
            "os.stat"
        ) as mock_stat:
            mock_exists.return_value = True
            mock_listdir.return_value = backup_files
            mock_stat.return_value = type(
                "Stat", (), {"st_size": 1048576, "st_mtime": 1704792600}
            )()

            response = client.get(f"/api/backups/{test_server.id}/history")
            assert response.status_code == 200

            data = response.get_json()
            assert data["success"] is True
            assert data["count"] == 2
            assert len(data["backups"]) == 2

            # Verify both naming patterns are recognized
            backup_filenames = [backup["filename"] for backup in data["backups"]]
            for filename in backup_files:
                assert filename in backup_filenames

    def test_backup_error_handling_table_card_buttons(self, client, admin_user, test_server):
        """Test error handling for table/card backup buttons."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test backup failure
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class:
            mock_backup_instance = mock_backup_class.return_value
            mock_backup_instance.execute_backup_job.return_value = {
                "success": False,
                "error": "Server directory not found",
            }

            response = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )

            # Should redirect back to home page with error message
            assert response.status_code == 200
            assert (
                b"Error creating backup" in response.data
                or b"Server directory not found" in response.data
            )

        # Test backup with missing error message
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class:
            mock_backup_instance = mock_backup_class.return_value
            mock_backup_instance.execute_backup_job.return_value = {
                "success": False,
            }

            response = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )

            # Should redirect back to home page with generic error message
            assert response.status_code == 200
            assert (
                b"Error creating backup" in response.data
                or b"Unknown error occurred" in response.data
            )

    def test_backup_error_handling_management_page(self, client, admin_user, test_server):
        """Test error handling for backup management page."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test backup failure
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": False,
                "error": "Server directory not found",
            }

            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 500

            data = response.get_json()
            assert data["success"] is False
            assert "Server directory not found" in data["error"]

        # Test backup with missing error message
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.return_value = {
                "success": False,
            }

            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 500

            data = response.get_json()
            assert data["success"] is False
            assert "error" in data

        # Test backup with exception
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup:
            mock_backup.side_effect = Exception("Unexpected error")

            response = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response.status_code == 500

            data = response.get_json()
            assert data["success"] is False
            assert "error" in data

    def test_backup_unified_implementation_consistency(self, client, admin_user, test_server):
        """Test that both interfaces use the same backup implementation."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test table/card button
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class1:
            mock_backup_instance1 = mock_backup_class1.return_value
            mock_backup_instance1.execute_backup_job.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            response1 = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )
            assert response1.status_code == 200
            mock_backup_instance1.execute_backup_job.assert_called_once_with(test_server.id)

        # Test management page API
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup2:
            mock_backup2.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            response2 = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response2.status_code == 200
            mock_backup2.assert_called_once_with(test_server.id)

    def test_backup_bulk_operations_consistency(self, client, admin_user, test_server):
        """Test that bulk backup operations use the same implementation."""
        # Create additional test server
        server2 = Server(
            server_name="test_server_2",
            version="1.20.1",
            port=25566,
            status="Stopped",
            memory_mb=1024,
            owner_id=admin_user.id,
        )
        from app.extensions import db

        db.session.add(server2)
        db.session.commit()

        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test first server backup
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class1:
            mock_backup_instance1 = mock_backup_class1.return_value
            mock_backup_instance1.execute_backup_job.return_value = {
                "success": True,
                "backup_filename": "test_backup.tar.gz",
                "backup_file": "/backups/test_backup.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            response1 = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )
            assert response1.status_code == 200
            mock_backup_instance1.execute_backup_job.assert_called_once_with(test_server.id)

        # Test second server backup
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class2:
            mock_backup_instance2 = mock_backup_class2.return_value
            mock_backup_instance2.execute_backup_job.return_value = {
                "success": True,
                "backup_filename": "test_backup2.tar.gz",
                "backup_file": "/backups/test_backup2.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
            }

            response2 = client.post(
                f"/backup/{server2.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )
            assert response2.status_code == 200
            mock_backup_instance2.execute_backup_job.assert_called_once_with(server2.id)

    def test_backup_verification_consistency(self, client, admin_user, test_server):
        """Test that backup verification works consistently across interfaces."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test table/card button backup
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class1:
            mock_backup_instance1 = mock_backup_class1.return_value
            mock_backup_instance1.execute_backup_job.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
                "verification": {
                    "verified": True,
                    "checksum_valid": True,
                    "file_integrity": True,
                    "quality_score": 95,
                },
            }

            response1 = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )
            assert response1.status_code == 200
            mock_backup_instance1.execute_backup_job.assert_called_once_with(test_server.id)

        # Test management page API backup
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup2:
            mock_backup2.return_value = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
                "verification": {
                    "verified": True,
                    "checksum_valid": True,
                    "file_integrity": True,
                    "quality_score": 95,
                },
            }

            response2 = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response2.status_code == 200

            data = response2.get_json()
            assert data["success"] is True
            assert "backup" in data
            mock_backup2.assert_called_once_with(test_server.id)

    def test_backup_metadata_consistency(self, client, admin_user, test_server):
        """Test that backup metadata is consistent across interfaces."""
        # Login as admin
        client.post(
            "/login",
            data={"username": "admin", "password": "adminpass"},  # pragma: allowlist secret
            follow_redirects=True,
        )

        # Test table/card button backup
        with patch("app.routes.server_routes.BackupScheduler") as mock_backup_class1:
            mock_backup_instance1 = mock_backup_class1.return_value
            backup_metadata = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
                "compression": "gzip",
                "encryption": None,
                "created_at": "2025-01-14T14:30:00Z",
            }
            mock_backup_instance1.execute_backup_job.return_value = backup_metadata

            response1 = client.post(
                f"/backup/{test_server.id}",
                data={"csrf_token": "test_token"},
                follow_redirects=True,
            )
            assert response1.status_code == 200
            mock_backup_instance1.execute_backup_job.assert_called_once_with(test_server.id)

        # Test management page API backup
        with patch("app.backup_scheduler.backup_scheduler.execute_backup_job") as mock_backup2:
            backup_metadata = {
                "success": True,
                "backup_filename": f"{test_server.server_name}_backup_20250114_143000.tar.gz",
                "backup_file": f"/backups/{test_server.server_name}/{test_server.server_name}_backup_20250114_143000.tar.gz",
                "size": 1048576,
                "checksum": "abc123def456",
                "duration": 45.2,
                "was_running": False,
                "compression": "gzip",
                "encryption": None,
                "created_at": "2025-01-14T14:30:00Z",
            }
            mock_backup2.return_value = backup_metadata

            response2 = client.post(f"/api/backups/{test_server.id}/trigger")
            assert response2.status_code == 200

            data = response2.get_json()
            assert data["success"] is True
            backup_data = data["backup"]

            # Verify metadata consistency
            assert backup_data["server_id"] == test_server.id
            assert backup_data["server_name"] == test_server.server_name
            assert backup_data["size"] == backup_metadata["size"]
            assert backup_data["checksum"] == backup_metadata["checksum"]
            assert backup_data["duration"] == backup_metadata["duration"]
            mock_backup2.assert_called_once_with(test_server.id)
