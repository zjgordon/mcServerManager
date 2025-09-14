# Backup API Endpoints Documentation

## Overview

The Backup API provides comprehensive REST endpoints for managing automated backup operations, schedules, and restoration procedures for Minecraft servers. All endpoints require authentication and return JSON responses.

## Base URL

```
http://localhost:5000/api/backups
```

## Authentication

All endpoints require user authentication. Include your session cookie or authentication token in requests.

### Session Cookie Authentication
```bash
curl -b cookies.txt http://localhost:5000/api/backups/schedules
```

### API Token Authentication (if implemented)
```bash
curl -H "Authorization: Bearer your_token" http://localhost:5000/api/backups/schedules
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 10 requests per minute
- **Create/Update/Delete**: 5 requests per 5 minutes
- **Trigger operations**: 3 requests per 10 minutes

## Error Handling

All endpoints return consistent error responses:

### Error Response Format
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Schedule Management Endpoints

### List All Schedules

**GET** `/api/backups/schedules`

Retrieve all backup schedules. Admin users see all schedules, regular users see only their own server schedules.

#### Request
```bash
curl -X GET http://localhost:5000/api/backups/schedules
```

#### Response
```json
{
  "success": true,
  "schedules": [
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
  ],
  "count": 1
}
```

#### Error Responses
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database or server error

### Create New Schedule

**POST** `/api/backups/schedules`

Create a new backup schedule for a server.

#### Request Body
```json
{
  "server_id": 1,
  "schedule_type": "daily",
  "schedule_time": "02:00",
  "retention_days": 30,
  "enabled": true
}
```

#### Field Descriptions
- `server_id` (required): ID of the server to schedule backups for
- `schedule_type` (required): Schedule frequency - "daily", "weekly", or "monthly"
- `schedule_time` (required): Time to run backups in HH:MM format (24-hour)
- `retention_days` (optional): Days to retain backups (1-365, default: 30)
- `enabled` (optional): Whether schedule is active (default: true)

#### Request
```bash
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

