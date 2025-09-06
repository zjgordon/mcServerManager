# Rate Limiting and Security Middleware Implementation

## Overview

This document describes the comprehensive rate limiting and security middleware implementation for the Node.js/Express backend contract routes. The implementation provides enhanced protection for all API endpoints while maintaining Flask API contract compatibility.

## Architecture

### Rate Limiting Layers

1. **Contract-Specific Rate Limiters**: Specialized rate limiting for different endpoint categories
2. **Redis-Based Distributed Rate Limiting**: Scalable rate limiting across multiple instances
3. **Dynamic Rate Limiting**: User-type based rate limiting (admin vs regular users)
4. **Endpoint-Specific Rate Limiting**: Custom limits for resource-intensive operations

### Security Middleware Stack

1. **Contract Security Middleware**: Contract-specific security headers and request tracking
2. **Request Validation**: HTTP method and Content-Type validation
3. **Response Standardization**: Consistent response format across all endpoints
4. **Performance Monitoring**: Request timing and slow request detection
5. **Audit Logging**: Comprehensive logging for sensitive operations
6. **CSRF Protection**: Cross-Site Request Forgery protection for state-changing operations

## Rate Limiting Configuration

### Authentication Endpoints

```typescript
authContract: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => `auth_contract:${req.ip}:${userAgentHash}`,
}
```

**Protected Endpoints:**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/change-password`

### Server Management Endpoints

```typescript
serverContract: {
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 operations per window
  keyGenerator: (req) => `server_contract:${req.ip}:${sessionId}`,
}
```

**Protected Endpoints:**
- `POST /api/v1/servers` (server creation)
- `GET /api/v1/servers` (server listing)
- `GET /api/v1/servers/{id}` (server details)
- `DELETE /api/v1/servers/{id}` (server deletion)

### Server Lifecycle Operations

```typescript
serverLifecycle: {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 start/stop operations per window
  keyGenerator: (req) => `server_lifecycle:${req.ip}:${sessionId}`,
}
```

**Protected Endpoints:**
- `POST /api/v1/servers/{id}/start`
- `POST /api/v1/servers/{id}/stop`

### Backup Operations

```typescript
backupOperations: {
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // 3 backup operations per window
  keyGenerator: (req) => `backup_operations:${req.ip}:${sessionId}`,
}
```

**Protected Endpoints:**
- `POST /api/v1/servers/{id}/backup`

### Admin Endpoints

```typescript
adminContract: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 admin operations per window
  keyGenerator: (req) => `admin_contract:${req.ip}:${sessionId}`,
}
```

**Protected Endpoints:**
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/config`
- `GET /api/v1/admin/stats`
- `PUT /api/v1/admin/config`

### User Management Operations

```typescript
userManagement: {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 user operations per hour
  keyGenerator: (req) => `user_management:${req.ip}:${sessionId}`,
}
```

**Protected Endpoints:**
- `POST /api/v1/admin/users` (user creation)
- `PUT /api/v1/admin/users/{id}` (user updates)
- `DELETE /api/v1/admin/users/{id}` (user deletion)

## Security Features

### Security Headers

All contract routes include comprehensive security headers:

```typescript
// Contract-specific headers
'X-Contract-Version': '1.0.0'
'X-API-Source': 'express-contract'
'X-Request-ID': 'contract_<timestamp>_<random>'

// Standard security headers
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '1; mode=block'
'Server': 'Minecraft-Server-Manager/2.0.0'
```

### Request Validation

- **HTTP Method Validation**: Only allows GET, POST, PUT, DELETE
- **Content-Type Validation**: Requires `application/json` for POST/PUT requests
- **Request Sanitization**: Removes potentially dangerous characters and patterns

### Response Standardization

All contract responses include:

```typescript
{
  success: boolean,
  message?: string,
  data?: any,
  timestamp: string,
  requestId?: string
}
```

### Performance Monitoring

- **Request Timing**: Tracks response times for all requests
- **Slow Request Detection**: Logs requests taking longer than 2 seconds
- **Performance Metrics**: Detailed performance logging for optimization

### Audit Logging

Sensitive operations are logged with:

- Request ID for tracking
- User session information
- IP address and User-Agent
- Request body (for non-GET requests)
- Timestamp and operation details

**Sensitive Paths:**
- `/admin/` - All admin operations
- `/users/` - User management operations
- `/config` - Configuration changes
- `/backup` - Backup operations

## Redis Integration

### Distributed Rate Limiting

```typescript
// Redis key format
`${keyPrefix}:${keyGenerator(req)}`

// Examples
`auth_contract:192.168.1.1:base64UserAgentHash`
`server_contract:192.168.1.1:sessionId123`
`admin_contract:192.168.1.1:sessionId456`
```

### Rate Limit Headers

All rate-limited responses include:

```typescript
'X-Rate-Limit-Limit': '5'
'X-Rate-Limit-Remaining': '3'
'X-Rate-Limit-Reset': '2025-01-06T15:30:00.000Z'
```

## Error Handling

### Rate Limit Exceeded

```typescript
{
  success: false,
  message: 'Too many authentication attempts, please try again later.',
  retryAfter: '15 minutes'
}
```

### Security Violations

```typescript
{
  success: false,
  message: 'Method not allowed'
}

{
  success: false,
  message: 'Content-Type must be application/json'
}

{
  success: false,
  message: 'CSRF token required'
}
```

