/**
 * 🔒 Safe Authentication Helper
 * 
 * Centraliza a extração segura de userId de requests API.
 * 
 * REGRAS DE SEGURANÇA:
 * - Em PRODUÇÃO: APENAS Supabase auth é aceito
 * - Em DESENVOLVIMENTO (NODE_ENV=development + SKIP_AUTH=true): permite x-user-id header
 * - O header x-user-id NUNCA é aceito em produção
 */

import { NextRequest } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';

export interface AuthResult {
  userId: string;
  email?: string;
  authenticated: true;
}

export interface AuthError {
  authenticated: false;
  error: string;
  status: 401;
}

/**
 * Extrai userId autenticado de forma segura.
 * 
 * Em produção: SOMENTE Supabase auth.
 * Em dev (NODE_ENV=development + SKIP_AUTH=true): permite x-user-id header como fallback.
 */
export async function getAuthenticatedUserId(
  req: NextRequest
): Promise<AuthResult | AuthError> {
  // Em desenvolvimento com SKIP_AUTH, permitir header x-user-id
  const isDev = process.env.NODE_ENV === 'development';
  const skipAuth = process.env.SKIP_AUTH === 'true';
  
  if (isDev && skipAuth) {
    const headerUserId = req.headers.get('x-user-id');
    if (headerUserId) {
      logger.warn('Dev auth bypass via x-user-id header', { 
        userId: headerUserId.substring(0, 8) + '...',
        component: 'safe-auth' 
      });
      return { userId: headerUserId, authenticated: true };
    }
  }

  // Autenticação real via Supabase (OBRIGATÓRIO em produção)
  try {
    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { 
        authenticated: false, 
        error: 'Não autenticado', 
        status: 401 
      };
    }

    return { 
      userId: user.id, 
      email: user.email, 
      authenticated: true 
    };
  } catch (error) {
    logger.error('Auth error in safe-auth', 
      error instanceof Error ? error : new Error(String(error)),
      { component: 'safe-auth' }
    );
    return { 
      authenticated: false, 
      error: 'Erro de autenticação', 
      status: 401 
    };
  }
}
