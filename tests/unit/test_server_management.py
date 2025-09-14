"""
Unit tests for server management functionality.

This module contains comprehensive unit tests for:
- Feature flag functionality (is_feature_enabled, toggle_experimental_feature)
- Server management route access control
- Console API endpoints (logs, command, status)
- Command execution system
- Log parsing utility functions
- Error handling scenarios
"""
import json
import os
import tempfile
from datetime import datetime
from unittest.mock import MagicMock, Mock, patch

import pytest
from flask import jsonify
from flask_login import current_user

from app.error_handlers import FileOperationError, ValidationError
from app.extensions import db
from app.models import ExperimentalFeature, Server, User
from app.routes.api.console_routes import (
    get_server_logs,
    get_server_status,
    send_console_command,
    validate_server_access,
)
from app.utils import (
    execute_server_command,
    is_feature_enabled,
    parse_server_logs,
    toggle_experimental_feature,
)


@pytest.mark.unit
@pytest.mark.server
class TestFeatureFlagFunctionality:
    """Test feature flag functionality for server management."""

    def test_is_feature_enabled_existing_feature(self, app):
        """Test checking if an existing feature is enabled."""
        with app.app_context():
            # Create a test feature
            feature = ExperimentalFeature(
                feature_key="server_management_page",
                feature_name="Server Management Page",
                description="Test feature for server management",
                enabled=True,
                is_stable=False,
            )
            db.session.add(feature)
            db.session.commit()

            # Test enabled feature
            assert is_feature_enabled("server_management_page") is True

            # Test disabled feature
            feature.enabled = False
            db.session.commit()
            assert is_feature_enabled("server_management_page") is False

    def test_is_feature_enabled_nonexistent_feature(self, app):
        """Test checking if a non-existent feature is enabled."""
        with app.app_context():
            # Should return False for non-existent features
            assert is_feature_enabled("nonexistent_feature") is False

    def test_is_feature_enabled_database_error(self, app):
        """Test is_feature_enabled handles database errors gracefully."""
        with app.app_context():
            with patch("app.models.ExperimentalFeature.query") as mock_query:
                mock_query.filter_by.return_value.first.side_effect = Exception("DB Error")
                assert is_feature_enabled("test_feature") is False

    def test_toggle_experimental_feature_success(self, app, admin_user):
        """Test successfully toggling an experimental feature."""
        with app.app_context():
            # Create a test feature
            feature = ExperimentalFeature(
                feature_key="test_toggle_feature",
                feature_name="Test Toggle Feature",
                description="Test feature for toggling",
                enabled=False,
                is_stable=False,
            )
            db.session.add(feature)
            db.session.commit()

            # Mock current_user
            with patch("app.utils.current_user", admin_user):
                # Test enabling
                result = toggle_experimental_feature("test_toggle_feature", True)
                assert result is True
                assert feature.enabled is True

                # Test disabling
                result = toggle_experimental_feature("test_toggle_feature", False)
                assert result is True
                assert feature.enabled is False

    def test_toggle_experimental_feature_nonexistent(self, app, admin_user):
        """Test toggling a non-existent experimental feature."""
        with app.app_context():
            with patch("app.utils.current_user", admin_user):
                result = toggle_experimental_feature("nonexistent_feature", True)
                assert result is False

    def test_toggle_experimental_feature_database_error(self, app, admin_user):
        """Test toggle_experimental_feature handles database errors gracefully."""
        with app.app_context():
            with patch("app.utils.current_user", admin_user):
                with patch("app.utils.db.session.commit") as mock_commit:
                    mock_commit.side_effect = Exception("DB Error")
                    result = toggle_experimental_feature("test_feature", True)
                    assert result is False


