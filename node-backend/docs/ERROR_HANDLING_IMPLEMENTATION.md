# Comprehensive Error Handling Implementation

## Overview

This document describes the comprehensive error handling implementation for the Node.js/Express backend contract routes. The implementation provides robust error handling while maintaining Flask API contract compatibility and ensuring consistent error responses across all endpoints.

## Architecture

### Error Handling Layers

1. **Contract-Specific Error Classes**: Specialized error classes for different error types
2. **Contract Error Handler Middleware**: Centralized error handling with Flask API compatibility
3. **Error Recovery Middleware**: Attempts to recover from certain types of errors
4. **Error Metrics Middleware**: Tracks error metrics for monitoring
5. **Error Sanitization Middleware**: Sanitizes error messages for production
6. **Error Logging Middleware**: Comprehensive error logging with context

### Error Classification

#### Contract-Specific Error Classes

```typescript
// Base contract error class
export class ContractError extends AppError {
  public contractCode: string;
  public flaskCompatible: boolean;
}

// Specific error types
export class ContractValidationError extends ContractError
export class ContractAuthenticationError extends ContractError
export class ContractAuthorizationError extends ContractError
export class ContractNotFoundError extends ContractError
export class ContractConflictError extends ContractError
export class ContractRateLimitError extends ContractError
export class ContractDatabaseError extends ContractError
export class ContractServerError extends ContractError
export class ContractBackupError extends ContractError
export class ContractConfigError extends ContractError
```

## Error Handling Features

### Contract-Specific Error Classes

#### ContractValidationError
- **Status Code**: 400
- **Contract Code**: `CONTRACT_VALIDATION_ERROR`
- **Use Case**: Input validation failures
- **Flask Compatible**: Yes

#### ContractAuthenticationError
- **Status Code**: 401
- **Contract Code**: `CONTRACT_AUTH_ERROR`
- **Use Case**: Authentication failures
- **Flask Compatible**: Yes

#### ContractAuthorizationError
- **Status Code**: 403
- **Contract Code**: `CONTRACT_AUTHZ_ERROR`
- **Use Case**: Insufficient permissions
- **Flask Compatible**: Yes

#### ContractNotFoundError
- **Status Code**: 404
- **Contract Code**: `CONTRACT_NOT_FOUND`
- **Use Case**: Resource not found
- **Flask Compatible**: Yes

#### ContractConflictError
- **Status Code**: 409
- **Contract Code**: `CONTRACT_CONFLICT`
- **Use Case**: Resource conflicts
- **Flask Compatible**: Yes

#### ContractRateLimitError
- **Status Code**: 429
- **Contract Code**: `CONTRACT_RATE_LIMIT`
- **Use Case**: Rate limit exceeded
- **Flask Compatible**: Yes

#### ContractDatabaseError
- **Status Code**: 500
- **Contract Code**: `CONTRACT_DATABASE_ERROR`
- **Use Case**: Database operation failures
- **Flask Compatible**: Yes

#### ContractServerError
- **Status Code**: 500
- **Contract Code**: `CONTRACT_SERVER_ERROR`
- **Use Case**: Server operation failures
- **Flask Compatible**: Yes

#### ContractBackupError
- **Status Code**: 500
- **Contract Code**: `CONTRACT_BACKUP_ERROR`
- **Use Case**: Backup operation failures
- **Flask Compatible**: Yes

#### ContractConfigError
- **Status Code**: 500
- **Contract Code**: `CONTRACT_CONFIG_ERROR`
- **Use Case**: Configuration errors
- **Flask Compatible**: Yes

### Error Response Format

All contract error responses follow a consistent format:

```typescript
{
  success: false,
  message: string,
  code: string, // Contract-specific error code
  timestamp: string,
  requestId?: string,
  details?: any, // Additional error details
  // Development-only fields
  stack?: string,
  error?: string,
  originalCode?: string,
  flaskCompatible?: boolean
}
```

### Error Handling Middleware Stack

#### 1. Contract Error Handler
- **Purpose**: Main error handling middleware
- **Features**: Error classification, response formatting, logging
- **Flask Compatibility**: Maintains Flask API contract

#### 2. Error Recovery Middleware
- **Purpose**: Attempts to recover from certain error types
- **Features**: Database error recovery, rate limit retry information
- **Use Case**: Graceful degradation

#### 3. Error Metrics Middleware
- **Purpose**: Tracks error metrics for monitoring
- **Features**: Error type tracking, status code monitoring
- **Use Case**: Performance monitoring

