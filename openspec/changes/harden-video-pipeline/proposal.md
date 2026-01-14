# Proposal: Production Hardening of Video Pipeline

## Overview

This change introduces production-grade hardening for the video rendering pipeline, focusing on definitive timeouts, idempotent retries, concurrency controls, comprehensive alerting, and operational metrics across render, TTS, and storage subsystems.

## Problem Statement

The current video pipeline has basic retry and timeout mechanisms but lacks production-grade hardening:

1. **Inconsistent Timeouts**: Some operations have 30min timeout (render-queue), but TTS and storage operations lack defined Service Level Objectives (SLOs)
2. **Non-Idempotent Retries**: Retry logic exists (3 attempts, exponential backoff) but doesn't guarantee idempotency - double-processing risk for TTS/storage operations
3. **Limited Concurrency Controls**: Basic concurrency limits exist (concurrency:2 in video-processing.queue) but not tuned or configurable per resource type
4. **Monitoring Gaps**: Stuck-job-monitor exists but no comprehensive metrics/alerts for:
   - Render pipeline health (queue depth, processing time, failure rate)
   - TTS provider performance (latency, quota usage, error rates)
   - Storage operations (upload time, bandwidth, failures)
5. **No Circuit Breakers**: External dependencies (TTS APIs, storage) lack circuit breaker protection

## User Review Required

> [!IMPORTANT]
> **Timeout Strategy**: Proposed definitive timeouts:
> - **Render**: 30min per job (current), 5min per slide composition
> - **TTS**: 60s per slide audio generation, 3min total per batch
> - **Storage Upload**: 10min per video file upload
> 
> Do these align with observed production behavior?

> [!IMPORTANT]
> **Idempotency Keys**: TTS and storage operations should use idempotency keys to prevent double-processing on retry. Confirm key format:
> - TTS: `tts_{projectId}_{slideId}_{contentHash}`
> - Storage: `upload_{jobId}_{timestamp}`

> [!WARNING]
> **Concurrency Limits**: Proposed limits per resource:
> - **Render Workers**: 2 concurrent jobs (current)
> - **TTS Requests**: 5 concurrent per provider
> - **Storage Uploads**: 3 concurrent uploads
> 
> Adjust based on infrastructure capacity?

> [!IMPORTANT]
> **Alert Channels**: Where should alerts be sent?
> - Slack webhook?
> - Email (SMTP)?
> - Sentry (already integrated)?
> - Custom webhook?

## Proposed Changes

### Production Timeouts

#### [MODIFY] [render-queue.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/queue/render-queue.ts)

Add timeout configuration constants with clear SLOs:
- Keep 30min job timeout (adequate for 50+ slide presentations)
- Add operation-specific timeouts (FFmpeg compose, TTS generation, upload)
- Add timeout middleware to fail-fast on exceeded SLOs

#### [NEW] [timeout-config.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/config/timeout-config.ts)

Create centralized timeout configuration:
```typescript
export const PIPELINE_TIMEOUTS = {
  renderJob: 30 * 60 * 1000,        // 30min total
  slideComposition: 5 * 60 * 1000,  // 5min per slide
  ttsPerSlide: 60 * 1000,            // 60s per slide
  ttsBatch: 3 * 60 * 1000,           // 3min per batch
  storageUpload: 10 * 60 * 1000,     // 10min per file
  storageDownload: 5 * 60 * 1000,    // 5min per file
};
```

---

### Idempotent Retries

#### [NEW] [idempotency-middleware.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/middleware/idempotency-middleware.ts)

Implement idempotency key tracking:
- Store operation keys in Redis with TTL (24h)
- Check before executing expensive operations (TTS, storage)
- Return cached result if operation already completed
- Prevent duplicate TTS API calls, duplicate storage uploads

#### [MODIFY] [tts-service.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/tts/tts-service.ts)

Add idempotency wrapper:
- Generate key: `tts_{projectId}_{slideId}_{hash(text+voice)}`
- Check Redis cache before API call
- Store result with key on success
- Use cached audio URL on retry

#### [MODIFY] [s3-uploader.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/storage/s3-uploader.ts)

Add idempotent upload logic:
- Generate key: `upload_{jobId}_{filename}_{timestamp}`
- Check if object exists before upload (HEAD request)
- Use multipart upload with resumability for large files
- Skip upload if file already exists with correct size

---

### Concurrency Limits

#### [NEW] [concurrency-limiter.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/queue/concurrency-limiter.ts)

Implement semaphore-based concurrency control:
- Per-resource semaphores (render, tts, storage)
- Configurable limits via environment variables
- Queue overflow protection (reject if queue > N jobs)
- Backpressure signaling to upstream

#### [MODIFY] [video-processing.queue.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/queue/video-processing.queue.ts)

Replace hardcoded `concurrency:2` with dynamic configuration:
```typescript
concurrency: parseInt(process.env.RENDER_CONCURRENCY || '2')
```

#### [NEW] [tts-concurrency-pool.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/tts/tts-concurrency-pool.ts)