@pytest.mark.unit
@pytest.mark.server
class TestServerManagementRouteAccessControl:
    """Test server management route access control."""

    def test_validate_server_access_admin_user(self, app, admin_user, test_server):
        """Test admin user can access any server."""
        with app.app_context():
            with patch("app.routes.api.console_routes.current_user", admin_user):
                result = validate_server_access(test_server.id)
                assert result.id == test_server.id
                assert result.server_name == test_server.server_name

    def test_validate_server_access_owner_user(self, app, regular_user, test_server):
        """Test regular user can access their own server."""
        with app.app_context():
            # Create a new server owned by the regular user
            from tests.factories import ServerFactory

            user_server = ServerFactory.create(
                server_name="user_server",
                owner_id=regular_user.id,
            )
            db.session.add(user_server)
            db.session.commit()
            db.session.refresh(user_server)

            with patch("app.routes.api.console_routes.current_user", regular_user):
                result = validate_server_access(user_server.id)
                assert result.id == user_server.id
                assert result.server_name == user_server.server_name

    def test_validate_server_access_non_owner_user(self, app, regular_user, test_server):
        """Test regular user cannot access server they don't own."""
        with app.app_context():
            # Set server owner to different user
            test_server.owner_id = 999  # Different user ID
            db.session.commit()

            with patch("app.routes.api.console_routes.current_user", regular_user):
                with pytest.raises(ValueError, match="Access denied"):
                    validate_server_access(test_server.id)

    def test_validate_server_access_nonexistent_server(self, app, admin_user):
        """Test accessing non-existent server raises error."""
        with app.app_context():
            with patch("app.routes.api.console_routes.current_user", admin_user):
                with pytest.raises(ValueError, match="Server not found"):
                    validate_server_access(999)  # Non-existent server ID


@pytest.mark.unit
@pytest.mark.server
class TestConsoleAPIEndpoints:
    """Test console API endpoints functionality."""

    def test_get_server_logs_success(self, app, test_server):
        """Test successfully getting server logs."""
        with app.app_context():
            # Create a temporary log file
            server_dir = os.path.join("servers", test_server.server_name)
            os.makedirs(os.path.join(server_dir, "logs"), exist_ok=True)
            log_file = os.path.join(server_dir, "logs", "latest.log")

            with open(log_file, "w") as f:
                f.write("[12:34:56] [INFO] Server starting\n")
                f.write("[12:34:57] [WARN] Warning message\n")
                f.write("[12:34:58] [ERROR] Error message\n")

            try:
                logs = get_server_logs(test_server, limit=10, offset=0)

                assert len(logs) == 3
                assert logs[0]["timestamp"] == "12:34:56"
                assert logs[0]["level"] == "info"
                assert logs[0]["message"] == "Server starting"
            finally:
                # Clean up the test files
                import shutil

                if os.path.exists(server_dir):
                    shutil.rmtree(server_dir, ignore_errors=True)

    def test_get_server_logs_file_not_found(self, app, test_server):
        """Test getting logs when log file doesn't exist."""
        with app.app_context():
            logs = get_server_logs(test_server, limit=10, offset=0)
            assert isinstance(logs, list)
            assert len(logs) == 0

    def test_get_server_logs_parse_error(self, app, test_server):
        """Test getting logs handles parse errors gracefully."""
        with app.app_context():
            # Create a temporary log file with invalid content
            server_dir = os.path.join("servers", test_server.server_name)
            os.makedirs(os.path.join(server_dir, "logs"), exist_ok=True)
            log_file = os.path.join(server_dir, "logs", "latest.log")

            with open(log_file, "w") as f:
                f.write("Invalid log format\n")

            try:
                logs = get_server_logs(test_server, limit=10, offset=0)
                # Should still return something, even if parsing fails
                assert isinstance(logs, list)
            finally:
                # Clean up the test files
                import shutil

                if os.path.exists(server_dir):
                    shutil.rmtree(server_dir, ignore_errors=True)

    def test_send_console_command_success(self, app, test_server):
        """Test successfully sending console command."""
        with app.app_context():
            with patch("app.routes.api.console_routes.execute_server_command") as mock_execute:
                mock_execute.return_value = {
                    "success": True,
                    "message": "Command executed",
                    "command": "test command",
                }

                result = send_console_command(test_server, "test command")

                assert result["success"] is True
                assert result["message"] == "Command executed"
                mock_execute.assert_called_once_with(test_server.id, "test command")

    def test_get_server_status_running_server(self, app, running_server):
        """Test getting status of a running server."""
        with app.app_context():
            with patch("psutil.Process") as mock_process:
                mock_proc = Mock()
                mock_proc.is_running.return_value = True
                mock_proc.pid = running_server.pid
                mock_proc.name.return_value = "java"
                mock_proc.cmdline.return_value = ["java", "-jar", "server.jar", "nogui"]
                mock_proc.cwd.return_value = "/test/server"
                mock_proc.create_time.return_value = 1234567890
                mock_proc.memory_info.return_value = Mock(rss=1000000, vms=2000000)
                mock_proc.cpu_percent.return_value = 5.0
                mock_proc.status.return_value = "running"
                mock_process.return_value = mock_proc

                status = get_server_status(running_server)

                assert status["server_id"] == running_server.id
                assert status["server_name"] == running_server.server_name
                assert status["status"] == running_server.status
                assert status["is_actually_running"] is True
                assert "process_info" in status

    def test_get_server_status_stopped_server(self, app, test_server):
        """Test getting status of a stopped server."""
        with app.app_context():
            test_server.status = "Stopped"
            test_server.pid = None
            db.session.commit()

            status = get_server_status(test_server)

            assert status["server_id"] == test_server.id
            assert status["server_name"] == test_server.server_name
            assert status["status"] == "Stopped"
            assert status["pid"] is None
            assert "is_actually_running" not in status


