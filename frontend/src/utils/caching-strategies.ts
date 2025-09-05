import React, { useRef, useCallback, useEffect, useState } from 'react';

// Cache configuration interface
export interface CacheConfig {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  maxAge?: number; // Maximum age in milliseconds
  staleWhileRevalidate?: boolean;
  version?: string;
}

// Cache entry interface
export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

// Memory cache implementation
class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 100,
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes
      maxAge: config.maxAge || 30 * 60 * 1000, // 30 minutes
      staleWhileRevalidate: config.staleWhileRevalidate || false,
      version: config.version || '1.0.0',
    };
  }

  set(key: string, value: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      hits: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    const isStale = now - entry.timestamp > this.config.maxAge;

    if (isExpired && !this.config.staleWhileRevalidate) {
      this.cache.delete(key);
      return null;
    }

    if (isStale && !this.config.staleWhileRevalidate) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = now;

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Get cache statistics
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalHits,
      avgHits,
      hitRate: totalHits / (totalHits + this.cache.size),
    };
  }
}

// Local storage cache implementation
class LocalStorageCache<T> {
  private config: Required<CacheConfig>;
  private prefix: string;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 50,
      ttl: config.ttl || 5 * 60 * 1000,
      maxAge: config.maxAge || 30 * 60 * 1000,
      staleWhileRevalidate: config.staleWhileRevalidate || false,
      version: config.version || '1.0.0',
    };
    this.prefix = `cache_${this.config.version}_`;
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set(key: string, value: T, ttl?: number): void {
    try {
      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl: ttl || this.config.ttl,
        hits: 0,
        lastAccessed: Date.now(),
      };

      localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set cache entry:', error);
    }
  }

  get(key: string): T | null {
    try {
      const stored = localStorage.getItem(this.getStorageKey(key));
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      const now = Date.now();
      const isExpired = now - entry.timestamp > entry.ttl;
      const isStale = now - entry.timestamp > this.config.maxAge;

      if (isExpired && !this.config.staleWhileRevalidate) {
        localStorage.removeItem(this.getStorageKey(key));
        return null;
      }

      if (isStale && !this.config.staleWhileRevalidate) {
        localStorage.removeItem(this.getStorageKey(key));
        return null;
      }

      // Update access statistics
      entry.hits++;
      entry.lastAccessed = now;
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));

      return entry.value;
    } catch (error) {
      console.warn('Failed to get cache entry:', error);
      return null;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    try {
      localStorage.removeItem(this.getStorageKey(key));
      return true;
    } catch (error) {
      console.warn('Failed to delete cache entry:', error);
      return false;
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  size(): number {
    try {
      const keys = Object.keys(localStorage);
      return keys.filter(key => key.startsWith(this.prefix)).length;
    } catch (error) {
      return 0;
    }
  }
}

// React Query cache configuration
export const queryCacheConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
};

// Cache hooks
export const useCache = <T>(config: CacheConfig = {}) => {
  const memoryCache = useRef(new MemoryCache<T>(config));
  const localStorageCache = useRef(new LocalStorageCache<T>(config));

  const set = useCallback((key: string, value: T, ttl?: number) => {
    memoryCache.current.set(key, value, ttl);
    localStorageCache.current.set(key, value, ttl);
  }, []);

  const get = useCallback((key: string): T | null => {
    // Try memory cache first
    let value = memoryCache.current.get(key);
    if (value !== null) return value;

    // Fallback to localStorage
    value = localStorageCache.current.get(key);
    if (value !== null) {
      // Restore to memory cache
      memoryCache.current.set(key, value);
    }

    return value;
  }, []);

  const has = useCallback((key: string): boolean => {
    return memoryCache.current.has(key) || localStorageCache.current.has(key);
  }, []);

  const deleteKey = useCallback((key: string): boolean => {
    const memoryResult = memoryCache.current.delete(key);
    const storageResult = localStorageCache.current.delete(key);
    return memoryResult || storageResult;
  }, []);

  const clear = useCallback(() => {
    memoryCache.current.clear();
    localStorageCache.current.clear();
  }, []);

  const getStats = useCallback(() => {
    return {
      memory: memoryCache.current.getStats(),
      storage: {
        size: localStorageCache.current.size(),
      },
    };
  }, []);

  return {
    set,
    get,
    has,
    delete: deleteKey,
    clear,
    getStats,
  };
};

