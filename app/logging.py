"""
Structured logging and error monitoring for mcServerManager.

This module provides comprehensive logging capabilities including:
- Structured JSON logging
- Error tracking and reporting
- Performance monitoring
- Security event logging
- Log rotation and retention policies
"""

import json
import logging
import logging.handlers
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Dict, Union

from flask import current_app, g, request
from flask_login import current_user


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "thread": record.thread,
            "process": record.process,
        }

        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)

        # Add request context if available
        if hasattr(g, "request_id"):
            log_entry["request_id"] = g.request_id

        # Add user context if available
        if hasattr(g, "user_id"):
            log_entry["user_id"] = g.user_id

        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info),
            }

        return json.dumps(log_entry, default=str)


class StructuredLogger:
    """Structured logger with enhanced capabilities."""

    def __init__(self, name: str = None):
        self.logger = logging.getLogger(name or __name__)
        self._setup_logger()

    def _setup_logger(self):
        """Set up the logger with appropriate handlers and formatters."""
        # Clear existing handlers
        self.logger.handlers.clear()

        # Set log level
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.logger.setLevel(getattr(logging, log_level, logging.INFO))

        # Console handler with JSON formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(console_handler)

        # File handler with JSON formatting and rotation
        log_dir = os.getenv("LOG_DIR", "logs")
        os.makedirs(log_dir, exist_ok=True)

        file_handler = logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, "app.log"),
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
        )
        file_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(file_handler)

        # Error file handler for ERROR and CRITICAL logs
        error_handler = logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, "error.log"),
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(error_handler)

        # Security log handler for security events
        security_handler = logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, "security.log"),
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10,
        )
        security_handler.setLevel(logging.INFO)
        security_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(security_handler)

    def _log_with_context(self, level: int, message: str, extra_fields: Dict[str, Any] = None):
        """Log with additional context information."""
        extra_fields = extra_fields or {}

        # Add request context if available
        try:
            if request:
                extra_fields.update(
                    {
                        "request_method": request.method,
                        "request_url": request.url,
                        "request_remote_addr": request.remote_addr,
                        "request_user_agent": request.headers.get("User-Agent", ""),
                    }
                )
        except RuntimeError:
            # Outside request context
            pass

        # Add user context if available
        try:
            if current_user and current_user.is_authenticated:
                extra_fields["user_id"] = current_user.id
                extra_fields["username"] = current_user.username
        except RuntimeError:
            # Outside user context
            pass

        # Add application context if available
        try:
            if current_app:
                extra_fields["app_name"] = current_app.name
                extra_fields["app_debug"] = current_app.debug
        except RuntimeError:
            # Outside app context
            pass

        self.logger.log(level, message, extra={"extra_fields": extra_fields})

    def debug(self, message: str, extra_fields: Dict[str, Any] = None):
        """Log debug message with context."""
        self._log_with_context(logging.DEBUG, message, extra_fields)

    def info(self, message: str, extra_fields: Dict[str, Any] = None):
        """Log info message with context."""
        self._log_with_context(logging.INFO, message, extra_fields)

    def warning(self, message: str, extra_fields: Dict[str, Any] = None):
        """Log warning message with context."""
        self._log_with_context(logging.WARNING, message, extra_fields)

    def error(self, message: str, extra_fields: Dict[str, Any] = None):
        """Log error message with context."""
        self._log_with_context(logging.ERROR, message, extra_fields)

    def critical(self, message: str, extra_fields: Dict[str, Any] = None):
        """Log critical message with context."""
        self._log_with_context(logging.CRITICAL, message, extra_fields)

    def security_event(self, action: str, details: Dict[str, Any] = None):
        """Log security-related event."""
        security_fields = {
            "event_type": "security",
            "action": action,
            "details": details or {},
        }
        self._log_with_context(logging.INFO, f"Security event: {action}", security_fields)

    def performance_metric(self, metric_name: str, value: Union[int, float], unit: str = None):
        """Log performance metric."""
        perf_fields = {
            "event_type": "performance",
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
        }
        self._log_with_context(logging.INFO, f"Performance metric: {metric_name}", perf_fields)

    def error_tracking(self, error: Exception, context: Dict[str, Any] = None):
        """Track error with full context and stack trace."""
        error_fields = {
            "event_type": "error_tracking",
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context or {},
            "traceback": traceback.format_exc(),
        }
        self._log_with_context(
            logging.ERROR, f"Error tracked: {type(error).__name__}", error_fields
        )


# Global logger instance
logger = StructuredLogger("mcServerManager")


def log_performance(func):
    """Decorator to log function performance metrics."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        function_name = f"{func.__module__}.{func.__name__}"

        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.performance_metric(f"{function_name}_execution_time", execution_time, "seconds")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.performance_metric(f"{function_name}_execution_time", execution_time, "seconds")
            logger.error_tracking(e, {"function": function_name, "execution_time": execution_time})
            raise

    return wrapper


def log_database_operation(operation: str, table: str = None, record_id: int = None):
    """Log database operations for audit purposes."""
    db_fields = {
        "event_type": "database_operation",
        "operation": operation,
        "table": table,
        "record_id": record_id,
    }
    logger.info(f"Database operation: {operation}", db_fields)


def log_user_action(action: str, details: Dict[str, Any] = None):
    """Log user actions for audit purposes."""
    user_fields = {
        "event_type": "user_action",
        "action": action,
        "details": details or {},
    }
    logger.info(f"User action: {action}", user_fields)


def log_system_event(event: str, details: Dict[str, Any] = None):
    """Log system events."""
    system_fields = {
        "event_type": "system_event",
        "event": event,
        "details": details or {},
    }
    logger.info(f"System event: {event}", system_fields)


def setup_logging(app):
    """Set up logging for the Flask application."""
    # Configure Flask's logger
    app.logger.handlers.clear()
    app.logger.addHandler(logging.StreamHandler(sys.stdout))

    # Set up request context logging
    @app.before_request
    def log_request_start():
        g.request_id = f"req_{int(time.time() * 1000)}"
        g.start_time = time.time()

        logger.info(
            "Request started",
            {
                "event_type": "request_start",
                "request_id": g.request_id,
                "method": request.method,
                "url": request.url,
                "remote_addr": request.remote_addr,
            },
        )

    @app.after_request
    def log_request_end(response):
        if hasattr(g, "request_id") and hasattr(g, "start_time"):
            duration = time.time() - g.start_time

            logger.info(
                "Request completed",
                {
                    "event_type": "request_end",
                    "request_id": g.request_id,
                    "method": request.method,
                    "url": request.url,
                    "status_code": response.status_code,
                    "duration_seconds": duration,
                },
            )

        return response

    # Set up error logging
    @app.errorhandler(Exception)
    def log_exception(error):
        logger.error_tracking(
            error,
            {
                "request_method": request.method,
                "request_url": request.url,
                "request_remote_addr": request.remote_addr,
            },
        )
        return error


# Initialize the logger
setup_logging(current_app) if current_app else None
