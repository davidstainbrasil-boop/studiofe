/**
 * Query Cache Utility
 * Caches query results to improve performance
 *
 * Features:
 * - In-memory caching with TTL
 * - Automatic cache invalidation
 * - Cache hit/miss metrics
 * - Namespace support
 */

import NodeCache from 'node-cache';
import { logger } from '@lib/logger';

// Cache instances with different TTLs
const caches = {
  // Short-lived cache (5 minutes) - frequently changing data
  short: new NodeCache({ stdTTL: 300, checkperiod: 60 }),

  // Medium-lived cache (10 minutes) - moderately changing data
  medium: new NodeCache({ stdTTL: 600, checkperiod: 120 }),

  // Long-lived cache (30 minutes) - rarely changing data
  long: new NodeCache({ stdTTL: 1800, checkperiod: 300 }),
};

// Cache metrics
const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
};

/**
 * Cache a query result
 *
 * @param key - Cache key
 * @param query - Function that executes the query
 * @param ttl - Time to live in seconds (optional)
 * @param cache - Cache instance to use (default: medium)
 * @returns Query result
 */
export async function cachedQuery<T>(
  key: string,
  query: () => Promise<T>,
  ttl?: number,
  cache: NodeCache = caches.medium
): Promise<T> {
  try {
    // Check if cached
    const cached = cache.get<T>(key);

    if (cached !== undefined) {
      metrics.hits++;
      logger.debug('Cache hit', { key, cache: getCacheName(cache) });
      return cached;
    }

    // Cache miss - execute query
    metrics.misses++;
    logger.debug('Cache miss', { key, cache: getCacheName(cache) });

    const result = await query();

    // Store in cache
    if (ttl) {
      cache.set(key, result, ttl);
    } else {
      cache.set(key, result);
    }

    metrics.sets++;
    logger.debug('Cache set', { key, cache: getCacheName(cache), ttl });

    return result;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache error', error instanceof Error ? error : new Error(String(error)), { key });

    // On error, execute query without caching
    return await query();
  }
}

/**
 * Invalidate a specific cache key
 */
export function invalidateCache(key: string, cache: NodeCache = caches.medium): void {
  cache.del(key);
  metrics.deletes++;
  logger.debug('Cache invalidated', { key, cache: getCacheName(cache) });
}

/**
 * Invalidate all keys matching a pattern
 */
export function invalidatePattern(pattern: string | RegExp, cache: NodeCache = caches.medium): void {
  const keys = cache.keys();
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  let deletedCount = 0;
  for (const key of keys) {
    if (regex.test(key)) {
      cache.del(key);
      deletedCount++;
    }
  }

  metrics.deletes += deletedCount;
  logger.info('Cache pattern invalidated', {
    pattern: pattern.toString(),
    cache: getCacheName(cache),
    deletedCount,
  });
}

/**
 * Clear all caches
 */
export function clearAll(): void {
  Object.values(caches).forEach(cache => cache.flushAll());
  logger.info('All caches cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    metrics: { ...metrics },
    hitRate: metrics.hits + metrics.misses > 0
      ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(2)
      : '0.00',
    caches: {
      short: {
        keys: caches.short.keys().length,
        stats: caches.short.getStats(),
      },
      medium: {
        keys: caches.medium.keys().length,
        stats: caches.medium.getStats(),
      },
      long: {
        keys: caches.long.keys().length,
        stats: caches.long.getStats(),
      },
    },
  };
}

/**
 * Get cache name (for logging)
 */
function getCacheName(cache: NodeCache): string {
  if (cache === caches.short) return 'short';
  if (cache === caches.medium) return 'medium';
  if (cache === caches.long) return 'long';
  return 'custom';
}

/**
 * Namespaced cache helper
 */
export function createNamespacedCache(namespace: string) {
  return {
    get: <T>(key: string, cache?: NodeCache) =>
      cachedQuery<T>(
        `${namespace}:${key}`,
        async () => { throw new Error('No query provided'); },
        undefined,
        cache
      ),

    set: <T>(key: string, value: T, ttl?: number, cache: NodeCache = caches.medium) => {
      const fullKey = `${namespace}:${key}`;
      if (ttl) {
        cache.set(fullKey, value, ttl);
      } else {
        cache.set(fullKey, value);
      }
      metrics.sets++;
    },

    invalidate: (key: string, cache?: NodeCache) =>
      invalidateCache(`${namespace}:${key}`, cache),

    invalidateAll: (cache: NodeCache = caches.medium) =>
      invalidatePattern(new RegExp(`^${namespace}:`), cache),

    query: <T>(key: string, query: () => Promise<T>, ttl?: number, cache?: NodeCache) =>
      cachedQuery<T>(`${namespace}:${key}`, query, ttl, cache),
  };
}

// Export cache instances
export { caches };

// Export specific helpers for common TTLs
export const shortCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, undefined, caches.short);

export const mediumCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, undefined, caches.medium);

export const longCache = <T>(key: string, query: () => Promise<T>) =>
  cachedQuery<T>(key, query, undefined, caches.long);
