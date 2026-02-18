import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/dashboard';
  // Prevent open redirect: only allow relative paths starting with /
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Ensure the user exists in Prisma DB (upsert on first login)
      try {
        await prisma.user.upsert({
          where: { id: data.user.id },
          update: {
            email: data.user.email ?? '',
            name: data.user.user_metadata?.full_name ?? data.user.email?.split('@')[0] ?? null,
            avatarUrl: data.user.user_metadata?.avatar_url ?? null,
          },
          create: {
            id: data.user.id,
            email: data.user.email ?? '',
            name: data.user.user_metadata?.full_name ?? data.user.email?.split('@')[0] ?? null,
            avatarUrl: data.user.user_metadata?.avatar_url ?? null,
            role: 'user',
            planTier: 'free',
          },
        });
      } catch (dbError) {
        // Log but don't block login — the user can still use Supabase auth
        logger.warn('Failed to upsert user in Prisma DB during auth callback', {
          userId: data.user.id,
          error: dbError instanceof Error ? dbError.message : 'Unknown',
        });
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
}
