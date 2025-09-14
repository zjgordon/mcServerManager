"""
Integration tests for server management page functionality.

This module contains comprehensive integration tests for:
- Complete server management page flow (feature enabled/disabled)
- Console functionality with real server logs
- Command execution and response handling
- Feature flag integration with admin config
- User access control scenarios (admin vs regular user)
- Error handling and fallback behavior
"""
import json
import os
import tempfile
from unittest.mock import MagicMock, Mock, patch

import pytest
from flask import jsonify

from app.extensions import db
from app.models import ExperimentalFeature, Server, User


@pytest.mark.integration
@pytest.mark.server
class TestServerManagementPageIntegration:
    """Test complete server management page integration scenarios."""

    def test_server_management_page_feature_disabled(self, authenticated_client):
        """Test server management page when feature is disabled."""
        with authenticated_client.application.app_context():
            # Ensure feature is disabled
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = False
                db.session.commit()

            # Try to access server management page
            response = authenticated_client.get("/servers", follow_redirects=True)
            # Should redirect or show error when feature is disabled
            assert response.status_code in [200, 403, 404]

    def test_server_management_page_feature_enabled(self, authenticated_client, test_server):
        """Test server management page when feature is enabled."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Access server management page
            response = authenticated_client.get("/servers", follow_redirects=True)
            assert response.status_code == 200
            # Should contain server management content
            assert b"server" in response.data.lower()

    def test_console_api_feature_flag_integration(self, authenticated_client, test_server):
        """Test console API integration with feature flags."""
        with authenticated_client.application.app_context():
            # Test with feature disabled
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = False
                db.session.commit()

            # Test console endpoints with feature disabled
            response = authenticated_client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 403
            assert "Console API is not enabled" in response.get_json()["error"]

            response = authenticated_client.get(f"/api/console/{test_server.id}/status")
            assert response.status_code == 403

            response = authenticated_client.post(
                f"/api/console/{test_server.id}/command", json={"command": "help"}
            )
            assert response.status_code == 403

            # Enable feature
            feature.enabled = True
            db.session.commit()

            # Test console endpoints with feature enabled
            response = authenticated_client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 200
            assert response.get_json()["success"] is True

    def test_console_api_authentication_flow(self, client, test_server):
        """Test console API authentication flow."""
        with client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Test without authentication
            response = client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 401

            response = client.get(f"/api/console/{test_server.id}/status")
            assert response.status_code == 401

            response = client.post(
                f"/api/console/{test_server.id}/command", json={"command": "help"}
            )
            assert response.status_code == 401

    def test_console_api_access_control_admin_vs_regular_user(
        self, authenticated_client, authenticated_regular_client, test_server, regular_user
    ):
        """Test console API access control for admin vs regular users."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Test admin access
            response = authenticated_client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 200

            # Test regular user access to their own server
            test_server.owner_id = regular_user.id
            db.session.commit()

            response = authenticated_regular_client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 200

            # Test regular user access to server they don't own
            test_server.owner_id = 999  # Different user ID
            db.session.commit()

            response = authenticated_regular_client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 403
            assert "Access denied" in response.get_json()["error"]


