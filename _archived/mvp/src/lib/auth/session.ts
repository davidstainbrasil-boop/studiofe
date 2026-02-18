// Simplified auth session — Supabase only, no NextAuth
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

/**
 * Get the current authenticated user from Supabase (server-side only).
 * Returns null if not authenticated.
 */
export async function getServerAuth(): Promise<AuthSession | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    return {
      user: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
      },
    };
  } catch (err) {
    logger.error('Failed to get server auth', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Get auth or throw 401 — use in API routes that require authentication.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerAuth();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
