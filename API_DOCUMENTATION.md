# Minecraft Server Manager API Documentation

This document provides comprehensive documentation for the Minecraft Server Manager REST API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Authentication API](#authentication-api)
7. [Server Management API](#server-management-api)
8. [Admin API](#admin-api)
9. [Data Models](#data-models)
10. [Examples](#examples)

## Overview

The Minecraft Server Manager API provides RESTful endpoints for managing Minecraft servers, user authentication, and administrative functions. The API is designed to support both web interface and modern frontend applications.

### Features

- **User Authentication**: Login, logout, password management
- **Server Management**: Create, start, stop, backup, and delete servers
- **Admin Functions**: User management, system configuration, statistics
- **CORS Support**: Full CORS support for frontend development
- **Security**: Rate limiting, input validation, audit logging

## Authentication

The API uses session-based authentication with Flask-Login. Users must be logged in to access most endpoints.

### Authentication Flow

1. **Login**: `POST /api/v1/auth/login`
2. **Access Protected Endpoints**: Include session cookies
3. **Logout**: `POST /api/v1/auth/logout`

### Admin Access

Admin-only endpoints require the user to have `is_admin: true` in their user record.

## Base URL

```
http://localhost:5000/api/v1
```

## Response Format

All API responses follow a consistent JSON format:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Common Error Messages

- `"Request body is required"` - Missing JSON body
- `"Authentication required"` - User not logged in
- `"Admin privileges required"` - Admin access needed
- `"Resource not found"` - Invalid ID or missing resource
- `"Validation error"` - Invalid input data

---

## Authentication API

Base path: `/api/v1/auth`

### POST /auth/login

Authenticate user and create session.

**Request Body:**
```json
{
  "username": "admin",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "is_admin": true,
    "email": "admin@example.com",
    "is_active": true,
    "last_login": "2025-09-04T16:20:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing username/password
- `401` - Invalid credentials
- `429` - Too many login attempts

### POST /auth/logout

Logout user and clear session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me

Get current user information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "is_admin": true,
    "email": "admin@example.com",
    "is_active": true,
    "last_login": "2025-09-04T16:20:00.000Z"
  }
}
```

### GET /auth/status

Check authentication status.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin",
    "is_admin": true
  }
}
```

### POST /auth/change-password

Change user password.

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword",
  "confirm_password": "newpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### POST /auth/setup

Set up initial admin account (first run only).

**Request Body:**
```json
{
  "username": "admin",
  "password": "securepassword",
  "confirm_password": "securepassword",
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "user": {
    "id": 1,
    "username": "admin",
    "is_admin": true
  }
}
```

### GET /auth/setup/status

Check if admin setup is required.

**Response:**
```json
{
  "setup_required": false,
  "has_admin": true
}
```

### POST /auth/reset-password

Reset user password (admin or self).

**Request Body:**
```json
{
  "user_id": 2,
  "new_password": "newpassword",
  "confirm_password": "newpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully for username"
}
```

---

## Server Management API

Base path: `/api/v1/servers`

### GET /servers/

List all servers (admin sees all, users see only their own).

**Response:**
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
      "level_seed": "12345",
      "gamemode": "survival",
      "difficulty": "normal",
      "hardcore": false,
      "pvp": true,
      "spawn_monsters": true,
      "motd": "Welcome to my server!",
      "created_at": "2025-09-04T16:20:00.000Z",
      "updated_at": "2025-09-04T16:20:00.000Z"
    }
  ]
}
```

### POST /servers/

Create a new Minecraft server.

**Request Body:**
```json
{
  "server_name": "My Server",
  "version": "1.21.8",
  "memory_mb": 1024,
  "level_seed": "12345",
  "gamemode": "survival",
  "difficulty": "normal",
  "hardcore": false,
  "pvp": true,
  "spawn_monsters": true,
  "motd": "Welcome to my server!"
}
```

**Response:**
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
    "level_seed": "12345",
    "gamemode": "survival",
    "difficulty": "normal",
    "hardcore": false,
    "pvp": true,
    "spawn_monsters": true,
    "motd": "Welcome to my server!"
  }
}
```

### GET /servers/{id}

Get server details.

**Response:**
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
    "level_seed": "12345",
    "gamemode": "survival",
    "difficulty": "normal",
    "hardcore": false,
    "pvp": true,
    "spawn_monsters": true,
    "motd": "Welcome to my server!",
    "created_at": "2025-09-04T16:20:00.000Z",
    "updated_at": "2025-09-04T16:20:00.000Z"
  }
}
```

### PUT /servers/{id}

Update server configuration.

**Request Body:**
```json
{
  "server_name": "Updated Server Name",
  "memory_mb": 2048,
  "gamemode": "creative",
  "difficulty": "hard",
  "motd": "Updated MOTD"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Server updated successfully",
  "server": {
    "id": 1,
    "server_name": "Updated Server Name",
    "memory_mb": 2048,
    "gamemode": "creative",
    "difficulty": "hard",
    "motd": "Updated MOTD"
  }
}
```

### DELETE /servers/{id}

Delete server and all its files.

**Response:**
```json
{
  "success": true,
  "message": "Server My Server deleted successfully"
}
```

### POST /servers/{id}/start

Start a Minecraft server.

**Response:**
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

**Error Responses:**
- `400` - Server already running or EULA not accepted
- `404` - Server not found

### POST /servers/{id}/stop

Stop a Minecraft server.

**Response:**
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

### GET /servers/{id}/status

Get server status and process information.

**Response:**
```json
{
  "success": true,
  "status": "Running",
  "pid": 12345,
  "process_info": {
    "cpu_percent": 15.5,
    "memory_mb": 512,
    "create_time": "2025-09-04T16:20:00.000Z"
  }
}
```

### POST /servers/{id}/backup

Create a backup of the server files.

**Response:**
```json
{
  "success": true,
  "message": "Backup of My Server completed successfully",
  "backup_file": "My_Server_20250904162000.tar.gz"
}
```

### POST /servers/{id}/accept-eula

Accept the EULA for a server.

**Response:**
```json
{
  "success": true,
  "message": "EULA accepted successfully. You can now start the server."
}
```

### GET /servers/versions

Get available Minecraft versions.

**Response:**
```json
{
  "success": true,
  "versions": {
    "latest_release": "1.21.8",
    "latest_snapshot": "24w35a",
    "releases": [
      "1.21.8",
      "1.21.7",
      "1.21.6"
    ],
    "snapshots": [
      "24w35a",
      "24w34a",
      "24w33a"
    ]
  }
}
```

### GET /servers/memory-usage

Get system memory usage summary.

**Response:**
```json
{
  "success": true,
  "memory_summary": {
    "total_allocated": 2048,
    "total_available": 8192,
    "utilization_percentage": 25.0,
    "servers": [
      {
        "id": 1,
        "server_name": "My Server",
        "memory_mb": 1024,
        "status": "Running"
      }
    ]
  }
}
```

---

## Admin API

Base path: `/api/v1/admin`

### GET /admin/config

Get system configuration (admin only).

**Response:**
```json
{
  "success": true,
  "config": {
    "app_title": "Minecraft Server Manager",
    "server_hostname": "localhost",
    "max_total_mb": 8192,
    "max_server_mb": 4096,
    "default_server_mb": 1024
  }
}
```

### PUT /admin/config

Update system configuration (admin only).

**Request Body:**
```json
{
  "app_title": "My Server Manager",
  "server_hostname": "myserver.com",
  "max_total_mb": 16384,
  "max_server_mb": 8192
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "config": {
    "app_title": "My Server Manager",
    "server_hostname": "myserver.com",
    "max_total_mb": 16384,
    "max_server_mb": 8192
  }
}
```

### GET /admin/stats

Get system statistics (admin only).

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_servers": 5,
    "running_servers": 2,
    "total_users": 3,
    "total_memory_allocated": 3072,
    "system_memory_usage": 45.5,
    "disk_usage": {
      "total_gb": 100,
      "used_gb": 25,
      "free_gb": 75
    }
  }
}
```

### GET /admin/users

List all users (admin only).

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "is_admin": true,
      "is_active": true,
      "created_at": "2025-09-04T16:20:00.000Z",
      "last_login": "2025-09-04T16:20:00.000Z",
      "server_count": 2
    }
  ]
}
```

