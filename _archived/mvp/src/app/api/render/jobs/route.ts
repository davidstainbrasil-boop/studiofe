import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { RenderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const validStatuses = new Set<string>(['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled']);

/** GET /api/render/jobs — List all render jobs for the current user */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'render:jobs:list', 60);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const statusParam = searchParams.get('status');
  const skip = (page - 1) * limit;

  try {
    const statusFilter = (statusParam && statusParam !== 'all' && validStatuses.has(statusParam))
      ? { status: statusParam as RenderStatus }
      : {};

    const baseWhere = { project: { userId: auth.user.id } };

    const [jobs, total] = await Promise.all([
      prisma.renderJob.findMany({
        where: { ...baseWhere, ...statusFilter },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          progress: true,
          outputUrl: true,
          errorMsg: true,
          priority: true,
          startedAt: true,
          createdAt: true,
          completedAt: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.renderJob.count({ where: { ...baseWhere, ...statusFilter } }),
    ]);

    // Summary stats
    const [totalJobs, completedJobs, failedJobs, processingJobs] = await Promise.all([
      prisma.renderJob.count({ where: baseWhere }),
      prisma.renderJob.count({ where: { ...baseWhere, status: 'completed' as RenderStatus } }),
      prisma.renderJob.count({ where: { ...baseWhere, status: 'failed' as RenderStatus } }),
      prisma.renderJob.count({ where: { ...baseWhere, status: 'processing' as RenderStatus } }),
    ]);

    return NextResponse.json({
      success: true,
      data: jobs,
      summary: {
        total: totalJobs,
        completed: completedJobs,
        failed: failedJobs,
        processing: processingJobs,
      },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Failed to list render jobs', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
