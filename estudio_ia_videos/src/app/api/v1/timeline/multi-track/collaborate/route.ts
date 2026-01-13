// TODO: Fix timeline multi-track types
/**
 * 🤝 Timeline Collaboration API - Real-time Collaboration
 * Sprint 44 - Multi-user timeline editing
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { logger } from '@lib/logger';

/**
 * POST - Lock/Unlock track for editing
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { projectId, trackId, action } = body;

    if (!projectId || !trackId || !action) {
      return NextResponse.json(
        { success: false, message: 'projectId, trackId e action são obrigatórios' },
        { status: 400 }
      );
    }

    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Projeto não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    if (action === 'lock') {
      const existingLock = await prisma.timeline_track_locks.findFirst({
        where: {
          projectId,
          trackId,
        },
      });

      if (existingLock && existingLock.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Track já está bloqueada por outro usuário' },
          { status: 409 }
        );
      }

      const lock = await prisma.timeline_track_locks.upsert({
        where: {
          projectId_trackId_userId: {
            projectId,
            trackId,
            userId: session.user.id,
          },
        },
        update: {
          updatedAt: new Date(),
        },
        create: {
          id: `lock_${projectId}_${trackId}_${Date.now()}`,
          projectId,
          trackId,
          userId: session.user.id,
        },
      });

      return NextResponse.json({ success: true, data: lock });
    } else if (action === 'unlock') {
      await prisma.timeline_track_locks.deleteMany({
        where: {
          projectId,
          trackId,
          userId: session.user.id,
        },
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, message: 'Ação inválida' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Erro na rota de colaboração:', error);
      return NextResponse.json(
        { success: false, message: 'Erro interno do servidor' },
        { status: 500 }
      );
  }
}

/**
 * GET - Get all active locks and presence for a project
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'projectId é obrigatório' },
        { status: 400 }
      );
    }

    // Get all active locks
    const locks = await prisma.timeline_track_locks.findMany({
      where: { projectId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get active users (presence)
    const activeUsers = await prisma.timeline_presence.findMany({
      where: {
        projectId,
        lastSeenAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    interface LockRecord { id: string; trackId: string; userId: string; users: { name: string | null; avatarUrl: string | null }; createdAt: Date }
    interface PresenceRecord { userId: string; users: { name: string | null; avatarUrl: string | null }; lastSeenAt: Date; currentTrackId?: string | null }
    return NextResponse.json({
      success: true,
      data: {
        locks: locks.map((lock: LockRecord) => ({
          id: lock.id,
          trackId: lock.trackId,
          userId: lock.userId,
          userName: lock.users.name || 'Unknown',
          userImage: lock.users.avatarUrl,
          lockedAt: lock.createdAt.toISOString(),
        })),
        activeUsers: activeUsers.map((presence: PresenceRecord) => ({
          userId: presence.userId,
          userName: presence.users.name || 'Unknown',
          userImage: presence.users.avatarUrl,
          lastSeenAt: presence.lastSeenAt.toISOString(),
          currentTrackId: presence.currentTrackId || undefined,
        })),
      },
    });

  } catch (error: unknown) {
    logger.error('❌ Erro ao buscar locks:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/timeline/multi-track/collaborate' });
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar informações de colaboração', error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update user presence (heartbeat)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, currentTrackId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'projectId é obrigatório' },
        { status: 400 }
      );
    }

    // Update or create presence
    const presence = await prisma.timeline_presence.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
      create: {
        id: crypto.randomUUID(),
        projectId,
        userId: session.user.id,
        currentTrackId: currentTrackId || null,
        lastSeenAt: new Date(),
      },
      update: {
        currentTrackId: currentTrackId || null,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: presence.userId,
        lastSeenAt: presence.lastSeenAt.toISOString(),
      },
      message: 'Presença atualizada',
    });

  } catch (error: unknown) {
    logger.error('❌ Erro ao atualizar presença:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/timeline/multi-track/collaborate' });
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar presença', error: message },
      { status: 500 }
    );
  }
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
