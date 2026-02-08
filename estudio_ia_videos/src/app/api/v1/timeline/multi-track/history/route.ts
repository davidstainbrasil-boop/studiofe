// TODO: Fix timeline multi-track types
export const dynamic = 'force-dynamic';

/**
 * 🎬 Timeline History API - Version Management
 * Sprint 43 - Timeline version history and rollback
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getServerAuth } from '@lib/auth/unified-session';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET - Retrieve timeline history (all versions)
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-timeline-multi-track-history-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'projectId é obrigatório' },
        { status: 400 }
      );
    }

    logger.info(`📜 Buscando histórico de timeline do projeto ${projectId}...`, {
      component: 'API: v1/timeline/multi-track/history',
      projectId
    });

    // Verify project access
    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Get current timeline
    const currentTimeline = await prisma.timelines.findUnique({
      where: { projectId },
    });

    if (!currentTimeline) {
      return NextResponse.json(
        { success: false, message: 'Timeline não encontrada' },
        { status: 404 }
      );
    }

    // Get timeline snapshots (history)
    const snapshots = await prisma.timeline_snapshots.findMany({
      where: { timelineId: currentTimeline.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.timeline_snapshots.count({
      where: { timelineId: currentTimeline.id },
    });

    logger.info(`✅ ${snapshots.length} versões encontradas`, {
      component: 'API: v1/timeline/multi-track/history',
      count: snapshots.length
    });

    interface SnapshotRecord { id: string; version: number | null; createdAt: Date | null; userId: string | null; description?: string | null; tracks: unknown[] | unknown; totalDuration: number | null }
    return NextResponse.json({
      success: true,
      data: {
        currentVersion: currentTimeline.version,
        history: snapshots.map((snapshot: SnapshotRecord) => ({
          id: snapshot.id,
          version: snapshot.version,
          createdAt: snapshot.createdAt?.toISOString() ?? null,
          createdBy: snapshot.userId,
          description: snapshot.description,
          tracksCount: Array.isArray(snapshot.tracks) ? snapshot.tracks.length : 0,
          totalDuration: snapshot.totalDuration,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + snapshots.length < total,
        },
      },
      message: 'Histórico de timeline recuperado',
    });

  } catch (error: unknown) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    logger.error('❌ Erro ao buscar histórico:', normalizedError
    , { component: 'API: v1/timeline/multi-track/history' });
    const message = normalizedError.message;
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar histórico', error: message },
      { status: 500 }
    );
  }
}


