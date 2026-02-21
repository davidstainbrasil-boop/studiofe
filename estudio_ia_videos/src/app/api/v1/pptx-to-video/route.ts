/**
 * API v1: POST /api/v1/pptx-to-video
 *
 * Public API endpoint for PPTX to Video conversion
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAPIKey, APIKey } from '@/lib/api/api-key-middleware';
import { withRateLimit } from '@/lib/api/rate-limiter';
import { getUsageTracker } from '@/lib/api/usage-tracker';
import { PPTXProcessorReal } from '@/lib/pptx/pptx-processor-real';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { getServerAuth } from '@lib/auth/unified-session';
import { getAppOrigin } from '@/lib/config/app-url';

export const maxDuration = 300;

interface CreateJobRequest {
  pptx_file?: string; // Base64 encoded file
  pptx_url?: string; // URL to PPTX file
  avatar_id?: string;
  voice_id: string;
  voice_provider?: 'elevenlabs' | 'azure' | 'edge' | 'google';
  music_id?: string;
  music_volume?: number;
  subtitles?: boolean;
  subtitle_style?: 'default' | 'netflix' | 'minimal' | 'bold';
  quality?: '720p' | '1080p' | '4k';
  webhook_url?: string;
}

interface JobResponse {
  success: boolean;
  job_id?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  webhook_url?: string;
  message?: string;
  error?: string;
}

async function handleRequest(request: NextRequest, apiKey: APIKey): Promise<NextResponse> {
  const tracker = getUsageTracker();
  const startTime = Date.now();

  try {
    // Parse request body or multipart form
    let body: CreateJobRequest;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('pptx_file') as File | null;

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        body = {
          pptx_file: Buffer.from(arrayBuffer).toString('base64'),
          voice_id: formData.get('voice_id') as string,
          voice_provider: formData.get('voice_provider') as CreateJobRequest['voice_provider'],
          avatar_id: formData.get('avatar_id') as string | undefined,
          music_id: formData.get('music_id') as string | undefined,
          music_volume: formData.get('music_volume')
            ? parseInt(formData.get('music_volume') as string)
            : undefined,
          subtitles: formData.get('subtitles') === 'true',
          subtitle_style: formData.get('subtitle_style') as CreateJobRequest['subtitle_style'],
          quality: formData.get('quality') as CreateJobRequest['quality'],
          webhook_url: formData.get('webhook_url') as string | undefined,
        };
      } else {
        return NextResponse.json(
          { success: false, error: 'No PPTX file provided' },
          { status: 400 }
        );
      }
    } else {
      body = await request.json();
    }

    // Validate required fields
    if (!body.voice_id) {
      return NextResponse.json(
        { success: false, error: 'voice_id is required' },
        { status: 400 }
      );
    }

    if (!body.pptx_file && !body.pptx_url) {
      return NextResponse.json(
        { success: false, error: 'Either pptx_file or pptx_url is required' },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = randomUUID();
    const projectId = `api-${jobId}`;

    logger.info('API v1: Creating PPTX to Video job', {
      jobId,
      apiKeyId: apiKey.id,
      hasFile: !!body.pptx_file,
      hasUrl: !!body.pptx_url,
      component: 'api-v1-pptx-to-video',
    });

    // Get PPTX buffer
    let pptxBuffer: Buffer;

    if (body.pptx_file) {
      pptxBuffer = Buffer.from(body.pptx_file, 'base64');
    } else if (body.pptx_url) {
      const response = await fetch(body.pptx_url);
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch PPTX from URL' },
          { status: 400 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      pptxBuffer = Buffer.from(arrayBuffer);
    } else {
      return NextResponse.json(
        { success: false, error: 'No PPTX source provided' },
        { status: 400 }
      );
    }

    // Extract slides (synchronously for now, queue in production)
    const extractResult = await PPTXProcessorReal.extract(pptxBuffer, projectId);

    if (!extractResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract PPTX slides' },
        { status: 400 }
      );
    }

    // Store job in database and queue for background processing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from('video_jobs').insert({
        id: jobId,
        project_id: projectId,
        api_key_id: apiKey.id,
        user_id: apiKey.userId,
        status: 'queued',
        stage: 'queued',
        progress: 0,
        message: 'Job queued for processing',
        settings: {
          voice_id: body.voice_id,
          voice_provider: body.voice_provider || 'edge',
          avatar_id: body.avatar_id,
          music_id: body.music_id,
          music_volume: body.music_volume ?? 20,
          subtitles: body.subtitles ?? false,
          subtitle_style: body.subtitle_style || 'default',
          quality: body.quality || '1080p',
        },
        slides: extractResult.slides,
        webhook_url: body.webhook_url,
      });
    }

    // Queue the actual video generation via the internal generate endpoint
    // This runs asynchronously - client polls status endpoint
    const internalBaseUrl = getAppOrigin();
    fetch(`${internalBaseUrl}/api/pptx-to-video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        jobId,
        slides: extractResult.slides.map((slide: { id?: string; slideNumber?: number; title?: string; content?: string; notes?: string; images?: string[] }, i: number) => ({
          id: slide.id || `slide-${i + 1}`,
          slideNumber: slide.slideNumber || i + 1,
          title: slide.title || `Slide ${i + 1}`,
          content: slide.content || '',
          notes: slide.notes || slide.content || '',
          imageUrl: slide.images?.[0],
          duration: 5,
        })),
        settings: {
          voiceId: body.voice_id,
          voiceProvider: body.voice_provider || 'edge',
          avatarId: body.avatar_id,
          musicId: body.music_id,
          musicVolume: body.music_volume ?? 20,
          subtitlesEnabled: body.subtitles ?? false,
          subtitleStyle: body.subtitle_style || 'default',
          quality: body.quality || '1080p',
        },
      }),
    }).catch((err) => {
      logger.error('Failed to trigger generate endpoint', err instanceof Error ? err : new Error(String(err)), {
        jobId,
        component: 'api-v1-pptx-to-video',
      });
    });

    const response: JobResponse = {
      success: true,
      job_id: jobId,
      status: 'queued',
      webhook_url: body.webhook_url,
      message: `Job queued successfully. Poll /api/v1/pptx-to-video/status/${jobId} for status.`,
    };

    // Track usage
    tracker.track({
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      endpoint: '/api/v1/pptx-to-video',
      method: 'POST',
      status: 200,
      duration: Date.now() - startTime,
      metadata: {
        jobId,
        slideCount: extractResult.slides.length,
      },
    });

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    logger.error('API v1 error', error instanceof Error ? error : new Error(String(error)), {
      component: 'api-v1-pptx-to-video',
    });

    tracker.track({
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      endpoint: '/api/v1/pptx-to-video',
      method: 'POST',
      status: 500,
      duration: Date.now() - startTime,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  return withRateLimit(
    request,
    (req) => withAPIKey(req, handleRequest),
    { maxRequests: 10, windowMs: 60000 } // 10 requests per minute for generation
  );
}
