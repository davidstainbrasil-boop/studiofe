/**
 * Unified Session Helper
 * 
 * Resolve a inconsistência de auth entre Supabase (cookies sb-*) e NextAuth (cookies next-auth):
 * - O login do client-side usa Supabase Auth diretamente → seta cookies sb-*
 * - O middleware verifica cookies Supabase → funciona
 * - Mas 198+ API routes usam getServerSession(authOptions) do NextAuth → falha porque não há cookie NextAuth
 * 
 * Esta função tenta Supabase primeiro (que é o auth real), depois fallback para NextAuth.
 * Retorna um objeto compatível com o formato que as API routes esperam: { user: { id, email, name } }
 */

import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface UnifiedUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface UnifiedSession {
  user: UnifiedUser;
  expires?: string | null;
}

/**
 * Obtém a sessão do usuário autenticado de forma unificada.
 * 
 * Ordem de verificação:
 * 1. Supabase Auth cookies (setados pelo login client-side)
 * 2. NextAuth JWT cookies (setados se alguém chamar /api/auth/callback/credentials)
 * 
 * @returns Session compatível com NextAuth ou null se não autenticado
 */
export async function getServerAuth(): Promise<UnifiedSession | null> {
  // 1. Tentar Supabase Auth primeiro (fonte primária de login)
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!error && user) {
      return {
        user: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          image: user.user_metadata?.avatar_url || null,
        },
        expires: null,
      };
    }
  } catch (supabaseError) {
    // Silently continue to NextAuth fallback
    logger.warn('Supabase session check failed, trying NextAuth', {
      error: supabaseError instanceof Error ? supabaseError.message : 'Unknown',
      component: 'unified-session',
    });
  }

  // 2. Fallback: NextAuth (para chamadas via /api/auth/callback/credentials)
  try {
    const nextAuthSession = await getServerSession(authOptions) as Session | null;
    if (nextAuthSession?.user) {
      return {
        user: {
          id: (nextAuthSession.user as UnifiedUser).id || '',
          email: nextAuthSession.user.email || '',
          name: nextAuthSession.user.name || null,
          image: nextAuthSession.user.image || null,
        },
        expires: nextAuthSession.expires || null,
      };
    }
  } catch (nextAuthError) {
    logger.warn('NextAuth session check failed', {
      error: nextAuthError instanceof Error ? nextAuthError.message : 'Unknown',
      component: 'unified-session',
    });
  }

  return null;
}
