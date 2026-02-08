/**
 * API Route: POST /api/avatar/talking-head
 *
 * Generates a talking head video from image + audio
 * Supports: MuseTalk, SadTalker, or fallback providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { getMuseTalkProvider } from '@/lib/avatar/musetalk-provider';
import { getSadTalkerProvider } from '@/lib/avatar/sadtalker-provider';
import { getServerAuth } from '@lib/auth/unified-session';

export const maxDuration = 300; // 5 minutes

interface GenerateRequest {
  sourceImage: string;  // URL of face image
  audioUrl: string;     // URL of audio
  provider?: 'musetalk' | 'sadtalker' | 'auto';
  options?: {
    fps?: number;
    enhanceFace?: boolean;
    stillMode?: boolean;
    expressionScale?: number;
  };
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(request, 'avatar-talking', 5);
    if (blocked) return blocked;

    const body: GenerateRequest = await request.json();
    const { sourceImage, audioUrl, provider = 'auto', options = {} } = body;

    if (!sourceImage || !audioUrl) {
      return NextResponse.json(
        { success: false, error: 'sourceImage and audioUrl are required' },
        { status: 400 }
      );
    }

    logger.info('Talking head generation request', {
      provider,
      hasImage: !!sourceImage,
      hasAudio: !!audioUrl,
    });

    // Select provider
    let result;

    if (provider === 'musetalk' || provider === 'auto') {
      const museTalk = getMuseTalkProvider();
      if (museTalk.isAvailable()) {
        result = await museTalk.generate({
          sourceImage,
          audioUrl,
          fps: options.fps || 25,
          enhanceFace: options.enhanceFace ?? true,
        });

        if (result.success) {
          return NextResponse.json({
            success: true,
            videoUrl: result.videoUrl,
            duration: result.duration,
            provider: 'musetalk',
          });
        }
      }
    }

    // Fallback to SadTalker
    if (provider === 'sadtalker' || provider === 'auto') {
      const sadTalker = getSadTalkerProvider();
      result = await sadTalker.generate({
        sourceImage,
        audioUrl,
        stillMode: options.stillMode ?? false,
        expressionScale: options.expressionScale ?? 1.0,
        enhancer: options.enhanceFace ? 'gfpgan' : null,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          videoUrl: result.videoUrl,
          duration: result.duration,
          provider: 'sadtalker',
        });
      }
    }

    return NextResponse.json(
      { success: false, error: result?.error || 'All providers failed' },
      { status: 500 }
    );
  } catch (error) {
    logger.error('Talking head API error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/avatar/talking-head
 * Returns available providers and their status
 */
export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'avatar-talking-head-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const museTalk = getMuseTalkProvider();
  const sadTalker = getSadTalkerProvider();

  return NextResponse.json({
    providers: [
      museTalk.getProviderInfo(),
      sadTalker.getProviderInfo(),
    ],
    recommended: museTalk.isAvailable() ? 'musetalk' : 'sadtalker',
  });
}
