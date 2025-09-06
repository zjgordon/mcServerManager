import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from '../config';
import { logger } from '../config/logger';

/**
 * CORS configuration for different environments
 */
export function setupCorsMiddleware() {
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed
      const allowedOrigins = getAllowedOrigins();

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log blocked origins
      logger.warn(`CORS blocked origin: ${origin}`, {
        allowedOrigins,
        userAgent: 'Unknown', // We don't have access to req here
      });

      return callback(new Error('Not allowed by CORS'), false);
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRFToken',
      'X-Request-ID',
      'Cache-Control',
      'Pragma',
    ],

    exposedHeaders: [
      'Content-Range',
      'X-Content-Range',
      'X-Request-ID',
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset',
    ],

    optionsSuccessStatus: 200, // Some legacy browsers choke on 204

    maxAge: 86400, // 24 hours
  };

  return cors(corsOptions);
}

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string[] {
  const baseOrigins = [
    config.frontendUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  if (config.nodeEnv === 'development') {
    return [
      ...baseOrigins,
      'http://localhost:5000', // Flask backend
      'http://localhost:5001', // Express backend
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5001',
    ];
  }

  if (config.nodeEnv === 'production') {
    return [
      config.frontendUrl,
      // Add production domains here
    ];
  }

  return baseOrigins;
}

/**
 * Preflight request handler
 */
export function handlePreflightRequest(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    // Set CORS headers for preflight
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRFToken, X-Request-ID');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');

    // Log preflight requests
    logger.debug('Preflight request handled', {
      origin: req.headers.origin,
      method: req.method,
      headers: req.headers,
    });

    res.status(200).end();
    return;
  }

  next();
}

/**
 * CORS error handler
 */
export function corsErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err.message === 'Not allowed by CORS') {
    logger.warn('CORS error', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: 'Origin not allowed',
    });
    return;
  }

  next(err);
}

/**
 * CORS logging middleware
 */
export function corsLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin) {
    logger.debug('CORS request', {
      origin,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });
  }

  next();
}
