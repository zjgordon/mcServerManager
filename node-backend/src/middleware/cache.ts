import { Request, Response, NextFunction } from 'express';
import { CacheService, getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

// Cache configuration
export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  condition?: (req: Request) => boolean; // Condition to check if request should be cached
  vary?: string[]; // Headers to vary cache by
  skipCache?: boolean; // Skip cache for this request
}

// Cache middleware factory
export function createCacheMiddleware(config: CacheConfig = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip cache if explicitly disabled
      if (config.skipCache || req.headers['cache-control'] === 'no-cache') {
        return next();
      }

      // Check condition
      if (config.condition && !config.condition(req)) {
        return next();
      }

      // Generate cache key
      const cacheKey = generateCacheKey(req, config);

      // Get cache service
      const cacheService = new CacheService(getRedisClient(), 'CACHE');

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug(`💾 Cache hit for key: ${cacheKey}`);

        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${config.ttl || 300}`,
        });

        // Send cached response
        res.json(cachedData);
        return;
      }

      logger.debug(`💾 Cache miss for key: ${cacheKey}`);

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data: any) {
        // Set cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${config.ttl || 300}`,
        });

        // Cache the response
        cacheService.set(cacheKey, data, config.ttl || 300).catch(error => {
          logger.error('Failed to cache response:', error);
        });

        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

// Generate cache key from request
function generateCacheKey(req: Request, config: CacheConfig): string {
  if (config.key) {
    return config.key;
  }

  const parts = [
    req.method,
    req.path,
    req.query ? JSON.stringify(req.query) : '',
  ];

  // Add vary headers
  if (config.vary) {
    for (const header of config.vary) {
      const value = req.headers[header.toLowerCase()];
      if (value) {
        parts.push(`${header}:${value}`);
      }
    }
  }

  // Add user ID if available
  if ((req.session as any)?.user?.id) {
    parts.push(`user:${(req.session as any).user.id}`);
  }

  return parts.filter(Boolean).join(':');
}

// Predefined cache configurations
export const cacheConfigs = {
  // Short-term cache (5 minutes)
  short: { ttl: 300 },

  // Medium-term cache (30 minutes)
  medium: { ttl: 1800 },

  // Long-term cache (2 hours)
  long: { ttl: 7200 },

  // User-specific cache
  userSpecific: {
    ttl: 600,
    vary: ['authorization'],
  },

  // Public cache (no user data)
  public: {
    ttl: 1800,
    condition: (req: Request) => !(req.session as any)?.user,
  },

  // API responses
  api: {
    ttl: 300,
    vary: ['accept', 'authorization'],
  },

  // Server status (frequent updates)
  serverStatus: {
    ttl: 30,
  },

  // Server list (less frequent updates)
  serverList: {
    ttl: 600,
    condition: (req: Request) => req.method === 'GET',
  },

  // User profile (user-specific)
  userProfile: {
    ttl: 1800,
    condition: (req: Request) => !!(req.session as any)?.user,
    vary: ['authorization'],
  },
};

// Cache invalidation middleware
export function createCacheInvalidationMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to invalidate cache after successful operations
      res.json = function (data: any) {
        // Only invalidate on successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          invalidateCache(patterns, req).catch(error => {
            logger.error('Failed to invalidate cache:', error);
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache invalidation middleware error:', error);
      next();
    }
  };
}

// Invalidate cache by patterns
async function invalidateCache(patterns: string[], req: Request): Promise<void> {
  try {
    const cacheService = new CacheService(getRedisClient(), 'CACHE');

    for (const pattern of patterns) {
      // Replace placeholders with actual values
      const keyPattern = pattern
        .replace(':serverId', req.params.serverId || '*')
        .replace(':userId', (req.session as any)?.user?.id || '*')
        .replace(':path', req.path);

      // Get all matching keys
      const keys = await (cacheService as any).client.keys(`mc:cache:${keyPattern}`);

      if (keys.length > 0) {
        // Remove namespace prefix for deletion
        const keysToDelete = keys.map((key: string) => key.replace('mc:cache:', ''));
        await (cacheService as any).client.del(keysToDelete);

        logger.debug(`🗑️ Invalidated ${keys.length} cache entries for pattern: ${keyPattern}`);
      }
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
}

// Cache warming middleware
export function createCacheWarmingMiddleware(warmupFunction: (req: Request) => Promise<any>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Warm up cache in background
      warmupFunction(req).catch(error => {
        logger.error('Cache warming error:', error);
      });

      next();
    } catch (error) {
      logger.error('Cache warming middleware error:', error);
      next();
    }
  };
}

// Cache statistics middleware
export async function getCacheStats(req: Request, res: Response): Promise<void> {
  try {
    const cacheService = new CacheService(getRedisClient(), 'CACHE');
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      data: {
        ...stats,
        hitRate: 'N/A', // Would need to track hits/misses
        memoryUsage: stats.memory,
        keyCount: stats.keys,
      },
    });
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
    });
  }
}

// Cache health check
export async function checkCacheHealth(): Promise<boolean> {
  try {
    const cacheService = new CacheService(getRedisClient(), 'CACHE');

    // Test basic operations
    const testKey = 'health:check';
    const testValue = { timestamp: Date.now() };

    await cacheService.set(testKey, testValue, 10);
    const retrieved = await cacheService.get(testKey);
    await cacheService.del(testKey);

    return Boolean(retrieved && (retrieved as any).timestamp === testValue.timestamp);
  } catch (error) {
    logger.error('Cache health check failed:', error);
    return false;
  }
}

// Export commonly used cache middlewares
export const cacheMiddleware = {
  short: createCacheMiddleware(cacheConfigs.short),
  medium: createCacheMiddleware(cacheConfigs.medium),
  long: createCacheMiddleware(cacheConfigs.long),
  userSpecific: createCacheMiddleware(cacheConfigs.userSpecific),
  public: createCacheMiddleware(cacheConfigs.public),
  api: createCacheMiddleware(cacheConfigs.api),
  serverStatus: createCacheMiddleware(cacheConfigs.serverStatus),
  serverList: createCacheMiddleware(cacheConfigs.serverList),
  userProfile: createCacheMiddleware(cacheConfigs.userProfile),
};

export default cacheMiddleware;