## Usage Examples

### Applying Rate Limiting to Routes

```typescript
import { createContractRateLimiters } from '../middleware/contractSecurity';

const contractRateLimiters = createContractRateLimiters();

// Apply to specific endpoints
router.post('/login', 
  contractRateLimiters.authContract,
  validateRequest({ body: AuthLoginSchema }),
  loginHandler
);

router.post('/servers',
  contractRateLimiters.serverContract,
  validateRequest({ body: ServerCreateSchema }),
  createServerHandler
);
```

### Applying Security Middleware

```typescript
import {
  contractSecurityMiddleware,
  contractRequestValidation,
  contractResponseStandardization,
  contractPerformanceMonitoring,
  contractAuditLogging,
} from '../middleware/contractSecurity';

// Apply to all routes
router.use(contractSecurityMiddleware);
router.use(contractRequestValidation);
router.use(contractResponseStandardization);
router.use(contractPerformanceMonitoring);
router.use(contractAuditLogging);
```

## Testing

### Running Rate Limiting Tests

```bash
# Test all rate limiting and security features
npm run test:rate:limiting

# Test specific categories
npm run test:rate:limiting -- --category=auth
npm run test:rate:limiting -- --category=server
npm run test:rate:limiting -- --category=admin
```

### Test Categories

1. **Authentication Rate Limiting**: Tests login attempt rate limiting
2. **Server Management Rate Limiting**: Tests server operation rate limiting
3. **Admin Rate Limiting**: Tests admin operation rate limiting
4. **Security Headers**: Validates security header presence
5. **Request Validation**: Tests HTTP method and Content-Type validation
6. **Response Standardization**: Validates response format consistency
7. **Performance Monitoring**: Tests request timing and monitoring
8. **Audit Logging**: Validates sensitive operation logging

## Configuration

### Environment Variables

```bash
# Redis configuration for distributed rate limiting
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Security configuration
NODE_ENV=production
LOG_LEVEL=info
```

### Customization

Rate limiting configurations can be customized by modifying the `contractRateLimitConfigs` object in `src/middleware/contractSecurity.ts`:

```typescript
export const contractRateLimitConfigs = {
  authContract: {
    windowMs: 15 * 60 * 1000, // Customize window
    max: 5, // Customize max requests
    // ... other options
  },
  // ... other configurations
};
```

## Monitoring and Alerting

### Log Analysis

Monitor the following log patterns:

```bash
# Rate limit exceeded
grep "rate limit exceeded" logs/app.log

# Slow requests
grep "slow request" logs/app.log

# Security violations
grep "suspicious request" logs/app.log
```

### Metrics to Monitor

1. **Rate Limit Hits**: Number of rate limit violations per endpoint
2. **Response Times**: Average and 95th percentile response times
3. **Error Rates**: 4xx and 5xx error rates
4. **Security Events**: Number of security violations and suspicious requests

## Best Practices

### Rate Limiting

1. **Gradual Rollout**: Start with higher limits and reduce based on usage patterns
2. **User Feedback**: Provide clear error messages with retry information
3. **Monitoring**: Track rate limit hits to identify abuse patterns
4. **Whitelisting**: Consider whitelisting trusted IPs for development/testing

### Security

1. **Regular Updates**: Keep security middleware and dependencies updated
2. **Log Analysis**: Regularly review security logs for suspicious activity
3. **Header Validation**: Ensure all security headers are properly set
4. **CSRF Protection**: Always require CSRF tokens for state-changing operations

### Performance

1. **Redis Optimization**: Use Redis clustering for high-traffic deployments
2. **Caching**: Implement response caching for frequently accessed endpoints
3. **Monitoring**: Set up alerts for slow requests and high error rates
4. **Load Testing**: Regularly test rate limiting under load

## Troubleshooting

### Common Issues

1. **Rate Limiting Too Strict**: Adjust `max` values in rate limit configurations
2. **Redis Connection Issues**: Check Redis connectivity and fallback behavior
3. **Missing Security Headers**: Verify middleware order and configuration
4. **Performance Issues**: Monitor Redis performance and consider optimization

### Debug Mode

Enable debug logging for detailed rate limiting information:

```bash
LOG_LEVEL=debug npm run dev
```

This will provide detailed information about:
- Rate limit calculations
- Redis operations
- Security header processing
- Request/response timing

## Future Enhancements

1. **Machine Learning**: Implement ML-based rate limiting for adaptive protection
2. **Geolocation**: Add geolocation-based rate limiting
3. **User Behavior**: Implement user behavior analysis for anomaly detection
4. **Advanced Analytics**: Add comprehensive analytics dashboard for monitoring

## Conclusion

The rate limiting and security middleware implementation provides comprehensive protection for all contract routes while maintaining Flask API compatibility. The system is designed to be scalable, configurable, and maintainable, with extensive testing and monitoring capabilities.

Key benefits:
- **Enhanced Security**: Multi-layered security protection
- **Scalable Rate Limiting**: Redis-based distributed rate limiting
- **Comprehensive Monitoring**: Detailed logging and performance tracking
- **Contract Compatibility**: Maintains Flask API contract compatibility
- **Easy Testing**: Comprehensive test suite for validation
- **Production Ready**: Designed for production deployment with monitoring