#### 4. Error Sanitization Middleware
- **Purpose**: Sanitizes error messages for production
- **Features**: Removes sensitive information, standardizes messages
- **Use Case**: Security and consistency

#### 5. Error Logging Middleware
- **Purpose**: Comprehensive error logging
- **Features**: Context logging, request tracking
- **Use Case**: Debugging and monitoring

## Error Handling by Category

### Authentication Errors

```typescript
// Invalid credentials
throw new ContractAuthenticationError('Invalid username or password');

// Missing authentication
throw new ContractAuthenticationError('Authentication required');

// Token expired
throw new ContractAuthenticationError('Token expired');
```

### Validation Errors

```typescript
// Input validation failure
throw new ContractValidationError('Validation failed', validationDetails);

// Invalid data format
throw new ContractValidationError('Invalid data format');
```

### Authorization Errors

```typescript
// Insufficient permissions
throw new ContractAuthorizationError('Insufficient permissions');

// Admin access required
throw new ContractAuthorizationError('Admin access required');
```

### Not Found Errors

```typescript
// Resource not found
throw new ContractNotFoundError('Server not found');

// User not found
throw new ContractNotFoundError('User not found');
```

### Conflict Errors

```typescript
// Resource already exists
throw new ContractConflictError('Server already exists');

// Unique constraint violation
throw new ContractConflictError('Username already taken');
```

### Database Errors

```typescript
// Database operation failed
throw new ContractDatabaseError('Database operation failed');

// Connection error
throw new ContractDatabaseError('Database connection failed');
```

### Server Errors

```typescript
// Server operation failed
throw new ContractServerError('Server operation failed');

// Process management error
throw new ContractServerError('Process management failed');
```

### Backup Errors

```typescript
// Backup operation failed
throw new ContractBackupError('Backup operation failed');

// File system error
throw new ContractBackupError('File system error');
```

### Configuration Errors

```typescript
// Configuration error
throw new ContractConfigError('Configuration error');

// System configuration failed
throw new ContractConfigError('System configuration failed');
```

## Prisma Error Handling

### Database Error Mapping

```typescript
// Prisma error codes mapped to contract errors
P2002 -> ContractConflictError (Unique constraint violation)
P2025 -> ContractNotFoundError (Record not found)
P2003 -> ContractValidationError (Foreign key constraint violation)
P2014 -> ContractValidationError (Invalid ID provided)
P2021 -> ContractDatabaseError (Table does not exist)
P2022 -> ContractDatabaseError (Column does not exist)
```

### Error Response Examples

#### Unique Constraint Violation
```json
{
  "success": false,
  "message": "Resource already exists",
  "code": "CONTRACT_UNIQUE_CONSTRAINT_ERROR",
  "timestamp": "2025-01-06T15:30:00.000Z",
  "requestId": "contract_1641234567890_abc123"
}
```

#### Record Not Found
```json
{
  "success": false,
  "message": "Resource not found",
  "code": "CONTRACT_RECORD_NOT_FOUND",
  "timestamp": "2025-01-06T15:30:00.000Z",
  "requestId": "contract_1641234567890_abc123"
}
```

## Usage Examples

### Applying Error Handling to Routes

```typescript
import {
  contractErrorHandler,
  contractAsyncHandler,
  ContractValidationError,
  ContractNotFoundError,
} from '../middleware/contractErrorHandler';

// Apply error handling middleware
router.use(contractErrorHandler);

// Use async handler for route handlers
router.get('/servers/:id', 
  contractAsyncHandler(async (req: Request, res: Response) => {
    const server = await getServer(req.params.id);
    if (!server) {
      throw new ContractNotFoundError('Server not found');
    }
    res.json({ success: true, server });
  })
);
```

### Error Handling in Route Handlers

```typescript
// Authentication error
if (!user || !user.isActive) {
  throw new ContractAuthenticationError('Invalid username or password');
}

// Validation error
if (!isValidServerData(serverData)) {
  throw new ContractValidationError('Invalid server data', validationErrors);
}

// Authorization error
if (!isAdmin) {
  throw new ContractAuthorizationError('Admin access required');
}

// Not found error
if (!server) {
  throw new ContractNotFoundError('Server not found');
}

// Conflict error
if (serverExists) {
  throw new ContractConflictError('Server already exists');
}

// Database error
try {
  await prisma.server.create({ data: serverData });
} catch (error) {
  throw new ContractDatabaseError('Failed to create server');
}
```

## Testing

