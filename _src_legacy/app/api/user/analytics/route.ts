import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const metric = searchParams.get('metric') || 'all';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Fetch analytics data
    const [
      totalProjects,
      totalVideos,
      completedVideos,
      totalDuration,
      totalStorage,
      avgProcessingTime,
      templateUsage,
      dailyUsage,
      topProjects,
      videoQualityStats,
    ] = await Promise.all([
      // Total projects created in period
      prisma.project.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Total videos created in period
      prisma.video.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Completed videos
      prisma.video.count({
        where: {
          userId: session.user.id,
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // Total duration
      prisma.video.aggregate({
        where: {
          userId: session.user.id,
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
          },
          duration: {
            not: null,
          },
        },
        _sum: {
          duration: true,
        },
      }),

      // Total storage used
      prisma.video.aggregate({
        where: {
          userId: session.user.id,
          fileSize: {
            not: null,
          },
        },
        _sum: {
          fileSize: true,
        },
      }),

      // Average processing time (simplified calculation)
      prisma.video.findMany({
        where: {
          userId: session.user.id,
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
          },
          updatedAt: {
            not: null,
          },
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
        take: 100, // Sample for performance
      }),

      // Template usage
      prisma.templateUsage.findMany({
        where: {
          userId: session.user.id,
          usedAt: {
            gte: startDate,
          },
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      }),

      // Daily usage stats
      prisma.video.groupBy({
        by: ['createdAt'],
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
          },
        },
        _count: true,
      }),

      // Top projects by video count
      prisma.project.findMany({
        where: {
          userId: session.user.id,
          videos: {
            some: {
              createdAt: {
                gte: startDate,
              },
            },
          },
        },
        include: {
          _count: {
            select: {
              videos: true,
            },
          },
        },
        orderBy: {
          videos: {
            _count: 'desc',
          },
        },
        take: 5,
      }),

      // Video quality distribution
      prisma.video.groupBy({
        by: ['quality'],
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
          },
        },
        _count: true,
      }),
    ]);

    // Calculate average processing time
    const avgProcessingMinutes =
      avgProcessingTime.length > 0
        ? avgProcessingTime.reduce((acc, video) => {
            const processingTime =
              (video.updatedAt.getTime() - video.createdAt.getTime()) / (1000 * 60);
            return acc + processingTime;
          }, 0) / avgProcessingTime.length
        : 0;

    // Process template usage data
    const templateStats = templateUsage.reduce(
      (acc, usage) => {
        const category = usage.template.category;
        if (!acc[category]) {
          acc[category] = {
            category,
            count: 0,
            templates: [],
          };
        }
        acc[category].count++;
        acc[category].templates.push({
          id: usage.template.id,
          name: usage.template.name,
        });
        return acc;
      },
      {} as Record<string, any>,
    );

    // Generate daily usage data (mock for now, would need proper date grouping)
    const dailyData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        projects: Math.floor(Math.random() * 5),
        videos: Math.floor(Math.random() * 10),
        completed: Math.floor(Math.random() * 8),
      };
    });

    const analytics = {
      overview: {
        totalProjects,
        totalVideos,
        completedVideos,
        totalDuration: Math.round(totalDuration._sum.duration || 0),
        totalStorage: Math.round(totalStorage._sum.fileSize || 0),
        avgProcessingTime: Math.round(avgProcessingMinutes * 10) / 10,
        successRate: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
      },

      usage: {
        dailyData: dailyData.reverse(),
        weeklyData: dailyData.slice(-7),
        monthlyData: dailyData,
      },

      projects: {
        top: topProjects.map((project) => ({
          id: project.id,
          title: project.title,
          videoCount: project._count.videos,
          createdAt: project.createdAt,
        })),
        total: totalProjects,
      },

      templates: Object.values(templateStats),

      quality: videoQualityStats.map((stat) => ({
        quality: stat.quality,
        count: stat._count,
        percentage: Math.round((stat._count / totalVideos) * 100),
      })),

      storage: {
        used: Math.round(totalStorage._sum.fileSize || 0),
        available: Math.max(0, 10 * 1024 * 1024 * 1024 - (totalStorage._sum.fileSize || 0)), // 10GB limit
        percentage: Math.round(
          ((totalStorage._sum.fileSize || 0) / (10 * 1024 * 1024 * 1024)) * 100,
        ),
      },

      performance: {
        avgProcessingTime: avgProcessingMinutes,
        successRate: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
        totalProcessed: totalVideos,
        errors: totalVideos - completedVideos,
      },
    };

    return NextResponse.json({
      success: true,
      analytics,
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
      },
      { status: 500 },
    );
  }
}
