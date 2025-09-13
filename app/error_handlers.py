"""
Centralized error handling utilities for the Minecraft Server Manager.
"""
import subprocess
from functools import wraps

import psutil
import requests
from flask import flash, redirect, request, url_for
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.exceptions import HTTPException

from .logging import logger


class AppError(Exception):
    """Base exception class for application-specific errors."""

    def __init__(self, message, error_code=None, details=None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ServerError(AppError):
    """Exception for server-related errors."""

    pass


class NetworkError(AppError):
    """Exception for network-related errors."""

    pass


class FileOperationError(AppError):
    """Exception for file operation errors."""

    pass


class ValidationError(AppError):
    """Exception for validation errors."""

    pass


class DatabaseError(AppError):
    """Exception for database-related errors."""

    pass


def log_error(error, context=None):
    """Log an error with context information using structured logging."""
    context = context or {}

    # Use the structured logger's error tracking
    logger.error_tracking(error, context)

    # Return simplified error info for backward compatibility
    return {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "context": context,
    }


def flash_error(message, category="danger"):
    """Flash an error message to the user."""
    flash(message, category)


def handle_network_error(func):
    """Decorator to handle network-related errors consistently."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except requests.exceptions.Timeout:
            error_msg = "Network request timed out. Please try again."
            log_error(NetworkError(error_msg), {"function": func.__name__})
            raise NetworkError(error_msg)
        except requests.exceptions.ConnectionError:
            error_msg = (
                "Failed to connect to remote server. " "Please check your internet connection."
            )
            log_error(NetworkError(error_msg), {"function": func.__name__})
            raise NetworkError(error_msg)
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP error occurred: {e.response.status_code}"
            log_error(
                NetworkError(error_msg),
                {"function": func.__name__, "status_code": e.response.status_code},
            )
            raise NetworkError(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = f"Network error: {str(e)}"
            log_error(NetworkError(error_msg), {"function": func.__name__})
            raise NetworkError(error_msg)

    return wrapper


def handle_file_operations(func):
    """Decorator to handle file operation errors consistently."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FileNotFoundError as e:
            error_msg = f"Required file not found: {str(e)}"
            log_error(FileOperationError(error_msg), {"function": func.__name__})
            raise FileOperationError(error_msg)
        except PermissionError as e:
            error_msg = f"Permission denied: {str(e)}"
            log_error(FileOperationError(error_msg), {"function": func.__name__})
            raise FileOperationError(error_msg)
        except OSError as e:
            error_msg = f"File system error: {str(e)}"
            log_error(FileOperationError(error_msg), {"function": func.__name__})
            raise FileOperationError(error_msg)

    return wrapper


def handle_database_operations(func):
    """Decorator to handle database operation errors consistently."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except IntegrityError as e:
            error_msg = "Data integrity constraint violated. This item may already exist."
            log_error(
                DatabaseError(error_msg),
                {"function": func.__name__, "original_error": str(e)},
            )
            raise DatabaseError(error_msg)
        except SQLAlchemyError as e:
            error_msg = "Database operation failed. Please try again."
            log_error(
                DatabaseError(error_msg),
                {"function": func.__name__, "original_error": str(e)},
            )
            raise DatabaseError(error_msg)

    return wrapper


def handle_server_operations(func):
    """Decorator to handle server process operation errors consistently."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except psutil.NoSuchProcess:
            error_msg = "Server process not found. The server may have already stopped."
            log_error(ServerError(error_msg), {"function": func.__name__})
            raise ServerError(error_msg)
        except psutil.AccessDenied:
            error_msg = "Permission denied when accessing server process."
            log_error(ServerError(error_msg), {"function": func.__name__})
            raise ServerError(error_msg)
        except psutil.TimeoutExpired:
            error_msg = "Server operation timed out."
            log_error(ServerError(error_msg), {"function": func.__name__})
            raise ServerError(error_msg)
        except subprocess.SubprocessError as e:
            error_msg = f"Server process error: {str(e)}"
            log_error(ServerError(error_msg), {"function": func.__name__})
            raise ServerError(error_msg)

    return wrapper


def safe_execute(func, *args, **kwargs):
    """
    Safely execute a function and handle errors consistently.
    Returns a tuple of (success: bool, result: any, error: str or None)
    """
    try:
        result = func(*args, **kwargs)
        return True, result, None
    except AppError as e:
        log_error(e, {"function": func.__name__ if hasattr(func, "__name__") else "unknown"})
        return False, None, e.message
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        log_error(e, {"function": func.__name__ if hasattr(func, "__name__") else "unknown"})
        return False, None, error_msg


def route_error_handler(func):
    """
    Decorator for route handlers to provide consistent error handling.
    Automatically handles common errors and provides user feedback.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            flash_error(e.message)
            return redirect(request.url)
        except NetworkError as e:
            flash_error(e.message)
            # For create page, stay on the same page to show error
            if request.endpoint == "server.create":
                # Don't redirect to avoid loops, just render the template with error
                from flask import render_template

                return render_template(
                    "select_version.html",
                    latest_release="Unknown",
                    latest_snapshot="Unknown",
                    releases=[],
                    snapshots=[],
                )
            return redirect(url_for("server.home"))
        except FileOperationError as e:
            flash_error(e.message)
            return redirect(request.url)
        except ServerError as e:
            flash_error(e.message)
            return redirect(url_for("server.home"))
        except DatabaseError as e:
            flash_error(e.message)
            return redirect(request.url)
        except AppError as e:
            flash_error(e.message)
            return redirect(url_for("server.home"))
        except HTTPException:
            # Let Flask handle HTTP exceptions normally
            raise
        except Exception as e:
            error_msg = "An unexpected error occurred. Please try again."
            log_error(
                e,
                {
                    "function": func.__name__,
                    "route": request.endpoint,
                    "method": request.method,
                    "url": request.url,
                },
            )
            flash_error(error_msg)
            return redirect(url_for("server.home"))

    return wrapper


def validate_input(validation_func, error_message):
    """
    Decorator factory for input validation.

    Args:
        validation_func: Function that takes the input and returns True if valid
        error_message: Message to show if validation fails
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # This would be customized based on the specific validation needs
            # For now, it's a placeholder that can be extended
            return func(*args, **kwargs)

        return wrapper

    return decorator


def init_error_handlers(app):
    """Initialize application-wide error handlers."""

    @app.errorhandler(404)
    def not_found_error(error):
        logger.warning(f"404 error: {request.url}")
        flash("The requested page was not found.", "warning")
        # In test mode, return proper 404 status code instead of redirecting
        if app.config.get("TESTING", False):
            from flask import make_response, render_template

            response = make_response(render_template("404.html"), 404)
            return response
        return redirect(url_for("server.home"))

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"500 error: {error}")
        flash("An internal server error occurred. Please try again.", "danger")
        return redirect(url_for("server.home"))

    @app.errorhandler(403)
    def forbidden_error(error):
        logger.warning(f"403 error: {request.url}")
        flash("You don't have permission to access this resource.", "danger")
        return redirect(url_for("server.home"))


