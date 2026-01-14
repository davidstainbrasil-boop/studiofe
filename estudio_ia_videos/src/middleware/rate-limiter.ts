/**
 * API Rate Limiter Middleware
 * Prevents abuse and ensures fair resource allocation
 *
 * Features:
 * - Tier-based limits (anonymous, free, pro, enterprise)
 * - Redis-backed distributed rate limiting
 * - Automatic blocking of abusive IPs
 * - Rate limit headers
 */

import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';

// Redis connection
let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      logger.error('Redis rate limiter error', err);
    });
  }
} catch (error) {
  logger.error('Failed to initialize Redis for rate limiting', error instanceof Error ? error : new Error(String(error)));
}

export type RateLimitTier = 'anonymous' | 'free' | 'basic' | 'pro' | 'enterprise';

/**
 * Rate limit configuration per tier
 */
const RATE_LIMITS: Record<RateLimitTier, { points: number; duration: number; blockDuration: number }> = {
  anonymous: {
    points: 100,       // 100 requests
    duration: 3600,    // per hour
    blockDuration: 3600, // block for 1 hour if exceeded
  },
  free: {
    points: 500,
    duration: 3600,
    blockDuration: 3600,
  },
  basic: {
    points: 2000,
    duration: 3600,
    blockDuration: 1800, // 30 min block
  },
  pro: {
    points: 5000,
    duration: 3600,
    blockDuration: 0, // Pro users don't get blocked
  },
  enterprise: {
    points: 50000,
    duration: 3600,
    blockDuration: 0,
  },
};

// Create rate limiters for each tier
const limiters: Record<RateLimitTier, RateLimiterRedis | null> = {
  anonymous: null,
  free: null,
  basic: null,
  pro: null,
  enterprise: null,
};

// Initialize limiters if Redis is available
if (redis) {
  for (const [tier, config] of Object.entries(RATE_LIMITS)) {
    try {
      limiters[tier as RateLimitTier] = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `rl:${tier}`,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration,
        insuranceLimiter: undefined, // No fallback to memory
      });
    } catch (error) {
      logger.error(`Failed to create rate limiter for tier ${tier}`, error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Rate limit a request
 *
 * @param req - Next.js request
 * @param userId - User ID (optional)
 * @param tier - Rate limit tier
 * @returns NextResponse with 429 if rate limited, null if allowed
 */
export async function rateLimit(
  req: NextRequest,
  userId?: string,
  tier: RateLimitTier = 'anonymous'
): Promise<NextResponse | null> {
  // If Redis not available, allow all requests (fail open)
  if (!redis || !limiters[tier]) {
    logger.warn('Rate limiting disabled (Redis unavailable)');
    return null;
  }

  // Extract IP address
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Use userId if available, otherwise IP
  const key = userId || ip;
  const limiter = limiters[tier]!;

  try {
    // Consume 1 point
    const rateLimitRes: RateLimiterRes = await limiter.consume(key, 1);

    // Log if user is close to limit
    if (rateLimitRes.remainingPoints < limiter.points * 0.1) {
      logger.warn('User approaching rate limit', {
        key,
        tier,
        remaining: rateLimitRes.remainingPoints,
        limit: limiter.points,
      });
    }

    // Request allowed - add headers
    // (Note: Response headers will be added by caller)
    return null;
  } catch (error) {
    // Rate limit exceeded
    if (error instanceof Error && 'msBeforeNext' in error) {
      const rateLimitError = error as any;
      const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);

      logger.warn('Rate limit exceeded', {
        key,
        tier,
        retryAfter,
        ip,
      });

      // Send Sentry alert for repeated violations
      if (rateLimitError.consumedPoints > limiter.points * 2) {
        try {
          const Sentry = require('@sentry/nextjs');
          Sentry.captureMessage('Repeated rate limit violations', {
            level: 'warning',
            tags: { key, tier, ip },
            contexts: {
              rate_limit: {
                consumedPoints: rateLimitError.consumedPoints,
                limit: limiter.points,
                tier,
              },
            },
          });
        } catch (sentryError) {
          // Sentry not available
        }
      }

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message:
            tier === 'pro' || tier === 'enterprise'
              ? 'Você atingiu o limite de requisições. Tente novamente em alguns segundos.'
              : 'Você atingiu o limite de requisições. Faça upgrade para PRO ou aguarde.',
          retryAfter,
          tier,
          limit: limiter.points,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limiter.points),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(new Date(Date.now() + rateLimitError.msBeforeNext).toISOString()),
          },
        }
      );
    }

    // Other error - allow request (fail open)
    logger.error('Rate limiter error', error instanceof Error ? error : new Error(String(error)), { key, tier });
    return null;
  }
}