@pytest.mark.integration
@pytest.mark.server
class TestConsoleFunctionalityIntegration:
    """Test console functionality with real server logs and commands."""

    def test_console_logs_with_real_server_logs(self, authenticated_client, test_server):
        """Test console logs functionality with real server log files."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Create real server log file
            server_dir = os.path.join("servers", test_server.server_name)
            logs_dir = os.path.join(server_dir, "logs")
            os.makedirs(logs_dir, exist_ok=True)
            log_file = os.path.join(logs_dir, "latest.log")

            # Write realistic server logs
            with open(log_file, "w") as f:
                f.write(
                    "[12:34:56] [Server thread/INFO] Starting minecraft server version 1.20.1\n"
                )
                f.write("[12:34:56] [Server thread/INFO] Loading properties\n")
                f.write("[12:34:57] [Server thread/INFO] Default game type: SURVIVAL\n")
                f.write("[12:34:57] [Server thread/INFO] Generating keypair\n")
                f.write("[12:34:58] [Server thread/INFO] Starting Minecraft server on *:25565\n")
                f.write(
                    "[12:34:58] [Server thread/INFO] Preparing start region for dimension minecraft:overworld\n"
                )
                f.write("[12:35:00] [Server thread/INFO] Time elapsed: 2000 ms\n")
                f.write('[12:35:00] [Server thread/INFO] Done (2.345s)! For help, type "help"\n')
                f.write(
                    "[12:35:01] [User Authenticator #1/INFO] UUID of player TestPlayer is 12345678-1234-1234-1234-123456789abc\n"
                )
                f.write("[12:35:01] [Server thread/INFO] TestPlayer joined the game\n")

            try:
                # Test logs endpoint
                response = authenticated_client.get(f"/api/console/{test_server.id}/logs")
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert len(data["logs"]) > 0
                assert data["server_id"] == test_server.id
                assert data["server_name"] == test_server.server_name

                # Verify log parsing
                logs = data["logs"]
                assert any("Starting minecraft server" in log["message"] for log in logs)
                assert any("TestPlayer joined the game" in log["message"] for log in logs)

                # Test pagination
                response = authenticated_client.get(
                    f"/api/console/{test_server.id}/logs?limit=5&offset=0"
                )
                assert response.status_code == 200
                data = response.get_json()
                assert len(data["logs"]) <= 5

            finally:
                # Cleanup
                import shutil

                shutil.rmtree(server_dir, ignore_errors=True)

    def test_console_command_execution_integration(self, authenticated_client, running_server):
        """Test console command execution with real server process."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Test command execution with mocked process
            with patch("psutil.Process") as mock_process:
                mock_proc = Mock()
                mock_proc.is_running.return_value = True
                mock_proc.stdin = Mock()
                mock_process.return_value = mock_proc

                # Test valid command
                response = authenticated_client.post(
                    f"/api/console/{running_server.id}/command",
                    json={"command": "help"},
                )
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert "Command 'help' executed successfully" in data["message"]

                # Test dangerous command (should be blocked)
                response = authenticated_client.post(
                    f"/api/console/{running_server.id}/command",
                    json={"command": "rm -rf /"},
                )
                assert response.status_code == 400
                data = response.get_json()
                assert data["success"] is False
                assert "not allowed" in data["error"]

                # Test empty command
                response = authenticated_client.post(
                    f"/api/console/{running_server.id}/command",
                    json={"command": ""},
                )
                assert response.status_code == 400
                data = response.get_json()
                assert data["success"] is False
                assert "Command is required" in data["error"]

    def test_console_status_integration(self, authenticated_client, running_server):
        """Test console status endpoint with real server data."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Test status endpoint with mocked process
            with patch("psutil.Process") as mock_process:
                mock_proc = Mock()
                mock_proc.is_running.return_value = True
                mock_proc.pid = running_server.pid
                mock_proc.name.return_value = "java"
                mock_proc.cmdline.return_value = ["java", "-jar", "server.jar"]
                mock_proc.cwd.return_value = "/test/server"
                mock_proc.create_time.return_value = 1234567890
                mock_proc.memory_info.return_value = Mock(rss=1000000, vms=2000000)
                mock_proc.cpu_percent.return_value = 5.0
                mock_proc.status.return_value = "running"
                mock_process.return_value = mock_proc

                response = authenticated_client.get(f"/api/console/{running_server.id}/status")
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert "status" in data
                status = data["status"]
                assert status["server_id"] == running_server.id
                assert status["server_name"] == running_server.server_name
                assert status["status"] == running_server.status
                assert "process_info" in status
                assert status["is_actually_running"] is True


@pytest.mark.integration
@pytest.mark.server
class TestErrorHandlingIntegration:
    """Test error handling and fallback behavior in server management."""

    def test_console_api_server_not_found(self, authenticated_client):
        """Test console API when server doesn't exist."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Test with non-existent server
            response = authenticated_client.get("/api/console/999/logs")
            assert response.status_code == 404
            data = response.get_json()
            assert data["success"] is False
            assert "Server not found" in data["error"]

            response = authenticated_client.get("/api/console/999/status")
            assert response.status_code == 404

            response = authenticated_client.post(
                "/api/console/999/command", json={"command": "help"}
            )
            assert response.status_code == 404

    def test_console_api_invalid_json_data(self, authenticated_client, test_server):
        """Test console API with invalid JSON data."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Test with invalid JSON
            response = authenticated_client.post(
                f"/api/console/{test_server.id}/command",
                data="invalid json",
                content_type="application/json",
            )
            assert response.status_code == 400
            data = response.get_json()
            assert data["success"] is False
            assert "JSON data required" in data["error"]

            # Test with missing JSON
            response = authenticated_client.post(f"/api/console/{test_server.id}/command")
            assert response.status_code == 400
            data = response.get_json()
            assert data["success"] is False
            assert "JSON data required" in data["error"]

    def test_console_api_rate_limiting_integration(self, authenticated_client, test_server):
        """Test console API rate limiting in integration scenario."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Make many requests to trigger rate limiting
            for i in range(65):  # Exceed the 60 request limit
                response = authenticated_client.get(f"/api/console/{test_server.id}/logs")
                if response.status_code == 429:  # Rate limited
                    break

            # Should eventually get rate limited
            assert response.status_code == 429

    def test_console_api_database_error_handling(self, authenticated_client, test_server):
        """Test console API handles database errors gracefully."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Mock database error
            with patch("app.routes.api.console_routes.Server.query") as mock_query:
                mock_query.get.side_effect = Exception("Database error")

                response = authenticated_client.get(f"/api/console/{test_server.id}/logs")
                assert response.status_code == 500
                data = response.get_json()
                assert data["success"] is False
                assert "Failed to retrieve logs" in data["error"]

    def test_console_api_file_operation_error_handling(self, authenticated_client, test_server):
        """Test console API handles file operation errors gracefully."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Mock file operation error
            with patch("builtins.open", side_effect=IOError("File error")):
                response = authenticated_client.get(f"/api/console/{test_server.id}/logs")
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert len(data["logs"]) == 0  # Should return empty list on error

    def test_console_api_process_error_handling(self, authenticated_client, running_server):
        """Test console API handles process errors gracefully."""
        with authenticated_client.application.app_context():
            # Enable feature
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if not feature:
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=True,
                    is_stable=False,
                )
                db.session.add(feature)
            else:
                feature.enabled = True
            db.session.commit()

            # Mock process error
            with patch("psutil.Process") as mock_process:
                mock_proc = Mock()
                mock_proc.is_running.return_value = True
                mock_proc.pid = running_server.pid
                mock_proc.name.return_value = "java"
                mock_proc.cmdline.return_value = ["java", "-jar", "server.jar"]
                mock_proc.cwd.return_value = "/path/to/server"
                mock_proc.create_time.return_value = 1234567890
                mock_proc.memory_info.return_value = Mock(rss=1000000, vms=2000000)
                mock_proc.cpu_percent.return_value = 5.0
                mock_proc.stdin = Mock()
                mock_proc.stdin.write.side_effect = OSError("Process error")
                mock_process.return_value = mock_proc

                response = authenticated_client.post(
                    f"/api/console/{running_server.id}/command",
                    json={"command": "help"},
                )
                assert response.status_code == 400
                data = response.get_json()
                assert data["success"] is False
                assert "Failed to send command" in data["error"]


