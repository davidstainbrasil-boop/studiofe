import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/admin';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  planTier: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
});

interface RouteParams {
  params: { id: string };
}

/** GET /api/admin/users/[id] — Get single user details */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'admin:user:detail', 30);
  if (rateLimited) return rateLimited;

  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        planTier: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            userId: true,
            roleId: true,
            role: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            projects: true,
            renderJobs: true,
            collaborations: true,
            analyticsEvents: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        roles: user.userRoles.map((r) => ({
          roleId: r.role.id,
          name: r.role.name,
        })),
      },
    });
  } catch (err) {
    logger.error('Failed to fetch user details', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/admin/users/[id] — Update user (role, plan, name) */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const rateLimited = applyRateLimit(req, 'admin:user:update', 15, 60_000);
  if (rateLimited) return rateLimited;

  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;
  const admin = adminResult;

  const { id } = params;

  try {
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planTier: true,
        updatedAt: true,
      },
    });

    logger.info('Admin updated user', {
      adminId: admin.user.id,
      targetUserId: id,
      changes: parsed.data,
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (err) {
    logger.error('Failed to update user', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
