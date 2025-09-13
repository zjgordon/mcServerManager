"""
Tests for the new centralized error handling system.
"""
import os
import tempfile
from unittest.mock import MagicMock, patch

import psutil
import pytest
import requests
from sqlalchemy.exc import IntegrityError

from app.error_handlers import (
    AppError,
    DatabaseError,
    FileOperationError,
    NetworkError,
    SafeDatabaseOperation,
    SafeFileOperation,
    ServerError,
    ValidationError,
    handle_database_operations,
    handle_file_operations,
    handle_network_error,
    handle_server_operations,
    log_error,
    route_error_handler,
    safe_execute,
)
from app.extensions import db
from app.models import Server, User


@pytest.mark.unit
@pytest.mark.utils
class TestCustomExceptions:
    """Test custom exception classes."""

    def test_app_error_creation(self):
        """Test AppError base exception."""
        error = AppError("Test message", error_code="TEST001", details={"key": "value"})
        assert error.message == "Test message"
        assert error.error_code == "TEST001"
        assert error.details == {"key": "value"}
        assert str(error) == "Test message"

    def test_server_error_inheritance(self):
        """Test ServerError inherits from AppError."""
        error = ServerError("Server failed")
        assert isinstance(error, AppError)
        assert error.message == "Server failed"

    def test_network_error_inheritance(self):
        """Test NetworkError inherits from AppError."""
        error = NetworkError("Network failed")
        assert isinstance(error, AppError)
        assert error.message == "Network failed"

    def test_validation_error_inheritance(self):
        """Test ValidationError inherits from AppError."""
        error = ValidationError("Validation failed")
        assert isinstance(error, AppError)
        assert error.message == "Validation failed"


@pytest.mark.unit
@pytest.mark.utils
class TestNetworkErrorDecorator:
    """Test network error handling decorator."""

    def test_successful_network_call(self):
        """Test decorator with successful network call."""

        @handle_network_error
        def successful_request():
            response = MagicMock()
            response.json.return_value = {"status": "success"}
            return response.json()

        result = successful_request()
        assert result == {"status": "success"}

    def test_timeout_error_handling(self, app):
        """Test decorator handles timeout errors."""
        with app.app_context():

            @handle_network_error
            def timeout_request():
                raise requests.exceptions.Timeout("Request timed out")

            with pytest.raises(NetworkError) as exc_info:
                timeout_request()
            assert "timed out" in str(exc_info.value)

    def test_connection_error_handling(self, app):
        """Test decorator handles connection errors."""
        with app.app_context():

            @handle_network_error
            def connection_request():
                raise requests.exceptions.ConnectionError("Connection failed")

            with pytest.raises(NetworkError) as exc_info:
                connection_request()
            assert "connect to remote server" in str(exc_info.value)

    def test_http_error_handling(self, app):
        """Test decorator handles HTTP errors."""
        with app.app_context():

            @handle_network_error
            def http_error_request():
                response = MagicMock()
                response.status_code = 404
                error = requests.exceptions.HTTPError(response=response)
                raise error

            with pytest.raises(NetworkError) as exc_info:
                http_error_request()
            assert "HTTP error" in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.utils
class TestFileOperationsDecorator:
    """Test file operations error handling decorator."""

    def test_successful_file_operation(self):
        """Test decorator with successful file operation."""

        @handle_file_operations
        def read_file():
            return "file content"

        result = read_file()
        assert result == "file content"

    def test_file_not_found_handling(self, app):
        """Test decorator handles FileNotFoundError."""
        with app.app_context():

            @handle_file_operations
            def read_missing_file():
                raise FileNotFoundError("File not found")

            with pytest.raises(FileOperationError) as exc_info:
                read_missing_file()
            assert "Required file not found" in str(exc_info.value)

    def test_permission_error_handling(self, app):
        """Test decorator handles PermissionError."""
        with app.app_context():

            @handle_file_operations
            def permission_denied_file():
                raise PermissionError("Permission denied")

            with pytest.raises(FileOperationError) as exc_info:
                permission_denied_file()
            assert "Permission denied" in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.server
