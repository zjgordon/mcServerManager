import { createServer } from 'http';
import { config } from './config';
import { logger } from './config/logger';
import { createApp } from './app';
import { initializeDatabase } from './config/database';
import { webSocketService } from './services/websocketService';
import { jobQueueManager } from './services/jobQueue';
import { shutdownRedis } from './config/redis';

// Graceful shutdown function
async function gracefulShutdown(server: any): Promise<void> {
  try {
    logger.info('🔄 Starting graceful shutdown...');
    
    // Close HTTP server
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });
    
    // Shutdown WebSocket service
    await webSocketService.shutdown();
    
    // Shutdown job queues
    await jobQueueManager.shutdown();
    
    // Shutdown Redis connections
    await shutdownRedis();
    
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

async function startServer() {
  try {
    // Initialize database
    initializeDatabase();

    // Create Express app (includes Redis initialization)
    const app = await createApp();

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket service
    await webSocketService.initialize(server);

    // Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info(`🚀 Express server running on port ${PORT}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`📖 Health Check: http://localhost:${PORT}/healthz`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await gracefulShutdown(server);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await gracefulShutdown(server);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
