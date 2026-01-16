/**
 * E2E Render Test - Harness Mode
 * Tests the render pipeline using mock dependencies
 * 
 * Requirements:
 * - RENDER_HARNESS=true
 * - E2E_TEST_MODE=true
 */

import { test, expect } from '@playwright/test';

test.describe('Render Pipeline E2E (Harness Mode)', () => {
  const TEST_TOKEN = 'test-token';
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ request }) => {
    // Verify test mode is available
    const response = await request.get(`${BASE_URL}/api/test/render`);
    
    // If test endpoint is not available, skip tests
    if (response.status() === 404) {
      test.skip(true, 'Test endpoint not available. Ensure E2E_TEST_MODE=true');
    }
  });

  test('should return 401 without test token', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/test/render`, {
      data: {
        projectId: 'test-project-001',
        slides: []
      }
    });

    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Invalid test token');
  });

  test('should render successfully with test token in harness mode', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/test/render`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      data: {
        projectId: 'e2e-test-project-001',
        slides: [
          {
            id: 'slide-1',
            content: 'Test slide content 1',
            title: 'Slide 1',
            duration: 3
          },
          {
            id: 'slide-2',
            content: 'Test slide content 2',
            title: 'Slide 2',
            duration: 2
          }
        ]
      }
    });

    expect(response.status()).toBe(200);
    
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('completed');
    expect(json.jobId).toBe('e2e-test-project-001');
    expect(json.videoUrl).toBeDefined();
    expect(json.harnessMode).toBe(true);
  });

  test('should return 400 if projectId is missing', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/test/render`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      data: {
        slides: []
      }
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('projectId is required');
  });

  test('should use default test slide if slides are empty', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/test/render`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      data: {
        projectId: 'e2e-test-default-slides'
      }
    });

    expect(response.status()).toBe(200);
    
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.harnessMode).toBe(true);
  });

  test('GET /api/test/render should confirm test mode status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/test/render`);

    expect(response.status()).toBe(200);
    
    const json = await response.json();
    expect(json.status).toBe('ok');
    expect(json.testMode).toBe(true);
    expect(json.harnessMode).toBe(true);
  });
});