#### Response
```json
{
  "success": true,
  "message": "Backup schedule created successfully",
  "schedule": {
    "id": 1,
    "server_id": 1,
    "server_name": "MyServer",
    "schedule_type": "daily",
    "schedule_time": "02:00",
    "retention_days": 30,
    "enabled": true,
    "created_at": "2025-01-14T00:00:00Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid request data or validation errors
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server not found or access denied
- `409 Conflict`: Schedule already exists for server
- `500 Internal Server Error`: Server error

### Get Schedule for Server

**GET** `/api/backups/schedules/{server_id}`

Retrieve backup schedule for a specific server.

#### Path Parameters
- `server_id`: ID of the server

#### Request
```bash
curl -X GET http://localhost:5000/api/backups/schedules/1
```

#### Response
```json
{
  "success": true,
  "schedule": {
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
}
```

#### Error Responses
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Admin privileges required
- `404 Not Found`: Server or schedule not found
- `500 Internal Server Error`: Server error

### Update Schedule

**PUT** `/api/backups/schedules/{server_id}`

Update backup schedule for a specific server.

#### Path Parameters
- `server_id`: ID of the server

#### Request Body
```json
{
  "schedule_type": "weekly",
  "schedule_time": "03:00",
  "retention_days": 60,
  "enabled": true
}
```

#### Request
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

#### Response
```json
{
  "success": true,
  "message": "Backup schedule updated successfully",
  "schedule": {
    "id": 1,
    "server_id": 1,
    "server_name": "MyServer",
    "schedule_type": "weekly",
    "schedule_time": "03:00",
    "retention_days": 60,
    "enabled": true,
    "last_backup": "2025-01-14T02:00:00Z",
    "created_at": "2025-01-14T00:00:00Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server or schedule not found
- `500 Internal Server Error`: Server error

### Delete Schedule

**DELETE** `/api/backups/schedules/{server_id}`

Delete backup schedule for a specific server.

#### Path Parameters
- `server_id`: ID of the server

#### Request
```bash
curl -X DELETE http://localhost:5000/api/backups/schedules/1
```

#### Response
```json
{
  "success": true,
  "message": "Backup schedule deleted successfully"
}
```

#### Error Responses
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server or schedule not found
- `500 Internal Server Error`: Server error

## Backup Operations Endpoints

### Trigger Manual Backup

**POST** `/api/backups/{server_id}/trigger`

Trigger an immediate backup for a specific server.

#### Path Parameters
- `server_id`: ID of the server to backup

#### Request
```bash
curl -X POST http://localhost:5000/api/backups/1/trigger
```

#### Response
```json
{
  "success": true,
  "message": "Manual backup completed successfully",
  "backup": {
    "server_id": 1,
    "server_name": "MyServer",
    "backup_file": "MyServer_backup_20250114_143000.tar.gz",
    "backup_path": "/path/to/backups/MyServer/MyServer_backup_20250114_143000.tar.gz",
    "size": 1048576,
    "checksum": "sha256:abc123...",
    "duration": 45.2,
    "was_running": true
  }
}
```

#### Error Responses
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server not found or access denied
- `500 Internal Server Error`: Backup failed

### Get Backup History

**GET** `/api/backups/{server_id}/history`

Retrieve backup history for a specific server.

#### Path Parameters
- `server_id`: ID of the server

#### Request
```bash
curl -X GET http://localhost:5000/api/backups/1/history
```

#### Response
```json
{
  "success": true,
  "server_id": 1,
  "server_name": "MyServer",
  "backups": [
    {
      "filename": "MyServer_backup_20250114_020000.tar.gz",
      "size": 1048576,
      "size_mb": 1.0,
      "created": "2025-01-14T02:00:00Z",
      "age_days": 1.5
    },
    {
      "filename": "MyServer_backup_20250113_020000.tar.gz",
      "size": 1048576,
      "size_mb": 1.0,
      "created": "2025-01-13T02:00:00Z",
      "age_days": 2.5
    }
  ],
  "count": 2
}
```

#### Error Responses
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server not found or access denied
- `500 Internal Server Error`: Server error

### Get Backup Status

**GET** `/api/backups/{server_id}/status`

Get backup status and schedule information for a specific server.

#### Path Parameters
- `server_id`: ID of the server

#### Request
```bash
curl -X GET http://localhost:5000/api/backups/1/status
```

#### Response (with schedule)
```json
{
  "success": true,
  "status": {
    "server_id": 1,
    "server_name": "MyServer",
    "has_schedule": true,
    "schedule_type": "daily",
    "schedule_time": "02:00",
    "retention_days": 30,
    "enabled": true,
    "last_backup": "2025-01-14T02:00:00Z",
    "created_at": "2025-01-14T00:00:00Z",
    "scheduled": true,
    "next_run": "2025-01-15T02:00:00Z"
  }
}
```

#### Response (no schedule)
```json
{
  "success": true,
  "server_id": 1,
  "server_name": "MyServer",
  "has_schedule": false,
  "message": "No backup schedule configured"
}
```

#### Error Responses
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server not found or access denied
- `500 Internal Server Error`: Server error

## Restore Operations Endpoints

### List Available Backups

**GET** `/api/backups/{server_id}/available`

List available backups for restoration.

#### Path Parameters
- `server_id`: ID of the server

#### Request
```bash
curl -X GET http://localhost:5000/api/backups/1/available
```

#### Response
```json
{
  "success": true,
  "server_id": 1,
  "server_name": "MyServer",
  "backups": [
    {
      "filename": "MyServer_backup_20250114_020000.tar.gz",
      "filepath": "/path/to/backups/MyServer/MyServer_backup_20250114_020000.tar.gz",
      "size": 1048576,
      "size_mb": 1.0,
      "created": "2025-01-14T02:00:00Z",
      "age_days": 1.5,
      "can_restore": true
    }
  ],
  "count": 1
}
```

#### Error Responses
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server not found or access denied
- `500 Internal Server Error`: Server error

### Trigger Restore

**POST** `/api/backups/{server_id}/restore`

Trigger a backup restoration for a specific server.

#### Path Parameters
- `server_id`: ID of the server

#### Request Body
```json
{
  "backup_filename": "MyServer_backup_20250114_020000.tar.gz",
  "confirm": false
}
```

#### Field Descriptions
- `backup_filename` (required): Name of the backup file to restore
- `confirm` (optional): Whether to actually perform restore (default: false)

#### Preview Request (confirm: false)
```bash
curl -X POST http://localhost:5000/api/backups/1/restore \
  -H "Content-Type: application/json" \
  -d '{
    "backup_filename": "MyServer_backup_20250114_020000.tar.gz",
    "confirm": false
  }'
```

#### Preview Response
```json
{
  "success": true,
  "preview": true,
  "message": "Restore preview - confirmation required",
  "backup_info": {
    "filename": "MyServer_backup_20250114_020000.tar.gz",
    "size_mb": 1.0,
    "created": "2025-01-14T02:00:00Z",
    "server_name": "MyServer"
  },
  "restore_warning": "This will replace the current server files with the backup. Make sure the server is stopped before proceeding."
}
```

#### Confirm Request (confirm: true)
```bash
curl -X POST http://localhost:5000/api/backups/1/restore \
  -H "Content-Type: application/json" \
  -d '{
    "backup_filename": "MyServer_backup_20250114_020000.tar.gz",
    "confirm": true
  }'
```

#### Confirm Response
```json
{
  "success": true,
  "message": "Backup restored successfully",
  "restore_info": {
    "server_id": 1,
    "server_name": "MyServer",
    "backup_filename": "MyServer_backup_20250114_020000.tar.gz",
    "restore_dir": "/path/to/servers/MyServer"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid request data or missing backup file
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Server or backup file not found
- `500 Internal Server Error`: Restore failed

### Get Restore Status

**GET** `/api/backups/restores/{restore_id}/status`

Get status of a restore operation (placeholder implementation).

#### Path Parameters
- `restore_id`: ID of the restore operation

#### Request
```bash
curl -X GET http://localhost:5000/api/backups/restores/1/status
```

#### Response
```json
{
  "success": true,
  "message": "Restore status tracking not yet implemented",
  "restore_id": 1,
  "status": "completed"
}
```

### Rollback Restore

**POST** `/api/backups/restores/{restore_id}/rollback`

Rollback a restore operation (placeholder implementation).

#### Path Parameters
- `restore_id`: ID of the restore operation to rollback

#### Request
```bash
curl -X POST http://localhost:5000/api/backups/restores/1/rollback
```

#### Response
```json
{
  "success": true,
  "message": "Rollback functionality not yet implemented",
  "restore_id": 1
}
```

## Data Models

### Schedule Object
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
  "created_at": "2025-01-14T00:00:00Z",
  "scheduled": true,
  "next_run": "2025-01-15T02:00:00Z"
}
```

### Backup Object
```json
{
  "filename": "MyServer_backup_20250114_020000.tar.gz",
  "filepath": "/path/to/backups/MyServer/MyServer_backup_20250114_020000.tar.gz",
  "size": 1048576,
  "size_mb": 1.0,
  "created": "2025-01-14T02:00:00Z",
  "age_days": 1.5,
  "checksum": "sha256:abc123...",
  "quality_score": 95,
  "quality_level": "Excellent",
  "can_restore": true
}
```

### Backup Result Object
```json
{
  "success": true,
  "backup_file": "/path/to/backups/MyServer/MyServer_backup_20250114_143000.tar.gz",
  "backup_filename": "MyServer_backup_20250114_143000.tar.gz",
  "size": 1048576,
  "checksum": "sha256:abc123...",
  "duration": 45.2,
  "was_running": true,
  "verification_details": {
    "overall_valid": true,
    "quality_score": 95,
    "quality_level": "Excellent"
  },
  "compression_method": "gzip",
  "encryption_enabled": false
}
```

## Usage Examples

### Complete Backup Workflow

```bash
# 1. Create a backup schedule
curl -X POST http://localhost:5000/api/backups/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": 1,
    "schedule_type": "daily",
    "schedule_time": "02:00",
    "retention_days": 30,
    "enabled": true
  }'

# 2. Check schedule status
curl -X GET http://localhost:5000/api/backups/1/status

# 3. Trigger manual backup
curl -X POST http://localhost:5000/api/backups/1/trigger

# 4. Check backup history
curl -X GET http://localhost:5000/api/backups/1/history

# 5. List available backups for restore
curl -X GET http://localhost:5000/api/backups/1/available

# 6. Preview restore
curl -X POST http://localhost:5000/api/backups/1/restore \
  -H "Content-Type: application/json" \
  -d '{
    "backup_filename": "MyServer_backup_20250114_020000.tar.gz",
    "confirm": false
  }'

# 7. Confirm restore
curl -X POST http://localhost:5000/api/backups/1/restore \
  -H "Content-Type: application/json" \
  -d '{
    "backup_filename": "MyServer_backup_20250114_020000.tar.gz",
    "confirm": true
  }'
```

### Error Handling Example

```bash
# Example of handling errors
response=$(curl -s -X POST http://localhost:5000/api/backups/schedules \
  -H "Content-Type: application/json" \
  -d '{"server_id": 999, "schedule_type": "daily", "schedule_time": "02:00"}')

# Check if request was successful
if echo "$response" | jq -e '.success' > /dev/null; then
  echo "Schedule created successfully"
  echo "$response" | jq '.schedule'
else
  echo "Error: $(echo "$response" | jq -r '.error')"
  exit 1
fi
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints** (GET): 10 requests per minute
- **Modification endpoints** (POST/PUT/DELETE): 5 requests per 5 minutes  
- **Trigger operations** (backup/restore): 3 requests per 10 minutes

When rate limited, the API returns:
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## Security Considerations

- All endpoints require authentication
- Users can only access their own server backups
- Admins can access all server backups
- All operations are logged for audit purposes
- Sensitive operations (restore) require explicit confirmation
- Rate limiting prevents abuse and DoS attacks

## Troubleshooting

### Common Issues

1. **Authentication Errors (401)**
   - Ensure you're logged in and have a valid session
   - Check that cookies are being sent with requests

2. **Permission Errors (403)**
   - Verify you have access to the requested server
   - Check if admin privileges are required

3. **Not Found Errors (404)**
   - Verify the server ID exists
   - Check that the backup file exists

4. **Validation Errors (400)**
   - Check request body format and required fields
   - Verify data types and value ranges

5. **Server Errors (500)**
   - Check application logs for detailed error information
   - Verify server configuration and dependencies

For additional support, refer to the main backup scheduling documentation or contact the development team.
