import { createClient, RedisClientType } from 'redis';
import { config } from './index';
import { logger } from './logger';

// Redis namespace configuration
export const REDIS_NAMESPACES = {
  CACHE: 'mc:cache:',
  JOBS: 'mc:jobs:',
  WS_PUBSUB: 'mc:ws:',
  SESSIONS: 'mc:sessions:',
} as const;

// Redis client instances
let redisClient: RedisClientType | null = null;
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

// Redis connection options
const redisOptions = {
  url: config.redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        logger.error('Redis connection failed after 10 retries');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
};

// Create main Redis client
export function createRedisClient(): RedisClientType {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient(redisOptions);

  redisClient.on('error', error => {
    logger.error('Redis client error:', error);
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('✅ Redis client ready');
  });

  redisClient.on('end', () => {
    logger.info('🔌 Redis client disconnected');
  });

  return redisClient;
}

// Create pub/sub clients for Socket.IO Redis adapter
export function createPubSubClients(): { pubClient: RedisClientType; subClient: RedisClientType } {
  if (pubClient && subClient) {
    return { pubClient, subClient };
  }

  pubClient = createClient(redisOptions);
  subClient = pubClient.duplicate();

  // Event handlers for pub client
  pubClient.on('error', error => {
    logger.error('Redis pub client error:', error);
  });

  pubClient.on('connect', () => {
    logger.info('✅ Redis pub client connected');
  });

  // Event handlers for sub client
  subClient.on('error', error => {
    logger.error('Redis sub client error:', error);
  });

  subClient.on('connect', () => {
    logger.info('✅ Redis sub client connected');
  });

  return { pubClient, subClient };
}

// Initialize Redis connection
export async function initializeRedis(): Promise<RedisClientType> {
  try {
    const client = createRedisClient();
    await client.connect();

    // Test connection
    await client.ping();
    logger.info('✅ Redis connection established and tested');

    return client;
  } catch (error) {
    logger.error('❌ Failed to initialize Redis:', error);
    throw error;
  }
}

// Initialize pub/sub clients
export async function initializePubSubClients(): Promise<{ pubClient: RedisClientType; subClient: RedisClientType }> {
  try {
    const { pubClient: pub, subClient: sub } = createPubSubClients();

    await Promise.all([pub.connect(), sub.connect()]);

    // Test connections
    await Promise.all([pub.ping(), sub.ping()]);

    logger.info('✅ Redis pub/sub clients established and tested');

    return { pubClient: pub, subClient: sub };
  } catch (error) {
    logger.error('❌ Failed to initialize Redis pub/sub clients:', error);
    throw error;
  }
}

// Get Redis client instance
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

// Get pub/sub clients
export function getPubSubClients(): { pubClient: RedisClientType; subClient: RedisClientType } {
  if (!pubClient || !subClient) {
    throw new Error('Redis pub/sub clients not initialized. Call initializePubSubClients() first.');
  }
  return { pubClient, subClient };
}

// Redis health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

// Cache service with namespace support
export class CacheService {
  private client: RedisClientType;
  private namespace: string;

  constructor(client: RedisClientType, namespace: keyof typeof REDIS_NAMESPACES = 'CACHE') {
    this.client = client;
    this.namespace = REDIS_NAMESPACES[namespace];
  }

  private getKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(this.getKey(key), ttlSeconds, serialized);
      } else {
        await this.client.set(this.getKey(key), serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      const keys = await this.client.keys(this.getKey('*'));
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  async getStats(): Promise<{ keys: number; memory: string }> {
    try {
      const keys = await this.client.keys(this.getKey('*'));
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        keys: keys.length,
        memory,
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { keys: 0, memory: 'unknown' };
    }
  }
}

// Session service with namespace support
export class SessionService {
  private client: RedisClientType;
  private namespace: string;

  constructor(client: RedisClientType) {
    this.client = client;
    this.namespace = REDIS_NAMESPACES.SESSIONS;
  }

  private getKey(sessionId: string): string {
    return `${this.namespace}${sessionId}`;
  }

  async get(sessionId: string): Promise<any | null> {
    try {
      const value = await this.client.get(this.getKey(sessionId));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Session get error for ${sessionId}:`, error);
      return null;
    }
  }

  async set(sessionId: string, data: any, ttlSeconds: number = 86400): Promise<boolean> {
    try {
      const serialized = JSON.stringify(data);
      await this.client.setEx(this.getKey(sessionId), ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error(`Session set error for ${sessionId}:`, error);
      return false;
    }
  }

  async del(sessionId: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(sessionId));
      return result > 0;
    } catch (error) {
      logger.error(`Session delete error for ${sessionId}:`, error);
      return false;
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(sessionId));
      return result === 1;
    } catch (error) {
      logger.error(`Session exists error for ${sessionId}:`, error);
      return false;
    }
  }
}

// Graceful shutdown
export async function shutdownRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }

    if (pubClient) {
      await pubClient.quit();
      pubClient = null;
    }

    if (subClient) {
      await subClient.quit();
      subClient = null;
    }

    logger.info('🔌 Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
  }
}

export default redisClient;
