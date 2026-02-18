import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/admin';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
});

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

/** GET /api/admin/roles — List all roles */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'admin:roles:list', 30);
  if (rateLimited) return rateLimited;

  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          select: {
            permission: {
              select: { id: true, name: true, resource: true, action: true },
            },
          },
        },
        users: { select: { userId: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions.map((p: { permission: { id: string; name: string; resource: string; action: string } }) => p.permission),
        usersCount: r.users.length,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    logger.error('Failed to list roles', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/admin/roles — Create role OR assign role to user */
export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'admin:roles:create', 10, 60_000);
  if (rateLimited) return rateLimited;

  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;
  const auth = adminResult;

  try {
    const body = await req.json();

    // Assign role to user
    if (body.userId && body.roleId) {
      const parsed = assignRoleSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existing = await prisma.userRole.findFirst({
        where: { userId: parsed.data.userId, roleId: parsed.data.roleId },
      });

      if (existing) {
        return NextResponse.json({ error: 'User already has this role' }, { status: 409 });
      }

      const userRole = await prisma.userRole.create({
        data: {
          userId: parsed.data.userId,
          roleId: parsed.data.roleId,
        },
      });

      logger.info('Role assigned', {
        targetUserId: parsed.data.userId,
        roleId: parsed.data.roleId,
        byUserId: auth.user.id,
      });

      return NextResponse.json({ success: true, data: userRole }, { status: 201 });
    }

    // Create new role
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    // Attach permissions if provided
    if (parsed.data.permissions && parsed.data.permissions.length > 0) {
      const permissionRecords = await prisma.permission.findMany({
        where: { name: { in: parsed.data.permissions } },
      });
      if (permissionRecords.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionRecords.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    logger.info('Role created', { roleId: role.id, roleName: role.name, permissions: parsed.data.permissions });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (err) {
    logger.error('Failed to manage roles', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
