# Implementation Tasks: Production Pipeline Hardening

## Prerequisites
- [x] Review current timeout/retry implementation
- [x] Identify TTS and storage integration points
- [x] Assess monitoring and alerting infrastructure
- [x] Design hardening architecture

## Phase 1: Timeout Implementation (Week 1)

### Timeout Configuration
- [x] Create `src/lib/config/timeout-config.ts` with centralized timeout constants
- [x] Add environment variable overrides (RENDER_JOB_TIMEOUT_MS, TTS_TIMEOUT_MS, etc.)
- [x] Implement timeout validation (reject negative/invalid values)
- [x] Add timeout config loader with defaults

### Timeout Enforcement
- [x] Implement `withTimeout()` utility wrapper for promises
- [x] Add timeout middleware to render job processor
- [x] Add timeout enforcement to TTS service (per-slide and batch)
- [x] Add timeout enforcement to storage upload operations
- [x] Add timeout enforcement to FFmpeg slide composition

### Testing & Verification
- [ ] Write unit tests for timeout enforcement (simulate slow operations)
- [ ] Write integration tests for timeout escalation (job → operation → abort)
- [ ] Test timeout with artificially slow TTS API (mock delay)
- [ ] Verify timeout errors are logged with clear context

## Phase 2: Idempotency Implementation (Week 1-2)

### Idempotency Middleware
- [x] Create `src/lib/middleware/idempotency-middleware.ts`
- [x] Implement `withIdempotency<T>()` wrapper function
- [x] Add Redis key generation utilities (hash functions, key prefixes)
- [x] Add Redis fallback logic (graceful degradation if Redis down)

### TTS Idempotency
- [x] Modify `tts-service.ts` to wrap API calls with idempotency
- [x] Generate idempotency key: `tts_{projectId}_{slideId}_{hash(text+voice+speed)}`
- [x] Store TTS result (audio URL) in Redis cache with 24h TTL
- [x] Return cached result on retry without API call

### Storage Idempotency
- [x] Modify `video-uploader.ts` to check object existence before upload
- [x] Implement idempotency wrapper with storage key
- [ ] Add multipart upload resumability for large files

### Testing & Verification
- [ ] Write unit tests for idempotency key generation (uniqueness, collisions)
- [ ] Write integration tests for TTS retry (verify no duplicate API calls)
- [ ] Write integration tests for storage retry (verify no duplicate uploads)
- [ ] Test Redis unavailability fallback (operations proceed without cache)
- [ ] Verify idempotency keys expire after 24h TTL

## Phase 3: Concurrency Control (Week 2)

### Resource Pool Implementation
- [x] Create `src/lib/queue/concurrency-limiter.ts`
- [x] Implement semaphore-based `ResourcePool` class
- [x] Add acquire/release methods with queuing
- [ ] Add timeout for acquire (prevent indefinite waiting)

### Render Concurrency
- [ ] Replace hardcoded `concurrency:2` with `RENDER_CONCURRENCY` env var
- [ ] Integrate resource pool with BullMQ worker options
- [ ] Add worker utilization metrics

### TTS Concurrency
- [x] Integrate `withTTSConcurrency` wrapper in `tts-service.ts`
- [x] Implement concurrency limiting via `concurrency-limiter.ts`
- [ ] Implement per-provider concurrency limits (ElevenLabs:2, Google:5)
- [ ] Handle 429 rate limit errors with exponential backoff

### Storage Concurrency
- [x] Integrate `withStorageConcurrency` wrapper in `video-uploader.ts`
- [ ] Implement bandwidth throttling if needed
- [ ] Queue uploads when limit reached

### Queue Overflow Protection
- [ ] Add `MAX_QUEUE_DEPTH` configuration (default: 100)
- [ ] Reject submissions with 429 + Retry-After header when queue full
- [ ] Add queue depth monitoring

### Testing & Verification
- [ ] Write unit tests for resource pool (acquire/release/queuing)
- [ ] Write load tests: Submit 100 jobs, verify max 2 concurrent renders
- [ ] Write load tests: Submit 20 TTS requests, verify max 5 concurrent per provider
- [ ] Test queue overflow: Submit jobs until rejection, verify 429 response
- [ ] Verify concurrency adjusts dynamically (update env var, observe change)

## Phase 4: Metrics Collection (Week 2-3)

### Metric Collectors
- [ ] Create `src/lib/monitoring/pipeline-metrics.ts`
- [ ] Implement metric interceptors (wrap operations)
- [ ] Add in-memory aggregation (1min windows)
- [ ] Implement periodic flush to Redis Timeseries or InfluxDB

### Render Metrics
- [ ] Collect queue depth (jobs waiting/active/completed)
- [ ] Collect render duration histogram (p50/p95/p99)
- [ ] Collect failure rate by cause (timeout/TTS/storage/FFmpeg)
- [ ] Collect stuck job count
- [ ] Collect worker utilization percentage

### TTS Metrics
- [ ] Collect API latency per provider (histogram)
- [ ] Collect error rate per provider (sliding 5min window)
- [ ] Collect quota usage (chars/month)
- [ ] Collect cache hit rate (hits / total requests)