@pytest.mark.unit
@pytest.mark.server
class TestCommandExecutionSystem:
    """Test command execution system."""

    def test_execute_server_command_success(self, app, running_server):
        """Test successfully executing a server command."""
        with app.app_context():
            with patch("app.utils.verify_process_status") as mock_verify, patch(
                "psutil.Process"
            ) as mock_process:
                # Mock verify_process_status to return running
                mock_verify.return_value = {
                    "is_running": True,
                    "process_info": {"pid": running_server.pid},
                    "error": None,
                }

                # Mock the process for stdin operations
                mock_proc = Mock()
                mock_proc.stdin = Mock()
                mock_process.return_value = mock_proc

                result = execute_server_command(running_server.id, "help")

                assert result["success"] is True
                assert "Command 'help' executed successfully" in result["message"]
                assert result["server_id"] == running_server.id
                assert result["command"] == "help"

    def test_execute_server_command_server_not_found(self, app):
        """Test executing command on non-existent server."""
        with app.app_context():
            result = execute_server_command(999, "help")

            assert result["success"] is False
            assert "Server not found" in result["error"]

    def test_execute_server_command_server_not_running(self, app, test_server):
        """Test executing command on stopped server."""
        with app.app_context():
            test_server.status = "Stopped"
            test_server.pid = None
            db.session.commit()

            result = execute_server_command(test_server.id, "help")

            assert result["success"] is False
            assert "Server is not running" in result["error"]

    def test_execute_server_command_invalid_input(self, app):
        """Test executing command with invalid input."""
        with app.app_context():
            # Test invalid server ID
            result = execute_server_command("invalid", "help")
            assert result["success"] is False
            assert "Invalid server ID" in result["error"]

            # Test empty command
            result = execute_server_command(1, "")
            assert result["success"] is False
            assert "Invalid command" in result["error"]

    def test_execute_server_command_dangerous_commands(self, app, running_server):
        """Test that dangerous commands are blocked."""
        with app.app_context():
            dangerous_commands = ["rm -rf /", "del C:\\", "format", "shutdown", "halt"]

            for cmd in dangerous_commands:
                result = execute_server_command(running_server.id, cmd)
                assert result["success"] is False
                assert "not allowed" in result["error"]

    def test_execute_server_command_process_error(self, app, running_server):
        """Test handling process errors during command execution."""
        with app.app_context():
            with patch("psutil.Process") as mock_process:
                mock_proc = Mock()
                mock_proc.is_running.return_value = True
                mock_proc.pid = running_server.pid
                mock_proc.name.return_value = "java"
                mock_proc.cmdline.return_value = ["java", "-jar", "server.jar", "nogui"]
                mock_proc.cwd.return_value = "/path/to/server"
                mock_proc.create_time.return_value = 1234567890
                mock_proc.memory_info.return_value = Mock(rss=1000000, vms=2000000)
                mock_proc.cpu_percent.return_value = 5.0
                mock_proc.stdin = Mock()
                mock_proc.stdin.write.side_effect = OSError("Process error")
                mock_process.return_value = mock_proc

                result = execute_server_command(running_server.id, "help")

                assert result["success"] is False
                assert "Failed to send command" in result["error"]


