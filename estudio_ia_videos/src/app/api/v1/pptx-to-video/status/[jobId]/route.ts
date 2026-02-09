/**
 * API v1: GET /api/v1/pptx-to-video/status/[jobId]
 *
 * Returns the status of a video generation job (API v1 wrapper).
 * Reuses the same job store and DB lookup logic as the internal endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/app/api/pptx-to-video/generate/route';
import { getServerAuth } from '@lib/auth/unified-session';
import { checkRateLimit } from '@/lib/rate-limit';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimit(`v1-status:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 },
    );
  }

  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'job_id is required' },
      { status: 400 },
    );
  }

  // Check in-memory store
  const memoryJob = jobStore.get(jobId);
  if (memoryJob) {
    return NextResponse.json({
      success: true,
      data: {
        job_id: jobId,
        status: memoryJob.status,
        stage: memoryJob.stage,
        progress: memoryJob.progress,
        message: memoryJob.message,
        video_url: memoryJob.videoUrl,
        subtitles_url: memoryJob.subtitlesUrl,
        duration: memoryJob.duration,
        file_size: memoryJob.fileSize,
        error: memoryJob.error,
      },
    });
  }

  // Fall back to DB
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: job, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!error && job) {
        return NextResponse.json({
          success: true,
          data: {
            job_id: jobId,
            status: job.status,
            stage: job.stage || job.status,
            progress: job.progress || 0,
            message: job.message || '',
            video_url: job.video_url,
            subtitles_url: job.subtitles_url,
            duration: job.duration,
            file_size: job.file_size,
            error: job.error,
          },
        });
      }
    }
  } catch {
    // DB unavailable, fall through
  }

  return NextResponse.json(
    { success: false, error: 'Job not found' },
    { status: 404 },
  );
}
