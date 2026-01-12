/**
 * Redis Distributed Cache
 * Distributed caching layer for multi-instance deployments
 *
 * Features:
 * - Redis-backed distributed caching
 * - Automatic serialization/deserialization
 * - TTL support
 * - Pattern-based invalidation
 * - Fallback to in-memory cache
 * - Metrics tracking
 */

import Redis from 'ioredis';
import { logger } from '@lib/logger';
import { caches as inMemoryCaches } from './query-cache';

// Redis connection
let redis: Redis | null = null;
let isRedisAvailable = false;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('connect', () => {
      isRedisAvailable = true;
      logger.info('Redis cache connected');
    });

    redis.on('error', (err) => {
      isRedisAvailable = false;
      logger.error('Redis cache error', err);
    });

    // Connect immediately
    redis.connect().catch((err) => {
      logger.warn('Failed to connect to Redis cache', { error: err.message });
    });
  } else {
    logger.warn('REDIS_URL not configured - using in-memory cache only');
  }
} catch (error) {
  logger.error('Failed to initialize Redis cache', error instanceof Error ? error : new Error(String(error)));
}

// Cache metrics
const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  fallbacks: 0,
};

/**
 * Cache tiers with default TTLs (seconds)
 */
export enum CacheTier {
  SHORT = 300,    // 5 minutes
  MEDIUM = 600,   // 10 minutes
  LONG = 1800,    // 30 minutes
  HOUR = 3600,    // 1 hour
  DAY = 86400,    // 24 hours
}

/**
 * Cached query execution with Redis backend
 *
 * @param key - Cache key
 * @param query - Function that executes the query
 * @param ttl - Time to live in seconds (defaults to MEDIUM)
 * @returns Query result
 */
export async function cachedQuery<T>(
  key: string,
  query: () => Promise<T>,
  ttl: number = CacheTier.MEDIUM
): Promise<T> {
  try {
    // Try Redis first if available
    if (redis && isRedisAvailable) {
      const cached = await redis.get(key);

      if (cached !== null) {
        metrics.hits++;
        logger.debug('Redis cache hit', { key, tier: getTierName(ttl) });

        try {
          return JSON.parse(cached) as T;
        } catch (parseError) {
          logger.warn('Failed to parse cached value', { key, error: parseError });
          // Continue to fetch fresh data
        }
      }

      // Cache miss - execute query
      metrics.misses++;
      logger.debug('Redis cache miss', { key, tier: getTierName(ttl) });

      const result = await query();

      // Store in Redis
      try {
        await redis.setex(key, ttl, JSON.stringify(result));
        metrics.sets++;
        logger.debug('Redis cache set', { key, ttl, tier: getTierName(ttl) });
      } catch (setError) {
        logger.error('Failed to set Redis cache', setError instanceof Error ? setError : new Error(String(setError)), { key });
        metrics.errors++;
      }

      return result;
    }

    // Fallback to in-memory cache
    metrics.fallbacks++;
    const inMemoryCache = selectInMemoryCache(ttl);
    const cached = inMemoryCache.get<T>(key);

    if (cached !== undefined) {
      metrics.hits++;
      logger.debug('In-memory cache hit (fallback)', { key, tier: getTierName(ttl) });
      return cached;
    }

    // Cache miss
    metrics.misses++;
    const result = await query();

    // Store in in-memory cache
    inMemoryCache.set(key, result, ttl);
    metrics.sets++;

    return result;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache error - executing query without cache', error instanceof Error ? error : new Error(String(error)), { key });

    // On error, execute query without caching
    return await query();
  }
}

/**
 * Get cached value without query function
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    if (redis && isRedisAvailable) {
      const cached = await redis.get(key);

      if (cached !== null) {
        metrics.hits++;
        return JSON.parse(cached) as T;
      }

      metrics.misses++;
      return null;
    }

    // Fallback to in-memory
    metrics.fallbacks++;
    const inMemoryCache = inMemoryCaches.medium;
    const cached = inMemoryCache.get<T>(key);

    if (cached !== undefined) {
      metrics.hits++;
      return cached;
    }

    metrics.misses++;
    return null;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache get error', error instanceof Error ? error : new Error(String(error)), { key });
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function set<T>(key: string, value: T, ttl: number = CacheTier.MEDIUM): Promise<void> {
  try {
    if (redis && isRedisAvailable) {
      await redis.setex(key, ttl, JSON.stringify(value));
      metrics.sets++;
      logger.debug('Redis cache set', { key, ttl });
      return;
    }

    // Fallback to in-memory
    metrics.fallbacks++;
    const inMemoryCache = selectInMemoryCache(ttl);
    inMemoryCache.set(key, value, ttl);
    metrics.sets++;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache set error', error instanceof Error ? error : new Error(String(error)), { key });
  }
}

/**
 * Invalidate specific cache key
 */
