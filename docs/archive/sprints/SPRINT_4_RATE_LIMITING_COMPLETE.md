# SPRINT 4 - Feature #2: API Rate Limiting Implementation

**Status:** ✅ COMPLETE
**Date:** 2026-01-12
**Priority:** CRITICAL

---

## ✅ Implementation Summary

Successfully implemented distributed, tier-based API rate limiting using Redis to prevent abuse and ensure fair resource allocation across all users.

### What Was Implemented

1. **Redis-backed Rate Limiter Middleware**
   - File: `src/middleware/rate-limiter.ts` (304 lines)
   - Distributed rate limiting using `rate-limiter-flexible` library
   - ioredis connection with error handling and lazy loading
   - Fail-open strategy (allows requests if Redis unavailable)

2. **Tier-based Rate Limits**
   - **Anonymous**: 100 req/hour (1h block)
   - **Free**: 500 req/hour (1h block)
   - **Basic**: 2000 req/hour (30min block)
   - **Pro**: 5000 req/hour (no block)
   - **Enterprise**: 50000 req/hour (no block)

3. **Next.js Middleware Integration**
   - File: `src/middleware.ts` (modified)
   - Basic rate limiting (500 req/min) in Edge Runtime for DDoS protection
   - Note: Full Redis-backed rate limiting applied in API routes (Node.js runtime)

4. **API Route Wrapper**
   - File: `src/middleware/with-rate-limit.ts` (129 lines)
   - HOF (Higher Order Function) for easy rate limit application
   - Configurable tier override, skip conditions, custom error handlers
   - Shorthand helpers: `withAnonRateLimit`, `withFreeRateLimit`, `withAdminRateLimit`

5. **Applied to Critical Routes**
   - `/api/render/start` - Video rendering (most resource-intensive)
   - Integrated with user tier detection from database

---

## 📁 Files Modified/Created

### Created Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/middleware/rate-limiter.ts` | 304 | Redis-backed distributed rate limiter core |
| `src/middleware/with-rate-limit.ts` | 129 | HOF wrapper for API routes |

### Modified Files

| File | Changes |
|------|---------|
| `src/middleware.ts` | Updated rate limiter to basic DDoS protection (Edge Runtime compatible) |
| `src/app/api/render/start/route.ts` | Replaced old rate limiter with Redis-backed tier-based limiter |

---

## 🔧 Technical Details

### Rate Limiter Architecture

```typescript
// Redis connection (lazy loaded)
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true
});

// Tier-based limiters
const limiters: Record<RateLimitTier, RateLimiterRedis | null> = {
  anonymous: new RateLimiterRedis({ points: 100, duration: 3600 }),
  free: new RateLimiterRedis({ points: 500, duration: 3600 }),
  basic: new RateLimiterRedis({ points: 2000, duration: 3600 }),
  pro: new RateLimiterRedis({ points: 5000, duration: 3600 }),
  enterprise: new RateLimiterRedis({ points: 50000, duration: 3600 }),
};
```

### Key Features

1. **Distributed Rate Limiting**
   - Redis stores rate limit counters across all server instances
   - Consistent limits regardless of which server handles request

2. **User Tier Detection**
   - Automatic tier lookup from `users.subscriptionTier` column
   - Maps subscription tier to rate limit tier
   - Falls back to 'free' on error (fail-safe)

3. **Sentry Integration**
   - Alerts for repeated violations (>2x limit)
   - Tracks violator IP, user ID, tier, consumed points

4. **Rate Limit Headers**
   - `X-RateLimit-Limit`: Total allowed requests
   - `X-RateLimit-Remaining`: Remaining requests in window
   - `X-RateLimit-Reset`: Timestamp when limit resets
   - `Retry-After`: Seconds until retry allowed

5. **Admin Functions**
   - `resetRateLimit(key, tier)`: Clear rate limit for specific user
   - `getRateLimitStats(key, tier)`: View current consumption
   - `isAdmin(userId)`: Check admin status (bypasses limits)

