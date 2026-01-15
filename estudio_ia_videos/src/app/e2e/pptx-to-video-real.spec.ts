/**
 * E2E Test: PPTX-to-Video Pipeline (Real Infrastructure)
 *
 * Tests the complete pipeline from PPTX upload through video generation:
 * 1. Upload PPTX file
 * 2. Validate slide extraction and database persistence
 * 3. Initiate video rendering
 * 4. Poll for completion
 * 5. Validate video file in storage
 * 6. Detect placeholders/mocks (fail if found)
 * 7. Automatic cleanup
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import {
  uploadPPTX,
  pollRenderJob,
  validateDatabaseRecord,
  validateStorageFile,
  isPlaceholderPath,
  cleanupTestData,
  getSlideCount,
  getValidUserId,
  createTestProject,
} from './helpers/pptx-pipeline.helpers';

import crypto from 'crypto';

const TEST_PPTX_PATH = path.join(__dirname, 'fixtures', 'test-presentation.pptx');
const MAX_RENDER_WAIT_MS = 180000; // 3 minutes

test.describe('E2E PPTX-to-Video Pipeline (Real Infrastructure)', () => {
  let uploadId: string;
  let jobId: string;
  let projectId: string;
  let userId: string;

  test.afterEach(async () => {
    // Automatic cleanup of test data
    await cleanupTestData(uploadId, jobId, projectId);
  });

  test('Complete pipeline: Upload PPTX → Process Slides → Render Video → Validate Storage', async ({
    request,
  }) => {
    console.log('=== Starting E2E PPTX-to-Video Pipeline Test ===');

    // ========================================
    // STEP 0: Setup User & Project
    // ========================================
    console.log('\n[Step 0] Setting up test user and project...');
    userId = await getValidUserId();
    projectId = crypto.randomUUID();
    await createTestProject(userId, projectId);
    console.log(`✓ Test user ID: ${userId}`);
    console.log(`✓ Test project created: ${projectId}`);

    // ========================================
    // STEP 1: Upload PPTX File
    // ========================================
    console.log('\n[Step 1] Uploading PPTX file...');

    const uploadResult = await uploadPPTX(request, TEST_PPTX_PATH, 'e2e-test-presentation.pptx');

    uploadId = uploadResult.processingId;
    const expectedSlideCount = uploadResult.slideCount;

    console.log(`✓ PPTX uploaded successfully`);
    console.log(`  - Processing ID: ${uploadId}`);
    console.log(`  - Slide count: ${expectedSlideCount}`);

    // Validate no placeholder in processing ID
    expect(isPlaceholderPath(uploadId), 'Processing ID should not be a placeholder').toBe(false);
    expect(expectedSlideCount, 'Should have at least 1 slide').toBeGreaterThan(0);

    // ========================================
    // STEP 2: Validate Database - PPTX Upload
    // ========================================
    console.log('\n[Step 2] Validating PPTX upload in database...');

    const uploadRecord = await validateDatabaseRecord('pptx_uploads', uploadId, {
      status: 'completed',
    });

    expect(uploadRecord.slide_count, 'Slide count in DB should match extracted count').toBe(
      expectedSlideCount,
    );
    expect(uploadRecord.original_filename).toBeTruthy();
    expect(uploadRecord.created_at || uploadRecord.createdAt).toBeTruthy();

    console.log(`✓ PPTX upload record validated`);
    console.log(`  - Status: ${uploadRecord.status}`);
    console.log(`  - Slides in DB: ${uploadRecord.slide_count}`);

    // ========================================
    // STEP 3: Validate Database - Slides
    // ========================================
    console.log('\n[Step 3] Validating individual slides in database...');

    const dbSlideCount = await getSlideCount(uploadId);

    expect(dbSlideCount, 'DB slide count should match upload record').toBe(expectedSlideCount);

    console.log(`✓ Found ${dbSlideCount} slides in pptx_slides table`);

    // ========================================
    // STEP 4: Initiate Video Rendering
    // ========================================
    console.log('\n[Step 4] Initiating video render job...');

    // Minimal slides payload for render
    const slidesPayload = Array.from({ length: expectedSlideCount }).map((_, i) => ({
        id: `slide_${i}`,
        content: `Slide ${i}`,
        duration: 5
    }));

    const renderResponse = await request.post('/api/render/start', {
      headers: {
        'x-user-id': userId // Bypass auth check with valid user ID
      },
      data: {
        projectId: projectId,
        slides: slidesPayload, // Must provide slides array
        config: {
            test: true, // Use test flag for faster render/mocking if available
            quality: 'low'
        }
      },
    });

    // Check for error response first to provide better debug message
    if (renderResponse.status() !== 200) {
        const errorText = await renderResponse.text();
        console.error(`Render failed with status ${renderResponse.status()}: ${errorText}`);
    }

    expect(renderResponse.status(), 'Render start request should succeed').toBe(200);
    const renderData = await renderResponse.json();

    jobId = renderData.jobId || renderData.data?.jobId || renderData.id;

    console.log(`✓ Render job initiated`);
    console.log(`  - Job ID: ${jobId}`);
    console.log(`  - Project ID: ${projectId}`);

    // Validate no placeholder in job ID
    expect(isPlaceholderPath(jobId), 'Job ID should not be a placeholder').toBe(false);

    // ========================================
    // STEP 5: Validate Render Job in Database
    // ========================================
    console.log('\n[Step 5] Validating render job in database...');

    const jobRecord = await validateDatabaseRecord('render_jobs', jobId, {
      // Don't check exact status since it might already be processing
    });

    expect(['pending', 'queued', 'processing', 'completed']).toContain(jobRecord.status);
    expect(jobRecord.projectId || jobRecord.project_id).toBe(projectId);

    console.log(`✓ Render job record validated`);
    console.log(`  - Initial status: ${jobRecord.status}`);

    // ========================================
    // STEP 6: Poll for Render Completion
    // ========================================
    console.log('\n[Step 6] Polling for render job completion...');
    console.log(`  - Max wait time: ${MAX_RENDER_WAIT_MS / 1000}s`);

    const pollResult = await pollRenderJob(request, jobId, MAX_RENDER_WAIT_MS, 5000, userId);

    if (pollResult.status === 'failed') {
      throw new Error(`Render job failed: ${pollResult.error || 'Unknown error'}`);
    }

    expect(pollResult.status, 'Render job should complete successfully').toBe('completed');

    console.log(`✓ Render job completed successfully`);

    // ========================================
    // STEP 7: Validate Output URL (No Placeholders)
    // ========================================
    console.log('\n[Step 7] Validating output URL...');

    const outputUrl = pollResult.outputUrl;

    expect(outputUrl, 'Output URL should not be null').toBeTruthy();
    expect(isPlaceholderPath(outputUrl!), 'Output URL should not be a placeholder path').toBe(
      false,
    );

    console.log(`✓ Output URL validated: ${outputUrl}`);

    // Additional placeholder checks
    expect(outputUrl).not.toMatch(/fake/i);
    expect(outputUrl).not.toMatch(/mock/i);
    expect(outputUrl).not.toMatch(/placeholder/i);
    expect(outputUrl).not.toMatch(/example/i);
    expect(outputUrl).not.toMatch(/dummy/i);

    // ========================================
    // STEP 8: Validate Storage File
    // ========================================
    console.log('\n[Step 8] Validating video file in storage...');

    const storageResult = await validateStorageFile(outputUrl!);

    expect(storageResult.exists, 'Video file should exist in storage').toBe(true);
    expect(storageResult.size, 'Video file size should be > 0').toBeGreaterThan(0);
    expect(
      storageResult.size,
      'Video file size should be > 100KB (real video content)',
    ).toBeGreaterThan(100 * 1024);

    console.log(`✓ Storage file validated`);
    console.log(`  - Path: ${storageResult.path}`);
    console.log(`  - Size: ${(storageResult.size / 1024).toFixed(2)} KB`);

    // ========================================
    // SUCCESS!
    // ========================================
    console.log('\n=== ✓ E2E PPTX-to-Video Pipeline Test PASSED ===');
    console.log('All validation checkpoints passed:');
    console.log('  ✓ PPTX upload and processing');
    console.log('  ✓ Database persistence (pptx_uploads, pptx_slides)');
    console.log('  ✓ Render job creation and completion');
    console.log('  ✓ No placeholder/mock data detected');
    console.log('  ✓ Video file exists in storage with valid size');
  });

  test('Negative test: Detect placeholder responses', async ({ request }) => {
    console.log('\n=== Negative Test: Placeholder Detection ===');

    // This test validates that our placeholder detection logic works
    const testCases = [
      '/fake/video.mp4',
      '/placeholder.mp4',
      '/mock/output/test.mp4',
      '/example/video.mp4',
      '/dummy/path/video.mp4',
      'test.mp4', // Too generic
    ];

    for (const testPath of testCases) {
      const isPlaceholder = isPlaceholderPath(testPath);
      expect(isPlaceholder, `Should detect "${testPath}" as placeholder`).toBe(true);
      console.log(`✓ Correctly detected placeholder: ${testPath}`);
    }

    // Valid paths that should NOT be detected as placeholders
    const validPaths = [
      '/storage/videos/project-123/render-456.mp4',
      'https://myproject.supabase.co/storage/v1/object/public/videos/2026-01-14/video.mp4',
      'videos/render-abc123.mp4',
    ];

    for (const validPath of validPaths) {
      const isPlaceholder = isPlaceholderPath(validPath);
      expect(isPlaceholder, `Should NOT detect "${validPath}" as placeholder`).toBe(false);
      console.log(`✓ Correctly accepted valid path: ${validPath}`);
    }

    console.log('\n✓ Placeholder detection logic validated');
  });
});
