# Middleware Setup and Configuration

This document provides comprehensive information about the middleware setup, configuration, and usage for the Node.js/Express backend.

## Overview

The application uses a comprehensive middleware stack that provides security, performance, logging, and error handling capabilities. All middleware is organized in the `src/middleware/` directory and follows a modular, composable architecture.

## Middleware Architecture

### Core Middleware Components

1. **Security Middleware** (`security.ts`)
   - Helmet.js configuration with comprehensive security headers
   - Custom security middleware for additional protections
   - Request sanitization and security auditing

2. **CORS Middleware** (`cors.ts`)
   - Environment-specific CORS configuration
   - Preflight request handling
   - CORS error handling and logging

3. **Rate Limiting Middleware** (`rateLimiting.ts`)
   - Multiple rate limiting configurations for different endpoint types
   - Redis-based distributed rate limiting
   - Dynamic rate limiting based on user type

4. **Error Handling Middleware** (`errorHandler.ts`)
   - Custom error classes and handling
   - Prisma error handling
   - Comprehensive error logging and formatting

5. **Validation Middleware** (`validation.ts`)
   - Zod-based request validation
   - File upload validation
   - Content type and size validation

6. **Logging Middleware** (`logging.ts`)
   - Request/response logging
   - Performance monitoring
   - Security event logging

7. **Utility Middleware** (`utils.ts`)
   - Middleware composition utilities
   - Conditional middleware application
   - Request ID and response time tracking

## Security Middleware

### Helmet.js Configuration

```typescript
import { setupSecurityMiddleware } from './middleware/security';

app.use(setupSecurityMiddleware());
```

**Security Headers Applied:**
- Content Security Policy (CSP)
- Cross-Origin Embedder Policy
- Cross-Origin Opener Policy
- Cross-Origin Resource Policy
- DNS Prefetch Control
- Expect-CT
- Feature Policy
- Frameguard
- Hide Powered By
- HTTP Strict Transport Security (HSTS)
- IE No Open
- No Sniff
- Origin Agent Cluster
- Permissions Policy
- Referrer Policy
- XSS Filter

### Custom Security Features

```typescript
import { customSecurityMiddleware, sanitizeRequest, securityAuditMiddleware } from './middleware/security';

app.use(customSecurityMiddleware());
app.use(sanitizeRequest());
app.use(securityAuditMiddleware());
```

**Features:**
- Request sanitization (XSS prevention)
- Security audit logging
- Suspicious pattern detection
- Request ID tracking
- Server identification

## CORS Middleware

### Configuration

```typescript
import { setupCorsMiddleware } from './middleware/cors';

app.use(setupCorsMiddleware());
```

**Environment-Specific Origins:**
- **Development**: `http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:3000`, etc.
- **Production**: Configurable production domains

**CORS Features:**
- Credentials support
- Multiple HTTP methods
- Custom headers
- Exposed headers
- Preflight request handling
- Error handling and logging

## Rate Limiting Middleware

### Configuration Types

```typescript
import { createRateLimiters } from './middleware/rateLimiting';

const rateLimiters = createRateLimiters();
app.use('/api/', rateLimiters.general);
app.use('/api/v1/auth/', rateLimiters.auth);
app.use('/api/v1/servers/', rateLimiters.servers);
app.use('/api/v1/admin/', rateLimiters.admin);
```

**Rate Limiting Configurations:**
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **Server Operations**: 20 operations per 5 minutes
- **Admin Operations**: 10 operations per 15 minutes
- **File Uploads**: 10 uploads per hour
- **WebSocket**: 5 connections per minute

### Redis-Based Rate Limiting

```typescript
import { createRedisRateLimiter } from './middleware/rateLimiting';

const redisLimiter = await createRedisRateLimiter('api', 15 * 60 * 1000, 100);
app.use(redisLimiter);
```

**Features:**
- Distributed rate limiting
- Custom key generation
- Trusted IP bypass
- Dynamic user-based limits

## Error Handling Middleware

### Custom Error Classes

```typescript
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError 
} from './middleware/errorHandler';

// Usage examples
throw new ValidationError('Invalid input data');
throw new AuthenticationError('Login required');
throw new NotFoundError('User not found');
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-05T20:30:00.000Z",
  "requestId": "req_1234567890_abc123",
  "details": {
    "field": "username",
    "message": "Username is required"
  }
}
```

### Prisma Error Handling

Automatic handling of Prisma-specific errors:
- `P2002`: Unique constraint violation
- `P2025`: Record not found
- `P2003`: Foreign key constraint violation
- `P2014`: Invalid ID provided
- `P2021`: Table does not exist
- `P2022`: Column does not exist

## Validation Middleware

### Request Validation

```typescript
import { validateRequest, validateBody, validateQuery } from './middleware/validation';
import { z } from 'zod';

const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
});

// Validate request body
app.post('/users', validateBody(userSchema), (req, res) => {
  // req.body is now validated and typed
});

// Validate multiple parts
app.post('/users', validateRequest({
  body: userSchema,
  query: z.object({ page: z.string().optional() })
}), (req, res) => {
  // Both req.body and req.query are validated
});
```

