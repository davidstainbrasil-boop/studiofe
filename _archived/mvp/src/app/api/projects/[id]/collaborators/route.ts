import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

const addCollaboratorSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']).default('viewer'),
});

/** GET /api/projects/[id]/collaborators — List collaborators */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'collaborators:list', 60);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Verify access to project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: auth.user.id },
          { collaborators: { some: { userId: auth.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const collaborators = await prisma.projectCollaborator.findMany({
      where: { projectId: params.id },
      select: {
        id: true,
        role: true,
        invitedAt: true,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Include owner
    const owner = await prisma.user.findUnique({
      where: { id: project.userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        owner,
        collaborators,
      },
    });
  } catch (err) {
    logger.error('Failed to list collaborators', {
      error: err instanceof Error ? err.message : 'Unknown',
      projectId: params.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/projects/[id]/collaborators — Add collaborator */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'collaborators:add', 20, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Only owner or editor can add collaborators
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: auth.user.id },
          { collaborators: { some: { userId: auth.user.id, role: 'editor' } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or no permission' }, { status: 404 });
    }

    if (!project.collaborationEnabled) {
      return NextResponse.json({ error: 'Collaboration is not enabled for this project' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = addCollaboratorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === project.userId) {
      return NextResponse.json({ error: 'Cannot add owner as collaborator' }, { status: 400 });
    }

    // Check if already collaborator
    const existing = await prisma.projectCollaborator.findFirst({
      where: { projectId: params.id, userId: targetUser.id },
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already a collaborator' }, { status: 409 });
    }

    const collaborator = await prisma.projectCollaborator.create({
      data: {
        projectId: params.id,
        userId: targetUser.id,
        role: parsed.data.role,
      },
      select: {
        id: true,
        role: true,
        invitedAt: true,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    await createNotification({
      userId: targetUser.id,
      type: 'collaborator_added',
      title: 'Você foi adicionado a um projeto',
      message: `Você recebeu acesso (${parsed.data.role}) ao projeto "${project.name}".`,
      data: {
        projectId: params.id,
        role: parsed.data.role,
        invitedByUserId: auth.user.id,
      },
    });

    logger.info('Collaborator added', {
      projectId: params.id,
      userId: targetUser.id,
      role: parsed.data.role,
    });

    return NextResponse.json({ success: true, data: collaborator }, { status: 201 });
  } catch (err) {
    logger.error('Failed to add collaborator', {
      error: err instanceof Error ? err.message : 'Unknown',
      projectId: params.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/projects/[id]/collaborators — Remove collaborator */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'collaborators:remove', 20, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const collaboratorId = searchParams.get('collaboratorId');

    if (!collaboratorId) {
      return NextResponse.json({ error: 'collaboratorId is required' }, { status: 400 });
    }

    // Only owner can remove collaborators
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: auth.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or no permission' }, { status: 404 });
    }

    // Ensure the collaborator belongs to this project before deleting
    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { id: collaboratorId, projectId: params.id },
    });

    if (!collaborator) {
      return NextResponse.json({ error: 'Collaborator not found in this project' }, { status: 404 });
    }

    await prisma.projectCollaborator.delete({
      where: { id: collaboratorId },
    });

    logger.info('Collaborator removed', {
      projectId: params.id,
      collaboratorId,
    });

    return NextResponse.json({ success: true, message: 'Collaborator removed' });
  } catch (err) {
    logger.error('Failed to remove collaborator', {
      error: err instanceof Error ? err.message : 'Unknown',
      projectId: params.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