### Running Error Handling Tests

```bash
# Test all error handling features
npm run test:error:handling

# Test specific error categories
npm run test:error:handling -- --category=auth
npm run test:error:handling -- --category=validation
npm run test:error:handling -- --category=notfound
```

### Test Categories

1. **Authentication Errors**: Tests authentication failure scenarios
2. **Validation Errors**: Tests input validation error handling
3. **Not Found Errors**: Tests resource not found scenarios
4. **Authorization Errors**: Tests permission-based error handling
5. **Method Not Allowed Errors**: Tests HTTP method validation
6. **Content Type Errors**: Tests content type validation
7. **Rate Limit Errors**: Tests rate limiting error responses
8. **Error Response Format**: Tests response format consistency
9. **Error Logging**: Tests error logging and tracking

## Error Monitoring

### Log Analysis

Monitor the following log patterns:

```bash
# Contract errors
grep "Contract error occurred" logs/app.log

# Error metrics
grep "Contract error metrics" logs/app.log

# Error recovery attempts
grep "attempting recovery" logs/app.log
```

### Metrics to Monitor

1. **Error Rates**: 4xx and 5xx error rates by endpoint
2. **Error Types**: Distribution of error types
3. **Response Times**: Error response times
4. **Recovery Success**: Error recovery success rates
5. **Contract Compatibility**: Flask API contract compliance

## Configuration

### Environment Variables

```bash
# Error handling configuration
NODE_ENV=production
LOG_LEVEL=info
ERROR_RECOVERY_ENABLED=true
ERROR_SANITIZATION_ENABLED=true
ERROR_METRICS_ENABLED=true
```

### Customization

Error handling can be customized by modifying the error classes and middleware in `src/middleware/contractErrorHandler.ts`:

```typescript
// Custom error class
export class CustomContractError extends ContractError {
  constructor(message: string) {
    super(message, 500, 'CUSTOM_CONTRACT_ERROR');
  }
}

// Custom error handler
export function customContractErrorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  // Custom error handling logic
  next(error);
}
```

## Best Practices

### Error Handling

1. **Use Specific Error Types**: Use the most specific error class for each scenario
2. **Provide Clear Messages**: Include clear, user-friendly error messages
3. **Include Context**: Add relevant context information to error responses
4. **Log Appropriately**: Log errors with sufficient context for debugging
5. **Maintain Compatibility**: Ensure Flask API contract compatibility

### Error Recovery

1. **Graceful Degradation**: Implement fallback mechanisms where possible
2. **Retry Logic**: Implement retry logic for transient errors
3. **Circuit Breakers**: Use circuit breakers for external service calls
4. **Health Checks**: Implement health checks for error monitoring

### Security

1. **Sanitize Messages**: Remove sensitive information from error messages
2. **Rate Limiting**: Implement rate limiting for error endpoints
3. **Logging Security**: Ensure error logs don't contain sensitive data
4. **Error Boundaries**: Implement error boundaries to prevent information leakage

## Troubleshooting

### Common Issues

1. **Error Not Caught**: Ensure error handling middleware is properly applied
2. **Inconsistent Responses**: Check error response format consistency
3. **Missing Context**: Verify error logging includes sufficient context
4. **Performance Issues**: Monitor error handling performance impact

### Debug Mode

Enable debug logging for detailed error information:

```bash
LOG_LEVEL=debug npm run dev
```

This will provide detailed information about:
- Error classification
- Error recovery attempts
- Error metrics
- Error sanitization

## Future Enhancements

1. **Error Analytics**: Implement comprehensive error analytics dashboard
2. **Automatic Recovery**: Implement automatic error recovery mechanisms
3. **Error Prediction**: Implement error prediction based on patterns
4. **Advanced Monitoring**: Add advanced error monitoring and alerting

## Conclusion

The comprehensive error handling implementation provides robust error handling for all contract routes while maintaining Flask API compatibility. The system is designed to be scalable, maintainable, and production-ready with extensive testing and monitoring capabilities.

Key benefits:
- **Consistent Error Responses**: Standardized error response format across all endpoints
- **Flask API Compatibility**: Maintains Flask API contract compatibility
- **Comprehensive Error Classification**: Specific error types for different scenarios
- **Error Recovery**: Attempts to recover from certain error types
- **Error Monitoring**: Comprehensive error logging and metrics
- **Production Ready**: Designed for production deployment with monitoring
- **Easy Testing**: Comprehensive test suite for validation
- **Type Safety**: Full TypeScript integration with proper error handling
