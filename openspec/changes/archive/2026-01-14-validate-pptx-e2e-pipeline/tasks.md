# Implementation Tasks: E2E PPTX-to-Video Pipeline Testing

## Prerequisites
- [x] Review current Playwright configuration
- [x] Identify PPTX processing endpoints
- [x] Map database schema for validation
- [x] Review storage integration patterns
- [x] Confirm CI workflow structure

## Test Implementation
- [x] Create test fixture: `estudio_ia_videos/src/app/e2e/fixtures/test-presentation.pptx`
  - Create minimal 2-3 slide PPTX with simple text content
  - Ensure file size < 500 KB
  - Add to version control
- [x] Create helper utilities: `estudio_ia_videos/src/app/e2e/helpers/pptx-pipeline.helpers.ts`
  - `uploadPPTX(file: File)`: Upload PPTX via API
  - `pollRenderJob(jobId: string, maxWaitMs: number)`: Poll with exponential backoff
  - `validateDatabaseRecord(table: string, id: string, expected: object)`: DB validation
  - `validateStorageFile(path: string)`: Check file existence and size
  - `isPlaceholderPath(path: string)`: Detect placeholder patterns
- [x] Create E2E test: `estudio_ia_videos/src/app/e2e/pptx-to-video-real.spec.ts`
  - Setup: Load test PPTX fixture
  - Test 1: Upload PPTX and validate slide extraction (DB records, no placeholders)
  - Test 2: Initiate render job and poll until completion
  - Test 3: Validate video file in storage (existence, size > 0)
  - Test 4: Negative test - detect placeholder responses
  - Cleanup: Delete test data after completion

## CI/CD Integration
- [x] Update `.github/workflows/nightly.yml`
  - Add `e2e-pptx-pipeline` to test matrix
  - Configure Playwright installation
  - Set environment variables from secrets
  - Upload Playwright report artifact on completion
- [x] Validate CI configuration locally
  - Run test with CI environment variables
  - Confirm artifact paths are correct
  - Test timeout behavior (manually trigger long-running job)

## Documentation
- [x] Create `walkthrough.md` in artifacts directory
  - Document E2E test purpose and architecture
  - Provide "How to run locally" instructions
  - Explain validation checkpoints
  - Include troubleshooting guide
  - Add CI integration details with links to workflow file

## Verification
- [x] Run E2E test locally with real infrastructure
  - Execute: `npx playwright test estudio_ia_videos/src/app/e2e/pptx-to-video-real.spec.ts`
  - Verify: Test passes, video file created, DB records valid
- [x] Run E2E test in headed mode for validation
  - Execute: `npx playwright test --headed`
  - Observe: Upload UI, API calls, polling, validation steps
- [x] Test placeholder detection (negative test)
  - Temporarily modify API to return placeholder `output_url`
  - Execute E2E test
  - Verify: Test fails with clear placeholder detection error
- [/] Push to branch and monitor CI
  - Push changes to feature branch
  - Monitor GitHub Actions for `e2e-pptx-pipeline` job
  - Verify: Job passes, artifact uploaded
- [ ] Review Playwright report artifact
  - Download artifact from GitHub Actions
  - Inspect: Screenshots, trace, video recordings
  - Confirm: All validation checkpoints visible

## Rollout
- [ ] Merge to main branch after approval
- [ ] Monitor CI metrics for E2E test execution time
- [ ] Document any environment-specific issues encountered
- [ ] Update team on new E2E coverage and how to interpret failures

## Dependencies
- Requires access to test database (seeded with test user)
- Requires access to Supabase Storage or S3 with write permissions
- Requires Redis instance for BullMQ queue
- Requires GitHub Secrets configured for CI environment variables

## Risk Mitigation
- **Long CI runtime**: Use minimal test PPTX (2-3 slides) to keep rendering < 60s
- **Flaky tests**: Implement exponential backoff polling with generous timeout (180s)
- **Test data pollution**: Implement automatic cleanup in `afterEach` hook
- **Storage quota**: Document storage usage, consider periodic cleanup script
- **Secrets exposure**: Use GitHub Secrets, never commit credentials to version control
