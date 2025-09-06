import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';

/**
 * Contract-specific rate limiting configurations
 * These are optimized for the Flask API contract compatibility
 */

// Enhanced rate limiting configurations for contract routes
export const contractRateLimitConfigs = {
  // Authentication contract endpoints - very strict
  authContract: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req: Request) => {
      // Use IP + User-Agent for more granular rate limiting
      const userAgent = req.get('User-Agent') || 'unknown';
      return `auth_contract:${req.ip}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
    },
    onLimitReached: (req: Request) => {
      logger.warn('Authentication rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    },
  },

  // Server management contract endpoints - moderate
  serverContract: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 operations per window
    message: {
      success: false,
      message: 'Too many server operations, please try again later.',
      retryAfter: '5 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use IP + session for user-specific rate limiting
      const sessionId = req.sessionID || 'anonymous';
      return `server_contract:${req.ip}:${sessionId}`;
    },
    onLimitReached: (req: Request) => {
      logger.warn('Server operation rate limit exceeded', {
        ip: req.ip,
        sessionId: req.sessionID,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    },
  },

  // Admin contract endpoints - very strict
  adminContract: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 admin operations per window
    message: {
      success: false,
      message: 'Too many admin operations, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use IP + session for admin-specific rate limiting
      const sessionId = req.sessionID || 'anonymous';
      return `admin_contract:${req.ip}:${sessionId}`;
    },
    onLimitReached: (req: Request) => {
      logger.warn('Admin operation rate limit exceeded', {
        ip: req.ip,
        sessionId: req.sessionID,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    },
  },

  // Server start/stop operations - very strict (resource intensive)
  serverLifecycle: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // 5 start/stop operations per window
    message: {
      success: false,
      message: 'Too many server start/stop operations, please try again later.',
      retryAfter: '10 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const sessionId = req.sessionID || 'anonymous';
      return `server_lifecycle:${req.ip}:${sessionId}`;
    },
    onLimitReached: (req: Request) => {
      logger.warn('Server lifecycle rate limit exceeded', {
        ip: req.ip,
        sessionId: req.sessionID,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    },
  },

  // Backup operations - strict (resource intensive)
  backupOperations: {
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 3, // 3 backup operations per window
    message: {
      success: false,
      message: 'Too many backup operations, please try again later.',
      retryAfter: '30 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const sessionId = req.sessionID || 'anonymous';
      return `backup_operations:${req.ip}:${sessionId}`;
    },
    onLimitReached: (req: Request) => {
      logger.warn('Backup operation rate limit exceeded', {
        ip: req.ip,
        sessionId: req.sessionID,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    },
  },

  // User creation/management - strict
  userManagement: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 user operations per hour
    message: {
      success: false,
      message: 'Too many user management operations, please try again later.',
      retryAfter: '1 hour',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const sessionId = req.sessionID || 'anonymous';
      return `user_management:${req.ip}:${sessionId}`;
    },
    onLimitReached: (req: Request) => {
      logger.warn('User management rate limit exceeded', {
        ip: req.ip,
        sessionId: req.sessionID,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    },
  },
};

/**
 * Create contract-specific rate limiters
 */
export function createContractRateLimiters() {
  return {
    authContract: rateLimit(contractRateLimitConfigs.authContract),
    serverContract: rateLimit(contractRateLimitConfigs.serverContract),
    adminContract: rateLimit(contractRateLimitConfigs.adminContract),
    serverLifecycle: rateLimit(contractRateLimitConfigs.serverLifecycle),
    backupOperations: rateLimit(contractRateLimitConfigs.backupOperations),
    userManagement: rateLimit(contractRateLimitConfigs.userManagement),
  };
}

/**
 * Redis-based contract rate limiting for distributed systems
 */
export async function createContractRedisRateLimiter(
  keyPrefix: string,
  windowMs: number,
  maxRequests: number,
  keyGenerator?: (req: Request) => string,
) {
  const redis = getRedisClient();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator 
        ? `${keyPrefix}:${keyGenerator(req)}`
        : `${keyPrefix}:${req.ip}`;
      
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > maxRequests) {
        logger.warn('Contract Redis rate limit exceeded', {
          key,
          current,
          max: maxRequests,
          ip: req.ip,
          path: req.path,
          method: req.method,
          sessionId: req.sessionID,
        });

        res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      // Add rate limit headers
      res.setHeader('X-Rate-Limit-Limit', maxRequests);
      res.setHeader('X-Rate-Limit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-Rate-Limit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    } catch (error) {
      logger.error('Contract Redis rate limiter error:', error);
      // Fall back to allowing the request if Redis is down
      next();
    }
  };
}

/**
 * Contract-specific security middleware
 */
export function contractSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add contract-specific security headers
  res.setHeader('X-Contract-Version', '1.0.0');
  res.setHeader('X-API-Source', 'express-contract');
  
  // Enhanced request ID for contract routes
  const requestId = req.headers['x-request-id'] || 
    `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;

  // Log contract-specific requests
  if (req.path.includes('/api/v1/')) {
    logger.debug('Contract API request', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
    });
  }

  next();
}

