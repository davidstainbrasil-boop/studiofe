/**
 * API Render Status - Verificar status de um job de renderização
 * GET /api/render/status/{jobId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { getAuthenticatedUserId } from '@lib/auth/safe-auth';
import { prisma } from '@lib/prisma';
import { getVideoJobStatus } from '@lib/queue/render-queue';

async function canViewJob(projectId: string | null | undefined, ownerId: string | null | undefined, userId: string) {
  if (ownerId === userId) return true;
  if (!projectId) return false;

  const collaborator = await prisma.project_collaborators.findFirst({
    where: {
      project_id: projectId,
      user_id: userId,
    },
    select: { id: true },
  });

  return Boolean(collaborator);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const rateLimitBlocked = await applyRateLimit(request, 'render-status-jobid-get', 60);
  if (rateLimitBlocked) return rateLimitBlocked;

  const auth = await getAuthenticatedUserId(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
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

    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        projectId: true,
        status: true,
        progress: true,
        outputUrl: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        estimatedDuration: true,
        renderSettings: true,
        settings: true,
        projects: {
          select: { userId: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Render job not found',
        code: 'JOB_NOT_FOUND',
      }, { status: 404 });
    }

    const allowed = await canViewJob(job.projectId, job.projects?.userId, auth.userId);
    if (!allowed) {
      return NextResponse.json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    const queueStatus = await getVideoJobStatus(job.id);
    const mappedQueueStatus =
      queueStatus.status === 'active'
        ? 'processing'
        : queueStatus.status === 'waiting' || queueStatus.status === 'delayed'
          ? 'queued'
          : queueStatus.status === 'completed' || queueStatus.status === 'failed'
            ? queueStatus.status
            : null;

    const status = job.status || mappedQueueStatus || 'pending';
    const progress = Math.max(
      job.progress ?? 0,
      typeof queueStatus.progress === 'number' ? queueStatus.progress : 0
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status,
      progress,
      videoUrl: job.outputUrl || undefined,
      error: job.errorMessage || queueStatus.error || undefined,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      estimatedDuration: job.estimatedDuration || undefined,
      config: job.renderSettings || job.settings || undefined,
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
