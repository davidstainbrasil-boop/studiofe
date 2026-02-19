import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';
import { getAuthenticatedUserId } from '@lib/auth/safe-auth';
import { prisma } from '@lib/prisma';
import { getVideoJobStatus, removeVideoJob } from '@lib/queue/render-queue';
import type { JobStatus } from '@prisma/client';

type RouteParams = { params: { jobId: string } }

const EDITOR_ROLES = new Set(['owner', 'editor']);

function queueStateToJobStatus(state: string | undefined): JobStatus | undefined {
  switch (state) {
    case 'waiting':
    case 'delayed':
      return 'queued';
    case 'active':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return undefined;
  }
}

function estimateRemainingTimeSeconds(
  status: JobStatus | undefined,
  progress: number,
  estimatedDuration: number | null | undefined
): number | null {
  if (status !== 'processing' && status !== 'queued' && status !== 'pending') {
    return null;
  }

  if (!estimatedDuration || estimatedDuration <= 0) {
    return null;
  }

  const boundedProgress = Math.max(0, Math.min(100, progress));
  return Math.max(0, Math.round((estimatedDuration * (100 - boundedProgress)) / 100));
}

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

async function canCancelJob(projectId: string | null | undefined, ownerId: string | null | undefined, userId: string) {
  if (ownerId === userId) return true;
  if (!projectId) return false;

  const collaborator = await prisma.project_collaborators.findFirst({
    where: {
      project_id: projectId,
      user_id: userId,
    },
    select: { role: true },
  });

  return Boolean(collaborator?.role && EDITOR_ROLES.has(collaborator.role));
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'video-pipeline-status-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const auth = await getAuthenticatedUserId(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
    }

    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
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
        durationMs: true,
        renderSettings: true,
        settings: true,
        retryCount: true,
        maxRetries: true,
        projects: {
          select: { userId: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      )
    }

    const hasPermission = await canViewJob(job.projectId, job.projects?.userId, auth.userId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const queueJobStatus = await getVideoJobStatus(job.id);
    const queueDerivedStatus = queueStateToJobStatus(queueJobStatus.status);

    const effectiveStatus = job.status || queueDerivedStatus || 'pending';
    const dbProgress = typeof job.progress === 'number' ? job.progress : 0;
    const queueProgress = typeof queueJobStatus.progress === 'number' ? queueJobStatus.progress : 0;
    const progress = Math.max(dbProgress, queueProgress);

    const jobStatus = {
      id: job.id,
      status: effectiveStatus,
      progress,
      createdAt: job.createdAt?.toISOString() || null,
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
      estimated_time_remaining: estimateRemainingTimeSeconds(effectiveStatus, progress, job.estimatedDuration),
      fileUrl: job.outputUrl || null,
      fileSize: null,
      errorMessage: job.errorMessage || queueJobStatus.error || null,
      metadata: {
        durationMs: job.durationMs,
        renderSettings: job.renderSettings,
        settings: job.settings,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        queueStatus: queueJobStatus.status,
        queueAttemptsMade: queueJobStatus.attemptsMade || 0,
      }
    }

    return NextResponse.json({
      success: true,
      job: jobStatus
    })
  } catch (error) {
    logger.error('Job status fetch error', error instanceof Error ? error : new Error(String(error)), { component: 'API: video-pipeline/status/[jobId]' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'video-pipeline-status-delete', 20);
    if (rateLimitBlocked) return rateLimitBlocked;

    const auth = await getAuthenticatedUserId(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
    }

    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required', code: 'JOB_ID_REQUIRED' },
        { status: 400 }
      )
    }

    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        projectId: true,
        status: true,
        projects: {
          select: { userId: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 });
    }

    const hasPermission = await canCancelJob(job.projectId, job.projects?.userId, auth.userId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        message: `Job ${jobId} is already finalized with status '${job.status}'`,
      });
    }

    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        errorMessage: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    const queueRemoved = await removeVideoJob(jobId);

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} cancelled successfully`,
      queueRemoved,
    })
  } catch (error) {
    logger.error('Job cancellation error', error instanceof Error ? error : new Error(String(error)), { component: 'API: video-pipeline/status/[jobId]' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
