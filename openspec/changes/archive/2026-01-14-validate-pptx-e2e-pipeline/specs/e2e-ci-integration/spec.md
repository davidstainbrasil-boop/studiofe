# Spec: CI/CD E2E Integration

## ADDED Requirements

### Requirement: CI Workflow E2E Test Execution

The CI/CD pipeline SHALL execute E2E PPTX pipeline tests as part of the automated quality gates.

#### Scenario: Run E2E test in CI environment

**GIVEN** a code change is pushed to the repository or a pull request is opened  
**WHEN** the CI workflow executes  
**THEN** a dedicated CI job SHALL run the E2E PPTX pipeline test  
**AND** the job SHALL use the same test configuration as local development  
**AND** the job SHALL have access to test database, storage, and queue infrastructure  
**AND** the job SHALL produce a Playwright HTML report as an artifact

#### Scenario: CI test failure blocks merge

**GIVEN** an E2E test that fails in CI  
**WHEN** a pull request is open  
**THEN** the CI status check SHALL be marked as failed  
**AND** the pull request SHALL NOT be mergeable until the E2E test passes  
**AND** the Playwright report artifact SHALL be available for debugging

#### Scenario: CI test timeout protection

**GIVEN** a render job that exceeds the expected completion time  
**WHEN** the E2E test runs in CI  
**THEN** the test SHALL timeout after 180 seconds (3 minutes)  
**AND** the CI job SHALL fail with a clear timeout error  
**AND** the CI job SHALL capture database and queue state for debugging

### Requirement: Test Fixtures in Version Control

The system SHALL maintain test fixtures in version control for reproducible testing.

#### Scenario: Test PPTX file availability

**GIVEN** the E2E test requires a PPTX file  
**WHEN** the test executes  
**THEN** the PPTX file SHALL be available in `estudio_ia_videos/src/app/e2e/fixtures/test-presentation.pptx`  
**AND** the file SHALL be < 500 KB to ensure fast CI execution  
**AND** the file SHALL contain 2-3 slides with simple text content  
**AND** the file SHALL be tracked in version control (not .gitignored)

### Requirement: CI Environment Configuration

The CI workflow SHALL configure environment variables required for E2E testing.

#### Scenario: CI environment variables

**GIVEN** the E2E test runs in CI  
**WHEN** the test accesses environment configuration  
**THEN** the following variables SHALL be set from GitHub Secrets:
- `DATABASE_URL`: Connection string for test database
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Admin key for cleanup operations
- `REDIS_URL`: Redis connection for queue backend
- `E2E_TEST_USER_EMAIL`: Pre-seeded test user email
- `E2E_TEST_USER_PASSWORD`: Test user password
**AND** missing variables SHALL cause the test to fail early with a clear error message

### Requirement: Playwright Report Artifacts

The CI workflow SHALL preserve Playwright test reports for debugging.

#### Scenario: Upload test report on failure

**GIVEN** an E2E test that fails in CI  
**WHEN** the CI job completes  
**THEN** the Playwright HTML report SHALL be uploaded as a GitHub Actions artifact  
**AND** the artifact SHALL be named `playwright-e2e-pptx-pipeline-report`  
**AND** the artifact SHALL include screenshots, traces, and video recordings  
**AND** the artifact SHALL be retained for 7 days

#### Scenario: Upload test report on success

**GIVEN** an E2E test that passes in CI  
**WHEN** the CI job completes  
**THEN** the Playwright HTML report SHALL be uploaded as an artifact  
**AND** the artifact SHALL confirm all validation checkpoints passed

## MODIFIED Requirements

_No existing requirements are modified by this spec._

## REMOVED Requirements

_No existing requirements are removed by this spec._
