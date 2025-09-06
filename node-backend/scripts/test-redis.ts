#!/usr/bin/env ts-node

/**
 * Redis Testing Script
 * 
 * This script tests Redis functionality including namespaces,
 * caching, sessions, and pub/sub capabilities.
 */

import { createClient } from 'redis';
import { logger } from '../src/config/logger';
import { REDIS_NAMESPACES, CacheService, SessionService } from '../src/config/redis';

class RedisTester {
  private redisUrl: string;

  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  async runTests(): Promise<void> {
    try {
      logger.info('🧪 Starting Redis functionality tests...');
      
      // Test basic connection
      await this.testConnection();
      
      // Test namespaces
      await this.testNamespaces();
      
      // Test cache service
      await this.testCacheService();
      
      // Test session service
      await this.testSessionService();
      
      // Test pub/sub functionality
      await this.testPubSub();
      
      // Test performance
      await this.testPerformance();
      
      logger.info('✅ All Redis tests completed successfully!');
      
    } catch (error) {
      logger.error('❌ Redis tests failed:', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
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

  private async testNamespaces(): Promise<void> {
    logger.info('📁 Testing Redis namespaces...');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();
    
    try {
      const testData = { test: 'data', timestamp: Date.now() };
      
      for (const [name, prefix] of Object.entries(REDIS_NAMESPACES)) {
        const key = `${prefix}test:${Date.now()}`;
        const value = JSON.stringify(testData);
        
        // Set value
        await client.set(key, value);
        
        // Get value
        const retrieved = await client.get(key);
        const parsed = JSON.parse(retrieved!);
        
        if (parsed.test === testData.test) {
          logger.info(`✅ Namespace ${name} (${prefix}) working correctly`);
        } else {
          throw new Error(`Namespace ${name} test failed`);
        }
        
        // Clean up
        await client.del(key);
      }
    } finally {
      await client.quit();
    }
  }

  private async testCacheService(): Promise<void> {
    logger.info('💾 Testing Cache Service...');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();
    
    try {
      const cacheService = new CacheService(client, 'CACHE');
      
      // Test basic operations
      const testKey = 'test:cache:key';
      const testValue = { message: 'Hello Cache!', number: 42 };
      
      // Set value
      const setResult = await cacheService.set(testKey, testValue, 60);
      if (!setResult) throw new Error('Cache set failed');
      
      // Get value
      const retrieved = await cacheService.get(testKey);
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
      
      logger.info('✅ Cache Service working correctly');
      
    } finally {
      await client.quit();
    }
  }

  private async testSessionService(): Promise<void> {
    logger.info('🔐 Testing Session Service...');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();
    
    try {
      const sessionService = new SessionService(client);
      
      const sessionId = `test-session-${Date.now()}`;
      const sessionData = {
        userId: 1,
        username: 'testuser',
        loginTime: new Date().toISOString()
      };
      
      // Set session
      const setResult = await sessionService.set(sessionId, sessionData, 300);
      if (!setResult) throw new Error('Session set failed');
      
      // Get session
      const retrieved = await sessionService.get(sessionId);
      if (!retrieved || retrieved.username !== sessionData.username) {
        throw new Error('Session get failed');
      }
      
      // Check existence
      const exists = await sessionService.exists(sessionId);
      if (!exists) throw new Error('Session exists check failed');
      
      // Delete session
      const delResult = await sessionService.del(sessionId);
      if (!delResult) throw new Error('Session delete failed');
      
      logger.info('✅ Session Service working correctly');
      
    } finally {
      await client.quit();
    }
  }

  private async testPubSub(): Promise<void> {
    logger.info('📡 Testing Pub/Sub functionality...');
    
    const publisher = createClient({ url: this.redisUrl });
    const subscriber = createClient({ url: this.redisUrl });
    
    await Promise.all([publisher.connect(), subscriber.connect()]);
    
    try {
      const channel = `${REDIS_NAMESPACES.WS_PUBSUB}test:channel`;
      const testMessage = { type: 'test', data: 'Hello Pub/Sub!' };
      
      let receivedMessage: any = null;
      
      // Subscribe to channel
      await subscriber.subscribe(channel, (message) => {
        receivedMessage = JSON.parse(message);
      });
      
      // Wait a moment for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Publish message
      await publisher.publish(channel, JSON.stringify(testMessage));
      
      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (receivedMessage && receivedMessage.data === testMessage.data) {
        logger.info('✅ Pub/Sub functionality working correctly');
      } else {
        throw new Error('Pub/Sub test failed');
      }
      
    } finally {
      await Promise.all([publisher.quit(), subscriber.quit()]);
    }
  }

  private async testPerformance(): Promise<void> {
    logger.info('⚡ Testing Redis performance...');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();
    
    try {
      const iterations = 1000;
      const startTime = Date.now();
      
      // Test set operations
      for (let i = 0; i < iterations; i++) {
        const key = `${REDIS_NAMESPACES.CACHE}perf:test:${i}`;
        const value = JSON.stringify({ iteration: i, timestamp: Date.now() });
        await client.set(key, value);
      }
      
      const setTime = Date.now() - startTime;
      
      // Test get operations
      const getStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const key = `${REDIS_NAMESPACES.CACHE}perf:test:${i}`;
        await client.get(key);
      }
      
      const getTime = Date.now() - getStartTime;
      
      // Clean up
      const keys = await client.keys(`${REDIS_NAMESPACES.CACHE}perf:test:*`);
      if (keys.length > 0) {
        await client.del(keys);
      }
      
      const totalTime = Date.now() - startTime;
      
      logger.info(`📊 Performance Results:`);
      logger.info(`  Set operations: ${iterations} ops in ${setTime}ms (${(iterations / setTime * 1000).toFixed(0)} ops/sec)`);
      logger.info(`  Get operations: ${iterations} ops in ${getTime}ms (${(iterations / getTime * 1000).toFixed(0)} ops/sec)`);
      logger.info(`  Total time: ${totalTime}ms`);
      
      if (setTime < 5000 && getTime < 5000) {
        logger.info('✅ Performance test passed');
      } else {
        logger.warn('⚠️ Performance test results are slower than expected');
      }
      
    } finally {
      await client.quit();
    }
  }
}

// Main execution
async function main() {
  const tester = new RedisTester();
  
  try {
    await tester.runTests();
    process.exit(0);
  } catch (error) {
    logger.error('Redis testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default RedisTester;

