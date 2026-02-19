/**
 * API para criar/verificar status de render (real)
 * POST /api/render/status
 * GET /api/render/status?jobId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@lib/prisma';
import { addVideoJob, getVideoJobStatus } from '@lib/queue/render-queue';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { getAuthenticatedUserId } from '@lib/auth/safe-auth';

const CreateRenderStatusSchema = z.object({
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

export async function POST(req: NextRequest) {
  const blocked = await applyRateLimit(req, 'render-status-post', 20);
  if (blocked) return blocked;

  const auth = await getAuthenticatedUserId(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
  }

  try {
    const body = CreateRenderStatusSchema.parse(await req.json());

    const access = await validateProjectWriteAccess(body.project_id, auth.userId);
    if (!access.allowed) {
      if (access.reason === 'PROJECT_NOT_FOUND') {
        return NextResponse.json({ error: 'Projeto não encontrado', code: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Sem permissão para renderizar', code: 'FORBIDDEN' }, { status: 403 });
    }

    const activeJob = await prisma.render_jobs.findFirst({
      where: {
        projectId: body.project_id,
        status: { in: ['pending', 'queued', 'processing'] },
      },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Já existe um render ativo para este projeto',
          code: 'ACTIVE_RENDER_EXISTS',
          job_id: activeJob.id,
          status: activeJob.status,
        },
        { status: 409 }
      );
    }

    const createdJob = await prisma.render_jobs.create({
      data: {
        projectId: body.project_id,
        userId: auth.userId,
        status: 'queued',
        progress: 0,
        settings: {
          preset_id: body.preset_id || 'default',
          source: 'api/render/status',
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
        projectId: body.project_id,
        userId: access.ownerId || auth.userId,
        settings: {
          resolution: '1080p',
          fps: 30,
          quality: 'high',
          format: 'mp4',
          includeAudio: true,
          includeSubtitles: false,
        },
        webhookUrl: body.webhook_url,
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

      logger.error('Falha ao enfileirar job via /api/render/status', queueError instanceof Error ? queueError : new Error(String(queueError)), {
        component: 'API: render/status',
        projectId: body.project_id,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Fila de render indisponível',
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
      createdAt: createdJob.createdAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Payload inválido', code: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Erro ao criar job em /api/render/status', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: render/status',
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const blocked = await applyRateLimit(req, 'render-status-get', 60);
  if (blocked) return blocked;

  const auth = await getAuthenticatedUserId(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId obrigatório' },
        { status: 400 }
      );
    }

    const renderJob = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        projectId: true,
        status: true,
        progress: true,
        outputUrl: true,
        errorMessage: true,
        renderSettings: true,
        settings: true,
        estimatedDuration: true,
        createdAt: true,
        completedAt: true,
        projects: {
          select: { userId: true },
        },
      },
    });

    if (!renderJob) {
      return NextResponse.json(
        { error: 'Job não encontrado', status: 'not_found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      );
    }

    const allowed = await canViewJob(renderJob.projectId, renderJob.projects?.userId, auth.userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const queueStatus = await getVideoJobStatus(jobId);
    const mappedQueueStatus =
      queueStatus.status === 'active'
        ? 'processing'
        : queueStatus.status === 'waiting' || queueStatus.status === 'delayed'
          ? 'queued'
          : queueStatus.status === 'completed' || queueStatus.status === 'failed'
            ? queueStatus.status
            : null;

    const status = renderJob.status || mappedQueueStatus || 'pending';
    const progress = Math.max(
      renderJob.progress || 0,
      typeof queueStatus.progress === 'number' ? queueStatus.progress : 0
    );

    return NextResponse.json({
      success: true,
      jobId,
      status,
      progress,
      outputUrl: renderJob.outputUrl,
      error: renderJob.errorMessage || queueStatus.error || undefined,
      config: renderJob.renderSettings || renderJob.settings,
      estimatedTime: renderJob.estimatedDuration,
      createdAt: renderJob.createdAt?.toISOString(),
      completedAt: renderJob.completedAt?.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[API] Erro ao verificar status', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: render/status',
    });
    return NextResponse.json(
      {
        error: 'Erro ao verificar status',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
