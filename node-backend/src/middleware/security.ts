import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { config } from '../config';
import { logger } from '../config/logger';

/**
 * Security middleware configuration
 * Provides comprehensive security headers and protections
 */
export function setupSecurityMiddleware() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline scripts in development
          ...(config.nodeEnv === 'development' ? ["'unsafe-eval'"] : []), // Only in development
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          ...(config.nodeEnv === 'development' ? ['http://localhost:*'] : []),
        ],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disabled for development compatibility

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: 'same-origin' },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },

    // Frameguard
    frameguard: { action: 'deny' },

    // Hide Powered By
    hidePoweredBy: true,

    // HSTS
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: config.nodeEnv === 'production',
    },

    // IE No Open
    ieNoOpen: true,

    // No Sniff
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // XSS Filter
    xssFilter: true,
  });
}

/**
 * Custom security middleware for additional protections
 */
export function customSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Remove X-Powered-By header (additional protection)
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Add server identification
  res.setHeader('Server', 'Minecraft-Server-Manager/2.0.0');

  // Add request ID for tracking
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;

  // Log security-relevant requests
  if (req.path.includes('..') || req.path.includes('admin') || req.path.includes('config')) {
    logger.warn(`Security-relevant request: ${req.method} ${req.path} from ${req.ip}`, {
      requestId,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
    });
  }

  next();
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  // Sanitize path parameters
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  if (typeof obj !== 'object' || obj === null) return;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        obj[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof value === 'object') {
        sanitizeObject(value);
      }
    }
  }
}

/**
 * Security audit middleware
 */
export function securityAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log suspicious patterns
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
      logger.warn(`Suspicious request pattern detected: ${pattern}`, {
        requestId: (req as any).requestId,
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

  // Log request completion time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Log slow requests
      logger.warn(`Slow request detected: ${duration}ms`, {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    }
  });

  next();
}
