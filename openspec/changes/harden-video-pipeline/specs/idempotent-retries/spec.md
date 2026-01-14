# Spec: Idempotent Retries

## ADDED Requirements

### Requirement: Idempotency Key Management

The system SHALL use Redis-backed idempotency keys to prevent duplicate processing on retry for expensive operations (TTS, storage).

#### Scenario: TTS request idempotency

**GIVEN** a TTS request for slide narration with text `"Hello world"` and voice `"en-US-Standard-A"`  
**WHEN** the request is made  
**THEN** an idempotency key SHALL be generated: `tts_{projectId}_{slideId}_{hash(text+voice+speed)}`  
**AND** the key SHALL be checked in Redis cache  
**AND** if cached, the stored audio URL SHALL be returned immediately without API call  
**AND** if not cached, the TTS API SHALL be called and result stored with key

#### Scenario: TTS retry uses cached result

**GIVEN** a TTS request succeeded and result is cached in Redis  
**WHEN** the render job fails and is retried  
**THEN** the TTS request with same parameters SHALL retrieve cached audio URL  
**AND** NO new TTS API call SHALL be made  
**AND** TTS provider quota SHALL NOT be consumed

#### Scenario: Storage upload idempotency

**GIVEN** a video file upload to storage with filename `"render-abc123.mp4"` and size `5MB`  
**WHEN** the upload is initiated  
**THEN** an idempotency key SHALL be generated: `upload_{jobId}_{filename}_{size}`  
**AND** the system SHALL check if object exists in storage (HEAD request)  
**AND** if exists with matching size, upload SHALL be skipped  
**AND** if exists with different size, old object SHALL be deleted and re-uploaded

#### Scenario: Idempotency key expiration

**GIVEN** an idempotency key is stored in Redis with TTL of 24 hours  
**WHEN** 24 hours elapse  
**THEN** the key SHALL expire automatically  
**AND** subsequent operations SHALL execute normally (cache miss)  
**AND** new result SHALL be cached with fresh TTL

### Requirement: Idempotency Cache Availability

The system SHALL gracefully handle Redis unavailability for idempotency cache.

#### Scenario: Redis unavailable fallback

**GIVEN** Redis is unavailable or connection fails  
**WHEN** an idempotent operation is attempted  
**THEN** the system SHALL log a warning `"Idempotency cache unavailable, executing without deduplication"`  
**AND** the operation SHALL proceed without idempotency check  
**AND** the result SHALL NOT be cached

#### Scenario: Redis cache partial failure

**GIVEN** Redis is available but a specific key operation fails (e.g., timeout)  
**WHEN** idempotency check or cache store fails  
**THEN** the system SHALL treat it as cache miss  
**AND** the expensive operation SHALL execute normally  
**AND** the failure SHALL be logged for monitoring

### Requirement: Idempotency Key Collision Prevention

The system SHALL ensure idempotency keys are unique and collision-resistant.

#### Scenario: Hash collision detection

**GIVEN** two different slide contents that produce the same hash (unlikely but possible)  
**WHEN** idempotency keys are generated  
**THEN** the keys SHALL include additional entropy (e.g., `slideId`, `projectId`)  
**AND** collision probability SHALL be < 1 in 1 billion

#### Scenario: Key uniqueness validation

**GIVEN** multiple concurrent render jobs for the same project  
**WHEN** idempotency keys are generated for different slides  
**THEN** each key SHALL be unique  
**AND** keys SHALL NOT collide even if text content is identical (due to `slideId` in key)

### Requirement: Retry Idempotency Enforcement

The system SHALL ensure all retry attempts use the same idempotency key.

#### Scenario: Consistent key across retries

**GIVEN** a TTS request fails on first attempt  
**WHEN** the request is retried after exponential backoff  
**THEN** the SAME idempotency key SHALL be used  
**AND** if first attempt stored partial result, retry SHALL NOT duplicate work

#### Scenario: Retry with different parameters

**GIVEN** a TTS request fails and user modifies slide text before retry  
**WHEN** the request is retried  
**THEN** a NEW idempotency key SHALL be generated (due to text hash change)  
**AND** a new TTS API call SHALL be made  
**AND** old cached result SHALL NOT be used

## MODIFIED Requirements

_No existing requirements are modified by this spec._

## REMOVED Requirements

_No existing requirements are removed by this spec._
