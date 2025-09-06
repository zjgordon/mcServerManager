#!/usr/bin/env ts-node

/**
 * Redis Services Testing Script
 *
 * This script tests the complete Redis services setup including
 * job queues, WebSocket pub/sub, and caching functionality.
 */

import { createClient } from 'redis';
import { logger } from '../src/config/logger';
import { initializeRedis, initializePubSubClients, REDIS_NAMESPACES, CacheService } from '../src/config/redis';
import { initializeJobQueues, jobQueueManager, JOB_TYPES, JOB_QUEUES } from '../src/services/jobQueue';
import { webSocketService } from '../src/services/websocketService';
import { checkCacheHealth } from '../src/middleware/cache';

class RedisServicesTester {
  private redisUrl: string;

  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  async runTests(): Promise<void> {
    try {
      logger.info('🧪 Starting Redis services tests...');

      // Test 1: Basic Redis connection
      await this.testRedisConnection();

      // Test 2: Redis services initialization
      await this.testRedisServicesInitialization();

      // Test 3: Job queue functionality
      await this.testJobQueues();

      // Test 4: Cache functionality
      await this.testCacheServices();

      // Test 5: WebSocket pub/sub (without actual WebSocket server)
      await this.testWebSocketPubSub();

      // Test 6: Performance and scaling
      await this.testPerformance();

      logger.info('✅ All Redis services tests completed successfully!');
    } catch (error) {
      logger.error('❌ Redis services tests failed:', error);
      throw error;
    }
  }

  private async testRedisConnection(): Promise<void> {
    logger.info('🔌 Testing Redis connection...');

    const client = createClient({ url: this.redisUrl });
    await client.connect();

    try {
      const pong = await client.ping();
      if (pong === 'PONG') {
        logger.info('✅ Redis connection successful');
      } else {
        throw new Error('Unexpected ping response');
      }
    } finally {
      await client.quit();
    }
  }

  private async testRedisServicesInitialization(): Promise<void> {
    logger.info('🔄 Testing Redis services initialization...');

    try {
      // Initialize Redis
      await initializeRedis();
      logger.info('✅ Redis connection initialized');

      // Initialize pub/sub clients
      await initializePubSubClients();
      logger.info('✅ Redis pub/sub clients initialized');

      // Initialize job queues
      await initializeJobQueues();
      logger.info('✅ Job queues initialized');

      logger.info('✅ All Redis services initialized successfully');
    } catch (error) {
      logger.error('❌ Redis services initialization failed:', error);
      throw error;
    }
  }

  private async testJobQueues(): Promise<void> {
    logger.info('📋 Testing job queue functionality...');

    try {
      // Test adding jobs to different queues
      const serverJob = await jobQueueManager.addJob(
        JOB_QUEUES.SERVER_MANAGEMENT,
        JOB_TYPES.START_SERVER,
        { serverId: 'test-server-1', userId: 1 }
      );

      const backupJob = await jobQueueManager.addJob(
        JOB_QUEUES.BACKUP,
        JOB_TYPES.BACKUP_SERVER,
        { serverId: 'test-server-1', backupType: 'full' }
      );

      const cleanupJob = await jobQueueManager.addJob(
        JOB_QUEUES.CLEANUP,
        JOB_TYPES.CLEANUP_LOGS,
        { serverId: 'test-server-1', olderThanDays: 7 }
      );

      logger.info(`✅ Added jobs: ${serverJob.id}, ${backupJob.id}, ${cleanupJob.id}`);

      // Wait a moment for jobs to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get queue statistics
      const stats = await jobQueueManager.getAllStats();
      logger.info('📊 Job queue statistics:', stats);

      // Test queue operations
      await jobQueueManager.pauseQueue(JOB_QUEUES.SERVER_MANAGEMENT);
      logger.info('✅ Queue paused successfully');

      await jobQueueManager.resumeQueue(JOB_QUEUES.SERVER_MANAGEMENT);
      logger.info('✅ Queue resumed successfully');

      logger.info('✅ Job queue functionality working correctly');
    } catch (error) {
      logger.error('❌ Job queue test failed:', error);
      throw error;
    }
  }