// API response cache
export const useApiCache = () => {
  const cache = useCache<any>();

  const cacheApiResponse = useCallback(async <T>(
    key: string,
    apiCall: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    // Check cache first
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Make API call
    try {
      const response = await apiCall();
      cache.set(key, response, ttl);
      return response;
    } catch (error) {
      throw error;
    }
  }, [cache]);

  const invalidateApiCache = useCallback((pattern?: string) => {
    if (pattern) {
      const keys = cache.getStats().memory.size > 0 ? Object.keys(cache) : [];
      keys.forEach(key => {
        if (key.includes(pattern)) {
          cache.delete(key);
        }
      });
    } else {
      cache.clear();
    }
  }, [cache]);

  return {
    cacheApiResponse,
    invalidateApiCache,
    cache,
  };
};

// Component cache for expensive computations
export const useComponentCache = <T>(
  computeFn: () => T,
  deps: React.DependencyList,
  ttl?: number
) => {
  const cache = useCache<T>();
  const cacheKey = useRef<string>('');
  const [value, setValue] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate cache key from dependencies
  useEffect(() => {
    cacheKey.current = `component_${JSON.stringify(deps)}`;
  }, deps);

  useEffect(() => {
    const key = cacheKey.current;
    
    // Check cache first
    const cached = cache.get(key);
    if (cached !== null) {
      setValue(cached);
      return;
    }

    // Compute new value
    setIsLoading(true);
    try {
      const newValue = computeFn();
      cache.set(key, newValue, ttl);
      setValue(newValue);
    } catch (error) {
      console.error('Component cache computation failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, deps);

  return { value, isLoading };
};

// Image cache hook
export const useImageCache = () => {
  const cache = useCache<string>();

  const preloadImage = useCallback((src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check cache first
      const cached = cache.get(src);
      if (cached) {
        resolve(cached);
        return;
      }

      const img = new Image();
      img.onload = () => {
        cache.set(src, src, 24 * 60 * 60 * 1000); // 24 hours
        resolve(src);
      };
      img.onerror = reject;
      img.src = src;
    });
  }, [cache]);

  const preloadImages = useCallback(async (srcs: string[]): Promise<string[]> => {
    const promises = srcs.map(src => preloadImage(src));
    return Promise.all(promises);
  }, [preloadImage]);

  return {
    preloadImage,
    preloadImages,
    cache,
  };
};

// Service Worker cache utilities
export const useServiceWorkerCache = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator);
  }, []);

  const registerServiceWorker = useCallback(async (swPath: string) => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.register(swPath);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }, [isSupported]);

  const clearServiceWorkerCache = useCallback(async () => {
    if (!isSupported) return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    } catch (error) {
      console.error('Failed to clear Service Worker cache:', error);
    }
  }, [isSupported]);

  return {
    isSupported,
    registerServiceWorker,
    clearServiceWorkerCache,
  };
};

// Cache management utilities
export const cacheUtils = {
  // Generate cache key from object
  generateKey: (obj: any): string => {
    return btoa(JSON.stringify(obj)).replace(/[^a-zA-Z0-9]/g, '');
  },

  // Check if cache is expired
  isExpired: (timestamp: number, ttl: number): boolean => {
    return Date.now() - timestamp > ttl;
  },

  // Get cache size in bytes (approximate)
  getCacheSize: (): number => {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  },

  // Clean expired entries
  cleanExpiredEntries: (cache: MemoryCache<any> | LocalStorageCache<any>) => {
    const keys = cache.keys();
    keys.forEach(key => {
      cache.get(key); // This will remove expired entries
    });
  },

  // Export cache data
  exportCache: (cache: MemoryCache<any>): string => {
    const data = Array.from(cache['cache'].entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
    }));
    return JSON.stringify(data);
  },

  // Import cache data
  importCache: (cache: MemoryCache<any>, data: string) => {
    try {
      const entries = JSON.parse(data);
      entries.forEach((entry: any) => {
        cache.set(entry.key, entry.value, entry.ttl);
      });
    } catch (error) {
      console.error('Failed to import cache data:', error);
    }
  },
};

export default {
  MemoryCache,
  LocalStorageCache,
  useCache,
  useApiCache,
  useComponentCache,
  useImageCache,
  useServiceWorkerCache,
  cacheUtils,
  queryCacheConfig,
};
