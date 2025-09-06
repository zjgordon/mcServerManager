#!/usr/bin/env ts-node

/**
 * Redis Setup Script
 * 
 * This script sets up Redis for development with proper namespace configuration
 * and provides utilities for Redis management.
 */

import { execSync } from 'child_process';
import { createClient } from 'redis';
import { logger } from '../src/config/logger';
import { REDIS_NAMESPACES } from '../src/config/redis';

class RedisSetup {
  private redisUrl: string;

  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  async setup(): Promise<void> {
    try {
      logger.info('🚀 Setting up Redis for development...');
      
      // Check if Redis is running
      if (!await this.checkRedisConnection()) {
        logger.warn('⚠️ Redis is not running. Please start Redis server first.');
        logger.info('💡 To install and start Redis:');
        logger.info('   Ubuntu/Debian: sudo apt install redis-server && sudo systemctl start redis');
        logger.info('   macOS: brew install redis && brew services start redis');
        logger.info('   Docker: docker run -d -p 6379:6379 redis:alpine');
        return;
      }

      // Test namespace configuration
      await this.testNamespaces();
      
      // Set up initial data structures
      await this.setupInitialData();
      
      logger.info('✅ Redis setup completed successfully!');
      
    } catch (error) {
      logger.error('❌ Redis setup failed:', error);
      throw error;
    }
  }

  private async checkRedisConnection(): Promise<boolean> {
    try {
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      await client.ping();
      await client.quit();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testNamespaces(): Promise<void> {
    logger.info('🧪 Testing Redis namespace configuration...');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();

    try {
      // Test each namespace
      const namespaces = Object.entries(REDIS_NAMESPACES);
      
      for (const [name, prefix] of namespaces) {
        const testKey = `${prefix}test:${Date.now()}`;
        const testValue = `test-value-${name}`;
        
        // Set test value
        await client.set(testKey, testValue);
        
        // Get test value
        const retrieved = await client.get(testKey);
        
        if (retrieved === testValue) {
          logger.info(`✅ Namespace ${name} (${prefix}) working correctly`);
        } else {
          throw new Error(`Namespace ${name} test failed`);
        }
        
        // Clean up test key
        await client.del(testKey);
      }
      
      logger.info('✅ All namespaces tested successfully');
      
    } finally {
      await client.quit();
    }
  }

  private async setupInitialData(): Promise<void> {
    logger.info('📊 Setting up initial Redis data structures...');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();

    try {
      // Set up cache namespace with some initial data
      const cacheKey = `${REDIS_NAMESPACES.CACHE}system:info`;
      const systemInfo = {
        version: '2.0.0',
        environment: 'development',
        setup_date: new Date().toISOString(),
        namespaces: REDIS_NAMESPACES
      };
      
      await client.set(cacheKey, JSON.stringify(systemInfo));
      logger.info('✅ System info cached');
      
      // Set up jobs namespace with initial queue info
      const jobsKey = `${REDIS_NAMESPACES.JOBS}queues:info`;
      const queueInfo = {
        available_queues: ['server-backup', 'health-check', 'cleanup'],
        setup_date: new Date().toISOString()
      };
      
      await client.set(jobsKey, JSON.stringify(queueInfo));
      logger.info('✅ Job queues info set');
      
      // Set up WebSocket namespace with initial connection info
      const wsKey = `${REDIS_NAMESPACES.WS_PUBSUB}connections:info`;
      const connectionInfo = {
        active_connections: 0,
        setup_date: new Date().toISOString(),
        features: ['server-status', 'system-monitoring', 'real-time-logs']
      };
      
      await client.set(wsKey, JSON.stringify(connectionInfo));
      logger.info('✅ WebSocket connection info set');
      
      // Set up sessions namespace with initial session info
      const sessionsKey = `${REDIS_NAMESPACES.SESSIONS}info`;
      const sessionInfo = {
        active_sessions: 0,
        setup_date: new Date().toISOString(),
        default_ttl: 86400 // 24 hours
      };
      
      await client.set(sessionsKey, JSON.stringify(sessionInfo));
      logger.info('✅ Session info set');
      
    } finally {
      await client.quit();
    }
  }

  async getRedisInfo(): Promise<void> {
    logger.info('📊 Redis Information:');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();

    try {
      // Get Redis server info
      const info = await client.info();
      const lines = info.split('\r\n');
      
      const relevantInfo = [
        'redis_version',
        'redis_mode',
        'os',
        'arch_bits',
        'uptime_in_seconds',
        'used_memory_human',
        'connected_clients',
        'total_commands_processed'
      ];
      
      logger.info('🔍 Redis Server Information:');
      for (const line of lines) {
        const [key, value] = line.split(':');
        if (relevantInfo.includes(key)) {
          logger.info(`  ${key}: ${value}`);
        }
      }
      
      // Get namespace information
      logger.info('📁 Namespace Information:');
      for (const [name, prefix] of Object.entries(REDIS_NAMESPACES)) {
        const keys = await client.keys(`${prefix}*`);
        logger.info(`  ${name} (${prefix}): ${keys.length} keys`);
      }
      
    } finally {
      await client.quit();
    }
  }

  async clearNamespaces(): Promise<void> {
    logger.info('🧹 Clearing all namespace data...');
    
    const client = createClient({ url: this.redisUrl });
    await client.connect();

    try {
      for (const [name, prefix] of Object.entries(REDIS_NAMESPACES)) {
        const keys = await client.keys(`${prefix}*`);
        if (keys.length > 0) {
          await client.del(keys);
          logger.info(`✅ Cleared ${keys.length} keys from ${name} namespace`);
        } else {
          logger.info(`ℹ️ No keys found in ${name} namespace`);
        }
      }
      
      logger.info('✅ All namespaces cleared');
      
    } finally {
      await client.quit();
    }
  }
}

// Main execution
async function main() {
  const setup = new RedisSetup();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'setup':
        await setup.setup();
        break;
      case 'info':
        await setup.getRedisInfo();
        break;
      case 'clear':
        await setup.clearNamespaces();
        break;
      default:
        logger.info('Usage: npm run redis:setup [setup|info|clear]');
        logger.info('  setup - Set up Redis with namespaces and initial data');
        logger.info('  info  - Show Redis server and namespace information');
        logger.info('  clear - Clear all namespace data');
        break;
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Redis setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default RedisSetup;

