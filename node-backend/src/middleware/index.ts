/**
 * Middleware exports
 * Centralized export of all middleware functions
 */

// Security middleware
export {
  setupSecurityMiddleware,
  customSecurityMiddleware,
  sanitizeRequest,
  securityAuditMiddleware,
} from './security';

// CORS middleware
export {
  setupCorsMiddleware,
  handlePreflightRequest,
  corsErrorHandler,
  corsLoggingMiddleware,
} from './cors';

// Rate limiting middleware
export {
  rateLimitConfigs,
  createRateLimiters,
  createRedisRateLimiter,
  createDynamicRateLimiter,
  createTrustedIPRateLimiter,
  createCustomKeyRateLimiter,
  createEndpointRateLimiter,
  rateLimitLoggingMiddleware,
  rateLimitErrorHandler,
} from './rateLimiting';

// Error handling middleware
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  formatValidationError,
  formatErrorResponse,
} from './errorHandler';

// Validation middleware
export {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  validateContentType,
  validateRequestSize,
  validateFileUpload,
  validateIPAddress,
  validateUserAgent,
  validateRequestTiming,
  validateRequestSignature,
  validationLoggingMiddleware,
} from './validation';

// Logging middleware
export {
  requestLoggingMiddleware,
  detailedRequestLoggingMiddleware,
  performanceLoggingMiddleware,
  securityLoggingMiddleware,
  errorLoggingMiddleware,
  databaseLoggingMiddleware,
  apiUsageLoggingMiddleware,
  createCustomLogFormatter,
  logRotationMiddleware,
} from './logging';

// Middleware composition utilities
export {
  composeMiddleware,
  requestIdMiddleware,
  responseTimeMiddleware,
  requestSizeMiddleware,
  healthCheckMiddleware,
} from './utils';
