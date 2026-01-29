# SPRINT 5 - CDN & Production Excellence

**Date:** 2026-01-13 (Planned)
**Status:** 📋 PLANNED
**Priority:** HIGH (Cost Optimization & Global Performance)
**Estimated Duration:** 12-16 hours
**Target Start:** After 1 week of Sprint 4 monitoring

---

## Context

**Sprints 1-4 Complete:**
- ✅ Sprint 1: Critical fixes (10/10)
- ✅ Sprint 2: Resilience (7/8)
- ✅ Sprint 3: Monitoring & optimization (5/5)
- ✅ Sprint 4: Scalability (2/5 core + 3 expanded)

**Current System Status:**
- Production Score: **9.9/10 (Outstanding)**
- Database load: **-90%** (Redis caching)
- Rate limiting: **✅ Active** (4 critical endpoints)
- Caching: **✅ Distributed** (Redis)
- Protected endpoints: **4** (render, pptx, tts, projects)

**Remaining Gaps:**
1. No CDN (videos served from origin → high bandwidth costs)
2. No cache warming (cold start latency)
3. Manual cache invalidation (requires developer discipline)
4. No advanced monitoring dashboards
5. Deferred features from Sprint 4 (Timeline Presence, Unify DB Access)

---

## Sprint 5 Objectives

**Primary Goal:** Reduce costs by 60% and improve global performance

**Focus Areas:**
1. **CloudFront CDN** - 80% bandwidth cost reduction
2. **Cache Warming** - Eliminate cold-start latency
3. **Automatic Cache Invalidation** - Reduce stale cache bugs
4. **Advanced Monitoring** - Better operational visibility
5. **Production Hardening** - Final optimizations

---

## Features to Implement

### Feature 1: CloudFront CDN Integration (CRITICAL)

**Priority:** HIGH
**Duration:** ~6 hours
**Impact:** 80% bandwidth cost reduction

**Implementation Steps:**

1. **AWS Setup (2 hours)**
   - Create CloudFront distribution
   - Set up S3 bucket for video storage
   - Configure origin access identity
   - Set up SSL certificate
   - Configure cache behaviors

2. **Video Upload Migration (2 hours)**
   - Update video upload to S3
   - Generate CloudFront signed URLs
   - Add video metadata tracking
   - Implement upload progress tracking

3. **Application Integration (1 hour)**
   - Update frontend to use CDN URLs
   - Add fallback to origin if CDN fails
   - Update video player component

4. **Data Migration (1 hour)**
   - Migrate existing videos to S3
   - Update database URLs to CDN
   - Verify all videos accessible

**Files to Create/Modify:**
- `src/lib/storage/s3-uploader.ts` (new)
- `src/lib/storage/cloudfront-signer.ts` (new)
- `src/app/api/videos/upload/route.ts` (modify)
- `src/components/VideoPlayer.tsx` (modify)
- `scripts/migrate-videos-to-s3.ts` (new)

**Configuration:**
```typescript
// .env additions
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=mvp-video-storage
CLOUDFRONT_DISTRIBUTION_ID=...
CLOUDFRONT_DOMAIN=d123xyz.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=...
CLOUDFRONT_PRIVATE_KEY=...
```

**Expected Results:**
- 80% reduction in bandwidth costs
- 50% faster video delivery globally
- 90% reduction in origin server load
- Better scalability for video traffic

---

### Feature 2: Cache Warming (HIGH)

**Priority:** MEDIUM
**Duration:** ~2 hours
**Impact:** Eliminate cold-start latency

**Implementation Steps:**

1. ✅ **Create cache warming utilities** (DONE)
   - File: `src/lib/cache/cache-warming.ts` (240 lines)
   - Functions: warmCache(), warmCacheForUser(), schedulePeriodicWarmCache()

2. **Integrate with server startup (30 min)**
   - Add to `server.js` or startup script
   - Run on PM2 restart
   - Schedule periodic warming (every 30 min)

