import express, { type Router } from 'express';
import { config } from '../config';
import { logger } from '../config/logger';
import { getRedisClient, checkRedisHealth } from '../config/redis';
import { getPrismaClient } from '../config/database';
import { jobQueueManager } from '../services/jobQueue';
import { webSocketService } from '../services/websocketService';
import { checkCacheHealth } from '../middleware/cache';

const router: Router = express.Router();

// Quick health check (for load balancers)
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: config.nodeEnv,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Detailed readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    cache: false,
    jobQueues: false,
    websocket: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database connectivity
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    logger.error('Database health check failed:', error);
  }

  try {
    // Check Redis connectivity
    checks.redis = await checkRedisHealth();
  } catch (error) {
    logger.error('Redis health check failed:', error);
  }

  try {
    // Check cache health
    checks.cache = await checkCacheHealth();
  } catch (error) {
    logger.error('Cache health check failed:', error);
  }

  try {
    // Check job queues
    const stats = await jobQueueManager.getAllStats();
    checks.jobQueues = stats.length > 0;
  } catch (error) {
    logger.error('Job queues health check failed:', error);
  }

  try {
    // Check WebSocket service
    const wsStats = webSocketService.getStats();
    checks.websocket = wsStats.connected >= 0; // Service is healthy if it can return stats
  } catch (error) {
    logger.error('WebSocket service health check failed:', error);
  }

  const isReady = checks.database && checks.redis && checks.cache && checks.jobQueues && checks.websocket;
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    success: isReady,
    status: isReady ? 'ready' : 'not ready',
    checks,
  });
});

// Alternative readiness endpoint (for compatibility)
router.get('/readyz', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database connectivity
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    logger.error('Database health check failed:', error);
  }

  try {
    // Check Redis connectivity
    const redisClient = getRedisClient();
    await redisClient.ping();
    checks.redis = true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
  }

  const isReady = checks.database && checks.redis;
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    success: isReady,
    status: isReady ? 'ready' : 'not ready',
    checks,
  });
});

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Redis services health check
router.get('/redis', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    const redisHealthy = await checkRedisHealth();
    const cacheHealthy = await checkCacheHealth();

    // Get Redis info
    const redisInfo = await redisClient.info('server');
    const memoryInfo = await redisClient.info('memory');

    // Get job queue stats
    const jobStats = await jobQueueManager.getAllStats();

    // Get WebSocket stats
    const wsStats = webSocketService.getStats();

    res.json({
      success: true,
      data: {
        redis: {
          healthy: redisHealthy,
          info: redisInfo.split('\r\n').filter(line => line && !line.startsWith('#')).reduce((acc, line) => {
            const [key, value] = line.split(':');
            if (key && value) acc[key] = value;
            return acc;
          }, {} as Record<string, string>),
        },
        cache: {
          healthy: cacheHealthy,
        },
        jobQueues: {
          stats: jobStats,
        },
        websocket: {
          stats: wsStats,
        },
        memory: memoryInfo.split('\r\n').filter(line => line && !line.startsWith('#')).reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
      },
    });
  } catch (error) {
    logger.error('Redis health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Redis services unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
