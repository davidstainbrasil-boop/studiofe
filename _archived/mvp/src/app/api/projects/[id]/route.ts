import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']).optional(),
  isPublic: z.boolean().optional(),
  collaborationEnabled: z.boolean().optional(),
  thumbnailUrl: z.string().url().optional(),
});

/** GET /api/projects/[id] — Get project details */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'projects:detail', 120);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: auth.user.id },
          { collaborators: { some: { userId: auth.user.id } } },
          { isPublic: true },
        ],
      },
      include: {
        slides: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            thumbnailUrl: true,
            duration: true,
            hasAudio: true,
          },
        },
        collaborators: {
          select: {
            id: true,
            role: true,
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        renderJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            progress: true,
            outputUrl: true,
            createdAt: true,
            completedAt: true,
          },
        },
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        _count: {
          select: { slides: true, collaborators: true, renderJobs: true, versions: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: project });
  } catch (err) {
    logger.error('Failed to get project', {
      error: err instanceof Error ? err.message : 'Unknown',
      projectId: params.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PUT /api/projects/[id] — Update project */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'projects:update', 30);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Only owner or editor can update
    const existing = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: auth.user.id },
          { collaborators: { some: { userId: auth.user.id, role: { in: ['owner', 'editor'] } } } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found or no permission' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        status: true,
        isPublic: true,
        collaborationEnabled: true,
        updatedAt: true,
      },
    });

    // Record history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        userId: auth.user.id,
        action: 'updated',
        changes: { changes: Object.keys(parsed.data) },
      },
    }).catch(() => { /* non-critical */ });

    logger.info('Project updated', { projectId: params.id, userId: auth.user.id });

    return NextResponse.json({ success: true, data: project });
  } catch (err) {
    logger.error('Failed to update project', {
      error: err instanceof Error ? err.message : 'Unknown',
      projectId: params.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/projects/[id] — Delete project */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'projects:delete', 10, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Only owner can delete
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId: auth.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found or no permission' }, { status: 404 });
    }

    await prisma.project.delete({ where: { id: params.id } });

    await prisma.analyticsEvent.create({
      data: {
        userId: auth.user.id,
        eventType: 'project_deleted',
        eventData: { projectId: params.id, projectName: existing.name },
      },
    }).catch(() => { /* non-critical */ });

    logger.info('Project deleted', { projectId: params.id, userId: auth.user.id });

    return NextResponse.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    logger.error('Failed to delete project', {
      error: err instanceof Error ? err.message : 'Unknown',
      projectId: params.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
