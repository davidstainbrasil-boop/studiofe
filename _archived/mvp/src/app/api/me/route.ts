import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  planTier: true,
  metadata: true,
  createdAt: true,
  _count: {
    select: {
      projects: true,
      renderJobs: true,
    },
  },
} as const;

/** GET /api/me — returns the current user's profile */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'me:get', 60);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: userSelect,
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

/** PUT /api/me — update the current user's profile */
export async function PUT(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'me:update', 20, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: parsed.data,
      select: userSelect,
    });

    logger.info('Profile updated', { userId: auth.user.id });

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    logger.error('Failed to update profile', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const deleteAccountSchema = z.object({
  confirmEmail: z.string().email('Email inválido'),
});

/**
 * DELETE /api/me — permanently deletes user account and all associated data.
 * Requires the user to confirm by sending their email address.
 * Cascade deletes in Prisma handle projects, render jobs, etc.
 * Also removes the user from Supabase Auth.
 */
export async function DELETE(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'me:delete', 3, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Safety: confirm email matches
    if (parsed.data.confirmEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'O email de confirmação não corresponde à sua conta' },
        { status: 400 }
      );
    }

    // 1. Delete from Prisma DB (cascade deletes projects, render jobs, etc.)
    await prisma.user.delete({
      where: { id: auth.user.id },
    });

    // 2. Delete from Supabase Auth
    try {
      const admin = getSupabaseAdmin();
      const { error: authError } = await admin.auth.admin.deleteUser(auth.user.id);
      if (authError) {
        logger.warn('Supabase Auth deletion failed (DB already cleaned)', {
          userId: auth.user.id,
          error: authError.message,
        });
      }
    } catch (authErr) {
      logger.warn('Supabase Auth deletion error (non-critical)', {
        userId: auth.user.id,
        error: authErr instanceof Error ? authErr.message : 'Unknown',
      });
    }

    logger.info('Account deleted', { userId: auth.user.id, email: auth.user.email });

    return NextResponse.json({ success: true, message: 'Conta excluída com sucesso' });
  } catch (err) {
    logger.error('Failed to delete account', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Falha ao excluir conta' }, { status: 500 });
  }
}
