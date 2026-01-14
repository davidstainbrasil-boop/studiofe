/**
 * Idempotency Middleware for Video Pipeline
 * 
 * Prevents duplicate processing of expensive operations (TTS, storage) on retry.
 * Uses Redis to cache operation results with 24h TTL.
 * 
 * Feature Flag: ENABLE_IDEMPOTENCY (default: true)
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Redis client for idempotency cache
 */
let redisClient: Redis | null = null;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redisClient.on('error', (error) => {
    logger.warn('Redis idempotency cache error', {
      service: 'IdempotencyMiddleware',
      error: error.message,
    });
  });

  redisClient.on('connect', () => {
    logger.info('Redis idempotency cache connected', {
      service: 'IdempotencyMiddleware',
    });
  });
} catch (error) {
  logger.error('Failed to initialize Redis for idempotency', error instanceof Error ? error : new Error(String(error)), {
    service: 'IdempotencyMiddleware',
  });
}

/**
 * Feature flag for idempotency
 */
export const IDEMPOTENCY_ENABLED = process.env.ENABLE_IDEMPOTENCY !== 'false';

/**
 * Generate SHA-256 hash of a string
 */
export function generateHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}

/**
 * Generate idempotency key for TTS operations
 * 
 * Format: tts_{projectId}_{slideId}_{hash(text+voice+speed)}
 */
export function generateTTSIdempotencyKey(
  projectId: string,
  slideId: string,
  text: string,
  voice: string,
  speed: number = 1.0
): string {
  const contentHash = generateHash(`${text}|${voice}|${speed}`);
  return `idem:tts:${projectId}:${slideId}:${contentHash}`;
}

/**
 * Generate idempotency key for storage upload operations
 * 
 * Format: upload_{jobId}_{filename}_{size}
 */
export function generateStorageIdempotencyKey(
  jobId: string,
  filename: string,
  size: number
): string {
  return `idem:upload:${jobId}:${filename}:${size}`;
}

/**
 * Wrapper for idempotent operations
 * 
 * Checks Redis cache before executing operation.
 * Stores result in cache on success.
 * Falls back to normal execution if Redis unavailable.
 * 
 * @param key - Idempotency key
 * @param operation - Async operation to execute
 * @param ttl - Cache TTL in seconds (default: 24h)
 * @returns Operation result (from cache or fresh execution)
 * 
 * @example
 * const audioUrl = await withIdempotency(
 *   generateTTSIdempotencyKey(projectId, slideId, text, voice),
 *   async () => await ttsProvider.generate(text, voice),
 *   IDEMPOTENCY_TTL
 * );
 */
export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttl: number = IDEMPOTENCY_TTL
): Promise<T> {
  // If idempotency disabled or Redis unavailable, execute operation directly
  if (!IDEMPOTENCY_ENABLED || !redisClient) {
    logger.debug('Idempotency disabled or Redis unavailable, executing operation', {
      service: 'IdempotencyMiddleware',
      key,
    });
    return operation();
  }

  try {
    // Check cache
    const cached = await redisClient.get(key);
    
    if (cached) {
      logger.info('Idempotency cache hit', {
        service: 'IdempotencyMiddleware',
        key,
      });
      
      return JSON.parse(cached) as T;
    }

    // Cache miss - execute operation
    logger.debug('Idempotency cache miss, executing operation', {
      service: 'IdempotencyMiddleware',
      key,
    });

    const result = await operation();

    // Store result in cache
    try {
      await redisClient.setex(key, ttl, JSON.stringify(result));
      
      logger.debug('Idempotency result cached', {
        service: 'IdempotencyMiddleware',
        key,
        ttl,
      });
    } catch (cacheError) {
      // Non-fatal: log but don't fail operation
      logger.warn('Failed to cache idempotency result', {
        service: 'IdempotencyMiddleware',
        key,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
    }

    return result;
  } catch (redisError) {
    // Redis error - fall back to executing operation without cache
    logger.warn('Redis idempotency check failed, executing without cache', {
      service: 'IdempotencyMiddleware',
      key,
      error: redisError instanceof Error ? redisError.message : String(redisError),
    });

    return operation();
  }
}

/**
 * Invalidate cached result for a key
 * Useful for manual cache busting or after operation failures
 */
export async function invalidateIdempotencyKey(key: string): Promise<void> {
  if (!redisClient || !IDEMPOTENCY_ENABLED) {
    return;
  }

  try {
    await redisClient.del(key);
    logger.info('Idempotency key invalidated', {
      service: 'IdempotencyMiddleware',
      key,
    });
  } catch (error) {
    logger.warn('Failed to invalidate idempotency key', {
      service: 'IdempotencyMiddleware',
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get idempotency cache statistics
 */
export async function getIdempotencyCacheStats(): Promise<{
  enabled: boolean;
  connected: boolean;
  keyCount: number;
}> {
  if (!redisClient || !IDEMPOTENCY_ENABLED) {
    return {
      enabled: IDEMPOTENCY_ENABLED,
      connected: false,
      keyCount: 0,
    };
  }

  try {
    const keys = await redisClient.keys('idem:*');
    return {
      enabled: true,
      connected: redisClient.status === 'ready',
      keyCount: keys.length,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      keyCount: 0,
    };
  }
}

/**
 * Graceful shutdown
 */
export async function closeIdempotencyCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Idempotency cache connection closed', {
      service: 'IdempotencyMiddleware',
    });
  }
}

// Auto-connect if enabled
if (IDEMPOTENCY_ENABLED && redisClient) {
  redisClient.connect().catch((error) => {
    logger.error('Failed to connect to Redis for idempotency', error instanceof Error ? error : new Error(String(error)), {
      service: 'IdempotencyMiddleware',
    });
  });
}
