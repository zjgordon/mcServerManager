# Database Management

This document describes the database management system for
mcServerManager, including migration tools, backup/recovery procedures,
data validation, and performance monitoring.

## Overview

The mcServerManager uses SQLAlchemy with Flask-Migrate for database management, providing:

- **Database Migrations**: Version-controlled schema changes
- **Backup & Recovery**: Automated database backup and restore capabilities
- **Data Validation**: Integrity checks and constraint validation
- **Performance Monitoring**: Database health and performance metrics
- **Data Integrity**: Comprehensive validation rules and constraints

## Database Schema

### Tables

#### User Table

- **Primary Key**: `id` (Integer)
- **Unique Fields**: `username`, `email`
- **Constraints**: Username 3-80 chars, alphanumeric with underscores/hyphens
- **Indexes**: username, email, is_admin, is_active

#### Server Table

- **Primary Key**: `id` (Integer)
- **Unique Fields**: `server_name`
- **Foreign Keys**: `owner_id` → `user.id`
- **Constraints**: Server name 3-150 chars, port 1024-65535, memory 512-32768MB
- **Indexes**: server_name, port, status, owner_id, memory_mb

#### Configuration Table

- **Primary Key**: `id` (Integer)
- **Unique Fields**: `key`
- **Foreign Keys**: `updated_by` → `user.id`
- **Constraints**: Key 1-100 chars, alphanumeric with dots/hyphens/underscores
- **Indexes**: key, updated_at, updated_by

## Migration System

### Flask-Migrate Integration

The application uses Flask-Migrate for database schema versioning and migrations.

#### Creating Migrations

```bash
# Create a new migration
python -m flask db migrate -m "Description of changes"

# Apply migrations
python -m flask db upgrade

# Downgrade to previous version
python -m flask db downgrade
```

#### Migration Commands

```bash
# Show current revision
python -m flask db current

# Show migration history
python -m flask db history

# Show pending migrations
python -m flask db show
```

### Database Manager API

The `DatabaseManager` class provides programmatic access to migration operations:

```python
from app.database import db_manager

# Create migration
db_manager.create_migration("Add new column")

# Upgrade database
db_manager.upgrade_database()

# Get current revision
revision = db_manager.get_current_revision()
```

## Backup and Recovery

### Backup Script

The `scripts/backup.py` script provides comprehensive backup and recovery functionality:

```bash
# Create backup
python scripts/backup.py backup

# Create backup with verbose output
python scripts/backup.py backup -v

# Create backup to specific directory
python scripts/backup.py backup -d /path/to/backups

# List available backups
python scripts/backup.py list

# Restore from backup
python scripts/backup.py restore backup_file.db

# Validate database integrity
python scripts/backup.py validate

# Show database statistics
python scripts/backup.py stats
```

### Backup API

```python
from app.database import DatabaseBackup

# Create backup
backup_file = DatabaseBackup.create_backup()

# Restore from backup
success = DatabaseBackup.restore_backup(backup_file)
```

### Backup Storage

- **Default Location**: `instance/backups/`
- **Naming Convention**: `db_backup_YYYYMMDD_HHMMSS.db`
- **Compression**: Not implemented (can be added if needed)
- **Retention**: Manual cleanup required

## Data Validation

### Validation Rules

#### User Validation

- Username: 3-80 characters, alphanumeric with underscores/hyphens
- Email: Valid email format (if provided)
- Password: Hashed using Werkzeug security functions

#### Server Validation

- Server Name: 3-150 characters, alphanumeric with underscores/hyphens
- Port: 1024-65535 range
- Memory: 512-32768 MB range
- Status: Must be one of 'Running', 'Stopped', 'Starting', 'Stopping'
- Game Mode: Must be one of 'survival', 'creative', 'adventure', 'spectator'
- Difficulty: Must be one of 'peaceful', 'easy', 'normal', 'hard'

#### Configuration Validation

- Key: 1-100 characters, alphanumeric with dots/hyphens/underscores
- Value: Non-empty text