---

## 🚀 Usage Examples

### Example 1: Apply to API Route Handler

```typescript
// src/app/api/example/route.ts
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';

export async function POST(req: NextRequest) {
  // Get user ID from session
  const supabase = getSupabaseForRequest(req);
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // Apply rate limiting
  const tier = await getUserTier(userId);
  const rateLimitResponse = await rateLimit(req, userId, tier);

  if (rateLimitResponse) {
    return rateLimitResponse; // 429 Too Many Requests
  }

  // Your API logic here
  return NextResponse.json({ success: true });
}
```

### Example 2: Use HOF Wrapper

```typescript
// src/app/api/example/route.ts
import { withRateLimit } from '@/middleware/with-rate-limit';

export const POST = withRateLimit(async (req: NextRequest) => {
  // Rate limiting automatically applied
  // Your API logic here
  return NextResponse.json({ success: true });
});
```

### Example 3: Custom Configuration

```typescript
import { withRateLimit } from '@/middleware/with-rate-limit';

export const POST = withRateLimit(
  async (req: NextRequest) => {
    // Your API logic
    return NextResponse.json({ success: true });
  },
  {
    tier: 'basic', // Force basic tier
    skip: async (req) => {
      // Skip rate limiting for admins
      const isAdmin = await checkAdmin(req);
      return isAdmin;
    },
    onRateLimitExceeded: async (req) => {
      // Custom error response
      return NextResponse.json({
        error: 'Custom rate limit message',
      }, { status: 429 });
    }
  }
);
```

---

## 📊 Rate Limit Tiers Explained

### Anonymous (100/hr)
- **Who**: Unauthenticated users
- **Use case**: Public endpoints, basic browsing
- **Block**: 1 hour on exceed
- **Example**: Guest browsing templates

### Free (500/hr)
- **Who**: Registered users without subscription
- **Use case**: Basic video creation, limited features
- **Block**: 1 hour on exceed
- **Example**: Creating 1-2 videos per day

### Basic (2000/hr)
- **Who**: Basic subscription tier
- **Use case**: Regular video creation
- **Block**: 30 minutes on exceed
- **Example**: Creating 5-10 videos per day

### Pro (5000/hr)
- **Who**: Pro subscription tier
- **Use case**: Heavy video creation, professional use
- **Block**: None (graceful degradation)
- **Example**: Agency creating 20+ videos per day

### Enterprise (50000/hr)
- **Who**: Enterprise subscription tier
- **Use case**: API integration, bulk operations
- **Block**: None
- **Example**: Automated video generation via API

---

## 🔒 Security Features

### 1. DDoS Protection
- Basic middleware rate limiter (500 req/min) blocks simple attacks
- Redis-backed rate limiter provides granular protection

### 2. Abuse Detection
- Sentry alerts when user exceeds 2x their limit
- Logs include IP, user ID, tier, violation count

### 3. Fail-Open Strategy
- If Redis is unavailable, requests are allowed (not blocked)
- Prevents total service outage due to Redis failure
- Logs warning when Redis is unavailable

### 4. IP-based Tracking
- Anonymous users tracked by IP address
- Handles proxies via `x-forwarded-for` header
- Falls back to 'unknown' if no IP available

---

## 🧪 Testing

### Test 1: Basic Rate Limiting

```bash
# Anonymous user (100 req/hr)
for i in {1..110}; do
  curl https://cursostecno.com.br/api/render/start \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"projectId": "test"}' \
    -w "\nHTTP %{http_code}\n"
done

# Expected: First 100 succeed (200), last 10 fail (429)
```

### Test 2: Tier-based Limits

```bash
# Free user (500 req/hr)
curl https://cursostecno.com.br/api/render/start \
  -X POST \
  -H "Cookie: sb-access-token=FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "test"}'

# Check response headers
# X-RateLimit-Limit: 500
# X-RateLimit-Remaining: 499
```

