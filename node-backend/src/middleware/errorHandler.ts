import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import { logger } from '../config/logger';

/**
 * Custom error classes
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code?: string) {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code?: string) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code?: string) {
    super(message, 409, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', code?: string) {
    super(message, 429, code);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', code?: string) {
    super(message, 500, code);
  }
}

/**
 * Main error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let details: any = undefined;

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    requestId: (req as any).requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    code = prismaError.code;
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = 'Database operation failed';
    code = 'DATABASE_ERROR';
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Database validation error';
    code = 'DATABASE_VALIDATION_ERROR';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'CAST_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    code = 'UPLOAD_ERROR';
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId,
  };

  // Add details if available
  if (details) {
    errorResponse.details = details;
  }

  // Add stack trace in development
  if (config.nodeEnv === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.error = error.message;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002':
      return {
        statusCode: 409,
        message: 'Unique constraint violation',
        code: 'UNIQUE_CONSTRAINT_ERROR',
      };
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND',
      };
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Foreign key constraint violation',
        code: 'FOREIGN_KEY_ERROR',
      };
    case 'P2014':
      return {
        statusCode: 400,
        message: 'Invalid ID provided',
        code: 'INVALID_ID',
      };
    case 'P2021':
      return {
        statusCode: 404,
        message: 'Table does not exist',
        code: 'TABLE_NOT_FOUND',
      };
    case 'P2022':
      return {
        statusCode: 404,
        message: 'Column does not exist',
        code: 'COLUMN_NOT_FOUND',
      };
    default:
      return {
        statusCode: 500,
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
      };
  }
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error boundary for unhandled promise rejections
 */
export function handleUnhandledRejection(reason: any, promise: Promise<any>) {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });

  // In production, you might want to exit the process
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
}

/**
 * Error boundary for uncaught exceptions
 */
export function handleUncaughtException(error: Error) {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });

  // Exit the process
  process.exit(1);
}

/**
 * Validation error formatter
 */
export function formatValidationError(error: ZodError) {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    received: (err as any).received,
  }));
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: any, req: Request) {
  return {
    success: false,
    message: error.message || 'An error occurred',
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId,
    path: req.path,
    method: req.method,
    ...(config.nodeEnv === 'development' && {
      stack: error.stack,
      details: error.details,
    }),
  };
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Log error details
  logger.error('Error middleware triggered:', {
    error: error.message,
    stack: error.stack,
    requestId: (req as any).requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
  });

  next(error);
}