export async function invalidate(key: string): Promise<void> {
  try {
    if (redis && isRedisAvailable) {
      await redis.del(key);
      metrics.deletes++;
      logger.debug('Redis cache invalidated', { key });
      return;
    }

    // Fallback to in-memory
    metrics.fallbacks++;
    Object.values(inMemoryCaches).forEach(cache => cache.del(key));
    metrics.deletes++;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache invalidate error', error instanceof Error ? error : new Error(String(error)), { key });
  }
}

/**
 * Invalidate all keys matching pattern
 *
 * @param pattern - Redis pattern (e.g., "user:*", "project:123:*")
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    if (redis && isRedisAvailable) {
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        metrics.deletes += keys.length;
        logger.info('Redis cache pattern invalidated', { pattern, count: keys.length });
      }

      return;
    }

    // Fallback to in-memory (convert Redis pattern to RegExp)
    metrics.fallbacks++;
    const regex = new RegExp(pattern.replace('*', '.*'));

    Object.values(inMemoryCaches).forEach(cache => {
      const keys = cache.keys();
      let deletedCount = 0;

      for (const key of keys) {
        if (regex.test(key)) {
          cache.del(key);
          deletedCount++;
        }
      }

      metrics.deletes += deletedCount;
    });
  } catch (error) {
    metrics.errors++;
    logger.error('Cache pattern invalidate error', error instanceof Error ? error : new Error(String(error)), { pattern });
  }
}

/**
 * Clear all caches
 */
export async function clearAll(): Promise<void> {
  try {
    if (redis && isRedisAvailable) {
      await redis.flushdb();
      logger.info('Redis cache cleared');
      return;
    }

    // Fallback to in-memory
    metrics.fallbacks++;
    Object.values(inMemoryCaches).forEach(cache => cache.flushAll());
    logger.info('In-memory caches cleared (fallback)');
  } catch (error) {
    metrics.errors++;
    logger.error('Cache clear error', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    metrics: { ...metrics },
    hitRate: metrics.hits + metrics.misses > 0
      ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(2) + '%'
      : '0.00%',
    isRedisAvailable,
    fallbackPercentage: metrics.hits + metrics.misses > 0
      ? ((metrics.fallbacks / (metrics.hits + metrics.misses)) * 100).toFixed(2) + '%'
      : '0.00%',
  };
}

/**
 * Ping Redis to check connection
 */
export async function ping(): Promise<boolean> {
  try {
    if (redis && isRedisAvailable) {
      const result = await redis.ping();
      return result === 'PONG';
    }
    return false;
  } catch (error) {
    logger.error('Redis ping failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Namespaced cache helper
 */
export function createNamespacedCache(namespace: string) {
  return {
    get: <T>(key: string) => get<T>(`${namespace}:${key}`),

    set: <T>(key: string, value: T, ttl?: number) => set<T>(`${namespace}:${key}`, value, ttl),

    invalidate: (key: string) => invalidate(`${namespace}:${key}`),

    invalidateAll: () => invalidatePattern(`${namespace}:*`),

    query: <T>(key: string, query: () => Promise<T>, ttl?: number) =>
      cachedQuery<T>(`${namespace}:${key}`, query, ttl),
  };
}

/**
 * Helper: Select appropriate in-memory cache based on TTL
 */
function selectInMemoryCache(ttl: number) {
  if (ttl <= CacheTier.SHORT) return inMemoryCaches.short;
  if (ttl <= CacheTier.MEDIUM) return inMemoryCaches.medium;
  return inMemoryCaches.long;
}

/**
 * Helper: Get tier name for logging
 */
function getTierName(ttl: number): string {
  switch (ttl) {
    case CacheTier.SHORT: return 'SHORT';
    case CacheTier.MEDIUM: return 'MEDIUM';
    case CacheTier.LONG: return 'LONG';
    case CacheTier.HOUR: return 'HOUR';
    case CacheTier.DAY: return 'DAY';
    default: return `CUSTOM(${ttl}s)`;
  }
}

// Export Redis instance for advanced usage
export { redis };

// Export cache tiers for convenience
export const shortCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, CacheTier.SHORT);

export const mediumCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, CacheTier.MEDIUM);

export const longCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, CacheTier.LONG);

export const hourCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, CacheTier.HOUR);

export const dayCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, CacheTier.DAY);