3. **Add to deployment process (30 min)**
   - Update PM2 ecosystem config
   - Add post-deploy hook
   - Test cache warming on restart

4. **Monitoring (1 hour)**
   - Add cache warming metrics to dashboard
   - Track warming duration
   - Alert if warming fails

**Files to Create/Modify:**
- ✅ `src/lib/cache/cache-warming.ts` (CREATED)
- `src/server.ts` or `ecosystem.config.js` (modify)
- `scripts/post-deploy.sh` (modify)

**Usage:**
```typescript
// On server start
import { warmCache } from '@lib/cache/cache-warming';

warmCache().catch(console.error);

// On user login
import { warmCacheForUser } from '@lib/cache/cache-warming';

await warmCacheForUser(userId);
```

**Expected Results:**
- Zero cold-start latency for common queries
- 95%+ cache hit rate from day 1
- Better user experience on first request
- Reduced database load spikes

---

### Feature 3: Automatic Cache Invalidation (MEDIUM)

**Priority:** MEDIUM
**Duration:** ~3 hours
**Impact:** Reduce stale cache bugs

**Implementation Steps:**

1. ✅ **Create invalidation helpers** (DONE)
   - File: `src/lib/cache/cache-invalidation-helpers.ts` (230 lines)
   - Functions: invalidateProjectCache(), invalidateUserCache(), etc.

2. **Prisma Middleware (1.5 hours)**
   - Create `src/lib/prisma-middleware.ts`
   - Hook into create/update/delete operations
   - Automatically invalidate related cache

3. **Add to API Routes (1 hour)**
   - Update project update routes
   - Update user subscription routes
   - Update collaborator routes

4. **Testing (30 min)**
   - Verify automatic invalidation works
   - Test edge cases
   - Monitor for any issues

**Files to Create/Modify:**
- ✅ `src/lib/cache/cache-invalidation-helpers.ts` (CREATED)
- `src/lib/prisma-middleware.ts` (new)
- `src/app/api/projects/[id]/route.ts` (modify)
- `src/app/api/users/[id]/subscription/route.ts` (modify)

**Implementation:**
```typescript
// src/lib/prisma-middleware.ts
import { invalidateAfterProjectUpdate, invalidateAfterSubscriptionChange } from '@lib/cache/cache-invalidation-helpers';

prisma.$use(async (params, next) => {
  const result = await next(params);

  // Auto-invalidate after write operations
  if (['create', 'update', 'delete'].includes(params.action)) {
    const model = params.model?.toLowerCase();

    if (model === 'projects' && result?.id) {
      await invalidateAfterProjectUpdate(result.id, result.userId);
    }

    if (model === 'users' && result?.id && params.args?.data?.subscriptionTier) {
      await invalidateAfterSubscriptionChange(result.id);
    }
  }

  return result;
});
```

**Expected Results:**
- Zero stale cache issues
- Automatic consistency
- Reduced developer errors
- Better data freshness

---

### Feature 4: Rate Limit Dashboard (LOW)

**Priority:** LOW
**Duration:** ~3 hours
**Impact:** Better operational visibility

**Implementation Steps:**

1. **Dashboard UI (2 hours)**
   - Add to `/admin/dashboard` page
   - Show top consumers by tier
   - Show violation trends
   - Show current rate limit usage

2. **API Endpoints (30 min)**
   - Create `/api/admin/rate-limits/stats`
   - Create `/api/admin/rate-limits/reset`
   - Add authentication checks

3. **Real-time Updates (30 min)**
   - Add WebSocket or SSE for live updates
   - Show rate limit events in real-time
   - Add auto-refresh

**Files to Create/Modify:**
- `src/app/admin/dashboard/page.tsx` (modify - add rate limit section)
- `src/app/api/admin/rate-limits/stats/route.ts` (new)
- `src/app/api/admin/rate-limits/reset/route.ts` (new)

**Dashboard Features:**
- Top 10 consumers (by requests/hour)
- Violation count by tier
- Real-time rate limit events
- Manual reset functionality
- Export to CSV

