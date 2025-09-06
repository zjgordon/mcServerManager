import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';

/**
 * Rate limiting configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // General API rate limiting
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/healthz' || req.path === '/readyz' || req.path === '/live';
    },
  },

  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  },

  // Server management endpoints (moderate)
  servers: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 server operations per window
    message: {
      success: false,
      message: 'Too many server operations, please try again later.',
      retryAfter: '5 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Admin endpoints (very strict)
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 admin operations per window
    message: {
      success: false,
      message: 'Too many admin operations, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: {
      success: false,
      message: 'Too many file uploads, please try again later.',
      retryAfter: '1 hour',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // WebSocket connection rate limiting
  websocket: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 WebSocket connections per minute
    message: {
      success: false,
      message: 'Too many WebSocket connections, please try again later.',
      retryAfter: '1 minute',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
};

/**
 * Create rate limiter instances
 */
export function createRateLimiters() {
  return {
    general: rateLimit(rateLimitConfigs.general),
    auth: rateLimit(rateLimitConfigs.auth),
    servers: rateLimit(rateLimitConfigs.servers),
    admin: rateLimit(rateLimitConfigs.admin),
    upload: rateLimit(rateLimitConfigs.upload),
    websocket: rateLimit(rateLimitConfigs.websocket),
  };
}

/**
 * Redis-based rate limiting for distributed systems
 */
export async function createRedisRateLimiter(
  keyPrefix: string,
  windowMs: number,
  maxRequests: number,
) {
  const redis = getRedisClient();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `${keyPrefix}:${req.ip}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > maxRequests) {
        logger.warn('Redis rate limit exceeded', {
          key,
          current,
          max: maxRequests,
          ip: req.ip,
          path: req.path,
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
      logger.error('Redis rate limiter error:', error);
      // Fall back to allowing the request if Redis is down
      next();
    }
  };
}

/**
 * Dynamic rate limiting based on user type
 */
export function createDynamicRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get user type from session or JWT
      const userType = (req.session as any)?.user?.isAdmin ? 'admin' : 'user';

      // Different limits for different user types
      const limits = {
        admin: { windowMs: 15 * 60 * 1000, max: 200 },
        user: { windowMs: 15 * 60 * 1000, max: 100 },
        guest: { windowMs: 15 * 60 * 1000, max: 50 },
      };

      const limit = limits[userType] || limits.guest;

      // Use Redis-based rate limiting
      const redisLimiter = await createRedisRateLimiter(
        `dynamic:${userType}`,
        limit.windowMs,
        limit.max,
      );

      redisLimiter(req, res, next);
    } catch (error) {
      logger.error('Dynamic rate limiter error:', error);
      next();
    }
  };
}

/**
 * Rate limiting bypass for trusted IPs
 */
export function createTrustedIPRateLimiter(baseConfig: any) {
  const trustedIPs = [
    '127.0.0.1',
    '::1',
    'localhost',
    // Add production trusted IPs here
  ];

  return rateLimit({
    ...baseConfig,
    skip: (req: Request) => {
      const ip = req.ip || req.connection.remoteAddress;
      return trustedIPs.includes(ip || '');
    },
  });
}

/**
 * Rate limiting middleware with custom key generation
 */
export function createCustomKeyRateLimiter(
  keyGenerator: (req: Request) => string,
  config: any,
) {
  return rateLimit({
    ...config,
    keyGenerator,
  });
}

/**
 * Rate limiting for specific endpoints
 */
export function createEndpointRateLimiter(endpoint: string, config: any) {
  return rateLimit({
    ...config,
    skip: (req: Request) => !req.path.startsWith(endpoint),
  });
}

/**
 * Rate limiting logging middleware
 */
export function rateLimitLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const rateLimitHeaders = {
      limit: res.getHeader('X-Rate-Limit-Limit'),
      remaining: res.getHeader('X-Rate-Limit-Remaining'),
      reset: res.getHeader('X-Rate-Limit-Reset'),
    };

    if (rateLimitHeaders.limit) {
      logger.debug('Rate limit info', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        rateLimit: rateLimitHeaders,
      });
    }
  });

  next();
}

/**
 * Rate limiting error handler
 */
export function rateLimitErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err.message.includes('Too many requests')) {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      error: err.message,
    });

    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded',
      retryAfter: '15 minutes',
    });
    return;
  }

  next(err);
}
