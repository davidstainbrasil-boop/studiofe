/**
 * API Route: GET /api/pptx-to-video/status/[jobId]
 *
 * Returns the status of a video generation job.
 * Checks in-memory store first, then falls back to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '../../generate/route';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { success: false, message: 'Job ID não fornecido' },
      { status: 400 }
    );
  }

  // Check in-memory store first (for jobs started in this process)
  const memoryJob = jobStore.get(jobId);
  if (memoryJob) {
    return NextResponse.json({
      success: true,
      ...memoryJob,
    });
  }

  // Fall back to database lookup (for API-queued jobs)
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
          status: job.status,
          stage: job.stage || job.status,
          progress: job.progress || 0,
          message: job.message || '',
          videoUrl: job.video_url,
          subtitlesUrl: job.subtitles_url,
          duration: job.duration,
          fileSize: job.file_size,
          error: job.error,
        });
      }
    }
  } catch {
    // Database unavailable, fall through to 404
  }

  return NextResponse.json(
    { success: false, message: 'Job não encontrado' },
    { status: 404 }
  );
}
