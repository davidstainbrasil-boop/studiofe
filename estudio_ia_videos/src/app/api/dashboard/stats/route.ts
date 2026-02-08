
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

// Types for optional Prisma models (may not exist in current schema)
interface VideoExportsModel {
  findMany: (args: Record<string, unknown>) => Promise<Array<{ duration: number | null }>>;
  count: (args: Record<string, unknown>) => Promise<number>;
}

interface CollaboratorsModel {
  groupBy: (args: Record<string, unknown>) => Promise<Array<{ userId: string }>>;
}

type PrismaExtended = typeof prisma & {
  video_exports?: VideoExportsModel;
  collaborators?: CollaboratorsModel;
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'dashboard-stats-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [
      activeProjectsCount,
      completedRenders,
      collaboratorsCount
    ] = await Promise.all([
      // Active projects
      prisma.projects.count({
        where: { 
            userId,
            status: { not: 'archived' as const } 
        }
      }),
      // Render stats (completed video exports)
      // TODO: Se video_exports não existir no schema Prisma, usar render_jobs ou outra tabela
      (prisma as unknown as PrismaExtended).video_exports?.findMany({
          where: { userId, status: 'completed' },
          select: { duration: true }
      }).catch(() => []) || Promise.resolve([]),
      // Collaborators (unique users collaborating on my projects)
      // TODO: Se collaborators não existir no schema Prisma, usar outra abordagem
      (prisma as unknown as PrismaExtended).collaborators?.groupBy({
          by: ['userId'],
          where: { 
              projects: { userId }
          }
      }).catch(() => []) || Promise.resolve([])
    ]);

    // Calculate total render hours
    interface RenderDuration { duration: number | null; }
    const completedRendersArray = Array.isArray(completedRenders) ? completedRenders : [];
    const totalSeconds = completedRendersArray.reduce((acc: number, curr: RenderDuration) => acc + (curr?.duration || 0), 0);
    const renderHours = (totalSeconds / 3600).toFixed(1);

    // Collaborators count
    const collaboratorsCountArray = Array.isArray(collaboratorsCount) ? collaboratorsCount : [];
    const uniqueCollaborators = collaboratorsCountArray.length;

    // AI Efficiency: (Completed Renders / Total Export Attempts) * 100
    // If no exports, default to 100% (optimistic)
    // TODO: Se video_exports não existir no schema Prisma, usar render_jobs
    let totalExports = 0;
    let failedExports = 0;
    try {
      const [total, failed] = await Promise.all([
        (prisma as unknown as PrismaExtended).video_exports?.count({ where: { userId } }).catch(() => 0) || Promise.resolve(0),
        (prisma as unknown as PrismaExtended).video_exports?.count({ where: { userId, status: 'failed' } }).catch(() => 0) || Promise.resolve(0)
      ]);
      totalExports = total || 0;
      failedExports = failed || 0;
    } catch {
      // Se tabela não existir, usar render_jobs como fallback
      try {
        totalExports = await prisma.render_jobs.count({ where: { userId } });
        failedExports = await prisma.render_jobs.count({ where: { userId, status: 'failed' } });
      } catch {
        // Ignorar se também não existir
      }
    }

    let aiEfficiency = 100;
    if (totalExports > 0) {
        aiEfficiency = Math.round(((totalExports - failedExports) / totalExports) * 100);
    }

    return NextResponse.json({
        activeProjects: activeProjectsCount,
        renderHours,
        collaborators: uniqueCollaborators,
        aiEfficiency
    });

  } catch (error) {
    logger.error('Dashboard Stats Error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