class TestServerOperationsDecorator:
    """Test server operations error handling decorator."""

    def test_successful_server_operation(self):
        """Test decorator with successful server operation."""

        @handle_server_operations
        def start_server():
            return "Server started"

        result = start_server()
        assert result == "Server started"

    def test_no_such_process_handling(self, app):
        """Test decorator handles NoSuchProcess."""
        with app.app_context():

            @handle_server_operations
            def stop_missing_process():
                raise psutil.NoSuchProcess(12345)

            with pytest.raises(ServerError) as exc_info:
                stop_missing_process()
            assert "process not found" in str(exc_info.value)

    def test_access_denied_handling(self, app):
        """Test decorator handles AccessDenied."""
        with app.app_context():

            @handle_server_operations
            def access_denied_process():
                raise psutil.AccessDenied(12345)

            with pytest.raises(ServerError) as exc_info:
                access_denied_process()
            assert "Permission denied" in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.utils
class TestDatabaseOperationsDecorator:
    """Test database operations error handling decorator."""

    def test_successful_database_operation(self):
        """Test decorator with successful database operation."""

        @handle_database_operations
        def add_record():
            return "Record added"

        result = add_record()
        assert result == "Record added"

    def test_integrity_error_handling(self, app):
        """Test decorator handles IntegrityError."""
        with app.app_context():

            @handle_database_operations
            def duplicate_record():
                raise IntegrityError("statement", "params", "orig")

            with pytest.raises(DatabaseError) as exc_info:
                duplicate_record()
            assert "integrity constraint violated" in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.utils
class TestSafeExecute:
    """Test safe_execute utility function."""

    def test_successful_execution(self):
        """Test safe_execute with successful function."""

        def successful_func(x, y):
            return x + y

        success, result, error = safe_execute(successful_func, 2, 3)
        assert success is True
        assert result == 5
        assert error is None

    def test_app_error_handling(self, app):
        """Test safe_execute with AppError."""
        with app.app_context():

            def failing_func():
                raise ValidationError("Validation failed")

            success, result, error = safe_execute(failing_func)
            assert success is False
            assert result is None
            assert error == "Validation failed"

    def test_unexpected_error_handling(self, app):
        """Test safe_execute with unexpected error."""
        with app.app_context():

            def unexpected_error_func():
                raise ValueError("Unexpected error")

            success, result, error = safe_execute(unexpected_error_func)
            assert success is False
            assert result is None
            assert "Unexpected error" in error


