import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar estatísticas do usuário
    const [totalProjects, totalVideos, completedVideos, processingVideos, failedVideos] =
      await Promise.all([
        prisma.project.count({
          where: {
            userId: session.user.id,
            status: {
              not: 'ARCHIVED',
            },
          },
        }),
        prisma.video.count({
          where: {
            userId: session.user.id,
            status: {
              not: 'ARCHIVED',
            },
          },
        }),
        prisma.video.count({
          where: {
            userId: session.user.id,
            status: 'COMPLETED',
          },
        }),
        prisma.video.count({
          where: {
            userId: session.user.id,
            status: 'PROCESSING',
          },
        }),
        prisma.video.count({
          where: {
            userId: session.user.id,
            status: 'FAILED',
          },
        }),
      ]);

    // Calcular duração total
    const videosWithDuration = await prisma.video.findMany({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        duration: {
          not: null,
        },
      },
      select: {
        duration: true,
      },
    });

    const totalDuration = videosWithDuration.reduce((acc, video) => acc + (video.duration || 0), 0);

    const stats = {
      totalProjects,
      totalVideos,
      completedVideos,
      processingVideos,
      failedVideos,
      totalDuration,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
      },
      { status: 500 },
    );
  }
}