### Storage Metrics
- [ ] Collect upload bandwidth (MB/s)
- [ ] Collect upload success rate (%)
- [ ] Collect average upload time per GB
- [ ] Collect storage quota usage (%)

### Dashboard API
- [ ] Create `/api/admin/pipeline-health` endpoint
- [ ] Return real-time metrics (queue depth, active jobs, circuit breakers)
- [ ] Create `/api/admin/pipeline-metrics` endpoint with time window parameter
- [ ] Return historical trends (throughput, latency, failure rate)

### Testing & Verification
- [ ] Write unit tests for metric collectors (verify counts/aggregation)
- [ ] Write integration tests: Execute jobs, verify metrics increment
- [ ] Test metric flushing (verify data persists to storage)
- [ ] Manually verify dashboard API returns correct data
- [ ] Load test: 100 jobs, verify metrics accuracy under load

## Phase 5: Alert Management (Week 3)

### Alert Conditions
- [ ] Create `src/lib/monitoring/alert-manager.ts`
- [ ] Define alert conditions (queue depth, failure rate, stuck jobs, etc.)
- [ ] Implement threshold checking (debounce: 5min persistence required)
- [ ] Add alert severity levels (CRITICAL/WARNING/INFO)

### Alert Delivery
- [ ] Integrate Slack webhook (if configured)
- [ ] Integrate email/SMTP (if configured)
- [ ] Integrate Sentry (already present)
- [ ] Add custom webhook support

### Alert Deduplication
- [ ] Implement alert rate limiting (max 1 per condition per 30min)
- [ ] Track suppressed alert count
- [ ] Send recovery alerts when conditions resolve

### Stuck Job Alert Integration
- [ ] Modify `stuck-job-monitor.ts` to use alert-manager
- [ ] Include job metadata in alerts (projectId, userId, age)
- [ ] Escalate if auto-fail doesn't resolve

### Testing & Verification
- [ ] Write unit tests for alert condition evaluation
- [ ] Write integration tests: Trigger condition, verify alert sent
- [ ] Test rate limiting: Trigger condition 3x, verify only 1 alert sent
- [ ] Test recovery alert: Resolve condition, verify recovery notification
- [ ] Manually trigger stuck job scenario, verify alert received

## Phase 6: Circuit Breakers (Week 3-4)

### Circuit Breaker Implementation
- [ ] Create `src/lib/resilience/circuit-breaker.ts`
- [ ] Implement state machine (CLOSED → OPEN → HALF_OPEN)
- [ ] Add error threshold config (5 failures in 10s)
- [ ] Add cooldown/recovery period (30s)

### TTS Circuit Breakers
- [ ] Wrap TTS provider calls with circuit breaker
- [ ] Separate circuit breakers per provider (ElevenLabs, Google, Azure)
- [ ] Define fallback: Use cached audio if available
- [ ] Trip circuit on 500 errors, 429 rate limits, timeouts

### Storage Circuit Breakers
- [ ] Wrap storage upload/download with circuit breaker
- [ ] Define fallback: Return 503 with retry-after

### Testing & Verification
- [ ] Write unit tests for circuit breaker state transitions
- [ ] Write integration tests: Simulate TTS failures, verify circuit opens
- [ ] Write integration tests: Verify auto-recovery after cooldown
- [ ] Test fallback strategies: Use cached TTS on circuit open
- [ ] Load test: TTS provider down, verify graceful degradation

## Documentation & Rollout

### Documentation
- [ ] Update README with hardening features
- [ ] Document timeout configuration (env vars, defaults)
- [ ] Document concurrency tuning guide
- [ ] Create runbook for alert handling
- [ ] Update architecture diagrams

### Feature Flags
- [x] Add `ENABLE_TIMEOUT_ENFORCEMENT` flag (default: true)
- [x] Add `ENABLE_IDEMPOTENCY` flag (default: true)
- [x] Add `ENABLE_CONCURRENCY_LIMITS` flag (default: true)
- [ ] Add `ENABLE_CIRCUIT_BREAKER` flag (default: true)
- [ ] Add `ENABLE_METRICS_COLLECTION` flag (default: true)

### Deployment
- [ ] Deploy to staging with feature flags enabled
- [ ] Monitor staging for 48h (watch error rate, throughput)
- [ ] Deploy to production with gradual rollout (10% → 50% → 100%)
- [ ] Monitor production metrics post-deployment

### Readiness Report
- [ ] Update `readiness_report.md` with hardening status
- [ ] Document SLO compliance (timeouts enforced)
- [ ] Document idempotency coverage (TTS, storage)
- [ ] Document alerting coverage (metrics + thresholds)

## Dependencies
- Redis (for idempotency cache and metrics storage)
- BullMQ (already present)
- Monitoring backend (Redis Timeseries or InfluxDB)
- Alert delivery channels (Slack/Email/Sentry)

## Risk Mitigation
- **Redis Dependency**: Graceful fallback if Redis unavailable
- **Performance Overhead**: Metrics add ~5ms per operation - monitor
- **Alert Fatigue**: Conservative thresholds, tune based on production data
- **Backward Compatibility**: Feature flags for gradual rollout