@pytest.mark.unit
@pytest.mark.utils
class TestSafeFileOperation:
    """Test SafeFileOperation context manager."""

    def test_successful_file_read(self):
        """Test successful file reading."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("test content")
            temp_file = f.name

        try:
            with SafeFileOperation(temp_file, "r") as file:
                content = file.read()
            assert content == "test content"
        finally:
            os.unlink(temp_file)

    def test_file_not_found_error(self):
        """Test FileOperationError when file not found."""
        with pytest.raises(FileOperationError) as exc_info:
            with SafeFileOperation("/nonexistent/file.txt", "r"):
                pass
        assert "Failed to open file" in str(exc_info.value)

    def test_successful_file_write(self):
        """Test successful file writing."""
        with tempfile.NamedTemporaryFile(delete=False) as f:
            temp_file = f.name

        try:
            with SafeFileOperation(temp_file, "w") as file:
                file.write("new content")

            # Verify content was written
            with open(temp_file, "r") as file:
                content = file.read()
            assert content == "new content"
        finally:
            os.unlink(temp_file)


@pytest.mark.unit
@pytest.mark.utils
class TestSafeDatabaseOperation:
    """Test SafeDatabaseOperation context manager."""

    def test_successful_database_operation(self, app):
        """Test successful database operation with commit."""
        with app.app_context():
            user = User(username="testuser", password_hash="hash", is_admin=False)

            with SafeDatabaseOperation(db.session) as session:
                session.add(user)
                # Should commit automatically

            # Verify user was added
            added_user = User.query.filter_by(username="testuser").first()
            assert added_user is not None

    def test_database_error_rollback(self, app):
        """Test that database errors trigger rollback."""
        with app.app_context():
            # Create a user first
            user1 = User(username="unique_user", password_hash="hash", is_admin=False)
            db.session.add(user1)
            db.session.commit()

            # Try to create another user with the same username
            user2 = User(username="unique_user", password_hash="hash2", is_admin=False)

            with pytest.raises(DatabaseError):
                with SafeDatabaseOperation(db.session) as session:
                    session.add(user2)
                    session.flush()  # Force the integrity error

            # Verify rollback occurred - only one user should exist
            users = User.query.filter_by(username="unique_user").all()
            assert len(users) == 1


@pytest.mark.unit
@pytest.mark.utils
class TestRouteErrorHandler:
    """Test route error handler decorator."""

    def test_successful_route(self):
        """Test decorator with successful route."""

        @route_error_handler
        def successful_route():
            return "success"

        result = successful_route()
        assert result == "success"

    def test_validation_error_handling(self, client):
        """Test route decorator handles ValidationError."""
        from flask import Flask

        app = Flask(__name__)
        app.config["SECRET_KEY"] = "test-secret-key"  # Set secret key for session

        @app.route("/test")
        @route_error_handler
        def test_route():
            raise ValidationError("Invalid input")

        with app.test_client():
            with app.test_request_context("/test"):
                # The decorator should catch the ValidationError and redirect
                # Since we can't easily test redirects in this context, we'll test that
                # the ValidationError is properly caught and handled (not re-raised)
                try:
                    result = test_route()
                    # If we get here, the decorator caught the error and returned a
                    # redirect
                    assert result is not None
                except ValidationError:
                    # This should not happen - the decorator should catch it
                    pytest.fail("ValidationError should have been caught by decorator")


@pytest.mark.unit
@pytest.mark.utils
class TestLogError:
    """Test error logging functionality."""

    def test_log_error_with_context(self, app):
        """Test logging error with context."""
        with app.app_context():
            error = ValidationError("Test error")
            context = {"function": "test_function", "user": "testuser"}

            error_info = log_error(error, context)

            assert error_info["error_type"] == "ValidationError"
            assert error_info["error_message"] == "Test error"
            assert error_info["context"] == context

    def test_log_error_without_context(self, app):
        """Test logging error without context."""
        with app.app_context():
            error = ServerError("Server failed")

            error_info = log_error(error)

            assert error_info["error_type"] == "ServerError"
            assert error_info["error_message"] == "Server failed"
            assert error_info["context"] == {}


@pytest.mark.unit
@pytest.mark.integration
class TestIntegrationErrorHandling:
    """Test error handling integration with actual routes."""

    def test_create_server_with_invalid_name(self, authenticated_client):
        """Test server creation with invalid name triggers ValidationError."""
        response = authenticated_client.post(
            "/configure_server",
            data={
                "server_name": "invalid/name",  # Invalid characters
                "level_seed": "test",
                "gamemode": "survival",
                "difficulty": "normal",
                "motd": "Test",
            },
            query_string={"version_type": "release", "version": "1.20.1"},
        )

        # Should handle the ValidationError and show error message
        assert response.status_code in [200, 302]  # Either show form again or redirect

    def test_network_error_in_version_fetch(self, authenticated_client):
        """Test network error handling in version fetching."""
        with patch("app.utils.fetch_version_manifest") as mock_fetch:
            mock_fetch.side_effect = requests.exceptions.ConnectionError("Network down")

            response = authenticated_client.get("/create")

            # Should handle the NetworkError gracefully
            assert response.status_code in [200, 302]

    @patch("psutil.Process")
    def test_server_stop_with_no_process(self, mock_psutil, authenticated_client, app, test_server):
        """Test stopping server when process doesn't exist."""
        # Set server as running in database
        with app.app_context():
            server = Server.query.get(test_server.id)
            server.status = "Running"
            server.pid = 99999  # Non-existent PID
            db.session.commit()

        # Mock psutil to raise NoSuchProcess
        mock_psutil.side_effect = psutil.NoSuchProcess(99999)

        response = authenticated_client.post(f"/stop/{test_server.id}", follow_redirects=True)

        # Should handle the error gracefully and update status
        assert response.status_code == 200

        # Verify server status was updated
        with app.app_context():
            server = Server.query.get(test_server.id)
            assert server.status == "Stopped"
            assert server.pid is None
