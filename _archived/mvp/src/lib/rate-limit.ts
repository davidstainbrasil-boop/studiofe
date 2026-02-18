import { NextResponse } from 'next/server';
import { logger } from './logger';

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (now >= bucket.resetAt) store.delete(key);
    }
  }, 60_000);
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, swap to Redis (ioredis).
 */
export function checkRateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSec = allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000);

  return { allowed, remaining, retryAfterSec };
}

/**
 * Apply rate limiting to an API route. Returns a 429 response if exceeded, null otherwise.
 */
export function applyRateLimit(
  request: Request,
  prefix: string,
  limit: number = 30,
  windowMs: number = 60_000
): NextResponse | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const key = `${prefix}:${ip}`;

  const result = checkRateLimit(key, limit, windowMs);

  if (!result.allowed) {
    logger.warn('Rate limit exceeded', { prefix, ip, retryAfter: result.retryAfterSec });
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: result.retryAfterSec },
      {
        status: 429,
        headers: { 'Retry-After': String(result.retryAfterSec) },
      }
    );
  }

  return null;
}
