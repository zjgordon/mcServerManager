# Backup Scheduling System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Configuration Options](#configuration-options)
4. [Backup Management](#backup-management)
5. [Restore Procedures](#restore-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Performance Optimization](#performance-optimization)
8. [Security Considerations](#security-considerations)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)

## Overview

The mcServerManager backup scheduling system provides automated, reliable backup management for Minecraft servers. It includes comprehensive features for scheduling, verification, compression, encryption, and restoration of server backups.

### Key Features

- **Automated Scheduling**: Daily, weekly, or monthly backup schedules
- **Server Management**: Automatic server stopping/starting during backups
- **Verification & Integrity**: Multiple verification methods including checksums and corruption detection
- **Compression & Encryption**: Support for gzip, bzip2, lzma compression and AES-256 encryption
- **Retention Policies**: Configurable backup retention with disk space monitoring
- **Monitoring & Alerting**: Comprehensive metrics and failure alerting
- **Restore Capabilities**: Full backup restoration with preview and confirmation
- **API Integration**: RESTful API for programmatic backup management

## Getting Started

### Prerequisites

- mcServerManager application running
- Admin or user access to servers
- Sufficient disk space for backups (recommended: 2x server size)

### Basic Setup

1. **Access Backup Management**:
   - Navigate to the server list in the web interface
   - Click "Manage Backups" for any server
   - Or access via `/backup/<server_id>` route

2. **Create Your First Backup Schedule**:
   ```bash
   # Via API
   curl -X POST http://localhost:5000/api/backups/schedules \
     -H "Content-Type: application/json" \
     -d '{
       "server_id": 1,
       "schedule_type": "daily",
       "schedule_time": "02:00",
       "retention_days": 30,
       "enabled": true
     }'
   ```

3. **Verify Schedule Creation**:
   ```bash
   # Check schedule status
   curl http://localhost:5000/api/backups/1/status
   ```

### Quick Start Guide

1. **Enable Backup Scheduling**:
   - Go to server configuration during server creation
   - Check "Enable Automated Backups"
   - Select schedule type (daily/weekly/monthly)
   - Set backup time and retention period

2. **Monitor Backup Status**:
   - View backup status in server details
   - Check backup history and verification results
   - Monitor disk usage and cleanup activities

3. **Manual Backup**:
   - Use "Backup Now" button for immediate backups
   - Trigger via API: `POST /api/backups/<server_id>/trigger`

## Configuration Options

### Schedule Types

#### Daily Backups
- **Frequency**: Every day at specified time
- **Use Case**: Active servers with frequent changes
- **Example**: `"schedule_type": "daily", "schedule_time": "02:00"`

#### Weekly Backups
- **Frequency**: Every Sunday at specified time
- **Use Case**: Less active servers or development environments
- **Example**: `"schedule_type": "weekly", "schedule_time": "03:00"`

#### Monthly Backups
- **Frequency**: First day of each month at specified time
- **Use Case**: Archive servers or long-term storage
- **Example**: `"schedule_type": "monthly", "schedule_time": "04:00"`

### Retention Policies

#### Time-Based Retention
- **Default**: 30 days
- **Range**: 1-365 days
- **Behavior**: Automatically removes backups older than retention period
- **Safety**: Always preserves at least one backup per server

#### Disk Space Monitoring
- **Threshold**: 90% disk usage triggers emergency cleanup
- **Emergency Policy**: Keeps only 3 most recent backups
- **Monitoring**: Real-time disk usage tracking

### Compression Options

#### Supported Methods
- **gzip**: Fast compression, good balance (default)
- **bzip2**: Better compression, slower
- **lzma**: Best compression, slowest
- **none**: No compression, fastest

#### Configuration
```python
# Via backup scheduler
backup_scheduler.configure_compression("bzip2")
```

### Encryption Options

#### AES-256 Encryption
- **Algorithm**: Fernet (AES-256 in CBC mode)
- **Key Derivation**: PBKDF2 with SHA-256
- **Salt**: Configurable salt for key derivation
- **Iterations**: 100,000 (configurable)

#### Configuration
```python
# Password-based encryption
backup_scheduler.configure_encryption(True, password="your_password")

# Key-based encryption
backup_scheduler.configure_encryption(True, key="your_base64_key")
```

## Backup Management

### Creating Schedules

#### Via Web Interface
1. Navigate to server list
2. Click "Manage Backups" for desired server
3. Fill in schedule configuration:
   - Schedule type (daily/weekly/monthly)
   - Backup time (HH:MM format)
   - Retention days (1-365)
   - Enable/disable schedule
4. Click "Create Schedule"

#### Via API
```bash
curl -X POST http://localhost:5000/api/backups/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "server_id": 1,
    "schedule_type": "daily",
    "schedule_time": "02:00",
    "retention_days": 30,
    "enabled": true
  }'
```

### Managing Existing Schedules

#### Update Schedule
```bash
curl -X PUT http://localhost:5000/api/backups/schedules/1 \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_type": "weekly",
    "schedule_time": "03:00",
    "retention_days": 60,
    "enabled": true
  }'
```

#### Disable Schedule
```bash
curl -X PUT http://localhost:5000/api/backups/schedules/1 \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

#### Delete Schedule
```bash
curl -X DELETE http://localhost:5000/api/backups/schedules/1
```

### Monitoring Backup Status

#### Check Schedule Status
```bash
curl http://localhost:5000/api/backups/1/status
```

#### View Backup History
```bash
curl http://localhost:5000/api/backups/1/history
```

#### List All Schedules
```bash
curl http://localhost:5000/api/backups/schedules
```

### Manual Backup Operations

#### Trigger Immediate Backup
```bash
curl -X POST http://localhost:5000/api/backups/1/trigger
```

#### Backup Process
1. **Server Stop**: Gracefully stops running server
2. **Archive Creation**: Creates compressed backup archive
3. **Verification**: Performs integrity checks
4. **Server Restart**: Restarts server if it was running
5. **Cleanup**: Removes old backups based on retention policy

## Restore Procedures

### Backup Restoration

#### List Available Backups
```bash
curl http://localhost:5000/api/backups/1/available
```

#### Preview Restore
```bash
curl -X POST http://localhost:5000/api/backups/1/restore \
  -H "Content-Type: application/json" \
  -d '{
    "backup_filename": "server_backup_20250114_020000.tar.gz",
    "confirm": false
  }'
```

#### Confirm Restore
```bash
curl -X POST http://localhost:5000/api/backups/1/restore \
  -H "Content-Type: application/json" \
  -d '{
    "backup_filename": "server_backup_20250114_020000.tar.gz",
    "confirm": true
  }'
```

### Restore Process

1. **Backup Selection**: Choose backup file to restore
2. **Preview**: Review backup metadata and warnings
3. **Confirmation**: Confirm restore operation
4. **Server Stop**: Stop server if running
5. **Restore**: Extract backup to server directory
6. **Verification**: Verify restored files
7. **Server Start**: Restart server if needed

### Restore Safety Features

- **Preview Mode**: Review backup before restoration
- **Confirmation Required**: Prevents accidental restores
- **Server Protection**: Automatic server stopping/starting
- **Backup Verification**: Ensures backup integrity before restore
- **Rollback Capability**: Future feature for restore rollback

## Troubleshooting

### Common Issues

#### Backup Failures

**Problem**: Backup creation fails
**Solutions**:
1. Check disk space: `df -h backups/`
2. Verify server directory exists: `ls -la servers/`
3. Check permissions: `ls -la servers/server_name/`
4. Review logs: `tail -f logs/app.log`

**Error Messages**:
- `Server directory not found`: Server directory missing or inaccessible
- `Insufficient disk space`: Not enough space for backup
- `Permission denied`: File system permission issues

#### Schedule Execution Failures

**Problem**: Scheduled backups not running
**Solutions**:
1. Check scheduler status: `GET /api/backups/schedules`
2. Verify schedule is enabled
3. Check server exists and is accessible
4. Review scheduler logs

**Common Causes**:
- Server deleted but schedule remains
- Database connection issues
- Scheduler not started
- Invalid schedule configuration

#### Verification Failures

**Problem**: Backup verification fails
**Solutions**:
1. Check backup file integrity: `tar -tzf backup_file.tar.gz`
2. Verify file permissions
3. Check for disk corruption
4. Recreate backup if necessary

**Verification Methods**:
- File integrity checks (MD5/SHA256)
- Archive integrity verification
- Minecraft world file validation
- Optional restore testing

#### Restore Failures

**Problem**: Backup restoration fails
**Solutions**:
1. Verify backup file exists and is readable
2. Check restore directory permissions
3. Ensure sufficient disk space
4. Verify backup file format

**Common Issues**:
- Corrupted backup file
- Insufficient disk space
- Permission denied errors
- Invalid backup format

### Log Analysis

#### Backup Logs
```bash
# View backup-specific logs
grep "backup" logs/app.log

# View verification logs
grep "verification" logs/app.log

# View schedule execution logs
grep "schedule" logs/app.log
```

#### Error Patterns
- `backup_failed`: Backup creation failed
- `verification_failed`: Backup verification failed
- `schedule_execution_failure`: Scheduled backup failed
- `corruption_detected`: Backup corruption found

### Performance Issues

#### Slow Backups
**Causes**:
- Large server directories
- Slow disk I/O
- High compression settings
- Encryption overhead

**Solutions**:
1. Use faster compression (gzip instead of lzma)
2. Disable encryption if not needed
3. Schedule backups during low-activity periods
4. Use faster storage (SSD)

#### High Disk Usage
**Causes**:
- Short retention periods
- Large server files
- Many servers with backups
- Compression not effective

**Solutions**:
1. Increase retention period cleanup frequency
2. Use better compression
3. Implement disk space monitoring
4. Consider external backup storage

## Performance Optimization

### Backup Performance

#### Compression Settings
- **gzip**: Fastest, moderate compression
- **bzip2**: Balanced, good compression
- **lzma**: Slowest, best compression
- **none**: Fastest, no compression

#### Recommended Settings
```python
# For fast backups
backup_scheduler.configure_compression("gzip")

# For space efficiency
backup_scheduler.configure_compression("lzma")

# For balanced performance
backup_scheduler.configure_compression("bzip2")
```

#### Scheduling Optimization
- **Off-Peak Hours**: Schedule during low server activity
- **Staggered Times**: Avoid simultaneous backups
- **Resource Monitoring**: Monitor CPU and disk usage

### Storage Optimization

#### Retention Policies
- **Active Servers**: 7-30 days retention
- **Development Servers**: 3-7 days retention
- **Archive Servers**: 90-365 days retention

#### Disk Space Management
- **Monitoring**: Real-time disk usage tracking
- **Emergency Cleanup**: Automatic cleanup at 90% usage
- **Compression**: Use appropriate compression methods

### Network Optimization

#### Backup Storage
- **Local Storage**: Fastest access, limited scalability
- **Network Storage**: Shared storage, network dependency
- **Cloud Storage**: Scalable, internet dependency

## Security Considerations

### Backup Security

#### Encryption
- **AES-256**: Strong encryption for sensitive data
- **Key Management**: Secure key storage and rotation
- **Password Protection**: Strong password requirements

#### Access Control
- **User Permissions**: Users can only backup their servers
- **Admin Access**: Admins can manage all backups
- **API Authentication**: Token-based API access

### Data Protection

#### Backup Integrity
- **Checksums**: MD5 and SHA-256 verification
- **Corruption Detection**: Multiple verification methods
- **Repair Capabilities**: Automatic repair when possible

#### Retention Security
- **Secure Deletion**: Proper file deletion
- **Audit Logging**: Complete backup operation logging
- **Access Logging**: User access tracking

### Compliance

#### Data Retention
- **Configurable Retention**: Flexible retention policies
- **Audit Trails**: Complete operation logging
- **Data Classification**: Support for different data types

## API Reference

### Authentication

All API endpoints require authentication. Include your session cookie or API token in requests.

```bash
# Using session cookie
curl -b cookies.txt http://localhost:5000/api/backups/schedules

# Using API token (if implemented)
curl -H "Authorization: Bearer your_token" http://localhost:5000/api/backups/schedules
```

### Endpoints

#### Schedule Management

**GET /api/backups/schedules**
- List all backup schedules
- Returns: Array of schedule objects

**POST /api/backups/schedules**
- Create new backup schedule
- Body: Schedule configuration object
- Returns: Created schedule object

**GET /api/backups/schedules/{server_id}**
- Get schedule for specific server
- Returns: Schedule object or 404

**PUT /api/backups/schedules/{server_id}**
- Update schedule for specific server
- Body: Updated schedule configuration
- Returns: Updated schedule object

**DELETE /api/backups/schedules/{server_id}**
- Delete schedule for specific server
- Returns: Success confirmation

#### Backup Operations

**POST /api/backups/{server_id}/trigger**
- Trigger manual backup
- Returns: Backup operation result

**GET /api/backups/{server_id}/history**
- Get backup history for server
- Returns: Array of backup objects

**GET /api/backups/{server_id}/status**
- Get backup status for server
- Returns: Status object

**GET /api/backups/{server_id}/available**
- List available backups for restore
- Returns: Array of available backup objects

**POST /api/backups/{server_id}/restore**
- Restore backup for server
- Body: Restore configuration
- Returns: Restore operation result

### Response Formats

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

#### Schedule Object
```json
{
  "id": 1,
  "server_id": 1,
  "server_name": "MyServer",
  "schedule_type": "daily",
  "schedule_time": "02:00",
  "retention_days": 30,
  "enabled": true,
  "last_backup": "2025-01-14T02:00:00Z",
  "created_at": "2025-01-14T00:00:00Z"
}
```

#### Backup Object
```json
{
  "filename": "server_backup_20250114_020000.tar.gz",
  "size": 1048576,
  "size_mb": 1.0,
  "created": "2025-01-14T02:00:00Z",
  "age_days": 1.5,
  "checksum": "sha256:abc123...",
  "quality_score": 95,
  "quality_level": "Excellent"
}
```

## Best Practices

### Backup Strategy

#### Frequency Guidelines
- **Production Servers**: Daily backups
- **Development Servers**: Weekly backups
- **Archive Servers**: Monthly backups
- **Critical Data**: Multiple daily backups

#### Retention Guidelines
- **Active Development**: 7-14 days
- **Production**: 30-90 days
- **Compliance**: 1-7 years (as required)
- **Archive**: 1+ years

### Monitoring

#### Key Metrics
- **Success Rate**: >95% backup success rate
- **Verification Rate**: >98% verification success
- **Disk Usage**: <80% backup disk usage
- **Duration**: Monitor backup duration trends

#### Alerting
- **Backup Failures**: Immediate alerts
- **Verification Failures**: Immediate alerts
- **Disk Space**: Alerts at 80% and 90% usage
- **Corruption**: Immediate alerts

### Maintenance

#### Regular Tasks
- **Monitor Logs**: Daily log review
- **Check Disk Space**: Weekly disk usage review
- **Test Restores**: Monthly restore testing
- **Update Retention**: Quarterly retention policy review

#### Backup Testing
- **Restore Testing**: Regular restore tests
- **Verification**: Verify backup integrity
- **Performance**: Monitor backup performance
- **Recovery Time**: Test recovery procedures

### Security

#### Access Control
- **Principle of Least Privilege**: Minimal required access
- **Regular Access Review**: Quarterly access review
- **Strong Authentication**: Use strong passwords/tokens
- **Audit Logging**: Enable comprehensive logging

#### Data Protection
- **Encryption**: Use encryption for sensitive data
- **Secure Storage**: Store backups securely
- **Key Management**: Secure key storage and rotation
- **Compliance**: Follow data protection regulations

---

For additional support or questions, please refer to the main project documentation or contact the development team.
