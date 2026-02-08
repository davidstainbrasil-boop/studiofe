/**
 * API Render Status - Verificar status de um job de renderização
 * GET /api/render/status/{jobId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
    const rateLimitBlocked = await applyRateLimit(request, 'render-status-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'jobId is required',
        code: 'MISSING_JOB_ID',
      }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from('render_jobs')
      .select('id, status, progress, output_url, error_message, created_at, started_at, completed_at, render_settings')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({
        success: false,
        error: 'Render job not found',
        code: 'JOB_NOT_FOUND',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress ?? 0,
      videoUrl: job.output_url || undefined,
      error: job.error_message || undefined,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    });
  } catch (error) {
    logger.error('Failed to fetch render status', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: render/status/[jobId]',
    });
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'RENDER_STATUS_ERROR',
      details: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : 'Unknown error')
        : undefined,
    }, { status: 500 });
  }
}

