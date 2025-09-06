# Flask Admin API Contract Baseline

**Document Version:** 1.0  
**Generated:** January 5, 2025  
**Purpose:** Contract testing baseline for Flask admin API endpoints

## Overview

This document provides the complete contract specification for Flask admin API endpoints that need to be migrated to Express.js. All endpoints require admin authentication and provide user management, system configuration, and system statistics functionality.

## Base URL
- **Flask Backend:** `http://localhost:5000/api/v1/admin`
- **Express Backend:** `http://localhost:5001/api/v1/admin`

## Authentication
All admin endpoints require:
- Valid session authentication
- Admin user privileges (`is_admin: true`)
- CSRF token for state-changing operations

## Admin API Endpoints

### 1. GET /api/v1/admin/users
**Description:** Get list of all users (admin only)

**Request:**
```http
GET /api/v1/admin/users
Cookie: mcserver_session=<session_cookie>
X-CSRFToken: <csrf_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "is_admin": true,
      "server_count": 3,
      "total_memory_allocated": 3072,
      "created_at": "2025-01-05T00:00:00Z"
    },
    {
      "id": 2,
      "username": "user1",
      "is_admin": false,
      "server_count": 1,
      "total_memory_allocated": 1024,
      "created_at": "2025-01-05T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- **403 Forbidden:** Admin access required
- **500 Internal Server Error:** Database error

---

### 2. POST /api/v1/admin/users
**Description:** Create a new user (admin only)

**Request:**
```http
POST /api/v1/admin/users
Content-Type: application/json
Cookie: mcserver_session=<session_cookie>
X-CSRFToken: <csrf_token>

{
  "username": "newuser",
  "password": "securepassword",
  "is_admin": false
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 3,
    "username": "newuser",
    "is_admin": false
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid input data
- **403 Forbidden:** Admin access required
- **500 Internal Server Error:** Database error

**Validation Rules:**
- Username: 3-50 characters, alphanumeric + underscore only
- Password: Minimum 8 characters
- Username must be unique

---

### 3. PUT /api/v1/admin/users/{user_id}
**Description:** Update user information (admin only)

**Request:**
```http
PUT /api/v1/admin/users/2
Content-Type: application/json
Cookie: mcserver_session=<session_cookie>
X-CSRFToken: <csrf_token>

{
  "username": "updateduser",
  "is_admin": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 2,
    "username": "updateduser",
    "is_admin": true
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid input data
- **403 Forbidden:** Admin access required
- **404 Not Found:** User not found
- **500 Internal Server Error:** Database error

---

### 4. DELETE /api/v1/admin/users/{user_id}
**Description:** Delete a user (admin only)

**Request:**
```http
DELETE /api/v1/admin/users/2
Cookie: mcserver_session=<session_cookie>
X-CSRFToken: <csrf_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- **400 Bad Request:** Cannot delete own account
- **403 Forbidden:** Admin access required
- **404 Not Found:** User not found
- **500 Internal Server Error:** Database error

**Business Rules:**
- Cannot delete own account
- Deleting user also deletes all their servers

---

### 5. GET /api/v1/admin/config
**Description:** Get system configuration (admin only)

**Request:**
```http
GET /api/v1/admin/config
Cookie: mcserver_session=<session_cookie>
X-CSRFToken: <csrf_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "config": {
    "max_total_memory_mb": 8192,
    "default_server_memory_mb": 1024,
    "min_server_memory_mb": 512,
    "max_server_memory_mb": 4096
  }
}
```

**Error Responses:**
- **403 Forbidden:** Admin access required
- **500 Internal Server Error:** Configuration error

---

### 6. PUT /api/v1/admin/config
**Description:** Update system configuration (admin only)

**Request:**
```http
PUT /api/v1/admin/config
Content-Type: application/json
Cookie: mcserver_session=<session_cookie>
X-CSRFToken: <csrf_token>

{
  "max_total_memory_mb": 8192,
  "default_server_memory_mb": 1024,
  "min_server_memory_mb": 512,
  "max_server_memory_mb": 4096
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "System configuration updated successfully",
  "config": {
    "max_total_memory_mb": 8192,
    "default_server_memory_mb": 1024,
    "min_server_memory_mb": 512,
    "max_server_memory_mb": 4096
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid configuration values
- **403 Forbidden:** Admin access required
- **500 Internal Server Error:** Configuration error

**Validation Rules:**
- max_total_memory_mb: Minimum 1024 MB
- min_server_memory_mb < max_server_memory_mb

---

### 7. GET /api/v1/admin/stats
**Description:** Get system statistics (admin only)

**Request:**
```http
GET /api/v1/admin/stats
Cookie: mcserver_session=<session_cookie>
X-CSRFToken: <csrf_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total_users": 5,
    "total_servers": 12,
    "running_servers": 8,
    "total_memory_allocated": 8192,
    "memory_usage_summary": {
      "total_allocated": 8192,
      "total_available": 16384,
      "utilization_percentage": 50.0
    }
  }
}
```

**Error Responses:**
- **403 Forbidden:** Admin access required
- **500 Internal Server Error:** Statistics error

---

## Common Error Response Format

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Authentication Requirements

All admin endpoints require:
1. **Session Authentication:** Valid session cookie
2. **Admin Privileges:** User must have `is_admin: true`
3. **CSRF Protection:** CSRF token for state-changing operations (POST, PUT, DELETE)

## Rate Limiting

Admin endpoints are subject to the same rate limiting as other API endpoints:
- **General API:** 100 requests per 15 minutes per IP
- **Authentication:** 5 login attempts per 15 minutes per IP

## Security Considerations

1. **Admin Access Control:** All endpoints verify admin privileges
2. **Input Validation:** Comprehensive validation for all inputs
3. **CSRF Protection:** State-changing operations require CSRF tokens
4. **Audit Logging:** All admin operations are logged
5. **Data Sanitization:** All inputs are sanitized before processing

## Contract Testing Requirements

The contract testing framework must validate:
1. **Response Format:** Exact JSON structure matching
2. **Status Codes:** Correct HTTP status codes
3. **Error Handling:** Proper error response format
4. **Authentication:** Admin access control
5. **Validation:** Input validation and error responses
6. **Business Logic:** User deletion rules, configuration validation

## Migration Notes

- All endpoints maintain exact Flask API compatibility
- Response formats must match exactly for frontend compatibility
- Error handling must be consistent with Flask implementation
- Authentication and authorization logic must be preserved
- Database operations must maintain data integrity
