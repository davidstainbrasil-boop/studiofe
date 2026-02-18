import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET /api/notifications — List user notifications using the Notification model */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'notifications:list', 60);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  try {
    const where = {
      userId: auth.user.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          read: true,
          data: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId: auth.user.id, read: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (err) {
    logger.error('Failed to list notifications', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/notifications — Mark notifications as read */
export async function PATCH(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'notifications:read', 30);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { ids, all } = body as { ids?: string[]; all?: boolean };

    if (all) {
      // Batch update — single query, no N+1
      const result = await prisma.notification.updateMany({
        where: { userId: auth.user.id, read: false },
        data: { read: true },
      });
      logger.info('All notifications marked as read', {
        userId: auth.user.id,
        count: result.count,
      });
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Bulk update specific IDs — single query
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: auth.user.id, // Security: only own notifications
          read: false,
        },
        data: { read: true },
      });
      logger.info('Notifications marked as read', {
        userId: auth.user.id,
        count: result.count,
        ids,
      });
    } else {
      return NextResponse.json({ error: 'Provide ids or all: true' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Failed to mark notifications read', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
