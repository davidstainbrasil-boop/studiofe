# e2e-pptx-integration Specification

## Purpose
TBD - created by archiving change validate-pptx-e2e-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Real PPTX-to-Video Pipeline Validation

The system SHALL provide automated end-to-end testing that validates the complete PPTX-to-video pipeline using real infrastructure (no mocks).

#### Scenario: Upload PPTX and validate slide extraction

**GIVEN** a test PPTX file with 2-3 slides containing text content  
**WHEN** the file is uploaded via `POST /api/v1/pptx/upload`  
**THEN** the API SHALL return HTTP 200 with a valid `processingId`  
**AND** a record SHALL exist in `pptx_uploads` table with `status='completed'`  
**AND** records SHALL exist in `pptx_slides` table matching the slide count  
**AND** each slide record SHALL have non-null `slideNumber`, `content`, and `duration` fields  
**AND** NO field SHALL contain placeholder values (e.g., "fake", "mock", "placeholder", "example")

#### Scenario: Initiate video rendering and validate completion

**GIVEN** a successfully processed PPTX with `processingId`  
**WHEN** a render job is initiated via `POST /api/render/start`  
**THEN** the API SHALL return HTTP 200 with a valid `jobId`  
**AND** a record SHALL exist in `render_jobs` table with initial `status='pending'` or `'processing'`  
**AND** within 120 seconds, the job status SHALL transition to `'completed'`  
**AND** the `output_url` field SHALL be populated with a non-null value  
**AND** the `output_url` SHALL NOT match placeholder patterns: `/fake/`, `/mock/`, `/placeholder/`, `/example/`, `/test\.mp4$/`, `/dummy/`

#### Scenario: Validate video file in storage

**GIVEN** a completed render job with `output_url`  
**WHEN** the storage backend is queried for the file at `output_url`  
**THEN** the file SHALL exist in storage  
**AND** the file size SHALL be greater than 0 bytes  
**AND** the file size SHOULD be greater than 100 KB (indicating real video content)  
**AND** the file SHALL be downloadable without permission errors

#### Scenario: Detect placeholder responses

**GIVEN** an endpoint temporarily returns placeholder data (e.g., `{ output_url: "/fake/video.mp4" }`)  
**WHEN** the E2E test executes  
**THEN** the test SHALL fail with a clear error message indicating placeholder detection  
**AND** the error message SHALL include the field name and placeholder value detected

### Requirement: Test Data Management

The system SHALL support cleanup of test data created during E2E testing.

#### Scenario: Automatic cleanup after test completion

**GIVEN** an E2E test that created database records (`pptx_uploads`, `pptx_slides`, `render_jobs`)  
**WHEN** the test completes (pass or fail)  
**THEN** the test framework SHALL delete all created database records in dependency order  
**AND** the test framework SHALL delete any video files created in storage  
**AND** cleanup failures SHALL be logged but SHALL NOT cause test failure

#### Scenario: Test isolation

**GIVEN** multiple E2E tests running concurrently or sequentially  
**WHEN** tests create database records  
**THEN** each test SHALL use unique identifiers to avoid conflicts  
**AND** test data from one test SHALL NOT interfere with another test  
**AND** test cleanup SHALL only delete records created by that specific test

### Requirement: Polling and Timeout Handling

The system SHALL implement robust polling with timeout for asynchronous render jobs.

#### Scenario: Poll render job until completion

**GIVEN** a render job with `jobId` in `'pending'` or `'processing'` status  
**WHEN** the test polls the job status  
**THEN** the test SHALL poll every 5 seconds with exponential backoff  
**AND** the test SHALL continue polling for a maximum of 180 seconds  
**AND** if `status='completed'` before timeout, the test SHALL proceed to validation  
**AND** if `status='failed'`, the test SHALL fail immediately with the `error_message`  
**AND** if timeout is reached, the test SHALL fail with a timeout error

#### Scenario: Handle render job failures gracefully

**GIVEN** a render job that fails during processing  
**WHEN** the job status transitions to `'failed'`  
**THEN** the test SHALL fail immediately without waiting for timeout  
**AND** the test failure message SHALL include the `error_message` from `render_jobs` table  
**AND** the test SHALL capture database state for debugging

