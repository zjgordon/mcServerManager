import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger } from '../config/logger';
import { config } from '../config';

/**
 * Custom morgan token for request ID
 */
morgan.token('request-id', (req: Request) => (req as any).requestId || 'unknown');

/**
 * Custom morgan token for user ID
 */
morgan.token('user-id', (req: Request) => (req.session as any)?.user?.id || 'anonymous');

/**
 * Custom morgan token for response time in milliseconds
 */
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : 'unknown';
});

/**
 * Custom morgan token for request body size
 */
morgan.token('req-body-size', (req: Request) => {
  const contentLength = req.get('Content-Length');
  return contentLength ? `${contentLength}B` : 'unknown';
});

/**
 * Custom morgan token for response body size
 */
morgan.token('res-body-size', (req: Request, res: Response) => {
  const contentLength = res.get('Content-Length');
  return contentLength ? `${contentLength}B` : 'unknown';
});

/**
 * Custom morgan token for error message
 */
morgan.token('error-message', (req: Request, res: Response) => {
  return res.statusCode >= 400 ? 'error' : 'success';
});

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(): any {
  const format = config.nodeEnv === 'production'
    ? 'combined'
    : 'dev';

  const morganFormat = config.nodeEnv === 'production'
    ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :request-id :user-id :response-time-ms'
    : ':method :url :status :response-time ms - :res[content-length] :request-id :user-id';

  return morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
    skip: (req: Request) => {
      // Skip logging for health checks in production
      if (config.nodeEnv === 'production' && req.path === '/healthz') {
        return true;
      }
      return false;
    },
  });
}

/**
 * Detailed request logging middleware
 */
export function detailedRequestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Log request start
    logger.info('Request started', {
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
        'content-length': req.get('Content-Length'),
        'origin': req.get('Origin'),
        'referer': req.get('Referer'),
      },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Log request completion
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

      logger[logLevel]('Request completed', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        responseTime: `${duration}ms`,
        contentLength: res.get('Content-Length'),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    });

    // Log request errors
    res.on('error', (error: Error) => {
      logger.error('Request error', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        error: error.message,
        stack: error.stack,
      });
    });

    next();
  };
}

/**
 * Performance logging middleware
 */
export function performanceLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // Log slow requests
      if (duration > 1000) { // More than 1 second
        logger.warn('Slow request detected', {
          requestId: (req as any).requestId,
          method: req.method,
          path: req.path,
          duration: `${duration.toFixed(2)}ms`,
          statusCode: res.statusCode,
        });
      }

      // Log performance metrics
      logger.debug('Request performance', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        memoryUsage: process.memoryUsage(),
      });
    });

    next();
  };
}

/**
 * Security logging middleware
 */
export function securityLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log suspicious requests
    const suspiciousPatterns = [
      /\.\./, // Path traversal
      /<script/i, // XSS attempts
      /javascript:/i, // JavaScript injection
      /union.*select/i, // SQL injection
      /eval\(/i, // Code injection
      /exec\(/i, // Command injection
    ];

    const requestString = `${req.method} ${req.path} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        logger.warn('Suspicious request pattern detected', {
          requestId: (req as any).requestId,
          pattern: pattern.toString(),
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          body: req.body,
          query: req.query,
        });
        break;
      }
    }

    // Log authentication attempts
    if (req.path.includes('/auth/') || req.path.includes('/login')) {
      logger.info('Authentication attempt', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: res.statusCode < 400,
      });
    }

    // Log admin operations
    if (req.path.includes('/admin/')) {
      logger.info('Admin operation', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req.session as any)?.user?.id || 'anonymous',
      });
    }

    next();
  };
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) {
        logger.error('Request error', {
          requestId: (req as any).requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          body: req.body,
          query: req.query,
          params: req.params,
        });
      }
    });

    next();
  };
}

/**
 * Database query logging middleware
 */
export function databaseLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      // Log database-heavy requests
      if (duration > 500) { // More than 500ms
        logger.info('Database-heavy request', {
          requestId: (req as any).requestId,
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
        });
      }
    });

    next();
  };
}

/**
 * API usage logging middleware
 */
export function apiUsageLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      // Log API usage statistics
      logger.info('API usage', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
    });

    next();
  };
}

/**
 * Custom log formatter
 */
export function createCustomLogFormatter() {
  return (tokens: any, req: Request, res: Response) => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId,
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      responseTime: tokens['response-time'](req, res),
      contentLength: tokens.res(req, res, 'content-length'),
      userAgent: tokens['user-agent'](req, res),
      ip: tokens['remote-addr'](req, res),
      userId: (req.session as any)?.user?.id || 'anonymous',
    });
  };
}

/**
 * Log rotation middleware
 */
export function logRotationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if we need to rotate logs
    const now = new Date();
    const hour = now.getHours();

    // Rotate logs every hour
    if (hour !== (logger as any).lastRotationHour) {
      logger.info('Log rotation triggered', {
        timestamp: now.toISOString(),
        hour,
      });
      (logger as any).lastRotationHour = hour;
    }

    next();
  };
}