@pytest.mark.integration
@pytest.mark.server
class TestFeatureFlagAdminIntegration:
    """Test feature flag integration with admin configuration."""

    def test_admin_can_toggle_feature_flag(self, authenticated_client, admin_user):
        """Test admin can toggle feature flags through admin interface."""
        from unittest.mock import patch

        with authenticated_client.application.app_context():
            # Get or create feature flag (it might already exist from app fixture)
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()

            if not feature:
                # Create feature flag if it doesn't exist
                feature = ExperimentalFeature(
                    feature_key="server_management_page",
                    feature_name="Server Management Page",
                    description="Test feature for server management",
                    enabled=False,
                    is_stable=False,
                )
                db.session.add(feature)
                db.session.commit()
            else:
                # Ensure it starts disabled for testing
                feature.enabled = False
                db.session.commit()

            # Test toggling feature flag (assuming there's an admin endpoint)
            # This would typically be done through an admin interface
            # For now, we'll test the utility function directly
            from app.utils import toggle_experimental_feature

            # Mock current_user to be the admin user
            with patch("app.utils.current_user", admin_user):
                result = toggle_experimental_feature("server_management_page", True)
                assert result is True

                # Verify feature is enabled
                feature = ExperimentalFeature.query.filter_by(
                    feature_key="server_management_page"
                ).first()
                assert feature.enabled is True

                # Test disabling
                result = toggle_experimental_feature("server_management_page", False)
                assert result is True

                # Verify feature is disabled
                feature = ExperimentalFeature.query.filter_by(
                    feature_key="server_management_page"
                ).first()
                assert feature.enabled is False

    def test_regular_user_cannot_toggle_feature_flag(self, authenticated_regular_client):
        """Test regular user cannot toggle feature flags."""
        with authenticated_regular_client.application.app_context():
            # Test toggling feature flag (should fail)
            from app.utils import toggle_experimental_feature

            result = toggle_experimental_feature("server_management_page", True)
            assert result is False  # Should fail for non-admin user

    def test_feature_flag_affects_all_console_endpoints(self, authenticated_client, running_server):
        """Test that feature flag affects all console endpoints consistently."""
        from unittest.mock import patch

        with authenticated_client.application.app_context():
            with patch("app.routes.api.console_routes.send_console_command") as mock_send:
                # Mock successful command execution
                mock_send.return_value = {
                    "success": True,
                    "message": "Command executed successfully",
                    "command": "help",
                    "server_id": running_server.id,
                    "timestamp": "2025-01-01T00:00:00Z",
                }

                # Test with feature disabled
                feature = ExperimentalFeature.query.filter_by(
                    feature_key="server_management_page"
                ).first()
                if feature:
                    feature.enabled = False
                    db.session.commit()

                # All console endpoints should return 403
                response = authenticated_client.get(f"/api/console/{running_server.id}/logs")
                assert response.status_code == 403

                response = authenticated_client.get(f"/api/console/{running_server.id}/status")
                assert response.status_code == 403

                response = authenticated_client.post(
                    f"/api/console/{running_server.id}/command", json={"command": "help"}
                )
                assert response.status_code == 403

                # Enable feature
                feature.enabled = True
                db.session.commit()

                # All console endpoints should work
                response = authenticated_client.get(f"/api/console/{running_server.id}/logs")
                assert response.status_code == 200

                response = authenticated_client.get(f"/api/console/{running_server.id}/status")
                assert response.status_code == 200

                response = authenticated_client.post(
                    f"/api/console/{running_server.id}/command", json={"command": "help"}
                )
                assert response.status_code == 200