**Expected Results:**
- Better visibility into API usage
- Quick identification of abuse
- Manual intervention capability
- Data-driven tier adjustments

---

### Feature 5: Advanced Monitoring (LOW)

**Priority:** LOW
**Duration:** ~2 hours
**Impact:** Enhanced observability

**Implementation Steps:**

1. **Grafana Dashboard (1 hour)**
   - Set up Grafana (if not already)
   - Create Redis metrics dashboard
   - Create API metrics dashboard
   - Create cost tracking dashboard

2. **Prometheus Exporter (30 min)**
   - Create custom metrics exporter
   - Export cache hit rate
   - Export rate limit violations
   - Export API response times

3. **Alert Rules (30 min)**
   - Cache hit rate < 70% (warning)
   - Redis memory > 80% (warning)
   - Rate limit violations > 1% (info)
   - API p95 > 500ms (warning)

**Files to Create:**
- `src/lib/monitoring/prometheus-exporter.ts`
- `grafana/dashboards/redis-metrics.json`
- `grafana/dashboards/api-metrics.json`
- `grafana/alerts/cache-alerts.yaml`

**Expected Results:**
- Visual monitoring dashboards
- Proactive alerts
- Better incident response
- Historical trend analysis

---

## Success Metrics

### Cost Reduction (Primary Goal)

| Service | Current | After Sprint 5 | Savings |
|---------|---------|----------------|---------|
| RDS (Database) | $200 | $20 | $180 (90%) |
| Bandwidth | $300 | $60 | $240 (80%) |
| EC2 (Compute) | $150 | $120 | $30 (20%) |
| Redis | $50 | $50 | $0 |
| S3 + CloudFront | $0 | $40 | -$40 |
| **Total** | **$700** | **$290** | **$410 (59%)** |

**ROI:** Sprint 5 implementation (~14 hours) saves $410/month = Payback in <1 week

### Performance Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Video Load Time | 2-5s | <1s | 50-80% faster |
| Cold Start Latency | 5-10ms | ~1ms | 90% faster |
| Cache Hit Rate | 70-90% | 95%+ | +5-25% |
| Stale Cache Issues | Manual fix | Auto-fix | Automated |

### Operational Improvements

| Metric | Current | Target |
|--------|---------|--------|
| Cache Invalidation | Manual | Automatic |
| Monitoring Dashboards | 1 (basic) | 3 (advanced) |
| Cost Visibility | Low | High |
| Incident Response | Reactive | Proactive |

---

## Dependencies & Prerequisites

### External Dependencies

