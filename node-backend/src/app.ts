import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import csurf from 'csurf';
import { config } from './config';
import { logger } from './config/logger';
import { getRedisClient } from './config/redis';

// Import routes (will be created in Phase 2)
// import authRoutes from './routes/auth';
// import serverRoutes from './routes/servers';
// import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';

export function createApp(): express.Application {
  const app = express();

  // Trust proxy for rate limiting and security headers
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for development
  }));

  // CORS configuration
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRFToken'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  }));

  // Compression
  app.use(compression());

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Session configuration
  app.use(session({
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
  }));

  // CSRF protection (will be configured in Phase 2)
  // app.use(csurf({
  //   cookie: {
  //     httpOnly: true,
  //     secure: config.nodeEnv === 'production',
  //     sameSite: 'lax',
  //   },
  // }));

  // Health check route (always available)
  app.use('/healthz', healthRoutes);

  // API routes (will be implemented in Phase 2)
  // app.use('/api/v1/auth', authRoutes);
  // app.use('/api/v1/servers', serverRoutes);
  // app.use('/api/v1/admin', adminRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Minecraft Server Manager API v2.0.0',
      version: '2.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/healthz',
        api: '/api/v1',
        // auth: '/api/v1/auth',
        // servers: '/api/v1/servers',
        // admin: '/api/v1/admin',
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
    });
  });

  // Error handler
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', error);
    
    res.status(error.status || 500).json({
      success: false,
      message: config.nodeEnv === 'production' ? 'Internal server error' : error.message,
      ...(config.nodeEnv === 'development' && { stack: error.stack }),
    });
  });

  return app;
}
