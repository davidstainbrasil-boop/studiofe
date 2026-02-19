import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@lib/auth/safe-auth';
import { prisma } from '@lib/prisma';
import { addVideoJob, getVideoJobStatus } from '@lib/queue/render-queue';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@lib/logger';

const RenderRequestSchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(['mp4', 'mov', 'webm']).optional().default('mp4'),
  quality: z.enum(['low', 'medium', 'high']).optional().default('high'),
  resolution: z.number().int().positive().optional().default(1080),
  fps: z.number().int().positive().optional().default(30),
  bitrate: z.number().int().positive().optional().default(8000),
  audioQuality: z.number().int().positive().optional().default(192),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  webhookUrl: z.string().url().optional(),
  customSettings: z
    .object({
      videoCodec: z.string().optional(),
      audioCodec: z.string().optional(),
      audioChannels: z.string().optional(),
      sampleRate: z.number().int().positive().optional(),
    })
    .optional(),
});

const QuerySchema = z.object({
  jobId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function resolutionToPreset(value: number): '720p' | '1080p' | '4k' {
  if (value >= 2160) return '4k';
  if (value >= 1080) return '1080p';
  return '720p';
}

function queueStateToStatus(value: string | undefined): 'queued' | 'processing' | 'completed' | 'failed' | null {
  switch (value) {
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
      return null;
  }
}

function canEditRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

async function validateProjectAccess(projectId: string, userId: string) {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project) {
    return { allowed: false, reason: 'PROJECT_NOT_FOUND' as const };
  }

  if (project.userId === userId) {
    return { allowed: true, projectOwnerId: project.userId };
  }

  const collaborator = await prisma.project_collaborators.findFirst({
    where: {
      project_id: projectId,
      user_id: userId,
    },
    select: { role: true },
  });

  if (canEditRole(collaborator?.role)) {
    return { allowed: true, projectOwnerId: project.userId };
  }

  return { allowed: false, reason: 'FORBIDDEN' as const };
}

export async function POST(request: NextRequest) {
  const blocked = await applyRateLimit(request, 'v1-pipeline-render', 5);
  if (blocked) return blocked;

  const auth = await getAuthenticatedUserId(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
  }

  try {
    const body = RenderRequestSchema.parse(await request.json());
    const access = await validateProjectAccess(body.projectId, auth.userId);

    if (!access.allowed) {
      if (access.reason === 'PROJECT_NOT_FOUND') {
        return NextResponse.json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
    }

    const activeJob = await prisma.render_jobs.findFirst({
      where: {
        projectId: body.projectId,
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
          activeJobId: activeJob.id,
          activeStatus: activeJob.status,
        },
        { status: 409 }
      );
    }

    const renderSettings = {
      format: body.format,
      quality: body.quality,
      resolution: body.resolution,
      fps: body.fps,
      bitrate: body.bitrate,
      audioQuality: body.audioQuality,
      customSettings: body.customSettings || {},
    };

    const estimatedDuration = Math.max(60, Math.round((body.resolution / 720) * 300));

    const createdJob = await prisma.render_jobs.create({
      data: {
        projectId: body.projectId,
        userId: access.projectOwnerId || auth.userId,
        status: 'queued',
        progress: 0,
        renderSettings,
        estimatedDuration,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        projectId: true,
      },
    });

    try {
      await addVideoJob({
        jobId: createdJob.id,
        projectId: body.projectId,
        userId: access.projectOwnerId || auth.userId,
        settings: {
          resolution: resolutionToPreset(body.resolution),
          fps: body.fps,
          quality: body.quality,
          format: body.format,
          includeAudio: true,
          includeSubtitles: false,
        },
        webhookUrl: body.webhookUrl,
        priority: body.priority === 'high' ? 1 : body.priority === 'normal' ? 5 : 10,
      });
    } catch (queueError) {
      await prisma.render_jobs.update({
        where: { id: createdJob.id },
        data: {
          status: 'failed',
          errorMessage: 'Failed to enqueue render job',
          completedAt: new Date(),
        },
      });

      logger.error(
        'Failed to enqueue v1 render job',
        queueError instanceof Error ? queueError : new Error(String(queueError)),
        { component: 'API: v1/video-pipeline/render' }
      );

      return NextResponse.json(
        {
          error: 'Render queue unavailable',
          code: 'QUEUE_UNAVAILABLE',
          jobId: createdJob.id,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: createdJob.id,
      status: createdJob.status,
      estimatedTime: estimatedDuration,
      progress: 0,
      parameters: {
        format: body.format,
        quality: body.quality,
        resolution: `${Math.round(body.resolution * (16 / 9))}x${body.resolution}`,
        fps: body.fps,
        bitrate: `${body.bitrate}kbps`,
        audioQuality: `${body.audioQuality}kbps`,
      },
      metadata: {
        projectId: body.projectId,
        startTime: createdJob.createdAt?.toISOString() || new Date().toISOString(),
        codec: body.customSettings?.videoCodec || 'h264',
        audioCodec: body.customSettings?.audioCodec || 'aac',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid render payload', code: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    logger.error(
      'Failed to create v1 render job',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: v1/video-pipeline/render' }
    );

    return NextResponse.json(
      { error: 'Falha na renderização de vídeo', code: 'RENDER_CREATE_FAILED' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const blocked = await applyRateLimit(request, 'v1-pipeline-render-get', 60);
  if (blocked) return blocked;

  const auth = await getAuthenticatedUserId(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error, code: 'AUTH_REQUIRED' }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    if (query.jobId) {
      const job = await prisma.render_jobs.findUnique({
        where: { id: query.jobId },
        select: {
          id: true,
          status: true,
          progress: true,
          projectId: true,
          outputUrl: true,
          errorMessage: true,
          createdAt: true,
          estimatedDuration: true,
          projects: { select: { userId: true } },
        },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 });
      }

      const canRead =
        job.projects?.userId === auth.userId ||
        Boolean(
          await prisma.project_collaborators.findFirst({
            where: {
              project_id: job.projectId || '',
              user_id: auth.userId,
            },
            select: { id: true },
          })
        );

      if (!canRead) {
        return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
      }

      const queueStatus = await getVideoJobStatus(job.id);
      const queueMappedStatus = queueStateToStatus(queueStatus.status);
      const status = job.status || queueMappedStatus || 'pending';
      const progress = Math.max(job.progress || 0, typeof queueStatus.progress === 'number' ? queueStatus.progress : 0);
      const remainingTime =
        status === 'processing' || status === 'queued' || status === 'pending'
          ? job.estimatedDuration
            ? Math.max(0, Math.round((job.estimatedDuration * (100 - progress)) / 100))
            : null
          : 0;

      return NextResponse.json({
        jobId: job.id,
        status,
        progress,
        remainingTime,
        outputUrl: job.outputUrl,
        fileSize: null,
      });
    }

    const [jobs, total] = await Promise.all([
      prisma.render_jobs.findMany({
        where: {
          OR: [
            { userId: auth.userId },
            { projects: { userId: auth.userId } },
            {
              projects: {
                project_collaborators: {
                  some: { user_id: auth.userId },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          status: true,
          progress: true,
          createdAt: true,
          estimatedDuration: true,
          outputUrl: true,
          projects: { select: { name: true } },
          renderSettings: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
      prisma.render_jobs.count({
        where: {
          OR: [
            { userId: auth.userId },
            { projects: { userId: auth.userId } },
            {
              projects: {
                project_collaborators: {
                  some: { user_id: auth.userId },
                },
              },
            },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.projects?.name || 'Projeto sem nome',
        status: job.status || 'pending',
        progress: job.progress || 0,
        format: (job.renderSettings as { format?: string } | null)?.format || 'mp4',
        startTime: job.createdAt?.toISOString() || null,
        remainingTime:
          job.status === 'processing' || job.status === 'queued' || job.status === 'pending'
            ? job.estimatedDuration || null
            : 0,
        outputUrl: job.outputUrl || null,
      })),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    logger.error(
      'Failed to fetch v1 render jobs',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: v1/video-pipeline/render' }
    );

    return NextResponse.json(
      { error: 'Erro ao buscar status de renderização', code: 'FETCH_STATUS_FAILED' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