### POST /admin/users

Create a new user (admin only).

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword",
  "email": "user@example.com",
  "is_admin": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "user@example.com",
    "is_admin": false,
    "is_active": true
  }
}
```

### PUT /admin/users/{id}

Update user details (admin only).

**Request Body:**
```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "is_admin": false,
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 2,
    "username": "updateduser",
    "email": "updated@example.com",
    "is_admin": false,
    "is_active": true
  }
}
```

### DELETE /admin/users/{id}

Delete a user (admin only).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Data Models

### User

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "is_admin": true,
  "is_active": true,
  "created_at": "2025-09-04T16:20:00.000Z",
  "last_login": "2025-09-04T16:20:00.000Z"
}
```

### Server

```json
{
  "id": 1,
  "server_name": "My Server",
  "version": "1.21.8",
  "port": 25565,
  "status": "Running",
  "pid": 12345,
  "memory_mb": 1024,
  "owner_id": 1,
  "level_seed": "12345",
  "gamemode": "survival",
  "difficulty": "normal",
  "hardcore": false,
  "pvp": true,
  "spawn_monsters": true,
  "motd": "Welcome to my server!",
  "created_at": "2025-09-04T16:20:00.000Z",
  "updated_at": "2025-09-04T16:20:00.000Z"
}
```