Create TTS request pool:
- Limit concurrent TTS API requests (default: 5)
- Per-provider limits (e.g., ElevenLabs: 3, Google: 10)
- Queue requests with priority (urgent slides first)
- Automatic retry with backoff on 429 (rate limit exceeded)

---

### Metrics & Alerts

#### [NEW] [pipeline-metrics.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/monitoring/pipeline-metrics.ts)

Comprehensive metric collection:

**Render Metrics**:
- Queue depth (jobs waiting)
- Processing time (p50, p95, p99)
- Failure rate (%)
- Stuck job count
- Worker utilization (%)

**TTS Metrics**:
- API latency per provider (ms)
- Error rate per provider (%)
- Quota usage (requests/minute)
- Cache hit rate (%)
- Character count processed

**Storage Metrics**:
- Upload bandwidth (MB/s)
- Upload success rate (%)
- Average upload time per GB
- Storage quota used (%)
- Failed uploads (count)

#### [NEW] [alert-manager.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/monitoring/alert-manager.ts)

Alert condition definitions:

**Critical Alerts** (immediate notification):
- Render queue depth > 50 jobs for > 5min
- Render failure rate > 20% over 15min
- TTS provider error rate > 10% over 5min
- Storage upload failure rate > 5% over 10min
- Any job stuck > 60min

**Warning Alerts** (lower priority):
- Render queue depth > 20 jobs for > 10min
- TTS quota usage > 80%
- Storage quota usage > 90%
- Average render time > 10min (trend)

#### [MODIFY] [stuck-job-monitor.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/render/stuck-job-monitor.ts)

Integrate with alert-manager:
- Send alert when stuck jobs detected
- Include job metadata (projectId, userId, age)
- Escalate if auto-fail doesn't resolve

---

### Circuit Breaker

#### [NEW] [circuit-breaker.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/resilience/circuit-breaker.ts)

Implement circuit breaker pattern:
- Protect external dependencies (TTS APIs, storage)
- States: CLOSED → OPEN → HALF_OPEN
- Trip on error rate threshold (5 failures in 10s)
- Auto-recovery after cooldown (30s)
- Fallback strategies (use cache, return 503)

---

### Observability Dashboard

#### [NEW] [pipeline-dashboard-api.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/app/api/admin/pipeline-health/route.ts)

Create real-time health endpoint:
- Current queue depth
- Active jobs with progress
- Recent failures with error details
- Circuit breaker states
- Resource utilization (render/tts/storage)

---

## Verification Plan

### Automated Tests

1. **Timeout Tests**:
   ```bash
   npm run test:timeout-enforcement
   # Verify: Jobs timeout after configured SLO
   ```

2. **Idempotency Tests**:
   ```bash
   npm run test:idempotency
   # Verify: Retry doesn't duplicate TTS/storage operations
   ```

3. **Concurrency Tests**:
   ```bash
   npm run test:concurrency-limits
   # Verify: Max N concurrent operations enforced
   ```

4. **Circuit Breaker Tests**:
   ```bash
   npm run test:circuit-breaker
   # Verify: Opens after error threshold, auto-recovers
   ```

### Load Testing

1. **Queue Stress Test**:
   - Submit 100 render jobs simultaneously
   - Verify: Concurrency limits respected, queue doesn't overflow
   - Verify: Metrics accurately reflect queue depth

2. **TTS Provider Failure**:
   - Simulate TTS API 500 errors
   - Verify: Circuit breaker trips, retries stop, alert sent

3. **Storage Quota Exceeded**:
   - Simulate storage quota reached
   - Verify: Uploads fail gracefully, alert sent, jobs marked failed

### Manual Verification

1. **Metrics Dashboard**:
   - Navigate to `/admin/pipeline-health`
   - Verify: Real-time metrics displayed
   - Verify: Historical trend graphs working

2. **Alert Testing**:
   - Manually trigger stuck job scenario
   - Verify: Alert sent to configured channel
   - Verify: Alert includes actionable details

3. **Idempotency Validation**:
   - Kill render job mid-TTS generation
   - Retry job
   - Verify: No duplicate audio files generated
   - Verify: Redis cache contains idempotency key

## Success Criteria

- [ ] All operations have defined timeouts with fail-fast behavior
- [ ] TTS and storage operations are idempotent (verified via tests)
- [ ] Concurrency limits configurable and enforced per resource type
- [ ] Comprehensive metrics collected for render/TTS/storage
- [ ] Alerts sent on critical conditions (queue depth, failure rate, stuck jobs)
- [ ] Circuit breakers protect external dependencies
- [ ] Observability dashboard provides real-time pipeline health view

## Implementation Risks

1. **Backward Compatibility**: Introduce feature flags for gradual rollout
2. **Redis Dependency**: Idempotency keys require Redis - fallback if Redis unavailable?
3. **Alert Fatigue**: Start with conservative thresholds, tune based on proddata
4. **Performance Overhead**: Metrics collection adds ~5ms per operation - acceptable?

## Related Work

- Builds on existing `stuck-job-monitor.ts` (F2.4)
- Extends `render-queue.ts` retry strategy (F2.5)
- Complements E2E testing from `validate-pptx-e2e-pipeline` spec