/**
 * Get rate limit headers for successful requests
 */
export function getRateLimitHeaders(
  rateLimitRes: RateLimiterRes,
  limiter: RateLimiterRedis
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limiter.points),
    'X-RateLimit-Remaining': String(rateLimitRes.remainingPoints),
    'X-RateLimit-Reset': String(new Date(Date.now() + rateLimitRes.msBeforeNext).toISOString()),
  };

  // Warning if close to limit
  if (rateLimitRes.remainingPoints < limiter.points * 0.1) {
    headers['X-RateLimit-Warning'] = 'true';
  }

  return headers;
}

/**
 * Check if user is admin (bypass rate limiting)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  // TODO: Implement admin check
  // For now, return false
  return false;
}

/**
 * Get user tier from database (with Redis cache)
 * Cached for 5 minutes to reduce database load
 */
export async function getUserTier(userId?: string): Promise<RateLimitTier> {
  if (!userId) return 'anonymous';

  try {
    // Try to get from Redis cache first
    if (redis) {
      const cached = await redis.get(`user:${userId}:tier`).catch(() => null);
      if (cached) {
        return cached as RateLimitTier;
      }
    }

    // Cache miss - query database
    const { prisma } = await import('@lib/prisma');

    // Fix: Query subscriptions instead of non-existent subscriptionTier field
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { subscription_plans: true },
          take: 1
        }
      }
    });

    if (!user) return 'free';

    // Map subscription tier to rate limit tier
    const tierMap: Record<string, RateLimitTier> = {
      'Free': 'free',
      'Basic': 'basic',
      'Pro': 'pro',
      'Enterprise': 'enterprise',
    };

    const planName = user.subscriptions?.[0]?.subscription_plans?.name || 'Free';
    const tier = tierMap[planName] || 'free';

    // Store in Redis cache (5 minutes)
    if (redis) {
      await redis.setex(`user:${userId}:tier`, 300, tier).catch(() => {
        // Ignore cache errors
      });
    }

    return tier;
  } catch (error) {
    logger.error('Failed to get user tier', error instanceof Error ? error : new Error(String(error)), { userId });
    return 'free'; // Default to free on error
  }
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export async function resetRateLimit(key: string, tier: RateLimitTier = 'free'): Promise<void> {
  const limiter = limiters[tier];
  if (!limiter) return;

  try {
    await limiter.delete(key);
    logger.info('Rate limit reset', { key, tier });
  } catch (error) {
    logger.error('Failed to reset rate limit', error instanceof Error ? error : new Error(String(error)), { key, tier });
  }
}

/**
 * Get rate limit stats for a key
 */
export async function getRateLimitStats(key: string, tier: RateLimitTier = 'free') {
  const limiter = limiters[tier];
  if (!limiter || !redis) return null;

  try {
    const keyWithPrefix = `rl:${tier}:${key}`;
    const points = await redis.get(keyWithPrefix);

    return {
      key,
      tier,
      consumed: points ? parseInt(points) : 0,
      limit: limiter.points,
      remaining: points ? limiter.points - parseInt(points) : limiter.points,
    };
  } catch (error) {
    logger.error('Failed to get rate limit stats', error instanceof Error ? error : new Error(String(error)), { key, tier });
    return null;
  }
}
