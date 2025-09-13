# Logging and Monitoring Documentation

This document describes the comprehensive logging and monitoring system
implemented in mcServerManager.

## Overview

The logging and monitoring system provides:

- Structured JSON logging with context
- Error tracking and reporting
- Performance monitoring and metrics
- Security event logging
- Alerting system for critical issues
- Log rotation and retention policies

## Structured Logging

### JSON Format

All logs are formatted as JSON with the following structure:

```json
{
  "timestamp": "2025-01-09T10:30:45.123456Z",
  "level": "INFO",
  "logger": "mcServerManager",
  "message": "User action: login",
  "module": "auth_routes",
  "function": "login",
  "line": 45,
  "thread": 140123456789,
  "process": 1234,
  "request_id": "req_1641727845123",
  "user_id": 1,
  "extra_fields": {
    "event_type": "user_action",
    "action": "login",
    "details": {}
  }
}
```

### Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General information about application flow
- **WARNING**: Warning messages for potential issues
- **ERROR**: Error messages for recoverable errors
- **CRITICAL**: Critical errors that require immediate attention

### Log Files

- `logs/app.log`: General application logs with rotation (10MB, 5 backups)
- `logs/error.log`: ERROR and CRITICAL level logs (10MB, 5 backups)
- `logs/security.log`: Security-related events (10MB, 10 backups)

## Error Tracking

### Error Context

Errors are tracked with comprehensive context including:

- Error type and message
- Stack trace (in debug mode)
- Request context (method, URL, IP address)
- User context (if authenticated)
- Application context (debug mode, app name)

### Error Categories

- **AppError**: Application-specific errors
- **ServerError**: Server process related errors
- **NetworkError**: Network connectivity errors
- **FileOperationError**: File system operation errors
- **ValidationError**: Input validation errors
- **DatabaseError**: Database operation errors

## Performance Monitoring

### Metrics Collection

The system automatically collects:

- CPU usage (system and process)
- Memory usage (system and process)
- Disk space usage
- Database connection pool metrics
- Application-specific metrics

### Performance Decorators

Use the `@log_performance` decorator to track function execution time:

```python
from app.logging import log_performance

@log_performance
def my_function():
    # Function implementation
    pass
```

## Security Event Logging

### Security Events

Security events are logged with:

- Action performed
- User ID (if authenticated)
- IP address
- User agent
- Additional details

### Audit Logging

Use the `audit_log` function for security-relevant actions:

```python
from app.security import audit_log

audit_log("user_login", {"username": "admin"})
audit_log("server_created", {"server_name": "test", "version": "1.20.1"})
```

## Alerting System

### Alert Rules

Default alert rules include:

- High CPU usage (>80% for 1 minute)
- Critical CPU usage (>95% for 30 seconds)
- High memory usage (>85% for 1 minute)
- Critical memory usage (>95% for 30 seconds)
- Low disk space (>90% immediately)
- Critical disk space (>95% immediately)
- High database connections (>80% for 1 minute)
- High error rate (>10 errors in 5 minutes)

### Alert Notifications

Alerts can be sent via:

- Email (SMTP configuration required)
- Webhook (URL configuration required)
- Security log file

### Configuration

Set the following environment variables for alerting:

```bash
# Email alerts
ALERT_EMAIL_SMTP_HOST=smtp.example.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=alerts@example.com
ALERT_EMAIL_SMTP_PASSWORD=password
ALERT_EMAIL_FROM=alerts@example.com
ALERT_EMAIL_TO=admin@example.com

# Webhook alerts
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_WEBHOOK_HEADERS={"Content-Type": "application/json"}
```

## Log Rotation and Retention

### Rotation Policy

- **File size limit**: 10MB per log file
- **Backup count**: 5 backups for general logs, 10 for security logs
- **Rotation trigger**: When file exceeds size limit

### Retention Policy

- Logs are automatically rotated when size limit is reached
- Old backup files are automatically deleted when backup count is exceeded
- Security logs are retained longer (10 backups vs 5 for general logs)

## Usage Examples

### Basic Logging

```python
from app.logging import logger

# Basic logging
logger.info("Application started")
logger.warning("High memory usage detected")
logger.error("Database connection failed")

# Logging with context
logger.info("User action: login", {
    "event_type": "user_action",
    "action": "login",
    "user_id": 1
})
```

### Performance Monitoring Examples

```python
from app.logging import log_performance, logger

@log_performance
def process_data(data):
    # Process data
    pass

# Manual performance logging
logger.performance_metric("database_query_time", 0.123, "seconds")
```

### Security Logging

```python
from app.logging import logger

# Security events
logger.security_event("failed_login", {
    "username": "admin",
    "ip_address": "192.168.1.100"
})

# User actions
logger.user_action("server_created", {
    "server_name": "test",
    "version": "1.20.1"
})
```

### Error Tracking Examples

```python
from app.logging import logger

try:
    # Risky operation
    result = risky_operation()
except Exception as e:
    logger.error_tracking(e, {
        "operation": "risky_operation",
        "input_data": "sensitive_data"
    })
    raise
```

## Monitoring Endpoints

The system provides monitoring endpoints at:

- `/health/`: Basic health status
- `/health/detailed`: Detailed system metrics
- `/health/ready`: Readiness probe
- `/health/live`: Liveness probe

## Best Practices

1. **Use appropriate log levels**: DEBUG for debugging, INFO for normal flow,
   WARNING for potential issues, ERROR for errors, CRITICAL for critical issues.

2. **Include context**: Always include relevant context in log messages using
   the `extra_fields` parameter.

3. **Use structured logging**: Prefer structured logging over string formatting
   for better log analysis.

4. **Log security events**: Always log security-relevant actions using
   `audit_log` or `logger.security_event`.

5. **Monitor performance**: Use performance decorators and metrics for critical
   functions.

6. **Handle errors properly**: Use `logger.error_tracking` for comprehensive
   error context.

7. **Configure alerts**: Set up appropriate alert rules and notification
   channels for your environment.

## Troubleshooting

### Common Issues

1. **Log files not created**: Check directory permissions for the `logs/` directory.

2. **Alerts not working**: Verify email/webhook configuration and network connectivity.

3. **High log volume**: Adjust log levels or add more specific filtering.

4. **Performance impact**: Consider using async logging for high-volume applications.

### Debug Mode

Enable debug mode for more detailed logging:

```bash
export LOG_LEVEL=DEBUG
export FLASK_DEBUG=1
```

This will include stack traces in error logs and more detailed debug information.
