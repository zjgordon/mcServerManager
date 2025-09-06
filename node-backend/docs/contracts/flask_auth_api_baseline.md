# Flask Authentication API Contract Baseline

This document defines the contract baseline for Flask authentication API endpoints that will be migrated to Express.js. All Express.js implementations must maintain exact API contract compatibility.

## Base URL
- **Flask**: `http://localhost:5000/api/v1/auth`
- **Express**: `http://localhost:5001/api/v1/auth`

## Authentication Endpoints

### 1. GET /csrf-token
**Purpose**: Get CSRF token for API requests

**Request**:
```http
GET /api/v1/auth/csrf-token
```

**Response** (200 OK):
```json
{
  "csrf_token": "string"
}
```

**Error Response** (500):
```json
{
  "success": false,
  "message": "An error occurred while generating CSRF token"
}
```

---

### 2. POST /login
**Purpose**: Authenticate user and create session

**Request**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Success Response** (200 OK):
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
    "last_login": "2025-01-05T10:30:00.000Z"
  }
}
```

**Error Responses**:
- **400 Bad Request** (Missing data):
```json
{
  "success": false,
  "message": "Request body is required"
}
```

- **400 Bad Request** (Missing fields):
```json
{
  "success": false,
  "message": "Username and password are required"
}
```

- **401 Unauthorized** (Invalid credentials):
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

- **429 Too Many Requests** (Rate limited):
```json
{
  "success": false,
  "message": "Too many login attempts. Please try again in 5 minutes."
}
```

- **500 Internal Server Error**:
```json
{
  "success": false,
  "message": "An error occurred during login"
}
```

---

### 3. POST /logout
**Purpose**: Logout current user and destroy session

**Request**:
```http
POST /api/v1/auth/logout
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Response** (500):
```json
{
  "success": false,
  "message": "An error occurred during logout"
}
```

**Note**: Requires authentication (401 if not authenticated)

---

### 4. GET /me
**Purpose**: Get current user information

**Request**:
```http
GET /api/v1/auth/me
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "is_admin": true,
    "server_count": 3,
    "total_memory_allocated": 3072
  }
}
```

**Error Response** (500):
```json
{
  "success": false,
  "message": "An error occurred while fetching user information"
}
```

**Note**: Requires authentication (401 if not authenticated)

---

### 5. GET /status
**Purpose**: Check authentication status

**Request**:
```http
GET /api/v1/auth/status
```

**Success Response** (200 OK) - Authenticated:
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

**Success Response** (200 OK) - Not Authenticated:
```json
{
  "authenticated": false
}
```

**Error Response** (500):
```json
{
  "authenticated": false,
  "error": "An error occurred while checking authentication status"
}
```

---

### 6. POST /change-password
**Purpose**: Change user password

**Request**:
```http
POST /api/v1/auth/change-password
Content-Type: application/json

{
  "current_password": "string",
  "new_password": "string"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses**:
- **400 Bad Request** (Missing data):
```json
{
  "success": false,
  "message": "Request body is required"
}
```

- **400 Bad Request** (Missing fields):
```json
{
  "success": false,
  "message": "Current password and new password are required"
}
```

- **400 Bad Request** (Password validation):
```json
{
  "success": false,
  "message": "Password validation error message"
}
```

- **401 Unauthorized** (Wrong current password):
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

- **500 Internal Server Error**:
```json
{
  "success": false,
  "message": "An error occurred while changing password"
}
```

**Note**: Requires authentication (401 if not authenticated)

---

### 7. POST /setup
**Purpose**: Set up the initial admin account on first run

**Request**:
```http
POST /api/v1/auth/setup
Content-Type: application/json

{
  "username": "admin",
  "password": "securepassword",
  "confirm_password": "securepassword",
  "email": "admin@example.com"
}
```

**Success Response** (201 Created):
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

**Error Responses**:
- **400 Bad Request** (Already set up):
```json
{
  "success": false,
  "message": "Admin account is already set up"
}
```

- **400 Bad Request** (Validation errors):
```json
{
  "success": false,
  "message": "Validation error message"
}
```

- **500 Internal Server Error**:
```json
{
  "success": false,
  "message": "An error occurred while setting up admin account"
}
```

---

### 8. GET /setup/status
**Purpose**: Check if admin setup is required

**Request**:
```http
GET /api/v1/auth/setup/status
```

**Success Response** (200 OK):
```json
{
  "setup_required": true,
  "has_admin": false
}
```

**Error Response** (500):
```json
{
  "success": false,
  "message": "An error occurred while checking setup status"
}
```

---

### 9. POST /reset-password
**Purpose**: Reset user password (admin only for other users, self for own password)

**Request**:
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "user_id": 2,
  "new_password": "newpassword",
  "confirm_password": "newpassword"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset successfully for username"
}
```

**Error Responses**:
- **400 Bad Request** (Missing data):
```json
{
  "success": false,
  "message": "Request body is required"
}
```

- **400 Bad Request** (Validation errors):
```json
{
  "success": false,
  "message": "Validation error message"
}
```

- **403 Forbidden** (Not admin):
```json
{
  "success": false,
  "message": "Admin privileges required"
}
```

- **500 Internal Server Error**:
```json
{
  "success": false,
  "message": "An error occurred while resetting password"
}
```

**Note**: Requires authentication (401 if not authenticated)

---

## Common Response Patterns

### Success Response Structure
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }  // Optional additional data
}
```

### Error Response Structure
```json
{
  "success": false,
  "message": "Error description"
}
```

### Authentication Required
All endpoints except `/csrf-token`, `/login`, `/setup`, `/setup/status`, and `/status` require authentication. Unauthenticated requests return 401.

### Rate Limiting
- Login endpoint: 5 attempts per 5 minutes per username
- Other endpoints: Standard rate limiting applies

### CSRF Protection
All state-changing operations (POST, PUT, DELETE) require valid CSRF token in request headers.

### Session Management
- Sessions are cookie-based with secure, HTTP-only cookies
- Session timeout: 24 hours (configurable)
- Automatic session refresh on activity

---

## Migration Requirements

1. **Exact API Contract**: All Express.js endpoints must maintain exact request/response format compatibility
2. **Status Codes**: All HTTP status codes must match exactly
3. **Error Messages**: Error messages should be identical or equivalent
4. **Authentication**: Session-based authentication with same cookie configuration
5. **Rate Limiting**: Same rate limiting behavior and error responses
6. **CSRF Protection**: Same CSRF token generation and validation
7. **Validation**: Same input validation rules and error responses

## Testing Strategy

1. **Contract Tests**: Automated tests comparing Flask vs Express responses
2. **Integration Tests**: End-to-end authentication flow testing
3. **Error Testing**: All error scenarios and edge cases
4. **Performance Testing**: Response time and throughput comparison
5. **Security Testing**: Authentication, authorization, and CSRF validation