  private async testCacheServices(): Promise<void> {
    logger.info('💾 Testing cache services...');

    try {
      // Test cache health
      const cacheHealthy = await checkCacheHealth();
      if (!cacheHealthy) {
        throw new Error('Cache health check failed');
      }
      logger.info('✅ Cache health check passed');

      // Test cache operations
      const cacheService = new CacheService(await import('../src/config/redis').then(m => m.getRedisClient()), 'CACHE');

      const testKey = 'test:cache:services';
      const testValue = { 
        message: 'Hello from cache services!', 
        timestamp: Date.now(),
        data: { nested: { value: 42 } }
      };

      // Set value
      const setResult = await cacheService.set(testKey, testValue, 60);
      if (!setResult) throw new Error('Cache set failed');

      // Get value
      const retrieved = await cacheService.get(testKey) as any;
      if (!retrieved || retrieved.message !== testValue.message) {
        throw new Error('Cache get failed');
      }

      // Check existence
      const exists = await cacheService.exists(testKey);
      if (!exists) throw new Error('Cache exists check failed');

      // Get stats
      const stats = await cacheService.getStats();
      if (stats.keys < 1) throw new Error('Cache stats failed');

      // Delete value
      const delResult = await cacheService.del(testKey);
      if (!delResult) throw new Error('Cache delete failed');

      logger.info('✅ Cache services working correctly');
    } catch (error) {
      logger.error('❌ Cache services test failed:', error);
      throw error;
    }
  }

  private async testWebSocketPubSub(): Promise<void> {
    logger.info('📡 Testing WebSocket pub/sub functionality...');

    try {
      // Test WebSocket service stats (without actual server)
      const wsStats = webSocketService.getStats();
      logger.info('📊 WebSocket service stats:', wsStats);

      // Test pub/sub with Redis directly
      const { pubClient, subClient } = await import('../src/config/redis').then(m => m.getPubSubClients());

      const channel = `${REDIS_NAMESPACES.WS_PUBSUB}test:services`;
      const testMessage = { 
        type: 'test', 
        data: 'Hello from WebSocket pub/sub!',
        timestamp: Date.now()
      };

      let receivedMessage: any = null;

      // Subscribe to channel
      await subClient.subscribe(channel, message => {
        receivedMessage = JSON.parse(message);
      });

      // Wait a moment for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish message
      await pubClient.publish(channel, JSON.stringify(testMessage));

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100));

      if (receivedMessage && receivedMessage.data === testMessage.data) {
        logger.info('✅ WebSocket pub/sub functionality working correctly');
      } else {
        throw new Error('WebSocket pub/sub test failed');
      }

      // Unsubscribe
      await subClient.unsubscribe(channel);
    } catch (error) {
      logger.error('❌ WebSocket pub/sub test failed:', error);
      throw error;
    }
  }

  private async testPerformance(): Promise<void> {
    logger.info('⚡ Testing Redis services performance...');

    try {
      const cacheService = new CacheService(await import('../src/config/redis').then(m => m.getRedisClient()), 'CACHE');
      
      const iterations = 100;
      const startTime = Date.now();

      // Test cache performance
      for (let i = 0; i < iterations; i++) {
        const key = `perf:test:services:${i}`;
        const value = { 
          iteration: i, 
          timestamp: Date.now(),
          data: `Performance test data ${i}`
        };
        await cacheService.set(key, value, 60);
      }

      const setTime = Date.now() - startTime;

      // Test get performance
      const getStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const key = `perf:test:services:${i}`;
        await cacheService.get(key);
      }

      const getTime = Date.now() - getStartTime;

      // Clean up
      for (let i = 0; i < iterations; i++) {
        const key = `perf:test:services:${i}`;
        await cacheService.del(key);
      }

      const totalTime = Date.now() - startTime;

      logger.info(`📊 Performance Results:`);
      logger.info(`  Set operations: ${iterations} ops in ${setTime}ms (${((iterations / setTime) * 1000).toFixed(0)} ops/sec)`);
      logger.info(`  Get operations: ${iterations} ops in ${getTime}ms (${((iterations / getTime) * 1000).toFixed(0)} ops/sec)`);
      logger.info(`  Total time: ${totalTime}ms`);

      if (setTime < 2000 && getTime < 2000) {
        logger.info('✅ Performance test passed');
      } else {
        logger.warn('⚠️ Performance test results are slower than expected');
      }
    } catch (error) {
      logger.error('❌ Performance test failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const tester = new RedisServicesTester();

  try {
    await tester.runTests();
    process.exit(0);
  } catch (error) {
    logger.error('Redis services testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default RedisServicesTester;
