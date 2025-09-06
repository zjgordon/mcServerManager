import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodTypeAny } from 'zod';
import { logger } from '../config/logger';
import { ValidationError } from './errorHandler';

/**
 * Request validation middleware factory
 */
export function validateRequest(schema: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
  headers?: ZodTypeAny;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      // Validate headers
      if (schema.headers) {
        req.headers = schema.headers.parse(req.headers);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError('Request validation failed', 'VALIDATION_ERROR');
        (validationError as any).details = formatValidationError(error);
        return next(validationError);
      }
      next(error);
    }
  };
}

/**
 * Body validation middleware
 */
export function validateBody(schema: ZodTypeAny) {
  return validateRequest({ body: schema });
}

/**
 * Query validation middleware
 */
export function validateQuery(schema: ZodTypeAny) {
  return validateRequest({ query: schema });
}

/**
 * Params validation middleware
 */
export function validateParams(schema: ZodTypeAny) {
  return validateRequest({ params: schema });
}

/**
 * Headers validation middleware
 */
export function validateHeaders(schema: ZodTypeAny) {
  return validateRequest({ headers: schema });
}

/**
 * Format validation error for response
 */
function formatValidationError(error: ZodError) {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    received: (err as any).received,
  }));
}

/**
 * Content-Type validation middleware
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');

    if (req.method === 'GET' || req.method === 'DELETE') {
      // GET and DELETE requests don't need Content-Type
      return next();
    }

    if (!contentType) {
      return next(new ValidationError('Content-Type header is required', 'MISSING_CONTENT_TYPE'));
    }

    const isValidType = allowedTypes.some(type => contentType.includes(type));

    if (!isValidType) {
      return next(new ValidationError(
        `Content-Type must be one of: ${allowedTypes.join(', ')}`,
        'INVALID_CONTENT_TYPE',
      ));
    }

    next();
  };
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      return next(new ValidationError(
        `Request size exceeds maximum allowed size of ${maxSize} bytes`,
        'REQUEST_TOO_LARGE',
      ));
    }

    next();
  };
}

/**
 * File upload validation middleware
 */
export function validateFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
} = {}) {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/zip', 'application/x-zip-compressed'],
    maxFiles = 5,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.files || !Array.isArray(req.files)) {
      return next();
    }

    const files = req.files as Express.Multer.File[];

    // Check number of files
    if (files.length > maxFiles) {
      return next(new ValidationError(
        `Maximum ${maxFiles} files allowed`,
        'TOO_MANY_FILES',
      ));
    }

    // Validate each file
    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        return next(new ValidationError(
          `File ${file.originalname} exceeds maximum size of ${maxSize} bytes`,
          'FILE_TOO_LARGE',
        ));
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new ValidationError(
          `File type ${file.mimetype} is not allowed`,
          'INVALID_FILE_TYPE',
        ));
      }

      // Check for potentially dangerous file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js', '.jar'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

      if (dangerousExtensions.includes(fileExtension)) {
        return next(new ValidationError(
          `File extension ${fileExtension} is not allowed`,
          'DANGEROUS_FILE_EXTENSION',
        ));
      }
    }

    next();
  };
}

/**
 * IP address validation middleware
 */
export function validateIPAddress(allowedIPs?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedIPs || allowedIPs.length === 0) {
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;

    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn('IP address not allowed', {
        ip: clientIP,
        allowedIPs,
        path: req.path,
        method: req.method,
      });

      return next(new ValidationError('IP address not allowed', 'IP_NOT_ALLOWED'));
    }

    next();
  };
}

/**
 * User agent validation middleware
 */
export function validateUserAgent(allowedPatterns?: RegExp[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedPatterns || allowedPatterns.length === 0) {
      return next();
    }

    const userAgent = req.get('User-Agent');

    if (!userAgent) {
      return next(new ValidationError('User-Agent header is required', 'MISSING_USER_AGENT'));
    }

    const isValid = allowedPatterns.some(pattern => pattern.test(userAgent));

    if (!isValid) {
      logger.warn('User-Agent not allowed', {
        userAgent,
        allowedPatterns: allowedPatterns.map(p => p.toString()),
        path: req.path,
        method: req.method,
      });

      return next(new ValidationError('User-Agent not allowed', 'INVALID_USER_AGENT'));
    }

    next();
  };
}

/**
 * Request timing validation middleware
 */
export function validateRequestTiming(maxAge: number = 300000) { // 5 minutes default
  return (req: Request, res: Response, next: NextFunction) => {
    const timestamp = req.get('X-Request-Timestamp');

    if (!timestamp) {
      return next();
    }

    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    const age = currentTime - requestTime;

    if (age > maxAge) {
      return next(new ValidationError(
        'Request timestamp is too old',
        'REQUEST_TOO_OLD',
      ));
    }

    if (age < 0) {
      return next(new ValidationError(
        'Request timestamp is in the future',
        'REQUEST_FUTURE_TIMESTAMP',
      ));
    }

    next();
  };
}

/**
 * Request signature validation middleware
 */
export function validateRequestSignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.get('X-Request-Signature');

    if (!signature) {
      return next(new ValidationError('Request signature is required', 'MISSING_SIGNATURE'));
    }

    // Simple HMAC validation (you might want to use a proper crypto library)
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return next(new ValidationError('Invalid request signature', 'INVALID_SIGNATURE'));
    }

    next();
  };
}

/**
 * Validation logging middleware
 */
export function validationLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    if (res.statusCode >= 400) {
      logger.warn('Validation failed', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        body: req.body,
        query: req.query,
        params: req.params,
      });
    }
  });

  next();
}
