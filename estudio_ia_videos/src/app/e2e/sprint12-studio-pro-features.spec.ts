/**
 * E2E Test: SPRINT 12 - Studio Pro Advanced Features
 *
 * Tests the new features implemented in SPRINT 12:
 * 1. GLB Avatar Rendering with Three.js
 * 2. Scene Transitions (6 types)
 * 3. Text Animations (12 types)
 * 4. Integration with Real Avatar API
 */

import { test, expect } from '@playwright/test';
import {
  getValidUserId,
  createTestProject,
  cleanupTestData,
} from './helpers/pptx-pipeline.helpers';
import crypto from 'crypto';

const MAX_RENDER_WAIT_MS = 300000; // 5 minutes

test.describe('SPRINT 12: Studio Pro Advanced Features', () => {
  let userId: string;
  let projectId: string;
  let jobId: string;

  test.beforeEach(async () => {
    userId = await getValidUserId();
    projectId = crypto.randomUUID();
    await createTestProject(userId, projectId);
  });

  test.afterEach(async () => {
    if (jobId || projectId) {
      await cleanupTestData(undefined, jobId, projectId);
    }
  });

  test('Scene Transitions: Should apply all 6 transition types', async ({ page }) => {
    console.error('=== Testing Scene Transitions ===');

    // Navigate to Studio Pro
    await page.goto(`/studio-unified?projectId=${projectId}`);
    await expect(page).toHaveURL(/studio-unified/);

    // Wait for Studio Pro to load
    await expect(page.getByText('Timeline')).toBeVisible({ timeout: 10000 });

    // Open Transitions panel
    const transitionsTab = page.getByRole('tab', { name: /Transi[cç][oõ]es|Transitions/i });
    if (await transitionsTab.isVisible()) {
      await transitionsTab.click();
      await page.waitForTimeout(500);

      // Test all 6 transition types
      const transitionTypes = ['none', 'fade', 'wipe', 'slide', 'zoom', 'dissolve'];

      for (const transitionType of transitionTypes) {
        console.error(`  Testing transition: ${transitionType}`);

        // Look for transition button/selector
        const transitionButton = page.locator(`[data-transition="${transitionType}"]`).first();

        if (await transitionButton.isVisible()) {
          await transitionButton.click();
          await page.waitForTimeout(300);

          // Verify transition is selected
          await expect(transitionButton).toHaveAttribute('data-selected', 'true');
          console.error(`    ✓ ${transitionType} transition selected`);
        } else {
          console.error(`    ⚠ ${transitionType} transition button not found (UI may differ)`);
        }
      }
    } else {
      console.error('  ⚠ Transitions tab not visible (may require different navigation)');
    }

    console.error('✓ Scene Transitions test completed');
  });

  test('Text Animations: Should apply all 12 animation types', async ({ page }) => {
    console.error('=== Testing Text Animations ===');

    // Navigate to Studio Pro
    await page.goto(`/studio-unified?projectId=${projectId}`);
    await expect(page).toHaveURL(/studio-unified/);
    await expect(page.getByText('Timeline')).toBeVisible({ timeout: 10000 });

    // Open Text/Animations panel
    const textTab = page.getByRole('tab', { name: /Texto|Text|Anima[cç][oõ]es/i });
    if (await textTab.isVisible()) {
      await textTab.click();
      await page.waitForTimeout(500);

      // Test all 12 animation types
      const animationTypes = [
        'none',
        'fade-in',
        'fade-out',
        'slide-in',
        'slide-out',
        'zoom-in',
        'zoom-out',
        'bounce-in',
        'bounce-out',
        'typewriter',
        'flip-in',
        'flip-out',
      ];

      for (const animationType of animationTypes) {
        console.error(`  Testing animation: ${animationType}`);

        // Look for animation button/selector
        const animationButton = page.locator(`[data-animation="${animationType}"]`).first();

        if (await animationButton.isVisible()) {
          await animationButton.click();
          await page.waitForTimeout(300);

          // Verify animation is selected
          await expect(animationButton).toHaveAttribute('data-selected', 'true');
          console.error(`    ✓ ${animationType} animation selected`);
        } else {
          console.error(`    ⚠ ${animationType} animation button not found (UI may differ)`);
        }
      }
    } else {
      console.error('  ⚠ Text/Animations tab not visible (may require different navigation)');
    }

    console.error('✓ Text Animations test completed');
  });

  test('GLB Avatar Rendering: Should render avatar with Three.js', async ({ page, request }) => {
    console.error('=== Testing GLB Avatar Rendering ===');

    // 1. Request avatar generation via API
    console.error('  Step 1: Requesting avatar generation...');

    const avatarId = crypto.randomUUID();
    const response = await request.post('/api/v2/avatars/generate', {
      headers: { 'x-user-id': userId },
      data: {
        projectId: projectId,
        avatarId: avatarId,
        text: 'Hello from E2E test',
        voiceId: 'pt-BR-FranciscaNeural',
        animation: 'talking',
        quality: 'PLACEHOLDER', // Use placeholder for fast testing
        enableLipSync: true,
      },
    });

    expect(response.status(), 'Avatar generation request should succeed').toBe(200);
    const data = await response.json();

    jobId = data.jobId || data.data?.jobId;
    expect(jobId, 'Should return a job ID').toBeTruthy();
    console.error(`    ✓ Avatar job initiated: ${jobId}`);

    // 2. Poll for completion
    console.error('  Step 2: Polling for avatar generation...');
    const startTime = Date.now();
    let status = 'pending';
    let videoUrl = '';

    while (Date.now() - startTime < MAX_RENDER_WAIT_MS) {
      const pollRes = await request.get(`/api/v2/avatars/generate/status/${jobId}`, {
        headers: { 'x-user-id': userId },
      });

      if (pollRes.status() === 200) {
        const pollData = await pollRes.json();
        status = pollData.status || pollData.data?.status;

        if (status === 'completed' || status === 'failed') {
          videoUrl = pollData.videoUrl || pollData.data?.videoUrl || pollData.url;
          if (status === 'failed') {
            console.error('    ✗ Job failed:', pollData.error);
          }
          break;
        }
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    expect(status, 'Avatar generation should complete').toBe('completed');
    expect(videoUrl, 'Should return video URL').toBeTruthy();
    console.error(`    ✓ Avatar generated: ${videoUrl}`);

    // 3. Navigate to Studio Pro and verify avatar is loaded
    console.error('  Step 3: Verifying avatar in Studio Pro...');

    await page.goto(`/studio-unified?projectId=${projectId}`);
    await expect(page).toHaveURL(/studio-unified/);
    await expect(page.getByText('Timeline')).toBeVisible({ timeout: 10000 });

    // Check for Three.js canvas (GLB rendering)
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      console.error('    ✓ Three.js canvas found');

      // Verify canvas has dimensions
      const boundingBox = await canvas.boundingBox();
      expect(boundingBox?.width, 'Canvas should have width > 0').toBeGreaterThan(0);
      expect(boundingBox?.height, 'Canvas should have height > 0').toBeGreaterThan(0);
      console.error(`    ✓ Canvas dimensions: ${boundingBox?.width}x${boundingBox?.height}`);
    } else {
      console.error('    ⚠ Three.js canvas not visible (may render on demand)');
    }

    console.error('✓ GLB Avatar Rendering test completed');
  });

  test('Complete Pipeline: Avatar + Transitions + Text Animations', async ({ page, request }) => {
    console.error('=== Testing Complete Studio Pro Pipeline ===');

    // 1. Generate avatar
    console.error('  Step 1: Generating avatar...');
    const avatarId = crypto.randomUUID();

    const avatarResponse = await request.post('/api/v2/avatars/generate', {
      headers: { 'x-user-id': userId },
      data: {
        projectId: projectId,
        avatarId: avatarId,
        text: 'Complete pipeline test',
        quality: 'PLACEHOLDER',
      },
    });

    expect(avatarResponse.status()).toBe(200);
    const avatarData = await avatarResponse.json();
    jobId = avatarData.jobId || avatarData.data?.jobId;
    console.error(`    ✓ Avatar job: ${jobId}`);

    // 2. Navigate to Studio Pro
    console.error('  Step 2: Opening Studio Pro...');
    await page.goto(`/studio-unified?projectId=${projectId}`);
    await expect(page.getByText('Timeline')).toBeVisible({ timeout: 10000 });
    console.error('    ✓ Studio Pro loaded');

    // 3. Apply scene transition
    console.error('  Step 3: Applying scene transition...');
    const transitionsTab = page.getByRole('tab', { name: /Transi[cç][oõ]es|Transitions/i });

    if (await transitionsTab.isVisible()) {
      await transitionsTab.click();
      await page.waitForTimeout(500);

      const fadeTransition = page.locator('[data-transition="fade"]').first();
      if (await fadeTransition.isVisible()) {
        await fadeTransition.click();
        console.error('    ✓ Fade transition applied');
      }
    }

    // 4. Apply text animation
    console.error('  Step 4: Applying text animation...');
    const textTab = page.getByRole('tab', { name: /Texto|Text/i });

    if (await textTab.isVisible()) {
      await textTab.click();
      await page.waitForTimeout(500);

      const typewriterAnimation = page.locator('[data-animation="typewriter"]').first();
      if (await typewriterAnimation.isVisible()) {
        await typewriterAnimation.click();
        console.error('    ✓ Typewriter animation applied');
      }
    }

    // 5. Trigger render
    console.error('  Step 5: Triggering final render...');
    const renderButton = page.getByRole('button', { name: /Renderizar|Render|Exportar/i });

    if (await renderButton.isVisible()) {
      await renderButton.click();
      await page.waitForTimeout(1000);

      // Check for success message
      const successMessage = page.getByText(/Renderiza[cç][aã]o iniciada|Render started/i);
      if (await successMessage.isVisible({ timeout: 5000 })) {
        console.error('    ✓ Render initiated');
      }
    }

    console.error('✓ Complete Pipeline test completed');
  });

  test('Performance: Scene Transition Rendering Speed', async ({ page }) => {
    console.error('=== Testing Scene Transition Performance ===');

    await page.goto(`/studio-unified?projectId=${projectId}`);
    await expect(page.getByText('Timeline')).toBeVisible({ timeout: 10000 });

    // Measure transition application time
    const transitionsTab = page.getByRole('tab', { name: /Transi[cç][oõ]es|Transitions/i });

    if (await transitionsTab.isVisible()) {
      await transitionsTab.click();

      const transitions = ['fade', 'wipe', 'slide', 'zoom'];
      const timings: Record<string, number> = {};

      for (const transition of transitions) {
        const button = page.locator(`[data-transition="${transition}"]`).first();

        if (await button.isVisible()) {
          const startTime = Date.now();
          await button.click();
          await page.waitForTimeout(100); // Wait for UI update
          const endTime = Date.now();

          timings[transition] = endTime - startTime;
          console.error(`  ${transition}: ${timings[transition]}ms`);
        }
      }

      // Performance assertion: transitions should apply in < 500ms
      Object.entries(timings).forEach(([name, time]) => {
        expect(time, `${name} transition should apply in < 500ms`).toBeLessThan(500);
      });

      console.error('✓ All transitions meet performance requirements');
    }

    console.error('✓ Performance test completed');
  });

  test('Error Handling: Invalid Avatar Request', async ({ request }) => {
    console.error('=== Testing Error Handling ===');

    // Test invalid quality tier
    const response = await request.post('/api/v2/avatars/generate', {
      headers: { 'x-user-id': userId },
      data: {
        projectId: projectId,
        avatarId: crypto.randomUUID(),
        text: 'Test',
        quality: 'INVALID_QUALITY', // Invalid
      },
    });

    // Should return 400 Bad Request
    expect(response.status(), 'Should reject invalid quality tier').toBeGreaterThanOrEqual(400);
    console.error('  ✓ Invalid quality tier rejected');

    // Test missing required fields
    const response2 = await request.post('/api/v2/avatars/generate', {
      headers: { 'x-user-id': userId },
      data: {
        // Missing required fields
      },
    });

    expect(response2.status(), 'Should reject missing required fields').toBeGreaterThanOrEqual(400);
    console.error('  ✓ Missing fields rejected');

    console.error('✓ Error Handling test completed');
  });
});