/**
 * Contract request validation middleware
 */
export function contractRequestValidation(req: Request, res: Response, next: NextFunction): void {
  // Validate request method for contract routes
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  if (!allowedMethods.includes(req.method)) {
    logger.warn('Invalid HTTP method for contract route', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn('Invalid Content-Type for contract route', {
        contentType,
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      res.status(400).json({
        success: false,
        message: 'Content-Type must be application/json',
      });
      return;
    }
  }

  next();
}

/**
 * Contract response standardization middleware
 */
export function contractResponseStandardization(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Ensure all contract responses have the standard format
    if (body && typeof body === 'object') {
      if (!body.hasOwnProperty('success')) {
        body.success = res.statusCode < 400;
      }
      
      // Add timestamp if not present
      if (!body.timestamp) {
        body.timestamp = new Date().toISOString();
      }
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Contract error handling middleware
 */
export function contractErrorHandling(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId;

  // Log the error
  logger.error('Contract route error', {
    requestId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    sessionId: req.sessionID,
  });

  // Standardize error response format
  const errorResponse = {
    success: false,
    message: 'An error occurred while processing your request',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Set appropriate status code
  const statusCode = res.statusCode || 500;
  res.status(statusCode).json(errorResponse);
}

/**
 * Contract performance monitoring middleware
 */
export function contractPerformanceMonitoring(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = (req as any).requestId;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log performance metrics
    logger.info('Contract request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      sessionId: req.sessionID,
    });

    // Log slow requests
    if (duration > 2000) { // 2 seconds
      logger.warn('Slow contract request', {
        requestId,
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode,
      });
    }
  });

  next();
}

/**
 * Contract CSRF protection middleware
 */
export function contractCSRFProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET requests and health checks
  if (req.method === 'GET' || req.path === '/healthz' || req.path === '/readyz') {
    return next();
  }

  // Check for CSRF token in headers
  const csrfToken = req.get('X-CSRF-Token') || req.get('X-XSRF-Token');
  
  if (!csrfToken) {
    logger.warn('Missing CSRF token in contract request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      sessionId: req.sessionID,
    });
    
    return res.status(403).json({
      success: false,
      message: 'CSRF token required',
    });
  }

  // Validate CSRF token (this would integrate with your CSRF middleware)
  // For now, we'll just check if it exists
  next();
}

/**
 * Contract audit logging middleware
 */
export function contractAuditLogging(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId;
  
  // Log sensitive operations
  const sensitivePaths = ['/admin/', '/users/', '/config', '/backup'];
  const isSensitive = sensitivePaths.some(path => req.path.includes(path));
  
  if (isSensitive) {
    logger.info('Sensitive contract operation', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      body: req.method !== 'GET' ? req.body : undefined,
    });
  }

  next();
}
