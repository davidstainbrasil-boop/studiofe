/**
 * API Route Rate Limiting Wrapper
 *
 * HOF (Higher Order Function) that wraps API route handlers with Redis-backed rate limiting.
 * Use this in API routes that need production-grade distributed rate limiting.
 *
 * Usage:
 * ```typescript
 * import { withRateLimit } from '@/middleware/with-rate-limit';
 *
 * export const POST = withRateLimit(async (req: NextRequest) => {
 *   // Your API logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getUserTier, RateLimitTier } from './rate-limiter';
import { getSupabaseForRequest } from '@lib/supabase/server';

export type RateLimitConfig = {
  /**
   * Override rate limit tier (defaults to user's subscription tier)
   */
  tier?: RateLimitTier;

  /**
   * Skip rate limiting if condition is true
   */
  skip?: (req: NextRequest) => boolean | Promise<boolean>;

  /**
   * Custom error handler
   */
  onRateLimitExceeded?: (req: NextRequest) => NextResponse | Promise<NextResponse>;
};

/**
 * Wraps an API route handler with Redis-backed rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Check if rate limiting should be skipped
    if (config?.skip) {
      const shouldSkip = await config.skip(req);
      if (shouldSkip) {
        return handler(req, context);
      }
    }

    // Get user session
    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const userId = user?.id;

    // Determine rate limit tier
    let tier: RateLimitTier;
    if (config?.tier) {
      tier = config.tier;
    } else {
      tier = await getUserTier(userId);
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, userId, tier);

    // If rate limit exceeded
    if (rateLimitResponse) {
      if (config?.onRateLimitExceeded) {
        return config.onRateLimitExceeded(req);
      }
      return rateLimitResponse;
    }

    // Rate limit passed - proceed with handler
    return handler(req, context);
  };
}

/**
 * Shorthand for anonymous-only rate limiting (lowest tier)
 */
export function withAnonRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withRateLimit(handler, { tier: 'anonymous' });
}

/**
 * Shorthand for free tier rate limiting
 */
export function withFreeRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withRateLimit(handler, { tier: 'free' });
}

/**
 * Admin routes bypass rate limiting
 */
export function withAdminRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withRateLimit(handler, {
    skip: async (req) => {
      const supabase = getSupabaseForRequest(req);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return false;

      // Check admin role (you may need to adjust based on your schema)
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      return profile?.role === 'admin';
    }
  });
}