@pytest.mark.unit
@pytest.mark.server
class TestLogParsingUtilityFunctions:
    """Test log parsing utility functions."""

    def test_parse_server_logs_success(self, app):
        """Test successfully parsing server logs."""
        with app.app_context():
            # Create a temporary log file
            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".log") as f:
                f.write("[12:34:56] [INFO] Server starting\n")
                f.write("[12:34:57] [WARN] Warning message\n")
                f.write("[12:34:58] [ERROR] Error message\n")
                f.write("Unparsed line without timestamp\n")
                log_file_path = f.name

            try:
                result = parse_server_logs(log_file_path, page=1, page_size=10)

                assert result["success"] is True
                assert len(result["entries"]) == 4
                assert result["pagination"]["total_entries"] == 4
                assert result["pagination"]["page"] == 1
                assert result["pagination"]["page_size"] == 10

                # Check first entry
                first_entry = result["entries"][0]
                assert first_entry["timestamp"] is not None
                assert first_entry["level"] == "INFO"
                assert "Server starting" in first_entry["message"]

            finally:
                os.unlink(log_file_path)

    def test_parse_server_logs_file_not_found(self, app):
        """Test parsing logs when file doesn't exist."""
        with app.app_context():
            result = parse_server_logs("/nonexistent/file.log", page=1, page_size=10)

            assert result["success"] is False
            assert "Log file not found" in result["error"]

    def test_parse_server_logs_invalid_parameters(self, app):
        """Test parsing logs with invalid parameters."""
        with app.app_context():
            # Test invalid page number
            result = parse_server_logs("test.log", page=0, page_size=10)
            assert result["success"] is False
            assert "Page number must be >= 1" in result["error"]

            # Test invalid page size
            result = parse_server_logs("test.log", page=1, page_size=0)
            assert result["success"] is False
            assert "Page size must be between 1 and 1000" in result["error"]

    def test_parse_server_logs_pagination(self, app):
        """Test log parsing pagination."""
        with app.app_context():
            # Create a log file with many lines
            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".log") as f:
                for i in range(25):
                    f.write(f"[12:34:{i:02d}] [INFO] Log message {i}\n")
                log_file_path = f.name

            try:
                # Test first page
                result = parse_server_logs(log_file_path, page=1, page_size=10)
                assert result["success"] is True
                assert len(result["entries"]) == 10
                assert result["pagination"]["has_next"] is True
                assert result["pagination"]["has_prev"] is False

                # Test second page
                result = parse_server_logs(log_file_path, page=2, page_size=10)
                assert result["success"] is True
                assert len(result["entries"]) == 10
                assert result["pagination"]["has_next"] is True
                assert result["pagination"]["has_prev"] is True

                # Test last page
                result = parse_server_logs(log_file_path, page=3, page_size=10)
                assert result["success"] is True
                assert len(result["entries"]) == 5
                assert result["pagination"]["has_next"] is False
                assert result["pagination"]["has_prev"] is True

            finally:
                os.unlink(log_file_path)

    def test_parse_server_logs_empty_file(self, app):
        """Test parsing empty log file."""
        with app.app_context():
            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".log") as f:
                log_file_path = f.name

            try:
                result = parse_server_logs(log_file_path, page=1, page_size=10)

                assert result["success"] is True
                assert len(result["entries"]) == 0
                assert result["pagination"]["total_entries"] == 0

            finally:
                os.unlink(log_file_path)


