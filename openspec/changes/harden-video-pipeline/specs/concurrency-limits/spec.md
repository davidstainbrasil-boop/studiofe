# Spec: Concurrency Limits

## ADDED Requirements

### Requirement: Resource-Specific Concurrency Control

The system SHALL enforce configurable concurrency limits per resource type to prevent overwhelming external dependencies and system resources.

#### Scenario: Render worker concurrency limit

**GIVEN** `RENDER_CONCURRENCY=2` is configured  
**WHEN** 5 render jobs are queued  
**THEN** only 2 jobs SHALL be processed concurrently  
**AND** remaining 3 jobs SHALL wait in queue  
**AND** as jobs complete, waiting jobs SHALL be started (FIFO order)

####Scenario: TTS API concurrency limit

**GIVEN** `TTS_CONCURRENCY=5` is configured  
**WHEN** 10 TTS requests are made simultaneously  
**THEN** only 5 requests SHALL be sent to TTS provider concurrently  
**AND** remaining 5 SHALL wait in internal queue  
**AND** requests SHALL be released as responses arrive

#### Scenario: Storage upload concurrency limit

**GIVEN** `STORAGE_CONCURRENCY=3` is configured  
**WHEN** 6 video files need to be uploaded  
**THEN** only 3 uploads SHALL proceed concurrently  
**AND** remaining 3 SHALL be queued  
**AND** bandwidth SHALL be distributed among active uploads

#### Scenario: Per-provider TTS concurrency limits

**GIVEN** multiple TTS providers are configured (ElevenLabs, Google, Azure)  
**WHEN** `TTS_ELEVENLABS_CONCURRENCY=2` and `TTS_GOOGLE_CONCURRENCY=5` are set  
**THEN** ElevenLabs SHALL have max 2 concurrent requests  
**AND** Google TTS SHALL have max 5 concurrent requests  
**AND** limits SHALL be enforced independently per provider

### Requirement: Queue Overflow Protection

The system SHALL reject new job submissions when queue depth exceeds configured limits to prevent resource exhaustion.

#### Scenario: Queue depth limit enforcement

**GIVEN** `MAX_QUEUE_DEPTH=100` is configured  
**WHEN** 100 jobs are already queued  
**AND** a new job is submitted  
**THEN** the submission SHALL be rejected with HTTP 429 (Too Many Requests)  
**AND** response SHALL include `Retry-After` header (e.g., 60 seconds)  
**AND** client SHALL be advised to retry later

#### Scenario: Queue depth recovery

**GIVEN** queue depth was at limit (100 jobs)  
**WHEN** jobs complete and queue depth drops to 80  
**THEN** new job submissions SHALL be accepted again  
**AND** queue SHALL resume normal operation

### Requirement: Backpressure Signaling

The system SHALL provide backpressure signals to upstream components when resources are saturated.

#### Scenario: Backpressure from worker saturation

**GIVEN** all render workers are busy (concurrency limit reached)  
**WHEN** API receives new render request  
**THEN** response SHALL include `X-Queue-Depth` header with current queue size  
**AND** response SHALL include `X-Estimated-Wait-Time` header (e.g., "5 minutes")  
**AND** client CAN choose to queue job or retry later

#### Scenario: Backpressure from TTS rate limiting

**GIVEN** TTS provider is rate-limiting requests (429 errors)  
**WHEN** internal TTS concurrency limit is reached  
**THEN** render jobs SHALL pause TTS generation temporarily  
**AND** jobs SHALL resume when TTS capacity available  
**AND** circuit breaker SHALL trip if TTS unavailable > 60s

### Requirement: Dynamic Concurrency Adjustment

The system SHALL support runtime adjustment of concurrency limits without restart.

#### Scenario: Runtime concurrency increase

**GIVEN** `RENDER_CONCURRENCY=2` is currently configured  
**WHEN** admin updates configuration to `RENDER_CONCURRENCY=4` via admin API  
**THEN** new limit SHALL take effect for subsequent jobs  
**AND** currently running jobs SHALL NOT be aborted  
**AND** up to 4 jobs SHALL run concurrently after change

#### Scenario: Runtime concurrency decrease

**GIVEN** `TTS_CONCURRENCY=10` is currently configured and 10 requests are active  
**WHEN** admin updates configuration to `TTS_CONCURRENCY=5`  
**THEN** currently active 10 requests SHALL complete normally  
**AND** new requests SHALL respect new limit of 5  
**AND** concurrency SHALL gradually decrease to 5 as requests complete

## MODIFIED Requirements

_No existing requirements are modified by this spec._

## REMOVED Requirements

_No existing requirements are removed by this spec._
