# Database Management

This document describes the database management system for
mcServerManager, including migration, backup, recovery, and monitoring
capabilities.

## Overview

The mcServerManager uses SQLite as its database with Flask-Migrate for
schema management, comprehensive backup and recovery tools, and built-in
data validation and integrity checking.

## Database Schema

### Tables

- **user**: User accounts and authentication
- **server**: Minecraft server instances and configuration
- **configuration**: Application configuration settings

### Key Features

- Foreign key relationships with referential integrity
- Data validation constraints at the database level
- Comprehensive validation methods in model classes
- Performance monitoring and optimization tools

## Migration System

### Flask-Migrate Integration

The application uses Flask-Migrate for database schema management:

```bash
# Initialize migrations (already done)
flask db init

# Create a new migration
flask db migrate -m "Description of changes"

# Apply migrations
flask db upgrade

# Rollback to previous migration
flask db downgrade

# Show migration history
flask db history

# Show current revision
flask db current
```

### Migration Files

Migration files are stored in the `migrations/versions/` directory and are
automatically generated based on model changes.

## Backup and Recovery

### Backup Script

The `scripts/backup.py` script provides comprehensive backup and recovery functionality:

```bash
# Create a backup
python scripts/backup.py create
python scripts/backup.py create --name "pre_deployment_backup"

# List available backups
python scripts/backup.py list

# Restore from backup
python scripts/backup.py restore backup_20250113_080000

# Clean up old backups (keep 10 most recent)
python scripts/backup.py cleanup --keep 10
```

### Backup Features

- **Automatic timestamping**: Backups are automatically named with timestamps
- **Metadata tracking**: Each backup includes database statistics and metadata
- **Integrity validation**: Restored databases are validated for integrity
- **Pre-restore backup**: Current database is backed up before restore operations
- **Cleanup utilities**: Automatic cleanup of old backups

### Backup Storage

Backups are stored in the `backups/` directory with the following structure:

```text
backups/
├── backup_20250113_080000.db
├── backup_20250113_080000_metadata.json
├── backup_20250113_090000.db
└── backup_20250113_090000_metadata.json
```

## Data Validation

### Model-Level Validation

Each model includes comprehensive validation methods:

#### User Model

- Username format and length validation (3-80 characters, alphanumeric + underscores)
- Email format validation (optional field)
- Comprehensive validation method returning error list

#### Server Model

- Server name format and length validation (1-150 characters, alphanumeric + hyphens/underscores)
- Port range validation (1-65535)
- Memory allocation validation (512-32768 MB)
- Status value validation (Running/Stopped)
- Gamemode validation (survival, creative, adventure, spectator)
- Difficulty validation (peaceful, easy, normal, hard)

#### Configuration Model

- Key format validation (1-100 characters, alphanumeric + dots/hyphens/underscores)
- Value validation (non-empty)

### Database-Level Constraints

SQLite constraints are defined for:

- String length limits
- Numeric ranges
- Enum value validation
- Foreign key relationships

## Performance Monitoring

### Database Statistics

The `DatabaseManager` class provides comprehensive database statistics:

```python
from app.database import DatabaseManager

# Get database statistics
stats = DatabaseManager.get_database_stats()
print(f"Database size: {stats['file_size_mb']} MB")
print(f"Tables: {stats['tables']}")
print(f"Integrity check: {stats['integrity_check']}")
```

### Performance Metrics

Monitor database performance with:

```python
# Get performance metrics
metrics = DatabaseManager.get_performance_metrics()
print(f"Query response time: {metrics['query_response_time_ms']} ms")
print(f"Total pages: {metrics['page_count']}")
print(f"Cache size: {metrics['cache_size_pages']} pages")
```

### Database Optimization

Optimize database performance:

```python
# Optimize database
result = DatabaseManager.optimize_database()
print(f"Optimization status: {result['status']}")
print(f"Operations performed: {result['operations']}")
```

## Data Integrity Checking

### Comprehensive Validation

The system includes comprehensive data integrity checking:

```python
# Validate data integrity
validation = DatabaseManager.validate_data_integrity()
print(f"Overall status: {validation['overall_status']}")

# Check specific validation results
for check_name, result in validation['checks'].items():
    print(f"{check_name}: {result['status']}")
    if result.get('issues'):
        print(f"  Issues: {result['issues']}")
```

### Validation Checks

The system performs the following validation checks:

1. **Foreign Key Constraints**: Ensures referential integrity
2. **Required Fields**: Validates non-null constraints
3. **Unique Constraints**: Checks for duplicate values
4. **Data Consistency**: Validates business rules and ranges

## Best Practices

### Migration Management

1. **Always backup before migrations**: Use the backup script before applying
   migrations
2. **Test migrations in development**: Test all migrations in a development
   environment first
3. **Review migration files**: Check generated migration files before applying
4. **Use descriptive migration messages**: Provide clear descriptions of changes

### Backup Strategy

1. **Regular automated backups**: Set up automated backups for production
2. **Test restore procedures**: Regularly test backup restoration
3. **Monitor backup storage**: Ensure adequate storage space for backups
4. **Retention policy**: Implement a backup retention policy

### Data Validation Rules

1. **Validate before saving**: Always validate data before database operations
2. **Handle validation errors**: Provide meaningful error messages to users
3. **Regular integrity checks**: Run integrity checks regularly in production
4. **Monitor performance**: Monitor database performance and optimize as needed

## Troubleshooting

### Common Issues

1. **Migration conflicts**: Use `flask db merge` to resolve migration conflicts
2. **Backup failures**: Check file permissions and disk space
3. **Validation errors**: Review model validation methods and constraints
4. **Performance issues**: Use optimization tools and monitor metrics

### Recovery Procedures

1. **Database corruption**: Restore from the most recent backup
2. **Migration rollback**: Use `flask db downgrade` to rollback migrations
3. **Data loss**: Restore from backup and investigate cause
4. **Performance degradation**: Run optimization and check for issues

## Security Considerations

1. **Backup security**: Secure backup files with appropriate permissions
2. **Database access**: Limit database access to authorized users only
3. **Validation**: Always validate user input before database operations
4. **Audit logging**: Log all database operations for security auditing

## Monitoring and Alerting

The database management system integrates with the application's monitoring
and alerting system:

- Database performance metrics are included in health checks
- Integrity check failures trigger alerts
- Backup failures are logged and can trigger alerts
- Performance degradation can be monitored and alerted

For more information about monitoring and alerting, see
[Health Monitoring](health-monitoring.md) and
[Logging and Monitoring](logging-monitoring.md).
