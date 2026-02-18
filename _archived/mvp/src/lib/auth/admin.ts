/**
 * Admin authorization utilities — server-side only.
 * Provides helpers for checking admin role and requiring admin access.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth, type AuthSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

/**
 * Check if a user has the admin role via UserRole table.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { name: 'admin' },
    },
  });
  return !!adminRole;
}

/**
 * Check if a user has a specific permission via Role → Permission.
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const userPermission = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        permissions: {
          some: {
            permission: { name: permissionName },
          },
        },
      },
    },
  });
  return !!userPermission;
}

/**
 * Require admin authentication. Returns AuthSession on success,
 * or a NextResponse error (401/403) on failure.
 * Usage in API routes:
 *   const result = await requireAdmin();
 *   if (result instanceof NextResponse) return result;
 *   const auth = result; // AuthSession
 */
export async function requireAdmin(): Promise<AuthSession | NextResponse> {
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(auth.user.id))) {
    logger.warn('Admin access denied', { userId: auth.user.id });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return auth;
}
