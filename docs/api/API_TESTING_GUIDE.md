# API Testing Guide

This guide provides practical examples for testing the Minecraft Server Manager API.

## Prerequisites

- Flask application running on `http://localhost:5000`
- API endpoints available at `http://localhost:5000/api/v1`
- CORS enabled for frontend development

## Testing Tools

### 1. curl

Basic curl command structure:
```bash
curl -X METHOD \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"key": "value"}' \
  http://localhost:5000/api/v1/endpoint
```

### 2. Postman

Import the OpenAPI specification (`api-spec.yaml`) into Postman for interactive testing.

### 3. JavaScript/Fetch

```javascript
const API_BASE = 'http://localhost:5000/api/v1';

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  return response.json();
}
```

## Testing Scenarios

### 1. Initial Setup

#### Check if admin setup is required
```bash
curl -X GET http://localhost:5000/api/v1/auth/setup/status
```

Expected response:
```json
{
  "setup_required": true,
  "has_admin": false
}
```

#### Create admin account
```bash
curl -X POST http://localhost:5000/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SecurePassword123",
    "confirm_password": "SecurePassword123",
    "email": "admin@example.com"
  }'
```

### 2. Authentication Flow

#### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -c cookies.txt \
  -d '{
    "username": "admin",
    "password": "SecurePassword123"
  }'
```

#### Check authentication status
```bash
curl -X GET http://localhost:5000/api/v1/auth/status \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Get current user info
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Logout
```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

### 3. Server Management

#### Get available versions
```bash
curl -X GET http://localhost:5000/api/v1/servers/versions
```

#### Create a new server
```bash
curl -X POST http://localhost:5000/api/v1/servers/ \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -d '{
    "server_name": "Test Server",
    "version": "1.21.8",
    "memory_mb": 1024,
    "gamemode": "survival",
    "difficulty": "normal",
    "motd": "Welcome to Test Server!"
  }'
```

#### List servers
```bash
curl -X GET http://localhost:5000/api/v1/servers/ \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Get server details
```bash
curl -X GET http://localhost:5000/api/v1/servers/1 \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Accept EULA
```bash
curl -X POST http://localhost:5000/api/v1/servers/1/accept-eula \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Start server
```bash
curl -X POST http://localhost:5000/api/v1/servers/1/start \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Check server status
```bash
curl -X GET http://localhost:5000/api/v1/servers/1/status \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Stop server
```bash
curl -X POST http://localhost:5000/api/v1/servers/1/stop \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Create backup
```bash
curl -X POST http://localhost:5000/api/v1/servers/1/backup \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Update server configuration
```bash
curl -X PUT http://localhost:5000/api/v1/servers/1 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -d '{
    "server_name": "Updated Test Server",
    "memory_mb": 2048,
    "gamemode": "creative"
  }'
```

#### Delete server
```bash
curl -X DELETE http://localhost:5000/api/v1/servers/1 \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

### 4. Admin Functions

#### Get system configuration
```bash
curl -X GET http://localhost:5000/api/v1/admin/config \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Update system configuration
```bash
curl -X PUT http://localhost:5000/api/v1/admin/config \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -d '{
    "app_title": "My Server Manager",
    "max_total_mb": 16384,
    "max_server_mb": 8192
  }'
```

#### Get system statistics
```bash
curl -X GET http://localhost:5000/api/v1/admin/stats \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### List users
```bash
curl -X GET http://localhost:5000/api/v1/admin/users \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

#### Create new user
```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -d '{
    "username": "testuser",
    "password": "TestPassword123",
    "email": "test@example.com",
    "is_admin": false
  }'
```

#### Update user
```bash
curl -X PUT http://localhost:5000/api/v1/admin/users/2 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -d '{
    "username": "updateduser",
    "email": "updated@example.com",
    "is_active": true
  }'
```

#### Delete user
```bash
curl -X DELETE http://localhost:5000/api/v1/admin/users/2 \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

### 5. CORS Testing

#### Test preflight request
```bash
curl -X OPTIONS http://localhost:5000/api/v1/auth/status \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type"
```

Expected CORS headers:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
Access-Control-Allow-Credentials: true
```

