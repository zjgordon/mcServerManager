import { createServer } from 'http';
import { config } from './config';
import { logger } from './config/logger';
import { createApp } from './app';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';

async function startServer() {
  try {
    // Initialize database
    initializeDatabase();
    
    // Initialize Redis
    await initializeRedis();
    
    // Create Express app
    const app = createApp();
    
    // Create HTTP server
    const server = createServer(app);
    
    // Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info(`🚀 Express server running on port ${PORT}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`📖 Health Check: http://localhost:${PORT}/healthz`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
