/**
 * 🧪 TEST ENDPOINT: Avatar Render (No Auth)
 *
 * This endpoint is ONLY available in development mode and bypasses authentication
 * for E2E testing purposes. DO NOT USE IN PRODUCTION.
 *
 * Usage:
 *   POST /api/v2/test/avatars/render
 *   {
 *     "text": "Hello world",
 *     "quality": "PLACEHOLDER",  // PLACEHOLDER | STANDARD | HIGH
 *     "emotion": "neutral",      // neutral | happy | sad | angry | surprised
 *     "fps": 30
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
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
    const blocked = await applyRateLimit(request, 'test-avatars', 5);
    if (blocked) return blocked;

    const body = await request.json();
    const { text, quality = 'PLACEHOLDER', emotion = 'neutral', fps = 30 } = body;

    logger.info('🧪 TEST: Avatar render request', {
      component: 'API: v2/test/avatars/render',
      text: text?.substring(0, 50),
      quality,
      emotion,
      fps,
    });

    // Validate required fields
    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Text is required',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 },
      );
    }

    // Validate quality tier
    const validQualities = ['PLACEHOLDER', 'STANDARD', 'HIGH', 'HYPERREAL'];
    if (!validQualities.includes(quality)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid quality tier. Must be one of: ${validQualities.join(', ')}`,
          code: 'INVALID_QUALITY_TIER',
        },
        { status: 400 },
      );
    }

    // For PLACEHOLDER tier: Return immediate mock response
    if (quality === 'PLACEHOLDER') {
      const jobId = `test-placeholder-${Date.now()}`;

      logger.info('🧪 TEST: PLACEHOLDER tier - returning immediate response', {
        component: 'API: v2/test/avatars/render',
        jobId,
      });

      return NextResponse.json(
        {
          success: true,
          jobId,
          status: 'completed',
          provider: 'placeholder',
          creditsUsed: 0,
          estimatedTime: 0,
          result: {
            animationData: {
              frames: generateMockBlendShapeFrames(text, fps),
              duration: Math.ceil(text.length * 0.1), // ~0.1s per character
              fps,
            },
            blendShapes: generateMockBlendShapeWeights(emotion),
          },
          message: 'PLACEHOLDER rendering completed instantly (test mode)',
        },
        { status: 200 },
      );
    }

    // For STANDARD/HIGH/HYPERREAL tiers: Return job ID with pending status
    const jobId = `test-${quality.toLowerCase()}-${Date.now()}`;
    const estimatedTimes = {
      STANDARD: 45,
      HIGH: 120,
      HYPERREAL: 600,
    };
    const credits = {
      STANDARD: 1,
      HIGH: 3,
      HYPERREAL: 10,
    };

    logger.info(`🧪 TEST: ${quality} tier - creating mock job`, {
      component: 'API: v2/test/avatars/render',
      jobId,
      estimatedTime: estimatedTimes[quality as keyof typeof estimatedTimes],
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        status: 'processing',
        provider: quality === 'STANDARD' ? 'did' : quality === 'HIGH' ? 'rpm' : 'ue5',
        creditsUsed: credits[quality as keyof typeof credits] || 0,
        estimatedTime: estimatedTimes[quality as keyof typeof estimatedTimes] || 60,
        message: `${quality} rendering queued (test mode - mock job)`,
      },
      { status: 202 },
    );
  } catch (error) {
    logger.error('🧪 TEST: Error processing avatar render request', 
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: v2/test/avatars/render' }
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

/**
 * Generate mock blend shape frames for testing
 */
function generateMockBlendShapeFrames(
  text: string,
  fps: number,
): Array<{
  time: number;
  blendShapes: Record<string, number>;
}> {
  const duration = Math.ceil(text.length * 0.1); // ~0.1s per character
  const totalFrames = Math.ceil(duration * fps);
  const frames = [];

  for (let i = 0; i < totalFrames; i++) {
    const time = i / fps;

    // Simulate mouth movement based on frame position
    const mouthOpenAmount = Math.sin((i / totalFrames) * Math.PI * 4) * 0.5 + 0.5;

    frames.push({
      time,
      blendShapes: {
        jawOpen: mouthOpenAmount * 0.6,
        mouthClose: (1 - mouthOpenAmount) * 0.3,
        mouthPucker: Math.random() * 0.2,
        eyeBlinkLeft: i % 90 === 0 ? 1.0 : 0.0, // Blink every ~3 seconds at 30fps
        eyeBlinkRight: i % 90 === 0 ? 1.0 : 0.0,
      },
    });
  }

  return frames;
}

/**
 * Generate mock blend shape weights with emotion overlay
 */
function generateMockBlendShapeWeights(emotion: string): Record<string, number> {
  const baseWeights: Record<string, number> = {
    jawOpen: 0.0,
    mouthClose: 0.0,
    mouthPucker: 0.0,
    eyeBlinkLeft: 0.0,
    eyeBlinkRight: 0.0,
  };

  // Add emotion overlay
  switch (emotion) {
    case 'happy':
      baseWeights.mouthSmileLeft = 0.7;
      baseWeights.mouthSmileRight = 0.7;
      baseWeights.cheekPuff = 0.3;
      break;
    case 'sad':
      baseWeights.mouthFrownLeft = 0.6;
      baseWeights.mouthFrownRight = 0.6;
      baseWeights.browDownLeft = 0.5;
      baseWeights.browDownRight = 0.5;
      break;
    case 'angry':
      baseWeights.browDownLeft = 0.8;
      baseWeights.browDownRight = 0.8;
      baseWeights.jawForward = 0.4;
      break;
    case 'surprised':
      baseWeights.browInnerUp = 0.9;
      baseWeights.eyeWideLeft = 0.8;
      baseWeights.eyeWideRight = 0.8;
      baseWeights.jawOpen = 0.6;
      break;
    default:
      // neutral - no changes to base weights
      break;
  }

  return baseWeights;
}

/**
 * GET method to check endpoint status
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        error: 'Test endpoints are only available in development mode',
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    success: true,
    endpoint: '/api/v2/test/avatars/render',
    mode: 'TEST (Development Only)',
    message: 'This endpoint bypasses authentication for E2E testing',
    usage: {
      method: 'POST',
      body: {
        text: 'string (required)',
        quality: 'PLACEHOLDER | STANDARD | HIGH | HYPERREAL (default: PLACEHOLDER)',
        emotion: 'neutral | happy | sad | angry | surprised (default: neutral)',
        fps: 'number (default: 30)',
      },
    },
    note: 'PLACEHOLDER tier returns immediate results, other tiers return job IDs',
  });
}
