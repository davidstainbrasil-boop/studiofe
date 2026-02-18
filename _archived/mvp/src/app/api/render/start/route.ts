import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const renderStartSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  config: z
    .object({
      resolution: z.enum(['720p', '1080p', '4k']).optional().default('1080p'),
      quality: z.enum(['draft', 'standard', 'high']).optional().default('standard'),
      fps: z.number().int().min(24).max(60).optional().default(30),
      format: z.enum(['mp4', 'webm']).optional().default('mp4'),
      includeAudio: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
  priority: z.number().int().min(0).max(10).optional().default(0),
});

/** POST /api/render/start — Start a new render job for a project */
export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'render:start', 10, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = renderStartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, config, priority } = parsed.data;

    // Verify project ownership or collaboration access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: auth.user.id },
          {
            collaborators: {
              some: {
                userId: auth.user.id,
                role: { in: ['owner', 'editor'] },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { slides: true } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    if (project._count.slides === 0) {
      return NextResponse.json(
        { error: 'Projeto não possui slides para renderizar' },
        { status: 400 }
      );
    }

    // Check for existing active render jobs on this project
    const existingActive = await prisma.renderJob.findFirst({
      where: {
        projectId,
        status: { in: ['pending', 'queued', 'processing'] },
      },
    });

    if (existingActive) {
      return NextResponse.json(
        {
          error: 'Já existe um job de renderização ativo para este projeto',
          existingJobId: existingActive.id,
        },
        { status: 409 }
      );
    }

    // Create the render job
    const renderJob = await prisma.renderJob.create({
      data: {
        projectId,
        userId: auth.user.id,
        status: 'pending',
        priority,
        config: config as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        status: true,
        priority: true,
        config: true,
        createdAt: true,
        project: {
          select: { id: true, name: true },
        },
      },
    });

    // Update project status to in_progress if it's still draft
    if (project.status === 'draft') {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'in_progress' },
      });
    }

    // Log the render start event
    await prisma.analyticsEvent.create({
      data: {
        userId: auth.user.id,
        eventType: 'render_started',
        eventData: {
          jobId: renderJob.id,
          projectId,
          projectName: project.name,
          config,
          slideCount: project._count.slides,
        },
      },
    });

    logger.info('Render job started', {
      jobId: renderJob.id,
      projectId,
      userId: auth.user.id,
      slideCount: project._count.slides,
    });

    return NextResponse.json(
      { success: true, data: renderJob },
      { status: 201 }
    );
  } catch (err) {
    logger.error('Failed to start render job', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json(
      { error: 'Falha ao iniciar renderização' },
      { status: 500 }
    );
  }
}
