/**
 * API: Convert PPTX to Scenes
 * POST /api/studio/convert-pptx
 *
 * Converte arquivo PPTX em Scene records com progress streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPPTXConverter, ConversionProgress } from '@lib/studio/pptx-to-scenes-converter';
import { logger } from '@lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// ============================================================================
// POST - Convert PPTX to Scenes
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string;
    const avatarId = formData.get('avatarId') as string | null;
    const avatarProvider = formData.get('avatarProvider') as string | null;
    const voiceId = formData.get('voiceId') as string | null;
    const generateSubtitles = formData.get('generateSubtitles') === 'true';
    const autoTransitions = formData.get('autoTransitions') === 'true';
    const musicUrl = formData.get('musicUrl') as string | null;
    const defaultDuration = parseInt((formData.get('defaultDuration') as string) || '5000');

    // Validate
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No projectId provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.pptx') && !file.type.includes('presentationml')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PPTX files are supported.' },
        { status: 400 },
      );
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
    }

    logger.info('Converting PPTX to scenes', {
      component: 'ConvertPPTXAPI',
      fileName: file.name,
      fileSize: file.size,
      projectId,
      userId: session.user.id,
    });

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Progress tracking (for SSE in future)
    const progressHistory: ConversionProgress[] = [];

    // Convert
    const converter = getPPTXConverter();
    const result = await converter.convertBuffer(buffer, {
      projectId,
      defaultDuration,
      avatarId: avatarId || undefined,
      avatarProvider: (avatarProvider as 'did' | 'heygen' | 'rpm') || undefined,
      voiceId: voiceId || undefined,
      generateSubtitles,
      autoTransitions,
      musicUrl: musicUrl || undefined,
      onProgress: (progress) => {
        progressHistory.push(progress);
        logger.info('Conversion progress', {
          component: 'ConvertPPTXAPI',
          ...progress,
        });
      },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Conversion failed',
          details: result.errors,
          progress: progressHistory,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      scenesCreated: result.scenesCreated,
      scenes: result.scenes,
      errors: result.errors,
      progress: progressHistory,
    });
  } catch (error) {
    logger.error(
      'PPTX conversion error',
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Conversion Status (for future SSE implementation)
// ============================================================================

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'studio-convert-pptx-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'No jobId provided' }, { status: 400 });
  }

  // TODO: Implement job status tracking
  return NextResponse.json({
    jobId,
    status: 'not_implemented',
    message: 'SSE progress tracking coming soon',
  });
}
