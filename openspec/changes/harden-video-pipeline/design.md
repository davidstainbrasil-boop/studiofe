# Design: Production Hardening Architecture

## System Context

The video pipeline orchestrates multiple subsystems with external dependencies:

```
User Request → API → Queue (BullMQ/Redis) → Worker
                         ↓
                   Render Pipeline
                   ├── Slide Composition (FFmpeg)
                   ├── TTS Generation (ElevenLabs/Google)
                   └── Video Assembly (FFmpeg)
                         ↓
                   Storage Upload (Supabase/S3)
                         ↓
                   Job Complete (DB Update)
```

Current pain points:
- **No SLO enforcement**: Operations can hang indefinitely (except 30min job timeout)
- **Retry amplification**: Failure causes 3x load on TTS/storage without idempotency
- **Resource contention**: No backpressure when TTS API is slow or storage is full
- **Blind spots**: Failures are logged but not alerted, metrics are incomplete

## Hardening Strategy

### 1. Timeout Hierarchy

**Philosophy**: Fail-fast with clear SLOs rather than silent hangs.

```
Job Timeout (30min)
├── Slide Composition Timeout (5min each)
├── TTS Batch Timeout (3min total)
│   └── TTS Per-Slide (60s each)
└── Storage Upload Timeout (10min)
```

**Implementation**: Use Promise.race() with timeout promises, escalate timeout errors to job manager.

### 2. Idempotency Pattern

**Challenge**: Retries can cause duplicate TTS API calls ($0.30/1K chars) and double storage writes.

**Solution**: Redis-backed idempotency middleware

```typescript
async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttl: number = 24 * 3600
): Promise<T> {
  // Check cache
  const cached = await redis.get(`idem:${key}`);
  if (cached) return JSON.parse(cached);
  
  // Execute
  const result = await operation();
  
  // Store result
  await redis.setex(`idem:${key}`, ttl, JSON.stringify(result));
  
  return result;
}
```

**Key Generation**:
- TTS: `tts_{projectId}_{slideId}_{hash(text+voice+speed)}`
- Storage: `upload_{jobId}_{filename}_{size}`

**Trade-offs**:
- Requires Redis availability (failover to no-cache mode if Redis down)
- Memory overhead (~1KB per operation key × 1M operations = 1GB)
- 24h TTL balances memory vs retry window

### 3. Concurrency Control

**Challenge**: Unbounded concurrency overwhelms external APIs (429 errors) and saturates bandwidth.

**Solution**: Semaphore-based resource pools

```typescript
class ResourcePool {
  private available: number;
  private waiting: Array<() => void> = [];
  
  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }
    
    await new Promise<void>(resolve => this.waiting.push(resolve));
  }
  
  release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.available++;
    }
  }
}
```

**Configuration**:
- `RENDER_CONCURRENCY=2`: Max concurrent FFmpeg processes (CPU-bound)
- `TTS_CONCURRENCY=5`: Max concurrent TTS API calls (network-bound)
- `STORAGE_CONCURRENCY=3`: Max concurrent uploads (bandwidth-bound)

**Backpressure**: Queue refuses new jobs if queue depth > `MAX_QUEUE_DEPTH` (default: 100)

### 4. Circuit Breaker

**Purpose**: Protect against cascading failures when external dependencies are unhealthy.

**State Machine**:
```
CLOSED (normal)
  ↓ (5 failures in 10s)
OPEN (reject all)
  ↓ (after 30s cooldown)
HALF_OPEN (test 1 request)
  ↓ (success → CLOSED, failure → OPEN)
```

**Fallback Strategies**:
- TTS failure → Use cached audio from previous generation (if text unchanged)
- Storage failure → Return 503 with retry-after header

**Per-Dependency**:
- Separate circuit breakers for TTS providers (ElevenLabs, Google, Azure)
- Separate for storage backends (Supabase, S3)

### 5. Metrics & Observability

**Metric Collection Architecture**:

```
Pipeline Operation
  ↓
Metric Interceptor (middleware)
  ↓
In-Memory Aggregator (1min windows)
  ↓
Periodic Flush (every 60s)
  ↓
Metrics Store (Redis Timeseries or InfluxDB)
  ↓
Dashboard API + Alert Evaluator
```

**Metric Types**:
- **Counters**: Total jobs processed, TTS chars generated, bytes uploaded
- **Gauges**: Queue depth, active workers, circuit breaker states
- **Histograms**: Render time distribution (p50/p95/p99)
- **Rates**: Jobs/min, failures/min, TTS requests/min

**Alert Evaluation**:
- Run every 60s
- Check thresholds (e.g., queue depth > 50)
- Debounce: Alert only if condition persists > 5min
- Rate limit: Max 1 alert per condition per 30min (avoid spam)

### 6. Graceful Degradation

**Scenarios**:
1. **Redis Down**: Disable idempotency cache, retry without dedup (warn user)
2. **All TTS Providers Down**: Circuit breakers open → Return 503, queue jobs for retry
3. **Storage Quota Exceeded**: Fail jobs immediately, alert admin, clear old files
4. **Queue Overflow**: Reject new submissions with 429 + retry-after header

## Implementation Phases

### Phase 1: Timeouts (Week 1)
- Add timeout-config.ts
- Wrap operations with Promise.race()
- Test with artificially slow operations

### Phase 2: Idempotency (Week 1-2)
- Implement idempotency middleware
- Add Redis key management
- Integrate with TTS and storage

### Phase 3: Concurrency (Week 2)
- Create resource pool implementation
- Replace hardcoded limits with config
- Add queue overflow protection

### Phase 4: Metrics (Week 2-3)
- Implement metric collectors
- Create aggregation pipeline
- Build dashboard API

### Phase 5: Alerts (Week 3)
- Define alert conditions
- Implement alert manager
- Integrate notification channels

### Phase 6: Circuit Breakers (Week 3-4)
- Implement circuit breaker class
- Wrap external calls
- Define fallback strategies

## Verification Strategy

**Unit Tests**:
- Timeout enforcement (verify operation aborts after SLO)
- Idempotency key generation (collisions, uniqueness)
- Semaphore behavior (max concurrency enforced)
- Circuit breaker state transitions

**Integration Tests**:
- Simulated TTS provider failure → circuit breaker opens
- Simulated storage quota → jobs fail gracefully
- Queue overflow → new jobs rejected with 429

**Load Tests**:
- 100 concurrent render jobs → concurrency limits respected
- TTS provider delay → circuit breaker trips
- Metrics accuracy under load

**Observability**:
- Dashboard shows real-time queue depth
- Alert sent when condition triggered
- Metrics match actual operation count

## Risk Mitigation

1. **Feature Flags**: Enable hardening features gradually
   - `ENABLE_TIMEOUT_ENFORCEMENT=true`
   - `ENABLE_IDEMPOTENCY=true`
   - `ENABLE_CIRCUIT_BREAKER=true`

2. **Monitoring**: Watch for regressions after deployment
   - Compare pre/post throughput
   - Monitor error rate increase

3. **Rollback Plan**: Disable features via env vars without code deploy

4. **Documentation**: Update runbook with troubleshooting for new features
