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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      userId: session.user.id,
      status: {
        not: 'ARCHIVED',
      },
    };

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get videos with filters and pagination
    const [videos, totalCount] = await Promise.all([
      prisma.video.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              shares: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.video.count({ where: whereClause }),
    ]);

    // Get available filters
    const [statuses, projects] = await Promise.all([
      prisma.video.groupBy({
        by: ['status'],
        where: {
          userId: session.user.id,
          status: { not: 'ARCHIVED' },
        },
        _count: true,
      }),
      prisma.project.findMany({
        where: {
          userId: session.user.id,
          status: { not: 'ARCHIVED' },
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      videos,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      filters: {
        statuses,
        projects,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoIds = searchParams.get('ids')?.split(',') || [];

    if (videoIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Nenhum vídeo selecionado',
        },
        { status: 400 },
      );
    }

    // Verify videos belong to user
    const userVideos = await prisma.video.findMany({
      where: {
        id: { in: videoIds },
        userId: session.user.id,
      },
    });

    if (userVideos.length !== videoIds.length) {
      return NextResponse.json(
        {
          error: 'Alguns vídeos não pertencem ao usuário',
        },
        { status: 403 },
      );
    }

    // Archive videos (soft delete)
    await prisma.video.updateMany({
      where: {
        id: { in: videoIds },
        userId: session.user.id,
      },
      data: {
        status: 'ARCHIVED',
      },
    });

    return NextResponse.json({
      success: true,
      message: `${videoIds.length} vídeo(s) arquivado(s) com sucesso`,
      archivedCount: videoIds.length,
    });
  } catch (error) {
    console.error('Erro ao arquivar vídeos:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
      },
      { status: 500 },
    );
  }
}
