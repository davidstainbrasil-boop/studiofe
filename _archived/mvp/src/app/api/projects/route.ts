import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: z.enum(['pptx', 'template', 'custom']).default('pptx'),
});

/** GET /api/projects — List the user's projects */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'projects:list', 60);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const skip = (page - 1) * limit;

  try {
    const where = {
      userId: auth.user.id,
      ...(status ? { status: status as 'draft' | 'in_progress' | 'completed' | 'archived' } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          thumbnailUrl: true,
          currentVersion: true,
          isPublic: true,
          collaborationEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { slides: true, collaborators: true, renderJobs: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: projects,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Failed to list projects', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/projects — Create a new project */
export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'projects:create', 10, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        type: parsed.data.type,
        userId: auth.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        userId: auth.user.id,
        eventType: 'project_created',
        eventData: { projectId: project.id, projectName: project.name },
      },
    }).catch(() => { /* non-critical */ });

    await createNotification({
      userId: auth.user.id,
      type: 'project_created',
      title: 'Projeto criado',
      message: `O projeto "${project.name}" foi criado com sucesso.`,
      data: { projectId: project.id, projectName: project.name },
    });

    logger.info('Project created', { projectId: project.id, userId: auth.user.id });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (err) {
    logger.error('Failed to create project', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
