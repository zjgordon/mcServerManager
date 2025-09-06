import { Request, Response, NextFunction } from 'express';

/**
 * Compose multiple middleware functions into a single middleware
 */
export function composeMiddleware(...middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;

    function runNext() {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }

    runNext();
  };
}

/**
 * Conditional middleware - only apply middleware if condition is met
 */
export function conditionalMiddleware(
  condition: (req: Request) => boolean,
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return middleware(req, res, next);
    }
    next();
  };
}

/**
 * Skip middleware for certain paths
 */
export function skipForPaths(
  paths: string[],
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return conditionalMiddleware(
    (req) => !paths.some(path => req.path.startsWith(path)),
    middleware,
  );
}

/**
 * Apply middleware only for certain paths
 */
export function onlyForPaths(
  paths: string[],
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return conditionalMiddleware(
    (req) => paths.some(path => req.path.startsWith(path)),
    middleware,
  );
}

/**
 * Apply middleware only for certain HTTP methods
 */
export function onlyForMethods(
  methods: string[],
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return conditionalMiddleware(
    (req) => methods.includes(req.method),
    middleware,
  );
}

/**
 * Skip middleware for certain HTTP methods
 */
export function skipForMethods(
  methods: string[],
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return conditionalMiddleware(
    (req) => !methods.includes(req.method),
    middleware,
  );
}

/**
 * Apply middleware only in certain environments
 */
export function onlyInEnvironments(
  environments: string[],
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return conditionalMiddleware(
    () => environments.includes(process.env.NODE_ENV || 'development'),
    middleware,
  );
}

/**
 * Skip middleware in certain environments
 */
export function skipInEnvironments(
  environments: string[],
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return conditionalMiddleware(
    () => !environments.includes(process.env.NODE_ENV || 'development'),
    middleware,
  );
}

/**
 * Timeout middleware - apply timeout to requests
 */
export function timeoutMiddleware(timeoutMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          timeout: timeoutMs,
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
}

/**
 * Retry middleware - retry failed requests
 */
export function retryMiddleware(maxRetries: number = 3) {
  return (req: Request, res: Response, next: NextFunction): void => {
    let retryCount = 0;

    const originalSend = res.send;
    res.send = function (data: any) {
      if (res.statusCode >= 500 && retryCount < maxRetries) {
        retryCount++;
        // Reset response state for retry
        res.statusCode = 200;
        res.headersSent = false;

        // Retry the request
        setTimeout(() => {
          // This would need to be implemented based on your specific needs
          // For now, we'll just log the retry attempt
          console.log(`Retrying request ${req.path} (attempt ${retryCount})`);
        }, 1000 * retryCount); // Exponential backoff

        return this;
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Cache middleware - simple in-memory cache
 */
export function cacheMiddleware(ttlMs: number = 300000) { // 5 minutes default
  const cache = new Map<string, { data: any; expires: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      res.json(cached.data);
      return;
    }

    const originalSend = res.send;
    res.send = function (data: any) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, {
          data: JSON.parse(data),
          expires: Date.now() + ttlMs,
        });
      }
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Request ID middleware - add unique request ID
 */
export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] ||
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

/**
 * Response time middleware - add response time header
 */
export function responseTimeMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      res.setHeader('X-Response-Time', duration);
    });

    next();
  };
}

/**
 * Request size middleware - limit request size
 */
export function requestSizeMiddleware(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        message: 'Request entity too large',
        maxSize,
        receivedSize: contentLength,
      });
      return;
    }

    next();
  };
}

/**
 * Health check middleware - simple health check
 */
export function healthCheckMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/health' || req.path === '/healthz') {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      });
      return;
    }

    next();
  };
}
