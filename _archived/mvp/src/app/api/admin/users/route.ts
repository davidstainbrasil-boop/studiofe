import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/admin';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET /api/admin/users — List all users (admin only) */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'admin:users', 30);
  if (rateLimited) return rateLimited;

  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;
  const auth = result;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const search = searchParams.get('search');
  const skip = (page - 1) * limit;

  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          planTier: true,
          role: true,
          createdAt: true,
          userRoles: {
            select: {
              role: { select: { name: true } },
            },
          },
          _count: {
            select: { projects: true, renderJobs: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        roles: u.userRoles.map((r) => r.role.name),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Failed to list users', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
