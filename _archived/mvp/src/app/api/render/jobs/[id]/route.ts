import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET /api/render/jobs/[id] — Get a single render job detail */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimited = applyRateLimit(req, 'render:jobs:detail', 120);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const job = await prisma.renderJob.findFirst({
      where: {
        id,
        project: { userId: auth.user.id },
      },
      select: {
        id: true,
        status: true,
        progress: true,
        outputUrl: true,
        errorMsg: true,
        priority: true,
        config: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Render job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (err) {
    logger.error('Failed to get render job detail', {
      error: err instanceof Error ? err.message : 'Unknown',
      jobId: id,
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
