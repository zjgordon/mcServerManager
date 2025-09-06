import express from 'express';
import compression from 'compression';
import session from 'express-session';
import { config } from './config';
import { logger } from './config/logger';
import { getRedisClient, initializeRedis, initializePubSubClients } from './config/redis';
import { initializeJobQueues, jobQueueManager } from './services/jobQueue';
import { webSocketService } from './services/websocketService';
import { cacheMiddleware } from './middleware/cache';
import { authMiddleware } from './middleware/auth';
import { csrfMiddleware } from './middleware/csrf';

// Import comprehensive middleware
import {
  setupSecurityMiddleware,
  customSecurityMiddleware,
  sanitizeRequest,
  securityAuditMiddleware,
  setupCorsMiddleware,
  corsErrorHandler,
  corsLoggingMiddleware,
  createRateLimiters,
  rateLimitLoggingMiddleware,
  rateLimitErrorHandler,
  errorHandler,
  notFoundHandler,
  requestLoggingMiddleware,
  detailedRequestLoggingMiddleware,
  performanceLoggingMiddleware,
  securityLoggingMiddleware,
  errorLoggingMiddleware,
  requestIdMiddleware,
  responseTimeMiddleware,
  requestSizeMiddleware,
  healthCheckMiddleware,
} from './middleware';

// Import routes (will be created in Phase 2)
import authRoutes from './routes/auth';
import authContractRoutes from './routes/authContract';
import serverContractRoutes from './routes/serverContract';
import adminContractRoutes from './routes/adminContract';
// import serverRoutes from './routes/servers';
// import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';
import docsRoutes from './routes/docs';

export async function createApp(): Promise<express.Application> {
  const app = express();

  // Initialize Redis services
  try {
    logger.info('🔄 Initializing Redis services...');
    
    // Initialize Redis connection
    await initializeRedis();
    
    // Initialize pub/sub clients for WebSocket scaling
    if (config.wsUseRedisAdapter) {
      await initializePubSubClients();
    }
    
    // Initialize job queues
    await initializeJobQueues();
    
    logger.info('✅ Redis services initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize Redis services:', error);
    throw error;
  }

  // Trust proxy for rate limiting and security headers
  app.set('trust proxy', 1);

  // Request ID middleware (must be first)
  app.use(requestIdMiddleware());

  // Response time middleware
  app.use(responseTimeMiddleware());

  // Request size limiting
  app.use(requestSizeMiddleware(10 * 1024 * 1024)); // 10MB

  // Health check middleware (early exit for health checks)
  app.use(healthCheckMiddleware());

  // Security middleware
  app.use(setupSecurityMiddleware());
  app.use(customSecurityMiddleware);
  app.use(sanitizeRequest);
  app.use(securityAuditMiddleware);

  // CORS configuration
  app.use(setupCorsMiddleware());
  app.use(corsErrorHandler);
  app.use(corsLoggingMiddleware);

  // Compression
  app.use(compression());

  // Request logging
  app.use(requestLoggingMiddleware());
  app.use(detailedRequestLoggingMiddleware);
  app.use(performanceLoggingMiddleware);
  app.use(securityLoggingMiddleware);
  app.use(errorLoggingMiddleware);

  // Rate limiting
  const rateLimiters = createRateLimiters();
  app.use('/api/', rateLimiters.general);
  app.use('/api/v1/auth/', rateLimiters.auth);
  app.use('/api/v1/servers/', rateLimiters.servers);
  app.use('/api/v1/admin/', rateLimiters.admin);
  app.use(rateLimitLoggingMiddleware);
  app.use(rateLimitErrorHandler);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Session configuration with Redis store
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',
      },
      name: 'mcserver_session',
      // Note: In production, you'd want to use a Redis session store
      // For now, we're using the default memory store
    }),
  );

  // CSRF protection
  app.use(csrfMiddleware.protection);

  // Health check route (always available)
  // Cache middleware for API routes
  app.use('/api/', cacheMiddleware.api);
  
  app.use('/healthz', healthRoutes);
  
  // API documentation routes
  app.use('/docs', docsRoutes);

  // Authentication routes
  app.use('/api/v1/auth', authRoutes);
  
  // Contract-compatible authentication routes (Phase 2 migration)
  app.use('/api/v1/auth', authContractRoutes);
  
  // Contract-compatible server management routes (Phase 2 migration)
  app.use('/api/v1/servers', serverContractRoutes);
  
  // Contract-compatible admin routes (Phase 2 migration)
  app.use('/api/v1/admin', adminContractRoutes);
  
  // API routes (will be implemented in Phase 2)
  // app.use('/api/v1/servers', serverRoutes);
  // app.use('/api/v1/admin', adminRoutes);

  // Root endpoint
  app.get('/', authMiddleware.optionalAuth, (req, res) => {
    const user = (req as any).user;
    
    res.json({
      success: true,
      message: 'Minecraft Server Manager API v2.0.0',
      version: '2.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      } : null,
      endpoints: {
        health: '/healthz',
        api: '/api/v1',
        auth: '/api/v1/auth',
        // servers: '/api/v1/servers',
        // admin: '/api/v1/admin',
      },
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}