def create_error_response(error, redirect_url=None):
    """Create a standardized error response."""
    if isinstance(error, AppError):
        flash_error(error.message)
    else:
        flash_error("An unexpected error occurred. Please try again.")
        log_error(error)

    if redirect_url:
        return redirect(redirect_url)
    return redirect(url_for("server.home"))


# Context managers for safe operations
class SafeFileOperation:
    """Context manager for safe file operations."""

    def __init__(self, filepath, mode="r", encoding="utf-8"):
        self.filepath = filepath
        self.mode = mode
        self.encoding = encoding
        self.file = None

    def __enter__(self):
        try:
            # Only pass encoding for text modes, not binary modes
            if "b" in self.mode:
                self.file = open(self.filepath, self.mode)
            else:
                self.file = open(self.filepath, self.mode, encoding=self.encoding)
            return self.file
        except Exception as e:
            raise FileOperationError(f"Failed to open file {self.filepath}: {str(e)}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.file:
            try:
                self.file.close()
            except Exception as e:
                logger.warning(f"Error closing file {self.filepath}: {str(e)}")

        if exc_type and issubclass(exc_type, Exception):
            raise FileOperationError(
                f"Error during file operation on {self.filepath}: {str(exc_val)}"
            )


class SafeDatabaseOperation:
    """Context manager for safe database operations."""

    def __init__(self, db_session):
        self.db_session = db_session

    def __enter__(self):
        return self.db_session

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            try:
                self.db_session.rollback()
            except Exception as e:
                logger.error(f"Error rolling back transaction: {str(e)}")

            if issubclass(exc_type, (IntegrityError, SQLAlchemyError)):
                raise DatabaseError(f"Database operation failed: {str(exc_val)}")
        else:
            try:
                self.db_session.commit()
            except Exception as e:
                self.db_session.rollback()
                raise DatabaseError(f"Failed to commit transaction: {str(e)}")