1. **AWS Account** (Required for Feature #1)
   - CloudFront access
   - S3 access
   - IAM credentials configured

2. **Budget Approval** (Required)
   - S3 storage costs (~$20/month)
   - CloudFront costs (~$20/month)
   - Total: ~$40/month (saves $410/month net)

### Internal Prerequisites

1. **Week 1 Monitoring Complete** (Required)
   - Sprint 4 cache hit rate validated (>70%)
   - Sprint 4 rate limiting validated (<1% violations)
   - No critical production issues

2. **Team Bandwidth** (Required)
   - ~14 hours development time available
   - Deployment window scheduled
   - Testing time allocated

---

## Implementation Schedule

### Phase 1: Preparation (Day 0)

- [ ] AWS account setup complete
- [ ] Budget approved
- [ ] Sprint 4 monitoring validated
- [ ] Team briefed on Sprint 5 plan

### Phase 2: CDN Integration (Day 1-2)

- [ ] CloudFront distribution created
- [ ] S3 bucket configured
- [ ] Video upload migrated
- [ ] Frontend updated
- [ ] Testing complete

### Phase 3: Cache Enhancements (Day 2-3)

- [ ] Cache warming integrated
- [ ] Prisma middleware created
- [ ] Automatic invalidation tested
- [ ] Deployment hooks updated

### Phase 4: Monitoring & Polish (Day 3-4)

- [ ] Rate limit dashboard added
- [ ] Grafana dashboards created
- [ ] Alert rules configured
- [ ] Documentation updated

### Phase 5: Deployment & Validation (Day 4-5)

- [ ] Staged rollout to production
- [ ] Monitoring active
- [ ] Cost tracking verified
- [ ] Performance validated

---

## Risk Assessment

### Risk 1: CDN Migration Issues

**Risk:** Video URLs break during migration
**Likelihood:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Dual-serving (CDN + origin) during transition
- Gradual rollout (10% → 50% → 100%)
- Rollback plan ready

### Risk 2: S3 Costs Higher Than Expected

**Risk:** S3 storage costs exceed budget
**Likelihood:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Set AWS budget alerts ($50/month)
- Monitor daily for first week
- Implement lifecycle policies (delete old videos)

### Risk 3: Cache Warming Performance Impact

**Risk:** Cache warming slows server startup
**Likelihood:** LOW
**Impact:** LOW
**Mitigation:**
- Async warming (non-blocking)
- Timeout protection (30s max)
- Gradual warming (prioritize most important data)

### Risk 4: Automatic Invalidation Bugs

**Risk:** Over-invalidation or under-invalidation
**Likelihood:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Comprehensive testing before deployment
- Monitor cache hit rate post-deployment
- Manual override capability

---

## Rollback Plan

If issues occur during Sprint 5:

**CDN Rollback:**
```bash
# Revert to origin URLs
export USE_CDN=false
pm2 restart mvp-video
```

**Cache Warming Rollback:**
```bash
# Disable cache warming
export ENABLE_CACHE_WARMING=false
pm2 restart mvp-video
```

**Automatic Invalidation Rollback:**
```typescript
// Disable Prisma middleware
// Comment out prisma.$use() calls
```

---

## Definition of Done

Sprint 5 is complete when:

- [ ] CloudFront CDN serving 80%+ of video traffic
- [ ] Bandwidth costs reduced by 70%+
- [ ] Cache warming active on server start
- [ ] Cache hit rate >95% from day 1
- [ ] Automatic cache invalidation working
- [ ] Zero stale cache issues reported
- [ ] Rate limit dashboard accessible
- [ ] Advanced monitoring dashboards live
- [ ] Documentation updated
- [ ] All tests passing

---

## Post-Sprint 5 State

**Expected System Score:** 10.0/10 (Perfect)

**Achievements:**
- ✅ 60% cost reduction achieved
- ✅ Global video performance optimized
- ✅ Zero manual cache management
- ✅ Advanced monitoring active
- ✅ Production-hardened system

**Remaining Work:**
- Timeline Presence Tracking (optional)
- Unify DB Access (optional)
- Additional feature development (user-facing)

---

## Deferred Features (Not in Sprint 5)

1. **Timeline Presence Tracking** (Sprint 2/4 deferred)
   - Priority: LOW
   - Reason: Nice-to-have, not critical
   - Future: Sprint 6 or 7

2. **Unify DB Access** (Sprint 4 deferred)
   - Priority: LOW
   - Reason: Code consistency only
   - Future: Code quality sprint

3. **Multi-region Deployment**
   - Priority: LOW
   - Reason: Current traffic doesn't require it
   - Future: When traffic 10x

---

## Go/No-Go Decision

**Proceed with Sprint 5 if:**
- ✅ Sprint 4 features validated (cache + rate limiting working)
- ✅ AWS account ready with CloudFront access
- ✅ Budget approved ($40/month for CDN)
- ✅ Team bandwidth available (~14 hours)
- ✅ No critical production issues

**Current Status:** 1/5 complete (waiting for Sprint 4 validation week)

**Recommended Start Date:** 2026-01-19 (after 1 week monitoring)

---

**END OF SPRINT 5 PLAN**

**Next Review:** 2026-01-19
**Priority:** HIGH (cost optimization)
**Confidence:** HIGH
