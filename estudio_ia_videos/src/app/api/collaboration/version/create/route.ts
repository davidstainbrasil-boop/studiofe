import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';
import { prisma } from '@lib/prisma';
import { Prisma } from '@prisma/client';

interface VersionChange {
  id?: string;
  type?: string;
  category?: string;
  description?: string;
  impact?: string;
}

function buildVersionNumber(index: number): string {
  return `v1.0.${index}`;
}

function buildChangeSummary(changes: VersionChange[]): string {
  if (!changes.length) return 'Manual version checkpoint';
  return changes
    .slice(0, 5)
    .map((c) => c.description || 'Alteração')
    .join(' | ')
    .slice(0, 500);
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const {
      projectId,
      title,
      description,
      changes = [],
      branchFrom = 'main',
      autoIncrement = true
    } = await request.json() as {
      projectId?: string;
      title?: string;
      description?: string;
      changes?: VersionChange[];
      branchFrom?: string;
      autoIncrement?: boolean;
    };

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      );
    }

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const versionCount = await prisma.project_versions.count({
      where: { projectId }
    });

    const versionNumber = autoIncrement
      ? buildVersionNumber(versionCount + 1)
      : title.trim().slice(0, 20) || buildVersionNumber(versionCount + 1);

    const now = new Date();
    const safeChanges = Array.isArray(changes) ? changes : [];
    const normalizedChanges = safeChanges.map((change, index) => ({
      id: change.id || `change_${Date.now()}_${index}`,
      type: change.type || 'modified',
      category: change.category || 'project',
      description: change.description || 'Manual version checkpoint',
      impact: change.impact || 'minor'
    }));

    const metadata: Prisma.InputJsonValue = {
      branchFrom,
      changes: normalizedChanges as unknown as Prisma.InputJsonArray,
      status: 'active',
      statistics: {
        downloads: 0,
        views: 0,
        shares: 0,
        comments: 0
      }
    };

    const createdVersion = await prisma.project_versions.create({
      data: {
        projectId,
        versionNumber,
        name: title.trim(),
        description: description || null,
        changesSummary: buildChangeSummary(safeChanges),
        createdBy: session.user.id,
        metadata,
        createdAt: now
      },
      include: {
        users_project_versions_created_byTousers: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    const metadataObj = (createdVersion.metadata || {}) as Record<string, unknown>;
    const statistics =
      (metadataObj.statistics as Record<string, number> | undefined) || {
        downloads: 0,
        views: 0,
        shares: 0,
        comments: 0
      };

    const mappedVersion = {
      id: createdVersion.id,
      projectId,
      version: createdVersion.versionNumber,
      title: createdVersion.name,
      description: createdVersion.description || '',
      branchFrom: (metadataObj.branchFrom as string) || branchFrom,
      author: {
        id: createdVersion.createdBy,
        name:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (createdVersion as any).users_project_versions_created_byTousers?.email?.split('@')[0] || 'User',
        email:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (createdVersion as any).users_project_versions_created_byTousers?.email || '',
        avatar: null
      },
      createdAt: createdVersion.createdAt?.toISOString() || now.toISOString(),
      changes: Array.isArray(metadataObj.changes) ? metadataObj.changes : [],
      status: (metadataObj.status as string) || 'active',
      statistics
    };

    logger.info('New collaboration version created', {
      component: 'API: collaboration/version/create',
      projectId,
      versionId: createdVersion.id,
      versionNumber: createdVersion.versionNumber,
      userId: session.user.id
    });

    return NextResponse.json({
      success: true,
      version: mappedVersion,
      message: `Versão ${createdVersion.versionNumber} criada com sucesso`
    }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error creating version', err, { component: 'API: collaboration/version/create' });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'collaboration-version-create-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        currentVersion: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const [versions, totalVersions] = await Promise.all([
      prisma.project_versions.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          users_project_versions_created_byTousers: {
            select: {
              id: true,
              email: true
            }
          }
        }
      }),
      prisma.project_versions.count({
        where: { projectId }
      })
    ]);

    const mappedVersions = versions.map((version) => {
      const metadata = (version.metadata || {}) as Record<string, unknown>;
      const stats =
        (metadata.statistics as Record<string, number> | undefined) || {
          downloads: 0,
          views: 0,
          shares: 0,
          comments: 0
        };

      return {
        id: version.id,
        projectId,
        version: version.versionNumber,
        title: version.name,
        description: version.description || '',
        branchFrom: (metadata.branchFrom as string) || 'main',
        author: {
          id: version.createdBy,
          name:
            version.users_project_versions_created_byTousers.email?.split('@')[0] || 'User',
          email: version.users_project_versions_created_byTousers.email
        },
        createdAt: version.createdAt?.toISOString() || new Date().toISOString(),
        changes: Array.isArray(metadata.changes) ? metadata.changes : [],
        status: (metadata.status as string) || 'active',
        statistics: stats
      };
    });

    return NextResponse.json({
      success: true,
      versions: mappedVersions,
      totalVersions,
      currentVersion: project.currentVersion || mappedVersions[0]?.version || null,
      pagination: {
        limit,
        offset,
        hasMore: totalVersions > offset + limit
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching versions', err, { component: 'API: collaboration/version/create' });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
