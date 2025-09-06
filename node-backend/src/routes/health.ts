import express from 'express';
import { config } from '../config';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';
import { getPrismaClient } from '../config/database';

const router = express.Router();

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

export default router;
