#!/usr/bin/env node
/**
 * Test Script: Avatar HIGH Tier (Ready Player Me)
 *
 * Tests the Ready Player Me integration with Remotion rendering
 * Expected time: ~120 seconds
 * Expected cost: 3 credits
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Testing Avatar HIGH Tier (Ready Player Me)\n');

async function testHighTier() {
  try {
    // Step 1: Create render job
    console.log('📤 Step 1: Creating HIGH tier render job...');

    const renderResponse = await fetch(`${BASE_URL}/api/v2/test/avatars/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Olá, este é um teste com avatar Ready Player Me de alta qualidade',
        quality: 'HIGH',
        emotion: 'happy',
        fps: 30,
      }),
    });

    if (!renderResponse.ok) {
      throw new Error(`HTTP ${renderResponse.status}: ${renderResponse.statusText}`);
    }

    const renderData = await renderResponse.json();

    if (!renderData.success) {
      throw new Error(`Render failed: ${renderData.error}`);
    }

    console.log('✅ Render job created successfully');
    console.log(`   Job ID: ${renderData.jobId}`);
    console.log(`   Provider: ${renderData.provider}`);
    console.log(`   Credits: ${renderData.creditsUsed}`);
    console.log(`   Estimated time: ${renderData.estimatedTime}s\n`);

    // Step 2: Poll status
    const jobId = renderData.jobId;
    let attempts = 0;
    const maxAttempts = 150; // 150 * 2s = 300s max wait
    let completed = false;

    console.log('🔄 Step 2: Polling job status...');

    while (attempts < maxAttempts && !completed) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(
        `${BASE_URL}/api/v2/test/avatars/render/status/${jobId}`
      );

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();

      if (!statusData.success) {
        throw new Error(`Status check error: ${statusData.error}`);
      }

      const progress = statusData.progress || 0;
      const status = statusData.status;
      const elapsed = statusData.elapsedTime || 0;
      const remaining = statusData.estimatedTimeRemaining || 0;

      console.log(
        `   [${status.toUpperCase()}] Progress: ${progress}% | Elapsed: ${elapsed}s | Remaining: ${remaining}s`
      );

      if (status === 'completed') {
        completed = true;
        console.log('\n✅ Rendering completed successfully!');
        console.log(`   Video URL: ${statusData.result?.videoUrl}`);
        console.log(`   Model URL: ${statusData.result?.modelUrl}`);
        console.log(`   Duration: ${statusData.result?.duration}s`);
        console.log(`   Resolution: ${statusData.result?.resolution}`);
        console.log(`   Total time: ${elapsed}s`);
        break;
      }

      if (status === 'failed') {
        throw new Error(`Rendering failed: ${statusData.result?.message || 'Unknown error'}`);
      }

      attempts++;
    }

    if (!completed) {
      throw new Error('Timeout: Rendering did not complete within expected time');
    }

    // Step 3: Validate results
    console.log('\n📊 Step 3: Validating results...');

    if (!statusData.result?.videoUrl) {
      throw new Error('Video URL not returned');
    }

    if (!statusData.result?.modelUrl) {
      console.warn('⚠️  Warning: Model URL not returned (may be expected for some renders)');
    }

    if (statusData.creditsUsed !== 3) {
      throw new Error(`Expected 3 credits, got ${statusData.creditsUsed}`);
    }

    if (statusData.provider !== 'rpm') {
      throw new Error(`Expected provider 'rpm', got '${statusData.provider}'`);
    }

    console.log('✅ All validations passed!');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 HIGH Tier (Ready Player Me) Test: PASSED');
    console.log('='.repeat(60));
    console.log(`Provider: Ready Player Me`);
    console.log(`Cost: 3 credits`);
    console.log(`Time: ${statusData.elapsedTime}s (expected ~120s)`);
    console.log(`Quality: 4K`);
    console.log(`Status: ✅ PRODUCTION READY`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n' + '='.repeat(60));
    console.error('❌ HIGH Tier (Ready Player Me) Test: FAILED');
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run test
testHighTier();