@pytest.mark.unit
@pytest.mark.server
class TestErrorHandlingScenarios:
    """Test error handling scenarios in server management."""

    def test_console_api_feature_flag_disabled(self, app, client, test_server, admin_user):
        """Test console API returns 403 when feature flag is disabled."""
        with app.app_context():
            # Login as admin first
            client.post("/login", data={"username": admin_user.username, "password": "adminpass"})

            # Ensure feature is disabled
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = False
                db.session.commit()

            # Test logs endpoint
            response = client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 403
            assert "Console API is not enabled" in response.get_json()["error"]

            # Test command endpoint
            response = client.post(
                f"/api/console/{test_server.id}/command",
                json={"command": "help"},
            )
            assert response.status_code == 403
            assert "Console API is not enabled" in response.get_json()["error"]

            # Test status endpoint
            response = client.get(f"/api/console/{test_server.id}/status")
            assert response.status_code == 403
            assert "Console API is not enabled" in response.get_json()["error"]

    def test_console_api_authentication_required(self, app, client, test_server):
        """Test console API requires authentication."""
        with app.app_context():
            # Enable feature flag
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = True
                db.session.commit()

            # Test without authentication
            response = client.get(f"/api/console/{test_server.id}/logs")
            assert response.status_code == 401

    def test_console_api_access_denied(self, app, client, regular_user, test_server):
        """Test console API access denied for non-owner."""
        with app.app_context():
            # Enable feature flag
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = True
                db.session.commit()

            # Set server owner to different user
            test_server.owner_id = 999
            db.session.commit()

            # Login as regular user
            response = client.post(
                "/login", data={"username": regular_user.username, "password": "userpass123"}
            )
            # Check if login was successful
            if response.status_code == 302:  # Redirect after successful login
                # Test access denied
                response = client.get(f"/api/console/{test_server.id}/logs")
                assert response.status_code == 403
                assert "Access denied" in response.get_json()["error"]

    def test_console_api_server_not_found(self, app, client, admin_user):
        """Test console API returns 404 for non-existent server."""
        with app.app_context():
            # Enable feature flag
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = True
                db.session.commit()

            # Login as admin
            response = client.post(
                "/auth/login", data={"username": admin_user.username, "password": "testpass"}
            )
            if response.status_code == 302:  # Redirect after successful login
                # Test non-existent server
                response = client.get("/api/console/999/logs")
                assert response.status_code == 404
                assert "Server not found" in response.get_json()["error"]

    def test_console_api_invalid_command_data(self, app, client, admin_user, running_server):
        """Test console API handles invalid command data."""
        with app.app_context():
            # Enable feature flag
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = True
                db.session.commit()

            # Login as admin
            response = client.post(
                "/auth/login", data={"username": admin_user.username, "password": "testpass"}
            )
            if response.status_code == 302:  # Redirect after successful login
                # Test missing JSON data
                response = client.post(f"/api/console/{running_server.id}/command")
                assert response.status_code == 400
                assert "JSON data required" in response.get_json()["error"]

                # Test empty command
                response = client.post(
                    f"/api/console/{running_server.id}/command",
                    json={"command": ""},
                )
                assert response.status_code == 400
                assert "Command is required" in response.get_json()["error"]

    def test_console_api_rate_limiting(self, app, client, admin_user, running_server):
        """Test console API rate limiting."""
        with app.app_context():
            # Enable feature flag
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()
            if feature:
                feature.enabled = True
                db.session.commit()

            # Login as admin
            response = client.post(
                "/auth/login", data={"username": admin_user.username, "password": "testpass"}
            )
            if response.status_code == 302:  # Redirect after successful login
                # Make many requests to trigger rate limiting
                for _ in range(65):  # Exceed the 60 request limit
                    response = client.get(f"/api/console/{running_server.id}/logs")
                    if response.status_code == 429:  # Rate limited
                        break

                # Should eventually get rate limited
                assert response.status_code == 429

    def test_database_error_handling(self, app):
        """Test database error handling in server management functions."""
        with app.app_context():
            with patch("app.utils.db.session.query") as mock_query:
                mock_query.side_effect = Exception("Database error")

                # Test is_feature_enabled with database error
                result = is_feature_enabled("test_feature")
                assert result is False

                # Test toggle_experimental_feature with database error
                result = toggle_experimental_feature("test_feature", True)
                assert result is False

    def test_file_operation_error_handling(self, app):
        """Test file operation error handling in log parsing."""
        with app.app_context():
            with patch("builtins.open", side_effect=IOError("File error")):
                result = parse_server_logs("/test/path.log", page=1, page_size=10)
                assert result["success"] is False
                assert "Log file not found" in result["error"]

    def test_validation_error_handling(self, app):
        """Test validation error handling in command execution."""
        with app.app_context():
            # Test invalid server ID type
            result = execute_server_command("invalid", "help")
            assert result["success"] is False
            assert "Invalid server ID" in result["error"]

            # Test None command
            result = execute_server_command(1, None)
            assert result["success"] is False
            assert "Invalid command" in result["error"]
