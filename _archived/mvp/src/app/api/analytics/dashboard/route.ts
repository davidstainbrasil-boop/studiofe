import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET /api/analytics/dashboard — Dashboard metrics & chart data */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'analytics:dashboard', 30);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '30d';
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[period] || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const userId = auth.user.id;

    // Core counts
    const [
      totalProjects,
      activeProjects,
      totalRenders,
      completedRenders,
      failedRenders,
      totalCollaborators,
      recentActivity,
    ] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.project.count({ where: { userId, status: { in: ['draft', 'in_progress'] } } }),
      prisma.renderJob.count({ where: { userId } }),
      prisma.renderJob.count({ where: { userId, status: 'completed' } }),
      prisma.renderJob.count({ where: { userId, status: 'failed' } }),
      prisma.projectCollaborator.count({
        where: { project: { userId } },
      }),
      prisma.analyticsEvent.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          eventType: true,
          eventData: true,
          createdAt: true,
        },
      }),
    ]);

    // Projects created per day (for chart)
    const projectsInPeriod = await prisma.project.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayCountMap = new Map<string, number>();
    for (const p of projectsInPeriod) {
      const dayKey = p.createdAt.toISOString().slice(0, 10);
      dayCountMap.set(dayKey, (dayCountMap.get(dayKey) || 0) + 1);
    }
    const projectsByDay = Array.from(dayCountMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Renders by status (for pie/donut chart)
    const rendersByStatus = await prisma.renderJob.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    // Recent projects
    const recentProjects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        _count: { select: { slides: true } },
      },
    });

    const renderSuccessRate =
      totalRenders > 0 ? Math.round((completedRenders / totalRenders) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalProjects,
          activeProjects,
          totalRenders,
          completedRenders,
          failedRenders,
          renderSuccessRate,
          totalCollaborators,
        },
        charts: {
          projectsByDay,
          rendersByStatus: rendersByStatus.map((r) => ({
            status: r.status,
            count: r._count,
          })),
        },
        recentProjects,
        recentActivity,
        period,
      },
    });
  } catch (err) {
    logger.error('Failed to get dashboard analytics', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
