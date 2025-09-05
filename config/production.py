"""
Production Configuration for Minecraft Server Manager

This module contains production-specific configuration settings for the
Minecraft Server Manager application.
"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent

class ProductionConfig:
    """Production configuration class."""
    
    # Basic Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'production-secret-key-change-this'
    DEBUG = False
    TESTING = False
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///instance/minecraft_manager.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_timeout': 20,
        'max_overflow': 0
    }
    
    # Security Configuration
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL') or 'memory://'
    RATELIMIT_DEFAULT = "1000 per day;100 per hour;20 per minute"
    RATELIMIT_HEADERS_ENABLED = True
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',') or ['https://yourdomain.com']
    CORS_SUPPORTS_CREDENTIALS = True
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/app.log')
    LOG_MAX_BYTES = 10 * 1024 * 1024  # 10MB
    LOG_BACKUP_COUNT = 5
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'json', 'properties'}
    
    # Server Management Configuration
    SERVERS_DIR = BASE_DIR / 'servers'
    BACKUPS_DIR = BASE_DIR / 'backups'
    MAX_SERVERS_PER_USER = int(os.environ.get('MAX_SERVERS_PER_USER', '10'))
    MAX_TOTAL_SERVERS = int(os.environ.get('MAX_TOTAL_SERVERS', '50'))
    
    # Memory Management
    MAX_TOTAL_MEMORY_MB = int(os.environ.get('MAX_TOTAL_MEMORY_MB', '16384'))
    DEFAULT_SERVER_MEMORY_MB = int(os.environ.get('DEFAULT_SERVER_MEMORY_MB', '1024'))
    MIN_SERVER_MEMORY_MB = int(os.environ.get('MIN_SERVER_MEMORY_MB', '512'))
    MAX_SERVER_MEMORY_MB = int(os.environ.get('MAX_SERVER_MEMORY_MB', '4096'))
    
    # Process Management
    STATUS_CHECK_INTERVAL = int(os.environ.get('STATUS_CHECK_INTERVAL', '300'))  # 5 minutes
    PROCESS_CLEANUP_INTERVAL = int(os.environ.get('PROCESS_CLEANUP_INTERVAL', '3600'))  # 1 hour
    
    # Security Settings
    PASSWORD_MIN_LENGTH = int(os.environ.get('PASSWORD_MIN_LENGTH', '12'))
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_NUMBERS = True
    PASSWORD_REQUIRE_SPECIAL = True
    
    # Session Security
    SESSION_COOKIE_NAME = 'mcservermanager_session'
    SESSION_COOKIE_DOMAIN = os.environ.get('SESSION_COOKIE_DOMAIN')
    SESSION_COOKIE_PATH = '/'
    
    # API Configuration
    API_RATE_LIMIT = "1000 per day;100 per hour;20 per minute"
    API_TIMEOUT = 30
    
    # Monitoring Configuration
    ENABLE_METRICS = True
    METRICS_ENDPOINT = '/metrics'
    HEALTH_CHECK_ENDPOINT = '/health'
    
    # Backup Configuration
    BACKUP_RETENTION_DAYS = int(os.environ.get('BACKUP_RETENTION_DAYS', '30'))
    BACKUP_COMPRESSION = True
    BACKUP_ENCRYPTION = os.environ.get('BACKUP_ENCRYPTION', 'false').lower() == 'true'
    
    # Email Configuration (for notifications)
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', '587'))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    # Redis Configuration (for caching and rate limiting)
    REDIS_URL = os.environ.get('REDIS_URL')
    CACHE_TYPE = 'redis' if REDIS_URL else 'simple'
    CACHE_REDIS_URL = REDIS_URL
    
    # SSL/TLS Configuration
    SSL_CERT_PATH = os.environ.get('SSL_CERT_PATH')
    SSL_KEY_PATH = os.environ.get('SSL_KEY_PATH')
    
    # Performance Configuration
    WORKERS = int(os.environ.get('WORKERS', '4'))
    WORKER_CONNECTIONS = int(os.environ.get('WORKER_CONNECTIONS', '1000'))
    KEEPALIVE = int(os.environ.get('KEEPALIVE', '2'))
    TIMEOUT = int(os.environ.get('TIMEOUT', '30'))
    
    # Database Connection Pool
    DB_POOL_SIZE = int(os.environ.get('DB_POOL_SIZE', '10'))
    DB_MAX_OVERFLOW = int(os.environ.get('DB_MAX_OVERFLOW', '20'))
    DB_POOL_TIMEOUT = int(os.environ.get('DB_POOL_TIMEOUT', '30'))
    DB_POOL_RECYCLE = int(os.environ.get('DB_POOL_RECYCLE', '3600'))
    
    # Error Handling
    ERROR_EMAIL_RECIPIENTS = os.environ.get('ERROR_EMAIL_RECIPIENTS', '').split(',')
    ERROR_LOG_LEVEL = 'ERROR'
    
    # Feature Flags
    ENABLE_WEBSOCKET = os.environ.get('ENABLE_WEBSOCKET', 'true').lower() == 'true'
    ENABLE_REAL_TIME_MONITORING = os.environ.get('ENABLE_REAL_TIME_MONITORING', 'true').lower() == 'true'
    ENABLE_AUTO_BACKUP = os.environ.get('ENABLE_AUTO_BACKUP', 'true').lower() == 'true'
    ENABLE_METRICS_COLLECTION = os.environ.get('ENABLE_METRICS_COLLECTION', 'true').lower() == 'true'
    
    # External Services
    SENTRY_DSN = os.environ.get('SENTRY_DSN')
    NEW_RELIC_LICENSE_KEY = os.environ.get('NEW_RELIC_LICENSE_KEY')
    
    # Custom Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    }
    
    @staticmethod
    def init_app(app):
        """Initialize application with production configuration."""
        # Create necessary directories
        ProductionConfig._create_directories()
        
        # Configure logging
        ProductionConfig._configure_logging(app)
        
        # Configure security headers
        ProductionConfig._configure_security_headers(app)
        
        # Configure error handling
        ProductionConfig._configure_error_handling(app)
    
    @staticmethod
    def _create_directories():
        """Create necessary directories for production."""
        directories = [
            BASE_DIR / 'logs',
            BASE_DIR / 'uploads',
            BASE_DIR / 'backups',
            BASE_DIR / 'servers',
            BASE_DIR / 'instance'
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def _configure_logging(app):
        """Configure production logging."""
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not app.debug and not app.testing:
            # File logging
            file_handler = RotatingFileHandler(
                ProductionConfig.LOG_FILE,
                maxBytes=ProductionConfig.LOG_MAX_BYTES,
                backupCount=ProductionConfig.LOG_BACKUP_COUNT
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(getattr(logging, ProductionConfig.LOG_LEVEL))
            app.logger.addHandler(file_handler)
            
            app.logger.setLevel(getattr(logging, ProductionConfig.LOG_LEVEL))
            app.logger.info('Minecraft Server Manager startup')
    
    @staticmethod
    def _configure_security_headers(app):
        """Configure security headers."""
        @app.after_request
        def set_security_headers(response):
            for header, value in ProductionConfig.SECURITY_HEADERS.items():
                response.headers[header] = value
            return response
    
    @staticmethod
    def _configure_error_handling(app):
        """Configure error handling for production."""
        import logging
        
        if not app.debug and not app.testing:
            @app.errorhandler(404)
            def not_found_error(error):
                app.logger.error(f'404 error: {error}')
                return {'error': 'Not found'}, 404
            
            @app.errorhandler(500)
            def internal_error(error):
                app.logger.error(f'500 error: {error}')
                return {'error': 'Internal server error'}, 500
