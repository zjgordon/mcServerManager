# Flask Server Management API Contract Baseline

This document defines the complete API contract for Flask server management endpoints that need to be replicated in the Express.js backend for contract compatibility.

## Base URL
- **Flask Backend**: `http://localhost:5000/api/v1/servers`
- **Express Backend**: `http://localhost:5001/api/v1/servers`

## Authentication
All endpoints require authentication via session cookies. The `login_required` decorator is applied to all routes.

## Endpoints

### 1. GET /api/v1/servers
**Description**: Get list of servers for current user

**Authentication**: Required (login_required)

**Response Format**:
```json
{
  "success": true,
  "servers": [
    {
      "id": 1,
      "server_name": "My Server",
      "version": "1.21.8",
      "port": 25565,
      "status": "Running",
      "pid": 12345,
      "memory_mb": 1024,
      "owner_id": 1,
      "created_at": "2025-09-04T00:00:00Z",
      "updated_at": "2025-09-04T00:00:00Z",
      "is_running": true
    }
  ]
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error loading server list"
}
```

**Status Codes**:
- `200`: Success
- `500`: Server error

---

### 2. POST /api/v1/servers
**Description**: Create a new Minecraft server with full setup

**Authentication**: Required (login_required)

**Request Body**:
```json
{
  "server_name": "My Server",
  "version": "1.21.8",
  "memory_mb": 1024,
  "level_seed": "optional_seed",
  "gamemode": "survival",
  "difficulty": "normal",
  "hardcore": false,
  "pvp": true,
  "spawn_monsters": true,
  "motd": "Welcome to my server!"
}
```

**Response Format**:
```json
{
  "success": true,
  "message": "Server created successfully",
  "server": {
    "id": 1,
    "server_name": "My Server",
    "version": "1.21.8",
    "port": 25565,
    "status": "Stopped",
    "memory_mb": 1024,
    "owner_id": 1,
    "level_seed": "optional_seed",
    "gamemode": "survival",
    "difficulty": "normal",
    "hardcore": false,
    "pvp": true,
    "spawn_monsters": true,
    "motd": "Welcome to my server!"
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "message": "Request body is required"
}
```

```json
{
  "success": false,
  "message": "Server name and version are required"
}
```

```json
{
  "success": false,
  "message": "Invalid server name. Use only letters, numbers, underscores, and hyphens."
}
```

```json
{
  "success": false,
  "message": "Server name already exists"
}
```

**Status Codes**:
- `201`: Server created successfully
- `400`: Bad request (validation errors)
- `500`: Server error

---

### 3. GET /api/v1/servers/{server_id}
**Description**: Get specific server details

**Authentication**: Required (login_required)

**Path Parameters**:
- `server_id` (integer): Server ID

**Response Format**:
```json
{
  "success": true,
  "server": {
    "id": 1,
    "server_name": "My Server",
    "version": "1.21.8",
    "port": 25565,
    "status": "Running",
    "pid": 12345,
    "memory_mb": 1024,
    "owner_id": 1,
    "level_seed": "optional_seed",
    "gamemode": "survival",
    "difficulty": "normal",
    "hardcore": false,
    "pvp": true,
    "spawn_monsters": true,
    "motd": "Welcome to my server!",
    "created_at": "2025-09-04T00:00:00Z",
    "updated_at": "2025-09-04T00:00:00Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Server not found or access denied"
}
```

**Status Codes**:
- `200`: Success
- `404`: Server not found or access denied
- `500`: Server error

---

### 4. POST /api/v1/servers/{server_id}/start
**Description**: Start a Minecraft server

**Authentication**: Required (login_required)

**Path Parameters**:
- `server_id` (integer): Server ID

**Response Format**:
```json
{
  "success": true,
  "message": "Server started successfully",
  "server": {
    "id": 1,
    "status": "Running",
    "pid": 12345
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "message": "Server not found or access denied"
}
```

```json
{
  "success": false,
  "message": "Server is already running"
}
```

```json
{
  "success": false,
  "message": "EULA must be accepted before starting the server",
  "eula_required": true
}
```

```json
{
  "success": false,
  "message": "Server JAR not found: /path/to/server.jar"
}
```

**Status Codes**:
- `200`: Server started successfully
- `400`: Bad request (server already running, EULA not accepted, etc.)
- `404`: Server not found or access denied
- `500`: Server error

---

### 5. POST /api/v1/servers/{server_id}/stop
**Description**: Stop a Minecraft server

**Authentication**: Required (login_required)

**Path Parameters**:
- `server_id` (integer): Server ID

**Response Format**:
```json
{
  "success": true,
  "message": "Server stopped successfully",
  "server": {
    "id": 1,
    "status": "Stopped",
    "pid": null
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "message": "Server not found or access denied"
}
```

```json
{
  "success": false,
  "message": "Server is already stopped"
}
```

```json
{
  "success": false,
  "message": "Permission denied when stopping server My Server"
}
```

**Status Codes**:
- `200`: Server stopped successfully
- `400`: Bad request (server already stopped)
- `404`: Server not found or access denied
- `500`: Server error

