import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET /api/activity — List the current user's activity events */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'activity:list', 60);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const eventType = searchParams.get('type');
  const skip = (page - 1) * limit;

  try {
    const where = {
      userId: auth.user.id,
      ...(eventType && eventType !== 'all' ? { eventType } : {}),
    };

    const [events, total, typeCounts] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          eventType: true,
          eventData: true,
          sessionId: true,
          createdAt: true,
        },
      }),
      prisma.analyticsEvent.count({ where }),
      prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { userId: auth.user.id },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
    ]);

    const eventTypes = typeCounts.map((t) => ({
      type: t.eventType,
      count: t._count.id,
    }));

    return NextResponse.json({
      success: true,
      data: events,
      eventTypes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Failed to list activity', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
