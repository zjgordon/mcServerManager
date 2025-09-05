# CORS Configuration for Frontend Development

This document describes the CORS (Cross-Origin Resource Sharing) configuration for the Minecraft Server Manager API to support frontend development.

## Overview

CORS is configured to allow frontend applications running on different ports to communicate with the Flask API. This is essential for modern frontend development workflows using React, Vue, or other frameworks.

## Configuration

### Default Allowed Origins

The following origins are allowed by default for development:

- `http://localhost:3000` - React development server (default)
- `http://localhost:5173` - Vite development server (default)
- `http://127.0.0.1:3000` - React development server (alternative)
- `http://127.0.0.1:5173` - Vite development server (alternative)

### Allowed Methods

- `GET` - Retrieve data
- `POST` - Create new resources
- `PUT` - Update existing resources
- `DELETE` - Remove resources
- `OPTIONS` - Preflight requests
- `PATCH` - Partial updates

### Allowed Headers

- `Content-Type` - Request content type
- `Authorization` - Authentication tokens
- `X-Requested-With` - AJAX requests
- `Accept` - Response format preferences
- `Origin` - Request origin

### Credentials Support

CORS is configured to support credentials (`Access-Control-Allow-Credentials: true`), which allows:
- Cookies to be sent with requests
- Authentication headers to be included
- Session management across origins

## Environment Configuration

### Development

For development, the default configuration supports common frontend development servers:

```bash
# Default configuration (no environment variables needed)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
```

### Production

For production, set the `CORS_ORIGINS` environment variable to your frontend domain:

```bash
# Production example
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### Custom Configuration

You can customize the CORS configuration by setting environment variables:

```bash
# Custom origins (comma-separated)
CORS_ORIGINS=http://localhost:8080,http://localhost:9000

# The following are configured in the application and don't need environment variables:
# CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH
# CORS_ALLOW_HEADERS=Content-Type,Authorization,X-Requested-With,Accept,Origin
# CORS_SUPPORTS_CREDENTIALS=true
```

## API Endpoints

CORS is applied to all API endpoints under `/api/v1/`:

- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/servers/*` - Server management endpoints
- `/api/v1/admin/*` - Admin endpoints

## Security Considerations

### API Endpoints

API endpoints use more permissive security headers to support CORS:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Cache-Control: no-cache, no-store, must-revalidate`

### Web Interface

The web interface (non-API endpoints) maintains full security headers including Content Security Policy.

## Testing CORS

### Using curl

Test preflight request:
```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:5000/api/v1/auth/status
```

Test actual request:
```bash
curl -X GET \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/v1/auth/status
```

### Using JavaScript

```javascript
// Test CORS request
fetch('http://localhost:5000/api/v1/auth/status', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000'
  },
  credentials: 'include' // Include cookies/credentials
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('CORS Error:', error));
```

## Troubleshooting

### Common Issues

1. **CORS Error: "Access to fetch at '...' from origin '...' has been blocked by CORS policy"**
   - Check that your frontend origin is in the `CORS_ORIGINS` list
   - Verify the API endpoint is under `/api/v1/`

2. **Credentials not being sent**
   - Ensure `credentials: 'include'` is set in fetch requests
   - Check that `CORS_SUPPORTS_CREDENTIALS` is `true`

3. **Preflight request failing**
   - Verify the request method is in the allowed methods list
   - Check that custom headers are in the allowed headers list

### Debug Mode

To debug CORS issues, check the browser's Network tab for:
- Preflight OPTIONS requests
- CORS headers in responses
- Error messages in the console

## Frontend Integration Examples

### React with Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Usage
api.get('/auth/status')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

### React with Fetch

```javascript
const apiCall = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/status', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('API Error:', error);
  }
};
```

## Production Deployment

When deploying to production:

1. Update `CORS_ORIGINS` to your production frontend domain
2. Ensure HTTPS is used for both frontend and backend
3. Consider using a reverse proxy (nginx) for additional security
4. Monitor CORS headers in production logs

## Support

For CORS-related issues:
1. Check this documentation
2. Verify environment variables
3. Test with the provided examples
4. Check browser developer tools for detailed error messages
