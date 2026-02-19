/**
 * GET/POST /api/video-pipeline
 * Real video pipeline endpoint (job creation + queue enqueue)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@lib/auth/safe-auth';
import { prisma } from '@lib/prisma';
import { addVideoJob, isQueueAvailable } from '@lib/queue/render-queue';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

const CreatePipelineJobSchema = z.object({
  project_id: z.string().uuid(),
  preset_id: z.string().optional(),
  webhook_url: z.string().url().optional(),
});

function canEditRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

async function validateProjectWriteAccess(projectId: string, userId: string) {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project) {
    return { allowed: false, reason: 'PROJECT_NOT_FOUND' as const };
  }

  if (project.userId === userId) {
    return { allowed: true, ownerId: project.userId };
  }

  const collaborator = await prisma.project_collaborators.findFirst({
    where: {
      project_id: projectId,
      user_id: userId,
    },
    select: { role: true },
  });

  if (canEditRole(collaborator?.role)) {
    return { allowed: true, ownerId: project.userId };
  }

  return { allowed: false, reason: 'FORBIDDEN' as const };
}

export async function GET(req: NextRequest) {
  const rateLimitBlocked = await applyRateLimit(req, 'video-pipeline-get', 60);
  if (rateLimitBlocked) return rateLimitBlocked;

  const queueAvailable = isQueueAvailable();

  return NextResponse.json({
    success: true,
    message: 'Video pipeline endpoint online',
    endpoint: '/api/video-pipeline',
    methods: ['GET', 'POST'],
    timestamp: new Date().toISOString(),
    status: queueAvailable ? 'operational' : 'degraded',
    queue: {
      available: queueAvailable,
    },
  });
}

export async function POST(req: NextRequest) {
  const rateLimitBlocked = await applyRateLimit(req, 'video-pipeline-post', 20);
  if (rateLimitBlocked) return rateLimitBlocked;

  const auth = await getAuthenticatedUserId(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
  }

  try {
    const payload = CreatePipelineJobSchema.parse(await req.json());
    const access = await validateProjectWriteAccess(payload.project_id, auth.userId);

    if (!access.allowed) {
      if (access.reason === 'PROJECT_NOT_FOUND') {
        return NextResponse.json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
    }

    const activeJob = await prisma.render_jobs.findFirst({
      where: {
        projectId: payload.project_id,
        status: { in: ['pending', 'queued', 'processing'] },
      },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeJob) {
      return NextResponse.json(
        {
          error: 'An active render job already exists for this project',
          code: 'ACTIVE_RENDER_EXISTS',
          job_id: activeJob.id,
          status: activeJob.status,
        },
        { status: 409 }
      );
    }

    const createdJob = await prisma.render_jobs.create({
      data: {
        projectId: payload.project_id,
        userId: access.ownerId || auth.userId,
        status: 'queued',
        progress: 0,
        settings: {
          preset_id: payload.preset_id || 'default',
          source: 'api/video-pipeline',
        },
      },
      select: {
        id: true,
        projectId: true,
        status: true,
        createdAt: true,
      },
    });

    try {
      await addVideoJob({
        jobId: createdJob.id,
        projectId: payload.project_id,
        userId: access.ownerId || auth.userId,
        settings: {
          resolution: '1080p',
          fps: 30,
          quality: 'high',
          format: 'mp4',
          includeAudio: true,
          includeSubtitles: false,
        },
        webhookUrl: payload.webhook_url,
      });
    } catch (queueError) {
      await prisma.render_jobs.update({
        where: { id: createdJob.id },
        data: {
          status: 'failed',
          errorMessage: 'QUEUE_UNAVAILABLE',
          completedAt: new Date(),
        },
      });

      logger.error(
        'Error enqueuing render job on video-pipeline route',
        queueError instanceof Error ? queueError : new Error(String(queueError)),
        { component: 'API: video-pipeline' }
      );

      return NextResponse.json(
        {
          error: 'Failed to enqueue render job',
          code: 'QUEUE_UNAVAILABLE',
          job_id: createdJob.id,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      job_id: createdJob.id,
      status: createdJob.status,
      project_id: createdJob.projectId,
      message: 'Video pipeline render job created successfully',
      created_at: createdJob.createdAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', code: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    logger.error(
      'Pipeline error',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: video-pipeline' }
    );
    return NextResponse.json(
      { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
