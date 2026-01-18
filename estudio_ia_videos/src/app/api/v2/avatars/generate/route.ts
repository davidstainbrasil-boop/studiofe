/**
 * API v2: Avatar Generation with Phase 1 + Phase 2 Integration
 * Complete pipeline: Text → Lip-Sync → Animation → Render
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { AvatarLipSyncIntegration } from '@/lib/avatar/avatar-lip-sync-integration';
import { AvatarRenderOrchestrator } from '@/lib/avatar/avatar-render-orchestrator';
import { z } from 'zod';

// Request validation schema
const generateSchema = z.object({
  text: z.string().min(1).max(5000),
  avatarId: z.string().optional(),
  quality: z.enum(['PLACEHOLDER', 'STANDARD', 'HIGH', 'HYPERREAL']).default('STANDARD'),
  emotion: z
    .enum(['neutral', 'happy', 'sad', 'angry', 'surprised', 'fear', 'disgust'])
    .default('neutral'),
  emotionIntensity: z.number().min(0).max(1).default(0.5),
  voice: z.string().optional(),
  enableBlinks: z.boolean().default(true),
  enableBreathing: z.boolean().default(true),
  enableHeadMovement: z.boolean().default(true),
  fps: z.number().min(15).max(60).default(30),
  resolution: z.enum(['480p', '720p', '1080p', '4k']).default('1080p'),
  outputFormat: z.enum(['mp4', 'webm', 'mov']).default('mp4'),
  backgroundColor: z.string().default('#FFFFFF'),
  preview: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    // In test environment, allow x-user-id header for E2E tests
    const testUserId = request.headers.get('x-user-id');
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Allow test user ID in test/CI environments
    const effectiveUser =
      isTestEnv && testUserId ? { id: testUserId, email: `test-${testUserId}@example.com` } : user;

    if (authError || !effectiveUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // 2. Validate request
    const body = await request.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const params = validation.data;

    logger.info('[API: v2/avatars/generate] Starting avatar generation', {
      userId: effectiveUser.id,
      textLength: params.text.length,
      quality: params.quality,
      emotion: params.emotion,
      preview: params.preview,
    });

    // 3. Check user credits
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('credits_available, credits_used, credits_limit')
      .eq('id', effectiveUser.id)
      .single();

    const userCredits = userProfile
      ? {
          available: userProfile.credits_available || 0,
          used: userProfile.credits_used || 0,
          limit: userProfile.credits_limit || 100,
        }
      : {
          available: 10, // Default for new users
          used: 0,
          limit: 100,
        };

    logger.info('[API: v2/avatars/generate] User credits', {
      userId: effectiveUser.id,
      available: userCredits.available,
      used: userCredits.used,
    });

    // 4. Initialize services
    const integration = new AvatarLipSyncIntegration();
    const orchestrator = new AvatarRenderOrchestrator({
      enableFallback: true,
      userId: effectiveUser.id,
    });

    // 5. Generate animation (Phase 1 + Phase 2)
    let animation;

    if (params.preview) {
      // Quick preview mode
      animation = await integration.generatePreview(params.text, {
        emotion: params.emotion,
        emotionIntensity: params.emotionIntensity,
        voice: params.voice,
        enableBlinks: params.enableBlinks,
        enableBreathing: params.enableBreathing,
      });
    } else {
      // Full quality
      animation = await integration.generateAvatarAnimation({
        text: params.text,
        avatarConfig: {
          avatarId: params.avatarId,
          quality: params.quality,
          emotion: params.emotion,
          emotionIntensity: params.emotionIntensity,
          voice: params.voice,
          enableBlinks: params.enableBlinks,
          enableBreathing: params.enableBreathing,
          enableHeadMovement: params.enableHeadMovement,
          fps: params.fps,
        },
      });
    }

    const animationTime = Date.now() - startTime;

    logger.info('[API: v2/avatars/generate] Animation generated', {
      userId: effectiveUser.id,
      frames: animation.frames.length,
      duration: animation.duration,
      provider: animation.metadata.provider,
      cached: animation.metadata.cached,
      processingTime: animationTime,
    });

    // 6. Validate animation
    const validation_result = integration.validateAnimation(animation);

    if (!validation_result.isValid) {
      logger.error('[API: v2/avatars/generate] Animation validation failed', {
        errors: validation_result.errors,
      });

      return NextResponse.json(
        {
          error: 'Animation validation failed',
          details: validation_result.errors,
        },
        { status: 500 },
      );
    }

    // 7. Calculate cost
    const cost = orchestrator.calculateRenderCost(animation.duration, params.quality);

    if (!cost) {
      return NextResponse.json(
        { error: 'Failed to calculate render cost', message: 'Provider not available' },
        { status: 500 },
      );
    }

    logger.info('[API: v2/avatars/generate] Render cost calculated', {
      credits: cost.credits,
      estimatedTime: cost.estimatedTime,
      provider: cost.provider,
    });

    // 8. Check if user has enough credits
    if (userCredits.available < cost.credits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: cost.credits,
          available: userCredits.available,
          message: `Need ${cost.credits} credits, have ${userCredits.available}`,
        },
        { status: 402 },
      );
    }

    // 9. Render video
    const renderResult = await orchestrator.render(
      {
        animation,
        avatarId: params.avatarId,
        resolution: params.resolution,
        outputFormat: params.outputFormat,
        backgroundColor: params.backgroundColor,
      },
      userCredits,
    );

    // 10. Deduct credits (if not PLACEHOLDER)
    if (cost.credits > 0) {
      await supabase
        .from('profiles')
        .update({
          credits_available: userCredits.available - cost.credits,
          credits_used: userCredits.used + cost.credits,
        })
        .eq('id', effectiveUser.id);

      logger.info('[API: v2/avatars/generate] Credits deducted', {
        userId: effectiveUser.id,
        creditsUsed: cost.credits,
        remainingCredits: userCredits.available - cost.credits,
      });
    }

    const totalTime = Date.now() - startTime;

    logger.info('[API: v2/avatars/generate] Generation completed', {
      userId: effectiveUser.id,
      jobId: renderResult.jobId,
      status: renderResult.status,
      totalTime,
    });

    // 11. Return response
    return NextResponse.json({
      success: true,
      data: {
        jobId: renderResult.jobId,
        status: renderResult.status,
        animation: {
          frames: animation.frames.length,
          duration: animation.duration,
          fps: animation.fps,
          provider: animation.metadata.provider,
          cached: animation.metadata.cached,
        },
        render: {
          quality: params.quality,
          resolution: params.resolution,
          provider: renderResult.metadata?.provider,
          creditsUsed: cost.credits,
          estimatedTime: cost.estimatedTime,
        },
        credits: {
          used: cost.credits,
          remaining: userCredits.available - cost.credits,
          limit: userCredits.limit,
        },
        output: {
          statusUrl: `/api/v2/avatars/status/${renderResult.jobId}`,
          videoUrl: renderResult.videoUrl,
        },
        metadata: {
          processingTime: {
            animation: animationTime,
            total: totalTime,
          },
          validation: {
            isValid: validation_result.isValid,
            warnings: validation_result.warnings,
          },
        },
      },
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('[API: v2/avatars/generate] Generation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalTime,
    });

    return NextResponse.json(
      {
        error: 'Avatar generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

// GET: List user's generations
export async function GET(request: NextRequest) {
  try {
    // In test environment, allow x-user-id header for E2E tests
    const testUserId = request.headers.get('x-user-id');
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Allow test user ID in test/CI environments
    const effectiveUser =
      isTestEnv && testUserId ? { id: testUserId, email: `test-${testUserId}@example.com` } : user;

    if (authError || !effectiveUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    // Query render jobs
    let query = supabase
      .from('render_jobs')
      .select('*', { count: 'exact' })
      .eq('userId', effectiveUser.id)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error: jobsError, count } = await query;

    if (jobsError) {
      throw jobsError;
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
      },
    });
  } catch (error) {
    logger.error('[API: v2/avatars/generate] List failed', error as Error);

    return NextResponse.json(
      {
        error: 'Failed to list generations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
