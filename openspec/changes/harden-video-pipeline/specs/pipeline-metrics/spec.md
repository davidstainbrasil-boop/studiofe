# Spec: Pipeline Metrics and Alerts

## ADDED Requirements

### Requirement: Render Pipeline Metrics

The system SHALL collect comprehensive metrics for render pipeline operations.

#### Scenario: Queue depth metric

**GIVEN** render jobs are being processed  
**WHEN** metrics are collected  
**THEN** queue depth metric SHALL be recorded every 60 seconds  
**AND** metric SHALL include:
- Total jobs in queue
- Jobs by status (waiting/active/completed/failed)
- Average wait time in queue

#### Scenario: Render duration histogram

**GIVEN** render jobs complete successfully  
**WHEN** job completion is recorded  
**THEN** render duration SHALL be added to histogram  
**AND** percentiles SHALL be calculated (p50, p95, p99)  
**AND** metrics SHALL segment by slide count (1-10, 11-50, 51+ slides)

#### Scenario: Failure rate tracking

**GIVEN** render jobs are completing  
**WHEN** metrics are aggregated over 15-minute windows  
**THEN** failure rate SHALL be calculated as `failures / total_jobs * 100`  
**AND** failures SHALL be categorized by cause (timeout/TTS/storage/FFmpeg)  
**AND** rate SHALL trigger alert if > 20%

### Requirement: TTS Provider Metrics

The system SHALL track TTS provider performance and quota usage.

#### Scenario: TTS API latency per provider

**GIVEN** TTS requests are made to multiple providers  
**WHEN** requests complete  
**THEN** latency SHALL be recorded per provider (ElevenLabs, Google, Azure)  
**AND** histogram SHALL track latency distribution  
**AND** p95 latency SHALL be exposed as metric

#### Scenario: TTS error rate by provider

**GIVEN** TTS requests are completing with errors  
**WHEN** errors occur  
**THEN** error count SHALL be incremented per provider  
**AND** error rate SHALL be calculated over sliding 5-minute window  
**AND** errors SHALL be categorized (timeout/429/500/network)

#### Scenario: TTS quota usage tracking

**GIVEN** TTS provider has character quota (e.g., 500K chars/month)  
**WHEN** TTS requests are made  
**THEN** character count SHALL be tracked  
**AND** monthly usage SHALL be compared to quota  
**AND** alert SHALL trigger when usage > 80% of quota

#### Scenario: TTS cache hit rate

**GIVEN** idempotency cache is enabled for TTS  
**WHEN** TTS requests are made  
**THEN** cache hits and misses SHALL be counted  
**AND** hit rate SHALL be calculated as `hits / (hits + misses) * 100`  
**AND** metric SHALL indicate caching effectiveness

### Requirement: Storage Operation Metrics

The system SHALL monitor storage upload/download performance and quota.

#### Scenario: Upload bandwidth metric

**GIVEN** video files are being uploaded to storage  
**WHEN** uploads complete  
**THEN** upload bandwidth SHALL be calculated as `file_size / upload_time`  
**AND** average bandwidth SHALL be tracked over 5-minute windows  
**AND** metric SHALL help identify network bottlenecks

#### Scenario: Storage failure tracking

**GIVEN** storage operations (upload/download/delete) are performed  
**WHEN** operations fail  
**THEN** failure count SHALL be incremented by operation type  
**AND** failure rate SHALL be calculated per operation  
**AND** alert SHALL trigger if upload failure rate > 5% over 10 minutes

#### Scenario: Storage quota monitoring

**GIVEN** storage has allocated quota (e.g., 100GB)  
**WHEN** files are uploaded/deleted  
**THEN** used storage SHALL be tracked  
**AND** quota usage percentage SHALL be calculated  
**AND** alert SHALL trigger when usage > 90%

### Requirement: Alert Condition Management

The system SHALL define and evaluate alert conditions for critical pipeline failures.

#### Scenario: Queue depth critical alert

**GIVEN** render queue depth is monitored  
**WHEN** queue depth > 50 jobs for more than 5 consecutive minutes  
**THEN** a `CRITICAL` alert SHALL be sent  
**AND** alert SHALL include current queue depth and ETA for clearance  
**AND** alert SHALL recommend scaling workers or investigating stuck jobs

#### Scenario: High failure rate alert

**GIVEN** render jobs are failing  
**WHEN** failure rate > 20% over 15-minute window  
**THEN** a `WARNING` alert SHALL be sent  
**AND** alert SHALL include failure reason distribution (TTS/storage/timeout)  
**AND** alert SHALL suggest checking circuit breaker states

#### Scenario: TTS provider outage alert

**GIVEN** TTS provider error rate is tracked  
**WHEN** error rate > 10% over 5-minute window  
**THEN** a `CRITICAL` alert SHALL be sent immediately  
**AND** alert SHALL identify which provider is failing  
**AND** alert SHALL recommend checking circuit breaker or switching providers

#### Scenario: Storage quota warning

**GIVEN** storage quota usage is monitored  
**WHEN** usage > 80% of allocated quota  
**THEN** a `WARNING` alert SHALL be sent  
**AND** alert SHALL suggest cleaning old files or increasing quota  
**AND** when usage > 90%, alert severity SHALL escalate to `CRITICAL`

#### Scenario: Stuck job alert

**GIVEN** stuck job monitor detects jobs in processing > 60 minutes  
**WHEN** stuck jobs are found  
**THEN** a `CRITICAL` alert SHALL be sent  
**AND** alert SHALL include job IDs, project IDs, and age  
**AND** alert SHALL recommend manual intervention or auto-fail threshold adjustment

### Requirement: Alert Deduplication and Rate Limiting

The system SHALL prevent alert fatigue bydeduplicating and rate-limiting notifications.

#### Scenario: Alert debouncing

**GIVEN** an alert condition is triggered (e.g., queue depth > 50)  
**WHEN** the condition persists for 5 minutes  
**THEN** alert SHALL be sent ONCE  
**AND** no additional alerts SHALL be sent while condition persists  
**AND** recovery alert SHALL be sent when condition resolves

#### Scenario: Alert rate limiting

**GIVEN** same alert condition triggers multiple times  
**WHEN** less than 30 minutes have elapsed since last alert  
**THEN** subsequent alerts SHALL be suppressed  
**AND** suppressed count SHALL be tracked  
**AND** summary alert SHALL be sent after cool-down period

### Requirement: Metrics Dashboard API

The system SHALL provide real-time pipeline health metrics via admin API.

#### Scenario: Real-time metrics endpoint

**GIVEN** an authenticated admin user  
**WHEN** GET `/api/admin/pipeline-health` is called  
**THEN** response SHALL include:
- Current queue depth
- Active jobs with progress %
- Recent failures (last 10)
- Circuit breaker states (per dependency)
- Resource utilization (render/TTS/storage concurrency %)

#### Scenario: Historical metrics query

**GIVEN** an authenticated admin user  
**WHEN** GET `/api/admin/pipeline-metrics?window=24h` is called  
**THEN** response SHALL include aggregated metrics for last 24 hours:
- Job throughput (jobs/hour)
- Average render time
- Failure rate trend
- TTS provider latency trends
- Storage bandwidth trends

## MODIFIED Requirements

_No existing requirements are modified by this spec._

## REMOVED Requirements

_No existing requirements are removed by this spec._
