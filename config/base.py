"""
Base configuration class for the Minecraft Server Manager application.

This module defines the base configuration class that contains all common
configuration settings and validation logic.
"""

import os
import secrets
from typing import Any, Dict


class BaseConfig:
    """Base configuration class with common settings and validation."""

    # Security Configuration
    SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL") or "sqlite:///minecraft_manager.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CSRF Protection
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour

    # Session Security
    SESSION_COOKIE_SECURE = (
        os.environ.get("SESSION_COOKIE_SECURE", "False").lower() == "true"
    )
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    SESSION_REFRESH_EACH_REQUEST = True

    # Rate Limiting
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URL = "memory://"
    RATELIMIT_DEFAULT = "200 per day;50 per hour;10 per minute"
    RATELIMIT_LOGIN = "5 per minute"

    # Security Headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": (
            "default-src 'self'; script-src 'self' 'unsafe-inline' "
            "https://code.jquery.com https://cdnjs.cloudflare.com "
            "https://maxcdn.bootstrapcdn.com; style-src 'self' 'unsafe-inline' "
            "https://maxcdn.bootstrapcdn.com; img-src 'self' data:; "
            "font-src 'self' https://maxcdn.bootstrapcdn.com;"
        ),
    }

    # Password Policy
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_DIGITS = True
    PASSWORD_REQUIRE_SPECIAL = False  # Optional for hobbyist use

    # Account Security
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = 900  # 15 minutes
    PASSWORD_EXPIRY_DAYS = 365  # 1 year

    # File Upload Security
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {"jar", "zip", "tar.gz"}

    # Application Configuration
    APP_TITLE = os.environ.get("APP_TITLE", "Minecraft Server Manager")
    SERVER_HOSTNAME = os.environ.get("SERVER_HOSTNAME", "localhost")

    # Memory Management Configuration
    MAX_TOTAL_MEMORY_MB = int(
        os.environ.get("MAX_TOTAL_MEMORY_MB", "8192")
    )  # Default 8GB total
    DEFAULT_SERVER_MEMORY_MB = int(
        os.environ.get("DEFAULT_SERVER_MEMORY_MB", "1024")
    )  # Default 1GB per server
    MIN_SERVER_MEMORY_MB = int(
        os.environ.get("MIN_SERVER_MEMORY_MB", "512")
    )  # Minimum 512MB per server
    MAX_SERVER_MEMORY_MB = int(
        os.environ.get("MAX_SERVER_MEMORY_MB", "4096")
    )  # Maximum 4GB per server

    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """
        Validate the current configuration and return any issues found.

        Returns:
            Dict[str, Any]: Dictionary containing validation results with
                           'valid' boolean and 'issues' list of problems found
        """
        issues = []

        # Validate memory configuration
        if cls.MIN_SERVER_MEMORY_MB >= cls.MAX_SERVER_MEMORY_MB:
            issues.append("MIN_SERVER_MEMORY_MB must be less than MAX_SERVER_MEMORY_MB")

        if cls.DEFAULT_SERVER_MEMORY_MB < cls.MIN_SERVER_MEMORY_MB:
            issues.append("DEFAULT_SERVER_MEMORY_MB must be >= MIN_SERVER_MEMORY_MB")

        if cls.DEFAULT_SERVER_MEMORY_MB > cls.MAX_SERVER_MEMORY_MB:
            issues.append("DEFAULT_SERVER_MEMORY_MB must be <= MAX_SERVER_MEMORY_MB")

        # Validate password policy
        if cls.PASSWORD_MIN_LENGTH < 1:
            issues.append("PASSWORD_MIN_LENGTH must be at least 1")

        # Validate security settings
        if cls.MAX_LOGIN_ATTEMPTS < 1:
            issues.append("MAX_LOGIN_ATTEMPTS must be at least 1")

        if cls.LOCKOUT_DURATION < 0:
            issues.append("LOCKOUT_DURATION must be non-negative")

        # Validate file upload settings
        if cls.MAX_CONTENT_LENGTH < 1024:  # At least 1KB
            issues.append("MAX_CONTENT_LENGTH must be at least 1KB")

        return {"valid": len(issues) == 0, "issues": issues}

    @classmethod
    def get_config_summary(cls) -> Dict[str, Any]:
        """
        Get a summary of the current configuration for debugging/logging.

        Returns:
            Dict[str, Any]: Dictionary containing configuration summary
        """
        return {
            "environment": os.environ.get("FLASK_ENV", "development"),
            "debug": getattr(cls, "DEBUG", False),
            "database_uri": cls.SQLALCHEMY_DATABASE_URI,
            "app_title": cls.APP_TITLE,
            "server_hostname": cls.SERVER_HOSTNAME,
            "memory_config": {
                "max_total_mb": cls.MAX_TOTAL_MEMORY_MB,
                "default_server_mb": cls.DEFAULT_SERVER_MEMORY_MB,
                "min_server_mb": cls.MIN_SERVER_MEMORY_MB,
                "max_server_mb": cls.MAX_SERVER_MEMORY_MB,
            },
            "security": {
                "csrf_enabled": cls.WTF_CSRF_ENABLED,
                "session_secure": cls.SESSION_COOKIE_SECURE,
                "rate_limit_enabled": cls.RATELIMIT_ENABLED,
            },
        }