#### Test actual CORS request
```bash
curl -X GET http://localhost:5000/api/v1/auth/status \
  -H "Origin: http://localhost:3000" \
  -v
```

## Error Testing

### Test invalid authentication
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'
```

Expected response:
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

### Test unauthorized access
```bash
curl -X GET http://localhost:5000/api/v1/servers/
```

Expected response:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Test admin-only endpoint
```bash
curl -X GET http://localhost:5000/api/v1/admin/users \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

(Use a non-admin user's cookies)

Expected response:
```json
{
  "success": false,
  "message": "Admin privileges required"
}
```

### Test invalid server ID
```bash
curl -X GET http://localhost:5000/api/v1/servers/999 \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

Expected response:
```json
{
  "success": false,
  "message": "Server not found or access denied"
}
```

## Frontend Integration Testing

### React Example

```javascript
import React, { useState, useEffect } from 'react';

const ServerManager = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/servers/', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setServers(data.servers);
      } else {
        console.error('Failed to fetch servers:', data.message);
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const startServer = async (serverId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/servers/${serverId}/start`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Server started:', data.message);
        fetchServers(); // Refresh server list
      } else {
        console.error('Failed to start server:', data.message);
      }
    } catch (error) {
      console.error('Error starting server:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Minecraft Servers</h1>
      {servers.map(server => (
        <div key={server.id}>
          <h3>{server.server_name}</h3>
          <p>Status: {server.status}</p>
          <p>Version: {server.version}</p>
          <p>Memory: {server.memory_mb}MB</p>
          <button onClick={() => startServer(server.id)}>
            Start Server
          </button>
        </div>
      ))}
    </div>
  );
};

export default ServerManager;
```

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test login endpoint
ab -n 100 -c 10 -p login.json -T application/json http://localhost:5000/api/v1/auth/login

# Test server list endpoint (requires authentication)
ab -n 100 -c 10 -H "Cookie: session=your-session-cookie" http://localhost:5000/api/v1/servers/
```

### Memory Usage Testing

```bash
# Get memory usage
curl -X GET http://localhost:5000/api/v1/servers/memory-usage \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check that Origin header is set correctly
   - Verify CORS configuration in Flask app
   - Ensure credentials are included in requests

2. **Authentication Issues**
   - Verify session cookies are being sent
   - Check that user is logged in
   - Ensure proper credentials in login request

3. **Server Creation Issues**
   - Check available memory
   - Verify Minecraft version is available
   - Ensure server name is unique

4. **Permission Errors**
   - Verify user has admin privileges for admin endpoints
   - Check server ownership for server operations
   - Ensure proper authentication

### Debug Mode

Enable debug logging in Flask:
```python
app.config['DEBUG'] = True
```

Check server logs for detailed error information.

## Automated Testing

### Python Test Script

```python
import requests
import json

class APITester:
    def __init__(self, base_url='http://localhost:5000/api/v1'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def login(self, username, password):
        response = self.session.post(f'{self.base_url}/auth/login', json={
            'username': username,
            'password': password
        })
        return response.json()
    
    def get_servers(self):
        response = self.session.get(f'{self.base_url}/servers/')
        return response.json()
    
    def create_server(self, server_data):
        response = self.session.post(f'{self.base_url}/servers/', json=server_data)
        return response.json()
    
    def test_full_flow(self):
        # Login
        login_result = self.login('admin', 'SecurePassword123')
        assert login_result['success'], f"Login failed: {login_result['message']}"
        
        # Get servers
        servers_result = self.get_servers()
        assert servers_result['success'], f"Get servers failed: {servers_result['message']}"
        
        # Create server
        server_data = {
            'server_name': 'Test Server',
            'version': '1.21.8',
            'memory_mb': 1024
        }
        create_result = self.create_server(server_data)
        assert create_result['success'], f"Create server failed: {create_result['message']}"
        
        print("All tests passed!")

if __name__ == '__main__':
    tester = APITester()
    tester.test_full_flow()
```

This testing guide provides comprehensive examples for testing all API endpoints and common scenarios.
