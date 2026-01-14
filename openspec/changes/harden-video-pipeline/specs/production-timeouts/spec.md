# Spec: Production Timeouts

## ADDED Requirements

### Requirement: Definitive Timeout Configuration

The system SHALL enforce definitive timeouts for all video pipeline operations to prevent indefinite hangs and ensure predictable SLOs.

#### Scenario: Render job timeout enforcement

**GIVEN** a video render job is submitted to the queue  
**WHEN** the job execution time exceeds 30 minutes  
**THEN** the job SHALL be terminated immediately  
**AND** the job status SHALL be set to `'failed'` with error message `"Job exceeded maximum timeout of 30 minutes"`  
**AND** any in-progress operations (FFmpeg, TTS, storage) SHALL be aborted  
**AND** allocated resources SHALL be released

#### Scenario: Slide composition timeout

**GIVEN** a render job is composing a single slide with FFmpeg  
**WHEN** the composition time exceeds 5 minutes  
**THEN** the slide composition SHALL be aborted  
**AND** the job SHALL fail with error `"Slide N composition timeout after 5 minutes"`  
**AND** partial output SHALL be cleaned up

#### Scenario: TTS per-slide timeout

**GIVEN** a TTS request is made for slide narration  
**WHEN** the TTS provider does not respond within 60 seconds  
**THEN** the TTS request SHALL be aborted  
**AND** the system SHALL retry with exponential backoff (if retries remaining)  
**AND** if all retries exhausted, fail the job with `"TTS timeout for slide N after 3 attempts"`

#### Scenario: TTS batch timeout

**GIVEN** a batch of TTS requests is being processed for multiple slides  
**WHEN** the total batch processing time exceeds 3 minutes  
**THEN** the batch SHALL be aborted  
**AND** successfully generated audio SHALL be preserved  
**AND** failed slides SHALL be retried individually

#### Scenario: Storage upload timeout

**GIVEN** a rendered video file is being uploaded to storage  
**WHEN** the upload time exceeds 10 minutes  
**THEN** the upload SHALL be aborted  
**AND** partial upload SHALL be cleaned up (delete incomplete multipart)  
**AND** the job SHALL be retried with exponential backoff

### Requirement: Timeout Configuration Management

The system SHALL provide centralized timeout configuration with environment variable overrides.

#### Scenario: Default timeout values

**GIVEN** no custom timeout environment variables are set  
**WHEN** the pipeline initializes  
**THEN** default timeout values SHALL be loaded:
- `renderJob`: 30 minutes
- `slideComposition`: 5 minutes
- `ttsPerSlide`: 60 seconds
- `ttsBatch`: 3 minutes
- `storageUpload`: 10 minutes
- `storageDownload`: 5 minutes

#### Scenario: Environment variable override

**GIVEN** environment variable `RENDER_JOB_TIMEOUT_MS=3600000` is set (60 minutes)  
**WHEN** the pipeline initializes  
**THEN** the render job timeout SHALL be 60 minutes  
**AND** other timeouts SHALL remain at default values

#### Scenario: Invalid timeout configuration

**GIVEN** environment variable `TTS_TIMEOUT_MS=-1` is set (invalid)  
**WHEN** the pipeline initializes  
**THEN** the system SHALL log a warning `"Invalid timeout configuration for TTS_TIMEOUT_MS, using default"`  
**AND** the default timeout value SHALL be used

### Requirement: Timeout Monitoring and Alerting

The system SHALL track timeout occurrences and alert on patterns indicating systemic issues.

#### Scenario: Timeout rate threshold alert

**GIVEN** render jobs are being processed  
**WHEN** more than 10% of jobs timeout within a 15-minute window  
**THEN** an alert SHALL be sent with severity `'warning'`  
**AND** the alert SHALL include timeout type distribution (render/TTS/storage)  
**AND** the alert SHALL suggest increasing timeout or investigating slow operations

#### Scenario: Consecutive timeout alert

**GIVEN** render jobs are being processed  
**WHEN** 5 consecutive jobs timeout on the same operation (e.g., TTS)  
**THEN** an alert SHALL be sent with severity `'critical'`  
**AND** the alert SHALL include suspected root cause (e.g., "TTS provider unresponsive")  
**AND** the alert SHALL recommend checking circuit breaker status

## MODIFIED Requirements

_No existing requirements are modified by this spec._

## REMOVED Requirements

_No existing requirements are removed by this spec._
