import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import { logger } from '../config/logger';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError, DatabaseError } from './errorHandler';

/**
 * Contract-specific error classes that maintain Flask API compatibility
 */
export class ContractError extends AppError {
  public contractCode: string;
  public flaskCompatible: boolean;

  constructor(message: string, statusCode: number = 500, contractCode: string, flaskCompatible: boolean = true) {
    super(message, statusCode, contractCode);
    this.contractCode = contractCode;
    this.flaskCompatible = flaskCompatible;
  }
}

export class ContractValidationError extends ContractError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'CONTRACT_VALIDATION_ERROR');
    this.details = details;
  }
}

export class ContractAuthenticationError extends ContractError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'CONTRACT_AUTH_ERROR');
  }
}

export class ContractAuthorizationError extends ContractError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'CONTRACT_AUTHZ_ERROR');
  }
}

export class ContractNotFoundError extends ContractError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'CONTRACT_NOT_FOUND');
  }
}

export class ContractConflictError extends ContractError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONTRACT_CONFLICT');
  }
}

export class ContractRateLimitError extends ContractError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'CONTRACT_RATE_LIMIT');
  }
}

export class ContractDatabaseError extends ContractError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'CONTRACT_DATABASE_ERROR');
  }
}

export class ContractServerError extends ContractError {
  constructor(message: string = 'Server operation failed') {
    super(message, 500, 'CONTRACT_SERVER_ERROR');
  }
}

export class ContractBackupError extends ContractError {
  constructor(message: string = 'Backup operation failed') {
    super(message, 500, 'CONTRACT_BACKUP_ERROR');
  }
}

export class ContractConfigError extends ContractError {
  constructor(message: string = 'Configuration error') {
    super(message, 500, 'CONTRACT_CONFIG_ERROR');
  }
}

/**
 * Contract-specific error handling middleware
 * Maintains Flask API contract compatibility
 */
export function contractErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'An error occurred while processing your request';
  let code: string | undefined;
  let details: any = undefined;
  let contractCode: string | undefined;
  let flaskCompatible = true;

  const requestId = (req as any).requestId;
  const isContractRoute = req.path.startsWith('/api/v1/');

  // Log the error with contract-specific context
  logger.error('Contract error occurred:', {
    error: error.message,
    stack: error.stack,
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID,
    isContractRoute,
    contractCode: (error as any).contractCode,
    flaskCompatible: (error as any).flaskCompatible,
  });

  // Handle contract-specific errors
  if (error instanceof ContractError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    contractCode = error.contractCode;
    flaskCompatible = error.flaskCompatible;
    details = (error as any).details;
  }
  // Handle standard AppError instances
  else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    contractCode = `CONTRACT_${error.code || 'ERROR'}`;
  }
  // Handle Zod validation errors
  else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    contractCode = 'CONTRACT_VALIDATION_ERROR';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }
  // Handle Prisma database errors
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handleContractPrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    code = prismaError.code;
    contractCode = prismaError.contractCode;
  }
  else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = 'Database operation failed';
    code = 'DATABASE_ERROR';
    contractCode = 'CONTRACT_DATABASE_ERROR';
  }
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Database validation error';
    code = 'DATABASE_VALIDATION_ERROR';
    contractCode = 'CONTRACT_DATABASE_VALIDATION_ERROR';
  }
  // Handle other common errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    contractCode = 'CONTRACT_VALIDATION_ERROR';
  }
  else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'CAST_ERROR';
    contractCode = 'CONTRACT_CAST_ERROR';
  }
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
    contractCode = 'CONTRACT_INVALID_TOKEN';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
    contractCode = 'CONTRACT_TOKEN_EXPIRED';
  }
  else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    code = 'UPLOAD_ERROR';
    contractCode = 'CONTRACT_UPLOAD_ERROR';
  }
  // Handle timeout errors
  else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    statusCode = 408;
    message = 'Request timeout';
    code = 'TIMEOUT_ERROR';
    contractCode = 'CONTRACT_TIMEOUT_ERROR';
  }
  // Handle network errors
  else if (error.name === 'NetworkError' || error.message.includes('network')) {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    code = 'NETWORK_ERROR';
    contractCode = 'CONTRACT_NETWORK_ERROR';
  }

  // Prepare contract-compatible error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Add contract-specific fields
  if (contractCode) {
    errorResponse.code = contractCode;
  }

  // Add details if available
  if (details) {
    errorResponse.details = details;
  }

  // Add request ID for tracking
  if (requestId) {
    errorResponse.requestId = requestId;
  }

  // Add development-specific information
  if (config.nodeEnv === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.error = error.message;
    errorResponse.originalCode = code;
    errorResponse.flaskCompatible = flaskCompatible;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Handle Prisma-specific errors with contract compatibility
 */
function handleContractPrismaError(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002':
      return {
        statusCode: 409,
        message: 'Resource already exists',
        code: 'UNIQUE_CONSTRAINT_ERROR',
        contractCode: 'CONTRACT_UNIQUE_CONSTRAINT_ERROR',
      };
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Resource not found',
        code: 'RECORD_NOT_FOUND',
        contractCode: 'CONTRACT_RECORD_NOT_FOUND',
      };
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Invalid reference',
        code: 'FOREIGN_KEY_ERROR',
        contractCode: 'CONTRACT_FOREIGN_KEY_ERROR',
      };
    case 'P2014':
      return {
        statusCode: 400,
        message: 'Invalid ID provided',
        code: 'INVALID_ID',
        contractCode: 'CONTRACT_INVALID_ID',
      };
    case 'P2021':
      return {
        statusCode: 500,
        message: 'Database configuration error',
        code: 'TABLE_NOT_FOUND',
        contractCode: 'CONTRACT_DATABASE_CONFIG_ERROR',
      };
    case 'P2022':
      return {
        statusCode: 500,
        message: 'Database configuration error',
        code: 'COLUMN_NOT_FOUND',
        contractCode: 'CONTRACT_DATABASE_CONFIG_ERROR',
      };
    default:
      return {
        statusCode: 500,
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        contractCode: 'CONTRACT_DATABASE_ERROR',
      };
  }
}

