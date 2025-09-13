"""
Development configuration for the Minecraft Server Manager application.

This module contains development-specific settings that override the base
configuration for local development environments.
"""

import os
from .base import BaseConfig


class DevelopmentConfig(BaseConfig):
    """Development configuration with debug settings and relaxed security."""
    
    # Debug settings
    DEBUG = True
    TESTING = False
    
    # Development database (in-memory for faster testing)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///dev_minecraft_manager.db'
    
    # Relaxed security for development
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development
    WTF_CSRF_ENABLED = True  # Keep CSRF protection even in dev
    
    # More permissive rate limiting for development
    RATELIMIT_DEFAULT = '1000 per day;200 per hour;50 per minute'
    RATELIMIT_LOGIN = '20 per minute'
    
    # Development-specific memory settings (smaller for local testing)
    MAX_TOTAL_MEMORY_MB = int(os.environ.get('MAX_TOTAL_MEMORY_MB', '2048'))  # 2GB for dev
    DEFAULT_SERVER_MEMORY_MB = int(os.environ.get('DEFAULT_SERVER_MEMORY_MB', '512'))  # 512MB for dev
    MIN_SERVER_MEMORY_MB = int(os.environ.get('MIN_SERVER_MEMORY_MB', '256'))  # 256MB min for dev
    MAX_SERVER_MEMORY_MB = int(os.environ.get('MAX_SERVER_MEMORY_MB', '1024'))  # 1GB max for dev
    
    # Development logging
    LOG_LEVEL = 'DEBUG'
    
    # Development-specific settings
    DEVELOPMENT_MODE = True
    AUTO_RELOAD = True
