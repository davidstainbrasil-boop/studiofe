/**
 * E2E Test API Route - Render with Harness
 * This route is specifically for E2E testing with mock dependencies
 * 
 * POST /api/test/render
 * Headers: Authorization: Bearer test-token (when E2E_TEST_MODE=true)
 * Body: { projectId, slides }
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateTestToken, E2E_TEST_USER, isE2ETestMode } from '@/lib/auth/e2e-test-auth';
import { createVideoRenderWorker, isHarnessMode } from '@/lib/workers/video-render-worker-factory';
import { RenderService } from '@/lib/services/render-service';
import { Slide, SlideElement } from '@/lib/types';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Route only available in E2E test mode
  if (!isE2ETestMode()) {
    return NextResponse.json(
      { error: 'Test endpoint not available' },
      { status: 404 }
    );
  }

  // Validate test token
  const authHeader = request.headers.get('authorization');
  const authResult = validateTestToken(authHeader);

  if (!authResult.isValidTestToken) {
    return NextResponse.json(
      { error: 'Invalid test token' },
      { status: 401 }
    );
  }

  try {
    const blocked = await applyRateLimit(request, 'test-render', 5);
    if (blocked) return blocked;

    const body = await request.json();
    const { projectId, slides } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Prepare minimal slides for test
    interface SlideInput {
      id?: string;
      elements?: SlideElement[];
      content?: string;
      title?: string;
      duration?: number;
    }
    const testSlides: Slide[] = slides?.length > 0 
      ? slides.map((s: SlideInput, index: number) => ({
          id: s.id || `test-slide-${index}`,
          number: index + 1,
          order_index: index,
          elements: (s.elements || []) as SlideElement[],
          content: s.content || 'Test slide content',
          title: s.title || `Test Slide ${index + 1}`,
          duration: s.duration || 3,
          visualSettings: {}
        }))
      : [
          {
            id: 'default-test-slide-1',
            number: 1,
            order_index: 0,
            elements: [],
            content: 'Default test content',
            title: 'Default Test Slide',
            duration: 3,
            visualSettings: {}
          }
        ];

    logger.info('[Test Render] Starting render', {
      component: 'API: test/render',
      projectId,
      slidesCount: testSlides.length,
      harnessMode: isHarnessMode()
    });

    // Create worker (harness if RENDER_HARNESS=true)
    const worker = createVideoRenderWorker();

    // For E2E tests, we run synchronously to get result
    try {
      const result = await RenderService.renderVideo(
        projectId,
        testSlides,
        E2E_TEST_USER.id,
        worker
      );

      return NextResponse.json({
        success: true,
        status: 'completed',
        jobId: projectId,
        videoUrl: result.videoUrl || 'https://mock-storage.com/test.mp4',
        harnessMode: isHarnessMode()
      });
    } catch (renderError) {
      logger.error('[Test Render] Render failed', renderError as Error);
      
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: renderError instanceof Error ? renderError.message : 'Unknown error',
        harnessMode: isHarnessMode()
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('[Test Render] Error', error as Error);
    return NextResponse.json(
      { error: 'Test render failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!isE2ETestMode()) {
    return NextResponse.json(
      { error: 'Test endpoint not available' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    testMode: true,
    harnessMode: isHarnessMode()
  });
}
