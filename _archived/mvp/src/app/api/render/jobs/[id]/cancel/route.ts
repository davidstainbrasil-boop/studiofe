import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { RenderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const cancellableStatuses = new Set<RenderStatus>(['pending', 'queued', 'processing']);

/** POST /api/render/jobs/[id]/cancel — Cancel a render job */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimited = applyRateLimit(req, 'render:jobs:cancel', 10);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    // Verify ownership
    const job = await prisma.renderJob.findFirst({
      where: {
        id,
        project: { userId: auth.user.id },
      },
      select: { id: true, status: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Render job not found' }, { status: 404 });
    }

    if (!cancellableStatuses.has(job.status)) {
      return NextResponse.json(
        { error: `Não é possível cancelar um job com status "${job.status}"` },
        { status: 400 }
      );
    }

    const updated = await prisma.renderJob.update({
      where: { id },
      data: {
        status: 'cancelled' as RenderStatus,
        completedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
      },
    });

    logger.info('Render job cancelled', { jobId: id, userId: auth.user.id });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    logger.error('Failed to cancel render job', {
      error: err instanceof Error ? err.message : 'Unknown',
      jobId: id,
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Falha ao cancelar render job' }, { status: 500 });
  }
}
