/**
 * 🧠 LRU Memory Cache
 * High-performance in-memory cache with automatic eviction
 * Uses lru-cache for optimal memory management
 */

import { LRUCache } from 'lru-cache';
import { logger } from '@/lib/logger';

interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
  name?: string;
}

/**
 * Create a type-safe LRU cache instance
 */
export function createLRUCache<T extends NonNullable<unknown>>(options: CacheOptions = {}) {
  const {
    maxSize = 500,
    ttlMs = 5 * 60 * 1000, // 5 minutes default
    name = 'lru-cache'
  } = options;

  const cache = new LRUCache<string, T>({
    max: maxSize,
    ttl: ttlMs,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  });

  return {
    get: (key: string): T | undefined => {
      const value = cache.get(key);
      if (value !== undefined) {
        logger.debug(`[${name}] Cache HIT: ${key}`);
      }
      return value;
    },

    set: (key: string, value: T, ttl?: number): void => {
      cache.set(key, value, { ttl: ttl ?? ttlMs });
      logger.debug(`[${name}] Cache SET: ${key}`);
    },

    has: (key: string): boolean => cache.has(key),

    delete: (key: string): boolean => {
      const deleted = cache.delete(key);
      if (deleted) {
        logger.debug(`[${name}] Cache DELETE: ${key}`);
      }
      return deleted;
    },

    clear: (): void => {
      cache.clear();
      logger.info(`[${name}] Cache CLEARED`);
    },

    size: (): number => cache.size,

    keys: (): string[] => [...cache.keys()],

    // Stats for monitoring
    stats: () => ({
      size: cache.size,
      maxSize,
      ttlMs,
      name,
    }),
  };
}

// Pre-configured caches for common use cases
export const templateCache = createLRUCache<Record<string, unknown>>({
  name: 'templates',
  maxSize: 100,
  ttlMs: 30 * 60 * 1000, // 30 min
});

export const userSessionCache = createLRUCache<Record<string, unknown>>({
  name: 'user-sessions',
  maxSize: 1000,
  ttlMs: 15 * 60 * 1000, // 15 min
});

export const apiResponseCache = createLRUCache<Record<string, unknown>>({
  name: 'api-responses',
  maxSize: 200,
  ttlMs: 60 * 1000, // 1 min
});

export const thumbnailCache = createLRUCache<Buffer>({
  name: 'thumbnails',
  maxSize: 50,
  ttlMs: 10 * 60 * 1000, // 10 min
});
