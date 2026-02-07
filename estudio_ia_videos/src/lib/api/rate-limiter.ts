/**
 * Rate Limiter
 *
 * Simple in-memory rate limiter for API endpoints
 * In production, use Redis for distributed rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@lib/logger';

const logger = new Logger('rate-limiter');

// =============================================================================
// Types
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// =============================================================================
// In-Memory Store
// =============================================================================

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

// =============================================================================
// Rate Limiter Class
// =============================================================================

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: config?.windowMs || 60000, // 1 minute default
      maxRequests: config?.maxRequests || 60, // 60 requests/minute default
    };
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    // No existing entry or expired
    if (!entry || entry.resetAt < now) {
      const resetAt = now + this.config.windowMs;
      rateLimitStore.set(identifier, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt,
      };
    }

    // Check limit
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Get rate limit headers
   */
  getHeaders(result: { remaining: number; resetAt: number }): Headers {
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', this.config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());
    return headers;
  }
}

// =============================================================================
// Middleware Function
// =============================================================================

/**
 * Rate limit middleware
 */
export function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: {
    identifier?: string;
    maxRequests?: number;
    windowMs?: number;
  }
): Promise<NextResponse> {
  // Get identifier (API key, IP, or custom)
  const identifier =
    options?.identifier ||
    request.headers.get('X-API-Key') ||
    request.headers.get('X-Forwarded-For') ||
    request.ip ||
    'anonymous';

  const limiter = new RateLimiter({
    maxRequests: options?.maxRequests,
    windowMs: options?.windowMs,
  });

  const result = limiter.check(identifier);

  if (!result.allowed) {
    const headers = limiter.getHeaders(result);
    headers.set('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000).toString());

    logger.warn('Rate limit exceeded', {
      identifier,
      resetAt: new Date(result.resetAt).toISOString(),
    });

    return Promise.resolve(
      new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers,
        }
      )
    );
  }

  // Add rate limit headers to successful response
  return handler(request).then((response) => {
    const headers = limiter.getHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  });
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter(config);
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  api: new RateLimiter({ windowMs: 60000, maxRequests: 60 }),
  upload: new RateLimiter({ windowMs: 60000, maxRequests: 10 }),
  generate: new RateLimiter({ windowMs: 60000, maxRequests: 5 }),
};

export default RateLimiter;
