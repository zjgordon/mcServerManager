# Configuration Management

The Minecraft Server Manager uses a centralized configuration management system that supports environment-specific configurations with proper validation and environment variable loading.

## Configuration Structure

The configuration system is organized in the `config/` directory with the following structure:

- `config/__init__.py` - Configuration factory that selects the appropriate config based on `FLASK_ENV`
- `config/base.py` - Base configuration class with common settings and validation
- `config/development.py` - Development-specific settings
- `config/testing.py` - Testing-specific settings  
- `config/production.py` - Production-specific settings

## Environment Configuration

The application automatically selects the appropriate configuration based on the `FLASK_ENV` environment variable:

- `development` (default) - Uses `DevelopmentConfig`
- `testing` or `test` - Uses `TestingConfig`
- `production` or `prod` - Uses `ProductionConfig`

## Configuration Classes

### BaseConfig

Contains all common configuration settings including:

- **Security Configuration**: SECRET_KEY, CSRF protection, session security
- **Database Configuration**: SQLAlchemy settings and connection
- **Rate Limiting**: Request rate limiting configuration
- **Password Policy**: Password complexity requirements
- **File Upload Security**: File size limits and allowed extensions
- **Memory Management**: Server memory allocation settings
- **Application Settings**: App title, hostname, and other app-specific settings

### DevelopmentConfig

Extends BaseConfig with development-specific settings:

- `DEBUG = True` - Enables debug mode
- Relaxed security settings for local development
- More permissive rate limiting
- Smaller memory limits for local testing
- Development-specific logging

### TestingConfig

Optimized for running the test suite:

- `TESTING = True` - Enables testing mode
- In-memory database for fast test execution
- Disabled CSRF protection and rate limiting
- Minimal memory settings for fast tests
- Disabled session refresh for testing

### ProductionConfig

Enhanced security and performance for production:

- `DEBUG = False` - Disables debug mode
- Enhanced security headers and settings
- Stricter rate limiting
- Configurable memory limits via environment variables
- Production-specific validation

## Environment Variables

### Required Variables

- `SECRET_KEY` - Flask secret key for session security (required in production)
- `DATABASE_URL` - Database connection string (required in production)

### Optional Variables

- `FLASK_ENV` - Environment selection (development, testing, production)
- `APP_TITLE` - Application title (default: "Minecraft Server Manager")
- `SERVER_HOSTNAME` - Server hostname (default: "localhost")
- `SESSION_COOKIE_SECURE` - Enable secure cookies (default: False in dev, True in prod)

### Memory Management Variables

- `MAX_TOTAL_MEMORY_MB` - Maximum total memory allocation (default: 8192MB)
- `DEFAULT_SERVER_MEMORY_MB` - Default memory per server (default: 1024MB)
- `MIN_SERVER_MEMORY_MB` - Minimum memory per server (default: 512MB)
- `MAX_SERVER_MEMORY_MB` - Maximum memory per server (default: 4096MB)

### Logging Variables

- `LOG_LEVEL` - Logging level (DEBUG, INFO, WARNING, ERROR)

## Configuration Validation

The configuration system includes built-in validation:

```python
from config import get_config

config_class = get_config()
validation_result = config_class.validate_config()

if not validation_result['valid']:
    print("Configuration issues:", validation_result['issues'])
```

## Configuration Summary

Get a summary of the current configuration for debugging:

```python
from config import get_config

config_class = get_config()
summary = config_class.get_config_summary()
print(summary)
```

## Usage in Application

The configuration is automatically loaded in the Flask application:

```python
from config import get_config

def create_app():
    app = Flask(__name__)
    app.config.from_object(get_config())
    return app
```

## Migration from app/config.py

The old `app/config.py` file has been replaced with the new centralized configuration system. All existing configuration settings have been preserved and enhanced with:

- Environment-specific configurations
- Configuration validation
- Better organization and documentation
- Environment variable loading
- Production-specific security enhancements

## Security Considerations

- Production configurations enforce stricter security settings
- Environment variables should be used for sensitive configuration
- Configuration validation helps catch misconfigurations early
- Security headers are automatically applied based on environment