---

### 6. GET /api/v1/servers/{server_id}/status
**Description**: Get real-time server status

**Authentication**: Required (login_required)

**Path Parameters**:
- `server_id` (integer): Server ID

**Response Format**:
```json
{
  "success": true,
  "status": {
    "is_running": true,
    "pid": 12345,
    "memory_usage": 512,
    "cpu_usage": 15.5,
    "uptime": 3600
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Server not found or access denied"
}
```

**Status Codes**:
- `200`: Success
- `404`: Server not found or access denied
- `500`: Server error

---

### 7. GET /api/v1/servers/versions
**Description**: Get list of available Minecraft versions

**Authentication**: Required (login_required)

**Response Format**:
```json
{
  "success": true,
  "versions": [
    {
      "id": "1.21.8",
      "type": "release",
      "url": "https://piston-meta.mojang.com/v1/packages/..."
    }
  ]
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Failed to fetch version information"
}
```

**Status Codes**:
- `200`: Success
- `500`: Server error

---

### 8. DELETE /api/v1/servers/{server_id}
**Description**: Delete a server and all its files

**Authentication**: Required (login_required)

**Path Parameters**:
- `server_id` (integer): Server ID

**Response Format**:
```json
{
  "success": true,
  "message": "Server My Server deleted successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Server not found or access denied"
}
```

**Status Codes**:
- `200`: Server deleted successfully
- `404`: Server not found or access denied
- `500`: Server error

---

### 9. POST /api/v1/servers/{server_id}/backup
**Description**: Create a backup of the server files

**Authentication**: Required (login_required)

**Path Parameters**:
- `server_id` (integer): Server ID

**Response Format**:
```json
{
  "success": true,
  "message": "Backup of My Server completed successfully",
  "backup_file": "server_name_20250904120000.tar.gz"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Server not found or access denied"
}
```

**Status Codes**:
- `200`: Backup created successfully
- `404`: Server not found or access denied
- `500`: Server error

---

### 10. POST /api/v1/servers/{server_id}/accept-eula
**Description**: Accept the EULA for a server

**Authentication**: Required (login_required)

**Path Parameters**:
- `server_id` (integer): Server ID

**Response Format**:
```json
{
  "success": true,
  "message": "EULA accepted successfully. You can now start the server."
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "EULA file not found. Please ensure the server is set up correctly."
}
```

**Status Codes**:
- `200`: EULA accepted successfully
- `400`: Bad request (EULA file not found)
- `404`: Server not found or access denied
- `500`: Server error

---

### 11. GET /api/v1/servers/memory-usage
**Description**: Get system memory usage summary

**Authentication**: Required (login_required)

**Response Format**:
```json
{
  "success": true,
  "memory_summary": {
    "total_allocated": 2048,
    "total_available": 8192,
    "utilization_percentage": 25.0
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "An error occurred while fetching memory usage"
}
```

**Status Codes**:
- `200`: Success
- `500`: Server error

---

## Common Response Patterns

### Success Response Structure
All successful responses follow this pattern:
```json
{
  "success": true,
  "message": "Optional success message",
  "data": "Optional response data"
}
```

### Error Response Structure
All error responses follow this pattern:
```json
{
  "success": false,
  "message": "Error description"
}
```

### Authentication
All endpoints require valid session authentication. Unauthenticated requests should return appropriate error responses.

### Access Control
- **Admin users**: Can access all servers
- **Regular users**: Can only access their own servers (where `owner_id` matches their user ID)

### Server Status Values
- `"Stopped"`: Server is not running
- `"Running"`: Server is currently running
- `"Starting"`: Server is in the process of starting
- `"Stopping"`: Server is in the process of stopping
- `"Error"`: Server encountered an error

### Process Management
- Servers are managed as subprocess with Java
- Process IDs (PID) are tracked for running servers
- Graceful termination is attempted first, then force kill if needed
- EULA acceptance is required before starting servers

### File System Operations
- Server files are stored in `/servers/{server_name}/` directory
- Backups are created in `/backups/{server_name}/` directory
- Server JAR files are downloaded from Mojang's official sources
- Server properties are generated from templates

### Memory Management
- Memory allocation is specified in MB
- System memory usage is monitored and reported
- Memory validation ensures reasonable allocation limits

### Version Management
- Minecraft versions are fetched from Mojang's official API
- Version exclusion lists can be configured
- Both release and snapshot versions are supported

## Contract Testing Requirements

When implementing contract-compatible Express routes, ensure:

1. **Exact Response Format**: All responses must match the Flask format exactly
2. **Status Codes**: Use the same HTTP status codes as Flask
3. **Error Messages**: Maintain consistent error message format
4. **Authentication**: Implement the same session-based authentication
5. **Access Control**: Enforce the same user/admin access rules
6. **Data Types**: Ensure all data types match (strings, integers, booleans, etc.)
7. **Field Names**: Use identical field names in responses
8. **Null Handling**: Handle null values the same way as Flask
9. **Date Formatting**: Use ISO 8601 format for timestamps
10. **Validation**: Implement the same validation rules and error responses
