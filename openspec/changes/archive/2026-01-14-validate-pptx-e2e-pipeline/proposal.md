# Proposal: End-to-End PPTX-to-Video Pipeline Validation

## Overview

This change introduces comprehensive end-to-end (E2E) testing for the complete PPTX-to-video pipeline, ensuring that the system functions correctly from file upload through video generation, with all integrations verified against real infrastructure (database, storage, rendering services).

## Problem Statement

The current E2E test suite (e.g., `production-real.spec.ts`) validates basic page loads and authentication flows but does not test the core business value proposition: uploading a PPTX file, processing it into slides, generating narration, and producing a final video output. This gap means:

1. **No validation of critical pipeline**: The PPTX upload → slide extraction → TTS generation → video rendering flow is untested at the integration level
2. **Placeholder/mock risk**: There's no automated verification that the system persists real data to the database and storage rather than returning placeholder values
3. **CI/CD blind spot**: Regressions in the video production pipeline could reach production undetected

## Proposed Solution

Implement a comprehensive E2E test suite that:

1. **Uploads a real PPTX file** through the Studio UI or API (`POST /api/v1/pptx/upload`)
2. **Validates slide processing** by checking database records in `pptx_uploads` and `pptx_slides` tables
3. **Initiates video rendering** via `POST /api/render/start` or integrated pipeline
4. **Polls for completion** and validates the final output:
   - Database record in `render_jobs` with `status=completed`
   - Video file exists in storage with `size > 0 bytes`
   - No placeholder or fake paths (e.g., `/fake/video.mp4`, `placeholder.mp4`)
5. **Fails fast** if any step returns mocks, placeholders, or fake data
6. **Integrates with CI/CD** via GitHub Actions workflow extension

## User Review Required

> [!IMPORTANT]
> **Test Data Strategy**: This E2E test will require a test PPTX file. Should we use an existing test file from `test_files/`, create a minimal test fixture, or allow configuration via environment variable?

> [!IMPORTANT]
> **Database Cleanup**: E2E tests will create database records (`pptx_uploads`, `pptx_slides`, `render_jobs`). Should we implement automatic cleanup after test completion, or use a dedicated test database schema?

> [!WARNING]
> **CI Runtime**: Full video rendering can take 30-120 seconds. This will significantly increase CI execution time. Consider:
> - Running E2E tests in a separate job matrix
> - Limiting to nightly builds or release branches
> - Using a shorter test PPTX (e.g., 2-3 slides)

> [!IMPORTANT]
> **Storage Integration**: Tests need to validate video file existence in storage. Confirm the storage backend:
> - Supabase Storage (current production)?
> - Local filesystem (development)?
> - S3 or other cloud storage?

## Proposed Changes

### E2E Test Implementation

#### [NEW] [pptx-to-video-real.spec.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/app/e2e/pptx-to-video-real.spec.ts)

Implement comprehensive E2E test covering:

1. **Test Setup**: Load test PPTX file, authenticate test user
2. **PPTX Upload**: `POST /api/v1/pptx/upload` with real file
3. **Validation Block 1 - Upload Success**:
   - Response contains `processingId`
   - Database record created in `pptx_uploads` with `status='completed'`
   - Database records created in `pptx_slides` (count matches actual slide count)
   - All slide records have non-null `slideNumber`, `content`, `duration`
4. **Video Rendering Initiation**: `POST /api/render/start` with PPTX processing ID
5. **Validation Block 2 - Render Job Created**:
   - Response contains `jobId`
   - Database record created in `render_jobs` with `status='pending'` or `'processing'`
6. **Polling Loop**: Poll render job status until `completed` or timeout (max 3 minutes)
7. **Validation Block 3 - Video Output**:
   - Render job status is `completed` (not `failed` or `placeholder`)
   - `output_url` field is NOT null and NOT a placeholder path
   - Query storage to verify file exists
   - File size is > 0 bytes (preferably > 100KB)
8. **Cleanup** (optional): Delete test records if configured

---

### CI/CD Integration

#### [MODIFY] [ci.yml](file:///root/_MVP_Video_TecnicoCursos_v7/.github/workflows/ci.yml)

Add new E2E test matrix entry:

```yaml
# In jobs.tests.strategy.matrix.suite, add: e2e-pptx-pipeline
- name: Run Playwright E2E PPTX Pipeline
  if: matrix.suite == 'e2e-pptx-pipeline'
  run: npx playwright test estudio_ia_videos/src/app/e2e/pptx-to-video-real.spec.ts --reporter=list
  env:
    CI: true
    E2E_BASE_URL: 'http://localhost:3000'
    # Storage and DB connection strings from secrets
```

---

### Test Fixtures

#### [NEW] [test-presentation.pptx](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/app/e2e/fixtures/test-presentation.pptx)

Create minimal test PPTX file (2-3 slides) with:
- Simple text content on each slide
- Basic formatting (no complex animations)
- Total file size < 500KB for fast CI execution

#### [NEW] [pptx-pipeline.helpers.ts](file:///root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/app/e2e/helpers/pptx-pipeline.helpers.ts)

Utility functions for:
- `uploadPPTX(file: File)`: Helper to upload PPTX via API
- `pollRenderJob(jobId: string, maxWaitMs: number)`: Polling utility with exponential backoff
- `validateDatabaseRecord(table: string, id: string, expectedFields: object)`: DB validation helper
- `validateStorageFile(path: string)`: Storage file existence and size check
- `isPlaceholderPath(path: string)`: Detect placeholder/fake paths

---

### Documentation

#### [MODIFY] [walkthrough.md](file:///root/.gemini/antigravity/brain/d6a38906-eb89-4b25-9087-cb5c40a3fa4f/walkthrough.md)

Document:
- E2E test purpose and coverage
- How to run locally: `npx playwright test e2e/pptx-to-video-real.spec.ts`
- Expected output and validation checkpoints
- CI integration details
- Troubleshooting guide for common failures

## Verification Plan

### Automated Tests

1. **Run new E2E test locally**:
   ```bash
   cd /root/_MVP_Video_TecnicoCursos_v7
   npx playwright test estudio_ia_videos/src/app/e2e/pptx-to-video-real.spec.ts --headed
   ```
   **Expected**: Test passes with all validation checkpoints green, video file created in storage

2. **Run in CI environment**:
   ```bash
   # After pushing to branch
   # Monitor GitHub Actions workflow for e2e-pptx-pipeline job
   ```
   **Expected**: CI job passes, artifacts include Playwright report with test evidence

3. **Negative test - detect placeholders**:
   - Temporarily modify `/api/render/start` to return `{ output_url: "/fake/placeholder.mp4" }`
   - Run E2E test
   - **Expected**: Test fails with clear error message about placeholder detection

### Manual Verification

1. **Review test execution recording**:
   - Run test with `npx playwright test --headed`
   - Observe file upload, API calls, polling behavior, and validation steps
   - Confirm no UI errors or console warnings

2. **Inspect database after test**:
   - Query `pptx_uploads`, `pptx_slides`, `render_jobs` tables
   - Verify records were created with expected data
   - Confirm cleanup occurred if configured

3. **Verify storage integration**:
   - Check storage bucket/directory for generated video file
   - Download and play video to confirm it's not corrupted
   - Verify file size matches database record

## Success Criteria

- [ ] E2E test successfully uploads PPTX and validates database records
- [ ] E2E test successfully initiates video rendering and polls for completion
- [ ] E2E test validates video file existence and size in storage
- [ ] E2E test fails when placeholder or fake paths are returned
- [ ] CI workflow includes E2E pipeline test and passes
- [ ] Walkthrough documentation is complete and accurate
