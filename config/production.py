"""
Production configuration for the Minecraft Server Manager application.

This module contains production-specific settings with enhanced security
and performance optimizations for production deployment.
"""

import os

from .base import BaseConfig


class ProductionConfig(BaseConfig):
    """Production configuration with enhanced security and performance settings."""

    # Production flags
    DEBUG = False
    TESTING = False

    # Production database (must be set via environment variable)
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("DATABASE_URL", "")

    # Enhanced security for production
    SESSION_COOKIE_SECURE = True  # HTTPS only
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"  # Stricter than base config

    # Production rate limiting (more restrictive)
    RATELIMIT_DEFAULT = "100 per day;20 per hour;5 per minute"
    RATELIMIT_LOGIN = "3 per minute"

    # Production memory settings (configurable via environment)
    MAX_TOTAL_MEMORY_MB = int(
        os.environ.get("MAX_TOTAL_MEMORY_MB", "16384")
    )  # 16GB default
    DEFAULT_SERVER_MEMORY_MB = int(
        os.environ.get("DEFAULT_SERVER_MEMORY_MB", "2048")
    )  # 2GB default
    MIN_SERVER_MEMORY_MB = int(
        os.environ.get("MIN_SERVER_MEMORY_MB", "1024")
    )  # 1GB minimum
    MAX_SERVER_MEMORY_MB = int(
        os.environ.get("MAX_SERVER_MEMORY_MB", "8192")
    )  # 8GB maximum

    # Production logging
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    # Production-specific settings
    PRODUCTION_MODE = True

    # Enhanced security headers for production
    SECURITY_HEADERS = {
        **BaseConfig.SECURITY_HEADERS,
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    }

    # Production file upload settings
    MAX_CONTENT_LENGTH = int(
        os.environ.get("MAX_CONTENT_LENGTH", str(32 * 1024 * 1024))
    )  # 32MB default

    # Production-specific security settings
    PASSWORD_REQUIRE_SPECIAL = True  # Require special characters in production
    PASSWORD_MIN_LENGTH = 12  # Longer passwords in production

    # Production session settings
    PERMANENT_SESSION_LIFETIME = 1800  # 30 minutes (shorter than dev)
    SESSION_REFRESH_EACH_REQUEST = True

    # Production error handling
    PROPAGATE_EXCEPTIONS = False  # Don't expose internal errors

    # Production-specific validation
    @classmethod
    def validate_production_config(cls) -> dict:
        """
        Validate production-specific configuration requirements.

        Returns:
            dict: Validation results with 'valid' boolean and 'issues' list
        """
        issues = []

        # Check for required environment variables
        required_vars = ["SECRET_KEY", "DATABASE_URL"]
        for var in required_vars:
            if not os.environ.get(var):
                issues.append(
                    f"Required environment variable {var} not set in production"
                )

        # Validate database URL format
        if cls.SQLALCHEMY_DATABASE_URI and not cls.SQLALCHEMY_DATABASE_URI.startswith(
            ("sqlite:///", "postgresql://", "mysql://")
        ):
            issues.append("DATABASE_URL must use a supported database engine")

        # Validate memory configuration for production
        if cls.MAX_TOTAL_MEMORY_MB < 4096:  # At least 4GB
            issues.append("MAX_TOTAL_MEMORY_MB should be at least 4096MB in production")

        # Validate security settings
        if not cls.SESSION_COOKIE_SECURE:
            issues.append("SESSION_COOKIE_SECURE must be True in production")

        if cls.SESSION_COOKIE_SAMESITE != "Strict":
            issues.append("SESSION_COOKIE_SAMESITE should be 'Strict' in production")

        return {"valid": len(issues) == 0, "issues": issues}
