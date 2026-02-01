/**
 * 🧪 TEST ENDPOINT: Avatar Render Status (No Auth)
 *
 * This endpoint is ONLY available in development mode and returns mock status
 * for E2E testing purposes. DO NOT USE IN PRODUCTION.
 *
 * Usage:
 *   GET /api/v2/test/avatars/render/status/{jobId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  // 🔒 SECURITY: Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        error: 'Test endpoints are only available in development mode',
        code: 'FORBIDDEN',
      },
      { status: 403 },
    );
  }

  try {
    const { jobId } = params;

    logger.info('🧪 TEST: Status check for job', {
      component: 'API: v2/test/avatars/render/status',
      jobId,
    });

    // Parse job ID to determine tier and creation time
    const jobParts = jobId.split('-');
    const tier = jobParts[1]; // e.g., "placeholder", "standard", "high"
    const timestamp = parseInt(jobParts[2] || '0', 10);
    const elapsedSeconds = timestamp > 0 ? Math.floor((Date.now() - timestamp) / 1000) : 0;

    // PLACEHOLDER jobs are instant (already completed)
    if (tier === 'placeholder') {
      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        provider: 'placeholder',
        creditsUsed: 0,
        elapsedTime: elapsedSeconds,
        result: {
          animationData: {
            frames: [
              { time: 0, blendShapes: { jawOpen: 0.0, mouthClose: 0.3 } },
              { time: 0.033, blendShapes: { jawOpen: 0.4, mouthClose: 0.0 } },
              { time: 0.066, blendShapes: { jawOpen: 0.6, mouthClose: 0.0 } },
            ],
            duration: 0.1,
            fps: 30,
          },
          message: 'PLACEHOLDER rendering completed (test mode)',
        },
      });
    }

    // STANDARD tier (~45s completion time)
    if (tier === 'standard') {
      if (elapsedSeconds < 45) {
        return NextResponse.json({
          success: true,
          jobId,
          status: 'processing',
          provider: 'did',
          creditsUsed: 1,
          elapsedTime: elapsedSeconds,
          estimatedTimeRemaining: Math.max(0, 45 - elapsedSeconds),
          progress: Math.min(100, Math.floor((elapsedSeconds / 45) * 100)),
          message: 'D-ID rendering in progress (test mode)',
        });
      }

      // Job completed
      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        provider: 'did',
        creditsUsed: 1,
        elapsedTime: elapsedSeconds,
        result: {
          videoUrl: `https://example.com/test-videos/${jobId}.mp4`,
          duration: 5.2,
          resolution: '1080p',
          message: 'D-ID rendering completed (test mode - mock URL)',
        },
      });
    }

    // HIGH tier (~120s completion time)
    if (tier === 'high') {
      if (elapsedSeconds < 120) {
        return NextResponse.json({
          success: true,
          jobId,
          status: 'processing',
          provider: 'rpm',
          creditsUsed: 3,
          elapsedTime: elapsedSeconds,
          estimatedTimeRemaining: Math.max(0, 120 - elapsedSeconds),
          progress: Math.min(100, Math.floor((elapsedSeconds / 120) * 100)),
          message: 'Ready Player Me rendering in progress (test mode)',
        });
      }

      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        provider: 'rpm',
        creditsUsed: 3,
        elapsedTime: elapsedSeconds,
        result: {
          videoUrl: `https://example.com/test-videos/${jobId}.mp4`,
          modelUrl: `https://example.com/test-models/${jobId}.glb`,
          duration: 5.2,
          resolution: '4K',
          message: 'Ready Player Me rendering completed (test mode - mock URLs)',
        },
      });
    }

    // HYPERREAL tier (~600s completion time)
    if (tier === 'hyperreal') {
      if (elapsedSeconds < 600) {
        return NextResponse.json({
          success: true,
          jobId,
          status: 'processing',
          provider: 'ue5',
          creditsUsed: 10,
          elapsedTime: elapsedSeconds,
          estimatedTimeRemaining: Math.max(0, 600 - elapsedSeconds),
          progress: Math.min(100, Math.floor((elapsedSeconds / 600) * 100)),
          message: 'Unreal Engine 5 rendering in progress (test mode)',
        });
      }

      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        provider: 'ue5',
        creditsUsed: 10,
        elapsedTime: elapsedSeconds,
        result: {
          videoUrl: `https://example.com/test-videos/${jobId}.mp4`,
          duration: 5.2,
          resolution: '8K',
          rayTracing: true,
          message: 'UE5 hyperreal rendering completed (test mode - mock URL)',
        },
      });
    }

    // Unknown job ID format
    return NextResponse.json(
      {
        success: false,
        error: 'Job not found or invalid job ID format',
        code: 'JOB_NOT_FOUND',
      },
      { status: 404 },
    );
  } catch (error) {
    logger.error('🧪 TEST: Error checking job status', 
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: v2/test/avatars/render/status' }
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}