### Game Mode Values

- `survival` - Survival mode
- `creative` - Creative mode
- `adventure` - Adventure mode
- `spectator` - Spectator mode

### Difficulty Values

- `peaceful` - Peaceful difficulty
- `easy` - Easy difficulty
- `normal` - Normal difficulty
- `hard` - Hard difficulty

### Server Status Values

- `Stopped` - Server is not running
- `Running` - Server is running
- `Starting` - Server is starting up
- `Stopping` - Server is shutting down

---

## Examples

### Complete Server Creation Flow

1. **Check available versions:**
```bash
curl -X GET http://localhost:5000/api/v1/servers/versions
```

2. **Create server:**
```bash
curl -X POST http://localhost:5000/api/v1/servers/ \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "My Test Server",
    "version": "1.21.8",
    "memory_mb": 1024,
    "gamemode": "survival",
    "difficulty": "normal"
  }'
```

3. **Accept EULA:**
```bash
curl -X POST http://localhost:5000/api/v1/servers/1/accept-eula
```

4. **Start server:**
```bash
curl -X POST http://localhost:5000/api/v1/servers/1/start
```

5. **Check status:**
```bash
curl -X GET http://localhost:5000/api/v1/servers/1/status
```

### Frontend Integration Example

```javascript
// API client setup
const API_BASE = 'http://localhost:5000/api/v1';

class MinecraftAPI {
  async login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    return response.json();
  }

  async getServers() {
    const response = await fetch(`${API_BASE}/servers/`, {
      credentials: 'include'
    });
    return response.json();
  }

  async createServer(serverData) {
    const response = await fetch(`${API_BASE}/servers/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(serverData)
    });
    return response.json();
  }

  async startServer(serverId) {
    const response = await fetch(`${API_BASE}/servers/${serverId}/start`, {
      method: 'POST',
      credentials: 'include'
    });
    return response.json();
  }
}

// Usage
const api = new MinecraftAPI();

// Login
const loginResult = await api.login('admin', 'password');
if (loginResult.success) {
  console.log('Logged in:', loginResult.user);
  
  // Get servers
  const serversResult = await api.getServers();
  console.log('Servers:', serversResult.servers);
  
  // Create new server
  const newServer = await api.createServer({
    server_name: 'My New Server',
    version: '1.21.8',
    memory_mb: 1024
  });
  
  if (newServer.success) {
    // Start the server
    const startResult = await api.startServer(newServer.server.id);
    console.log('Server started:', startResult);
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 200 requests per day, 50 per hour, 10 per minute
- **Login**: 5 attempts per 5 minutes per username
- **Admin endpoints**: Same as general API

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time

## Security

### Authentication
- Session-based authentication with Flask-Login
- Password hashing with Werkzeug
- Rate limiting on login attempts

### Authorization
- Role-based access control (admin vs regular user)
- Resource ownership validation
- Admin-only endpoints protection

### Input Validation
- Request body validation
- SQL injection prevention
- XSS protection
- File upload security

### Audit Logging
- All authentication events logged
- Admin actions tracked
- Security events recorded

## Support

For API support and questions:
1. Check this documentation
2. Review error messages and status codes
3. Check server logs for detailed error information
4. Verify authentication and permissions
