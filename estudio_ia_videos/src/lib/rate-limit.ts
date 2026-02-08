import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { logger } from './logger';

type InMemoryBucket = { count: number; resetAtMs: number };

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
  limit: number;
  resetAtMs: number;
  source: 'redis' | 'memory' | 'fail-open' | 'fail-closed';
};

let redisClient: Redis | null = null;
const mem = new Map<string, InMemoryBucket>();

function getRedisUrl(): string | null {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  // Best-effort compatibility with legacy envs
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  if (host && port) return `redis://${host}:${port}`;
  return null;
}

function shouldFailClosed(): boolean {
  // Default: fail-closed in production, fail-open elsewhere.
  if (process.env.RATE_LIMIT_FAIL_MODE === 'open') return false;
  if (process.env.RATE_LIMIT_FAIL_MODE === 'closed') return true;
  return process.env.NODE_ENV === 'production';
}

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const url = getRedisUrl();
  if (!url) return null;

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      // Upstash / managed Redis sometimes requires rediss:// with relaxed TLS
      ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    });
    redisClient.on('error', (err) => {
      logger.error('RateLimit Redis error', err instanceof Error ? err : new Error(String(err)), {
        component: 'rate-limit',
      });
    });
    return redisClient;
  } catch (err) {
    logger.error('Failed to init RateLimit Redis client', err instanceof Error ? err : new Error(String(err)), {
      component: 'rate-limit',
    });
    return null;
  }
}

const RATE_LIMIT_LUA = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = ARGV[1]
end
return {current, ttl}
`;

function memoryLimiter(key: string, limit: number, windowMs: number): RateLimitDecision {
  const now = Date.now();
  const bucket = mem.get(key);

  if (!bucket || now >= bucket.resetAtMs) {
    const resetAtMs = now + windowMs;
    mem.set(key, { count: 1, resetAtMs });
    return { allowed: true, retryAfterSec: 0, remaining: Math.max(0, limit - 1), limit, resetAtMs, source: 'memory' };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  const retryAfterSec = allowed ? 0 : Math.ceil((bucket.resetAtMs - now) / 1000);
  const remaining = Math.max(0, limit - bucket.count);
  return { allowed, retryAfterSec, remaining, limit, resetAtMs: bucket.resetAtMs, source: 'memory' };
}

export async function checkRateLimit(key: string, limit: number = 10, windowMs: number = 60_000): Promise<RateLimitDecision> {
  const redis = getRedisClient();
  const namespacedKey = `rl:${windowMs}:${limit}:${key}`;

  if (!redis) {
    return memoryLimiter(namespacedKey, limit, windowMs);
  }

  try {
    const res = (await redis.eval(RATE_LIMIT_LUA, 1, namespacedKey, String(windowMs))) as unknown as [number, number];
    const count = Number(res[0] ?? 0);
    const ttlMs = Number(res[1] ?? windowMs);
    const allowed = count <= limit;
    const retryAfterSec = allowed ? 0 : Math.ceil(Math.max(0, ttlMs) / 1000);
    const remaining = Math.max(0, limit - count);
    return {
      allowed,
      retryAfterSec,
      remaining,
      limit,
      resetAtMs: Date.now() + Math.max(0, ttlMs),
      source: 'redis',
    };
  } catch (err) {
    const failClosed = shouldFailClosed();
    logger.error('RateLimit Redis eval failed', err instanceof Error ? err : new Error(String(err)), {
      component: 'rate-limit',
      failMode: failClosed ? 'closed' : 'open',
    });
    if (failClosed) {
      return { allowed: false, retryAfterSec: Math.ceil(windowMs / 1000), remaining: 0, limit, resetAtMs: Date.now() + windowMs, source: 'fail-closed' };
    }
    return { allowed: true, retryAfterSec: 0, remaining: limit, limit, resetAtMs: Date.now() + windowMs, source: 'fail-open' };
  }
}

export async function inspectRateLimit(key: string, limit: number = 10, windowMs: number = 60_000) {
  const redis = getRedisClient();
  const namespacedKey = `rl:${windowMs}:${limit}:${key}`;
  if (!redis) {
    const bucket = mem.get(namespacedKey);
    const now = Date.now();
    if (!bucket || now >= bucket.resetAtMs) return { remaining: limit, resetAtMs: now + windowMs, source: 'memory' as const };
    return { remaining: Math.max(0, limit - bucket.count), resetAtMs: bucket.resetAtMs, source: 'memory' as const };
  }
  try {
    const [countStr, ttlStr] = (await redis
      .multi()
      .get(namespacedKey)
      .pttl(namespacedKey)
      .exec()) as unknown as [[null, string | null], [null, number]];
    const count = countStr?.[1] ? Number(countStr[1]) : 0;
    const ttlMs = ttlStr?.[1] && ttlStr[1] > 0 ? ttlStr[1] : windowMs;
    return {
      remaining: Math.max(0, limit - count),
      resetAtMs: Date.now() + ttlMs,
      source: 'redis' as const,
    };
  } catch {
    return { remaining: 0, resetAtMs: Date.now() + windowMs, source: 'unknown' as const };
  }
}

/**
 * Global rate limiter with sync-compatible check method
 * Used for compatibility with existing code
 */
export const globalRateLimiter = {
  /** Default limit per window */
  limit: 100,
  /** Default window in milliseconds */
  windowMs: 60_000,
  
  /**
   * Synchronous check using in-memory rate limiting
   * Returns { success: true } if allowed, { success: false } if rate limited
   */
  check(key: string): { success: boolean; remaining: number; limit: number } {
    const result = memoryLimiter(`global:${key}`, this.limit, this.windowMs);
    return {
      success: result.allowed,
      remaining: result.remaining,
      limit: result.limit,
    };
  },
  
  /**
   * Async check using Redis if available
   */
  async checkAsync(key: string): Promise<RateLimitDecision> {
    return checkRateLimit(`global:${key}`, this.limit, this.windowMs);
  },
  
  /**
   * Configure the rate limiter
   */
  configure(options: { limit?: number; windowMs?: number }) {
    if (options.limit) this.limit = options.limit;
    if (options.windowMs) this.windowMs = options.windowMs;
    return this;
  },
};

/**
 * Apply rate limiting to a request. Returns a 429 NextResponse if blocked, or null if allowed.
 *
 * Usage:
 * ```ts
 * const blocked = await applyRateLimit(request, 'render', 10);
 * if (blocked) return blocked;
 * ```
 *
 * @param request - The incoming request (uses x-forwarded-for or ip header)
 * @param prefix - Rate limit key prefix (e.g. 'render', 'tts', 'upload')
 * @param limit - Max requests per window (default 30)
 * @param windowMs - Window size in ms (default 60_000 = 1 min)
 */
export async function applyRateLimit(
  request: { headers: { get(name: string): string | null } },
  prefix: string,
  limit = 30,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimit(`${prefix}:${ip}`, limit, windowMs);
  if (!rl.allowed) {
    logger.warn(`Rate limit exceeded: ${prefix}`, { ip, retryAfter: rl.retryAfterSec });
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }
  return null;
}

