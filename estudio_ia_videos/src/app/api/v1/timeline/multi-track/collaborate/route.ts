// TODO: Fix timeline multi-track types
/**
 * 🤝 Timeline Collaboration API - Real-time Collaboration
 * Sprint 44 - Multi-user timeline editing
 * NOTE: timeline_track_locks table not yet in schema, using in-memory map
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { logger } from '@lib/logger';

// In-memory lock storage (TODO: migrate to database when timeline_track_locks table exists)
interface TrackLock {
  id: string;
  projectId: string;
  trackId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
const trackLocksMap = new Map<string, TrackLock>();

function getLockKey(projectId: string, trackId: string): string {
  return `${projectId}:${trackId}`;
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
      const lockKey = getLockKey(projectId, trackId);
      const existingLock = trackLocksMap.get(lockKey);

      if (existingLock && existingLock.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Track já está bloqueada por outro usuário' },
          { status: 409 }
        );
      }

      const lock: TrackLock = {
        id: `lock_${projectId}_${trackId}_${Date.now()}`,
        projectId,
        trackId,
        userId: session.user.id,
        createdAt: existingLock?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      trackLocksMap.set(lockKey, lock);

      return NextResponse.json({ success: true, data: lock });
    } else if (action === 'unlock') {
      const lockKey = getLockKey(projectId, trackId);
      const existingLock = trackLocksMap.get(lockKey);
      
      if (existingLock?.userId === session.user.id) {
        trackLocksMap.delete(lockKey);
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, message: 'Ação inválida' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Erro na rota de colaboração:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: v1/timeline/multi-track/collaborate'
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

    // Get all active locks from in-memory storage
    const locks: TrackLock[] = [];
    trackLocksMap.forEach((lock) => {
      if (lock.projectId === projectId) {
        locks.push(lock);
      }
    });

    // TODO: Get active users (presence) - timeline_presence table not in schema
    const activeUsers: unknown[] = [];

    interface LockResponse { id: string; trackId: string; userId: string; lockedAt: string }
    return NextResponse.json({
      success: true,
      data: {
        locks: locks.map((lock): LockResponse => ({
          id: lock.id,
          trackId: lock.trackId,
          userId: lock.userId,
          lockedAt: lock.createdAt.toISOString(),
        })),
        activeUsers: activeUsers,
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
