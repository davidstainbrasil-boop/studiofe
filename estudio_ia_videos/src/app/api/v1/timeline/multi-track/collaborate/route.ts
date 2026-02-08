/**
 * 🤝 Timeline Collaboration API - Real-time Collaboration
 * Sprint 44 - Multi-user timeline editing
 * UPDATED: Uses database persistence for track locks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { applyRateLimit } from '@/lib/rate-limit';

// Lock expiration time in minutes
const LOCK_EXPIRATION_MINUTES = 30;

/**
 * Cleanup expired locks for a project
 */
async function cleanupExpiredLocks(projectId: string): Promise<number> {
  const result = await prisma.timeline_track_locks.deleteMany({
    where: {
      projectId,
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

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

    // Verify project access
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

    // Cleanup expired locks first
    await cleanupExpiredLocks(projectId);

    if (action === 'lock') {
      // Check if lock exists
      const existingLock = await prisma.timeline_track_locks.findUnique({
        where: {
          unique_track_lock: { projectId, trackId },
        },
      });

      if (existingLock && existingLock.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Track já está bloqueada por outro usuário' },
          { status: 409 }
        );
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + LOCK_EXPIRATION_MINUTES * 60 * 1000);

      // Upsert lock (create or refresh)
      const lock = await prisma.timeline_track_locks.upsert({
        where: {
          unique_track_lock: { projectId, trackId },
        },
        create: {
          id: randomUUID(),
          projectId,
          trackId,
          userId: session.user.id,
          expiresAt,
        },
        update: {
          expiresAt,
          updatedAt: new Date(),
        },
      });

      logger.info('Track locked', {
        component: 'API:Collaborate',
        projectId,
        trackId,
        userId: session.user.id,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: lock.id,
          projectId: lock.projectId,
          trackId: lock.trackId,
          userId: lock.userId,
          expiresAt: lock.expiresAt.toISOString(),
          createdAt: lock.createdAt.toISOString(),
          updatedAt: lock.updatedAt.toISOString(),
        },
      });
    } else if (action === 'unlock') {
      // Only delete if the lock belongs to the current user
      const deleted = await prisma.timeline_track_locks.deleteMany({
        where: {
          projectId,
          trackId,
          userId: session.user.id,
        },
      });

      if (deleted.count > 0) {
        logger.info('Track unlocked', {
          component: 'API:Collaborate',
          projectId,
          trackId,
          userId: session.user.id,
        });
      }

      return NextResponse.json({ success: true });
    } else if (action === 'refresh') {
      // Refresh lock expiration time
      const expiresAt = new Date(Date.now() + LOCK_EXPIRATION_MINUTES * 60 * 1000);
      
      const updated = await prisma.timeline_track_locks.updateMany({
        where: {
          projectId,
          trackId,
          userId: session.user.id,
        },
        data: {
          expiresAt,
          updatedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { success: false, message: 'Lock não encontrado ou não pertence ao usuário' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { expiresAt: expiresAt.toISOString() },
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Ação inválida. Use: lock, unlock, refresh' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Erro na rota de colaboração:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:v1/timeline/multi-track/collaborate',
    });
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
    const rateLimitBlocked = await applyRateLimit(request, 'v1-timeline-multi-track-collaborate-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

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

    // Cleanup expired locks first
    const expiredCount = await cleanupExpiredLocks(projectId);
    if (expiredCount > 0) {
      logger.debug(`Cleaned up ${expiredCount} expired locks`, { projectId });
    }

    // Get all active locks from database
    const locks = await prisma.timeline_track_locks.findMany({
      where: {
        projectId,
        expiresAt: { gt: new Date() },
      },
      include: {
        users: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Get timeline for project to fetch presence
    const timeline = await prisma.timelines.findFirst({
      where: { projectId },
      select: { id: true },
    });

    // Get active users (presence) - last activity within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = timeline
      ? await prisma.timeline_presence.findMany({
          where: {
            timelineId: timeline.id,
            lastSeenAt: { gt: fiveMinutesAgo },
          },
          include: {
            users: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        })
      : [];

    return NextResponse.json({
      success: true,
      data: {
        locks: locks.map((lock) => ({
          id: lock.id,
          trackId: lock.trackId,
          userId: lock.userId,
          user: lock.users,
          lockedAt: lock.createdAt.toISOString(),
          expiresAt: lock.expiresAt.toISOString(),
        })),
        activeUsers: activeUsers.map((presence) => ({
          userId: presence.userId,
          user: presence.users,
          cursorPosition: presence.cursorPosition,
          lastSeenAt: presence.lastSeenAt?.toISOString(),
        })),
      },
    });
  } catch (error: unknown) {
    logger.error('Erro ao buscar locks:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:v1/timeline/multi-track/collaborate',
    });
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
    const { projectId, timelineId, currentTrackId } = body;

    // Need either timelineId directly or projectId to look up timeline
    if (!timelineId && !projectId) {
      return NextResponse.json(
        { success: false, message: 'timelineId ou projectId é obrigatório' },
        { status: 400 }
      );
    }

    // Get timelineId from projectId if needed
    let resolvedTimelineId = timelineId;
    if (!resolvedTimelineId && projectId) {
      const timeline = await prisma.timelines.findFirst({
        where: { projectId },
        select: { id: true },
      });
      if (!timeline) {
        return NextResponse.json(
          { success: false, message: 'Timeline não encontrada para o projeto' },
          { status: 404 }
        );
      }
      resolvedTimelineId = timeline.id;
    }

    // Update or create presence
    const cursorData = currentTrackId ? { trackId: currentTrackId } : {};
    const presence = await prisma.timeline_presence.upsert({
      where: {
        timelineId_userId: {
          timelineId: resolvedTimelineId,
          userId: session.user.id,
        },
      },
      create: {
        id: randomUUID(),
        timelineId: resolvedTimelineId,
        userId: session.user.id,
        cursorPosition: cursorData,
        lastSeenAt: new Date(),
      },
      update: {
        cursorPosition: currentTrackId ? cursorData : undefined,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: presence.userId,
        lastSeenAt: presence.lastSeenAt?.toISOString() ?? null,
      },
      message: 'Presença atualizada',
    });
  } catch (error: unknown) {
    logger.error('Erro ao atualizar presença:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:v1/timeline/multi-track/collaborate',
    });
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar presença', error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove all locks for a user (e.g., on disconnect)
 */
export async function DELETE(request: NextRequest) {
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

    // Remove all locks for this user in this project
    const deleted = await prisma.timeline_track_locks.deleteMany({
      where: {
        projectId,
        userId: session.user.id,
      },
    });

    logger.info('User locks removed', {
      component: 'API:Collaborate',
      projectId,
      userId: session.user.id,
      count: deleted.count,
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: deleted.count },
    });
  } catch (error: unknown) {
    logger.error('Erro ao remover locks:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:v1/timeline/multi-track/collaborate',
    });
    return NextResponse.json(
      { success: false, message: 'Erro ao remover locks' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
