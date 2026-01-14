
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
            status: { not: 'archived' } as any 
        }
      }),
      // Render stats (completed video exports)
      prisma.video_exports.findMany({
          where: { userId, status: 'completed' },
          select: { duration: true }
      }),
      // Collaborators (unique users collaborating on my projects)
      prisma.collaborators.groupBy({
          by: ['userId'],
          where: { 
              projects: { userId }
          }
      })
    ]);

    // Calculate total render hours
    const totalSeconds = completedRenders.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const renderHours = (totalSeconds / 3600).toFixed(1);

    // Collaborators count
    const uniqueCollaborators = collaboratorsCount.length;

    // AI Efficiency: (Completed Renders / Total Export Attempts) * 100
    // If no exports, default to 100% (optimistic)
    const [totalExports, failedExports] = await Promise.all([
        prisma.video_exports.count({ where: { userId } }),
        prisma.video_exports.count({ where: { userId, status: 'failed' } })
    ]);

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