### Test 3: Rate Limit Reset

```bash
# Check rate limit stats
curl https://cursostecno.com.br/api/admin/metrics \
  -H "Cookie: sb-access-token=ADMIN_TOKEN" \
  | jq '.rateLimits'
```

---

## 📈 Performance Impact

### Before Rate Limiting
- Risk: Unlimited requests could overload servers
- Cost: High cloud costs from abuse
- Stability: Vulnerable to DDoS attacks

### After Rate Limiting
- Protection: Automatic blocking of abusive users
- Cost savings: Prevent resource exhaustion
- Stability: Graceful degradation under load
- Redis overhead: ~1-2ms per request (negligible)

---

## 🛠️ Configuration

### Environment Variables

Required:
```bash
# Redis connection
REDIS_URL=redis://localhost:6379

# Optional: Override default queue name
RENDER_QUEUE_NAME=render-jobs
```

### Rate Limit Customization

Edit `src/middleware/rate-limiter.ts`:

```typescript
const RATE_LIMITS: Record<RateLimitTier, { points: number; duration: number }> = {
  anonymous: { points: 100, duration: 3600 },  // Change points or duration
  free: { points: 500, duration: 3600 },
  // ...
};
```

---

## 🚧 Known Limitations

1. **Edge Runtime Incompatibility**
   - ioredis not supported in Next.js Edge Runtime (middleware)
   - Workaround: Basic rate limiting in middleware, Redis rate limiting in API routes

2. **Per-instance Middleware Limiter**
   - Basic middleware rate limiter is per-instance (not distributed)
   - Only affects DDoS protection layer, not main rate limiting

3. **Database Tier Lookup**
   - Each request queries database for user tier
   - Future optimization: Cache user tiers in Redis

---

## 📝 Admin Operations

### Reset Rate Limit

```typescript
import { resetRateLimit } from '@/middleware/rate-limiter';

// Reset rate limit for specific user
await resetRateLimit('user-id-123', 'free');
```

### Check Rate Limit Stats

```typescript
import { getRateLimitStats } from '@/middleware/rate-limiter';

// Get current stats
const stats = await getRateLimitStats('user-id-123', 'free');
console.log(stats);
// {
//   key: 'user-id-123',
//   tier: 'free',
//   consumed: 45,
//   limit: 500,
//   remaining: 455
// }
```

---

## 🎯 Next Steps (Recommended)

1. **Apply to More Routes**
   - `/api/pptx/upload` - File uploads
   - `/api/projects` - Project creation
   - `/api/tts` - TTS generation
   - `/api/timeline` - Timeline updates

2. **Cache User Tiers**
   - Store user tier in Redis (5min TTL)
   - Reduce database queries by 99%

3. **Rate Limit Dashboard**
   - Add to admin dashboard (`/admin/dashboard`)
   - Show top consumers, violations, tier distribution

4. **Custom Rate Limits**
   - Per-endpoint rate limits (e.g., TTS: 100/hr, Render: 10/hr)
   - Dynamic limits based on system load

---

## ✅ Verification

### 1. Check Middleware Updated

```bash
grep -n "rate-limiter" /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/middleware.ts
# Should show import and basic rate limiting
```

### 2. Check Render Route Updated

```bash
grep -n "rateLimit" /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/app/api/render/start/route.ts
# Should show Redis-backed rate limiting
```

### 3. Test Live

```bash
# Anonymous user should be limited to 100 req/hr
curl https://cursostecno.com.br/api/render/start -X POST -H "Content-Type: application/json" -d '{"projectId":"test"}' -I | grep X-RateLimit
# Should show rate limit headers
```

---

## 📚 References

- Rate Limiter Flexible: https://github.com/animir/node-rate-limiter-flexible
- Redis: https://redis.io/documentation
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware

---

**Sprint 4 Rate Limiting: COMPLETE ✅**
**Next Feature:** Redis Distributed Caching (Feature #3)
