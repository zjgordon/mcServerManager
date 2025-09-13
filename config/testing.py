"""
Testing configuration for the Minecraft Server Manager application.

This module contains testing-specific settings optimized for running
the test suite with proper isolation and performance.
"""

import os
import tempfile
from .base import BaseConfig


class TestingConfig(BaseConfig):
    """Testing configuration with test-specific settings and optimizations."""
    
    # Testing flags
    DEBUG = False
    TESTING = True
    
    # In-memory database for fast test execution
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///:memory:'
    
    # Disable CSRF protection for easier testing
    WTF_CSRF_ENABLED = False
    
    # Disable rate limiting in tests
    RATELIMIT_ENABLED = False
    
    # Disable secure cookies for testing
    SESSION_COOKIE_SECURE = False
    
    # Test-specific memory settings (minimal for fast tests)
    MAX_TOTAL_MEMORY_MB = 1024  # 1GB total for tests
    DEFAULT_SERVER_MEMORY_MB = 256  # 256MB per server for tests
    MIN_SERVER_MEMORY_MB = 128  # 128MB minimum for tests
    MAX_SERVER_MEMORY_MB = 512  # 512MB maximum for tests
    
    # Test-specific file upload settings
    MAX_CONTENT_LENGTH = 1024 * 1024  # 1MB max for tests
    
    # Test logging
    LOG_LEVEL = 'WARNING'  # Reduce log noise during tests
    
    # Test-specific settings
    TESTING_MODE = True
    PRESERVE_CONTEXT_ON_EXCEPTION = False
    
    # Use temporary directory for test files
    TEST_UPLOAD_FOLDER = tempfile.mkdtemp()
    
    # Disable session refresh for testing
    SESSION_REFRESH_EACH_REQUEST = False
    
    # Test-specific security settings
    SECRET_KEY = 'test-secret-key-for-testing-only'
    
    # Disable password expiry for tests
    PASSWORD_EXPIRY_DAYS = 0  # No expiry in tests