### Validation API

```python
from app.database import DatabaseValidator

# Validate data integrity
data_issues = DatabaseValidator.validate_data_integrity()

# Validate schema integrity
schema_issues = DatabaseValidator.validate_schema()
```

### Validation Categories

- **Foreign Key Violations**: Orphaned records with invalid references
- **Constraint Violations**: Data that violates database constraints
- **Data Inconsistencies**: Invalid data values or ranges
- **Orphaned Records**: Records with invalid foreign key references

## Performance Monitoring

### Database Statistics

The `DatabaseMonitor` class provides performance metrics:

```python
from app.database import DatabaseMonitor

# Get database statistics
stats = DatabaseMonitor.get_database_stats()

# Check database health
health = DatabaseMonitor.check_database_health()
```

### Metrics Tracked

- **Table Counts**: Number of records in each table
- **Database Size**: Total database file size
- **Connection Pool**: Active connections and pool status
- **Performance Metrics**: Query performance and resource usage

### Health Checks

- **Connection Status**: Database connectivity
- **Data Integrity**: Validation of data consistency
- **Schema Integrity**: Validation of table structure
- **Performance**: Resource usage and query performance

## Data Integrity

### Constraint Enforcement

The database enforces data integrity through:

1. **Primary Keys**: Unique identifiers for all records
2. **Foreign Keys**: Referential integrity between tables
3. **Unique Constraints**: Prevents duplicate values
4. **Check Constraints**: Validates data ranges and formats
5. **Indexes**: Improves query performance and enforces uniqueness

### Integrity Checks

Regular integrity checks should be performed:

```bash
# Validate database integrity
python scripts/backup.py validate

# Check database health
python -c "from app.database import DatabaseMonitor; print(DatabaseMonitor.check_database_health())"
```

## Best Practices

### Migration Management

1. **Always backup before migrations** in production
2. **Test migrations** in development environment first
3. **Use descriptive migration messages** for clarity
4. **Review migration scripts** before applying
5. **Keep migrations small and focused** on single changes

### Backup Strategy

1. **Regular backups**: Daily automated backups
2. **Pre-migration backups**: Always backup before schema changes
3. **Test restores**: Regularly test backup restoration
4. **Offsite storage**: Store backups in secure, offsite location
5. **Retention policy**: Implement backup retention and cleanup

### Data Validation

1. **Validate on input**: Check data before database insertion
2. **Regular integrity checks**: Schedule automated validation
3. **Monitor constraint violations**: Track and resolve issues
4. **Data cleanup**: Regular cleanup of orphaned or invalid data

### Performance Monitoring

1. **Monitor database size**: Track growth and optimize as needed
2. **Connection pool monitoring**: Ensure adequate connection resources
3. **Query performance**: Monitor slow queries and optimize
4. **Regular health checks**: Automated monitoring and alerting

## Troubleshooting

### Common Issues

#### Migration Failures

- Check database connectivity
- Verify migration dependencies
- Review migration scripts for errors
- Restore from backup if necessary

#### Backup/Restore Issues

- Verify file permissions
- Check disk space availability
- Ensure database is not in use during restore
- Validate backup file integrity

#### Data Integrity Issues

- Run validation checks regularly
- Fix constraint violations promptly
- Clean up orphaned records
- Monitor for data inconsistencies

#### Performance Issues

- Monitor database size and growth
- Check connection pool status
- Optimize slow queries
- Consider database maintenance tasks

### Recovery Procedures

1. **Stop application** to prevent further data corruption
2. **Restore from latest backup** if data corruption detected
3. **Run integrity checks** to verify data consistency
4. **Apply any pending migrations** after restore
5. **Restart application** and monitor for issues

## Security Considerations

- **Backup encryption**: Consider encrypting backup files
- **Access control**: Restrict backup file access
- **Audit logging**: Log all database operations
- **Regular security updates**: Keep database software updated
- **Connection security**: Use secure database connections