### File Upload Validation

```typescript
import { validateFileUpload } from './middleware/validation';

app.post('/upload', validateFileUpload({
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/zip'],
  maxFiles: 5
}), (req, res) => {
  // Files are validated
});
```

### Content Validation

```typescript
import { validateContentType, validateRequestSize } from './middleware/validation';

app.use(validateContentType(['application/json']));
app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB
```

## Logging Middleware

### Request Logging

```typescript
import { 
  requestLoggingMiddleware,
  detailedRequestLoggingMiddleware,
  performanceLoggingMiddleware 
} from './middleware/logging';

app.use(requestLoggingMiddleware());
app.use(detailedRequestLoggingMiddleware());
app.use(performanceLoggingMiddleware());
```

**Logging Features:**
- Request/response logging
- Performance monitoring
- Security event logging
- Error logging
- Database query logging
- API usage statistics

### Log Format

```json
{
  "timestamp": "2025-01-05T20:30:00.000Z",
  "requestId": "req_1234567890_abc123",
  "method": "POST",
  "path": "/api/v1/users",
  "statusCode": 201,
  "duration": "45ms",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "userId": "user_123"
}
```

## Utility Middleware

### Middleware Composition

```typescript
import { composeMiddleware, conditionalMiddleware } from './middleware/utils';

// Compose multiple middleware
const composedMiddleware = composeMiddleware(
  middleware1,
  middleware2,
  middleware3
);

// Conditional middleware
const conditionalAuth = conditionalMiddleware(
  (req) => req.path.startsWith('/api/'),
  authMiddleware
);
```

### Request Tracking

```typescript
import { requestIdMiddleware, responseTimeMiddleware } from './middleware/utils';

app.use(requestIdMiddleware());
app.use(responseTimeMiddleware());
```

**Features:**
- Unique request ID generation
- Response time tracking
- Request size limiting
- Health check endpoints

## Middleware Testing

### Running Tests

```bash
# Test all middleware
npm run test:middleware

# Validate middleware setup
npm run validate:middleware
```

### Test Coverage

The middleware test suite covers:
- Security headers validation
- CORS configuration testing
- Rate limiting functionality
- Error handling and formatting
- Request validation
- Logging functionality
- Performance monitoring

## Configuration

### Environment Variables

```bash
# Security
NODE_ENV=development
SESSION_SECRET=your-secret-key
CSRF_SECRET=your-csrf-secret

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Custom Configuration

```typescript
// Custom rate limiting
const customLimiter = createCustomKeyRateLimiter(
  (req) => `user:${req.session?.user?.id}`,
  { windowMs: 60000, max: 10 }
);

// Environment-specific middleware
const devMiddleware = onlyInEnvironments(['development'], debugMiddleware);
const prodMiddleware = skipInEnvironments(['development'], securityMiddleware);
```

## Best Practices

### Security
1. Always use HTTPS in production
2. Regularly update security headers
3. Monitor for suspicious patterns
4. Implement proper CORS policies
5. Use rate limiting to prevent abuse

### Performance
1. Monitor response times
2. Use compression for large responses
3. Implement proper caching
4. Optimize database queries
5. Use connection pooling

### Error Handling
1. Use appropriate HTTP status codes
2. Provide meaningful error messages
3. Log errors for debugging
4. Don't expose sensitive information
5. Implement proper error boundaries

### Logging
1. Use structured logging
2. Include request IDs for tracing
3. Log security events
4. Monitor performance metrics
5. Implement log rotation

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check origin configuration
   - Verify preflight requests
   - Ensure credentials are properly configured

2. **Rate Limiting Issues**
   - Check rate limit configuration
   - Verify Redis connection
   - Monitor rate limit headers

3. **Security Header Issues**
   - Check CSP configuration
   - Verify HSTS settings
   - Test with security scanners

4. **Validation Errors**
   - Check Zod schema definitions
   - Verify request format
   - Test with different data types

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Health Checks

Check middleware health:
```bash
curl http://localhost:5001/healthz
```

## Monitoring

### Metrics to Monitor

1. **Security**
   - Failed authentication attempts
   - Suspicious request patterns
   - Rate limit violations

2. **Performance**
   - Response times
   - Request throughput
   - Error rates

3. **Usage**
   - API endpoint usage
   - User activity
   - Resource consumption

### Alerting

Set up alerts for:
- High error rates
- Slow response times
- Security violations
- Rate limit exceeded
- System resource usage

## Future Enhancements

### Planned Features

1. **Advanced Security**
   - JWT token validation
   - API key authentication
   - Advanced threat detection

2. **Performance**
   - Response caching
   - Request deduplication
   - Connection pooling

3. **Monitoring**
   - Prometheus metrics
   - Distributed tracing
   - Real-time dashboards

4. **Validation**
   - Advanced file validation
   - Custom validation rules
   - Schema evolution

The middleware system is designed to be extensible and maintainable, providing a solid foundation for the Node.js/Express backend while ensuring security, performance, and reliability.