/**
 * Contract-specific 404 handler
 */
export function contractNotFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new ContractNotFoundError(`Endpoint ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Contract-specific async error wrapper
 */
export function contractAsyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Contract error boundary for unhandled promise rejections
 */
export function handleContractUnhandledRejection(reason: any, promise: Promise<any>) {
  logger.error('Contract Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    contractContext: true,
  });

  // In production, you might want to exit the process
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
}

/**
 * Contract error boundary for uncaught exceptions
 */
export function handleContractUncaughtException(error: Error) {
  logger.error('Contract Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    contractContext: true,
  });

  // Exit the process
  process.exit(1);
}

/**
 * Contract validation error formatter
 */
export function formatContractValidationError(error: ZodError) {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    received: (err as any).received,
  }));
}

/**
 * Contract error response formatter
 */
export function formatContractErrorResponse(error: any, req: Request) {
  const requestId = (req as any).requestId;
  
  return {
    success: false,
    message: error.message || 'An error occurred while processing your request',
    code: error.contractCode || error.code || 'CONTRACT_UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
    ...(config.nodeEnv === 'development' && {
      stack: error.stack,
      details: error.details,
      originalCode: error.code,
      flaskCompatible: error.flaskCompatible,
    }),
  };
}

/**
 * Contract error logging middleware
 */
export function contractErrorLoggingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req as any).requestId;
  const sessionId = req.sessionID;
  
  // Log error details with contract context
  logger.error('Contract error middleware triggered:', {
    error: error.message,
    stack: error.stack,
    requestId,
    sessionId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
    contractCode: (error as any).contractCode,
    flaskCompatible: (error as any).flaskCompatible,
    isContractRoute: req.path.startsWith('/api/v1/'),
  });

  next(error);
}

/**
 * Contract error recovery middleware
 */
export function contractErrorRecoveryMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Attempt to recover from certain types of errors
  if (error instanceof ContractDatabaseError) {
    // Log database error for monitoring
    logger.warn('Database error in contract route, attempting recovery:', {
      error: error.message,
      path: req.path,
      method: req.method,
    });
  }

  // For rate limit errors, add retry information
  if (error instanceof ContractRateLimitError) {
    const retryAfter = req.get('X-Rate-Limit-Reset');
    if (retryAfter) {
      (error as any).retryAfter = retryAfter;
    }
  }

  next(error);
}

/**
 * Contract error metrics middleware
 */
export function contractErrorMetricsMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Track error metrics for monitoring
  const errorType = error.constructor.name;
  const statusCode = (error as any).statusCode || 500;
  const contractCode = (error as any).contractCode;
  
  logger.info('Contract error metrics:', {
    errorType,
    statusCode,
    contractCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  next(error);
}

/**
 * Contract error sanitization middleware
 */
export function contractErrorSanitizationMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Sanitize error messages for production
  if (config.nodeEnv === 'production') {
    // Remove sensitive information from error messages
    if (error.message.includes('password') || error.message.includes('token')) {
      error.message = 'Authentication error';
    }
    
    if (error.message.includes('database') || error.message.includes('connection')) {
      error.message = 'Service temporarily unavailable';
    }
  }

  next(error);
}
