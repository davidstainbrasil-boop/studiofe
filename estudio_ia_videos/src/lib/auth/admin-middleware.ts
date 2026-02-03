/**
 * Admin Authentication Middleware
 * 
 * Helpers para verificar e requerer autenticação de administrador
 * em rotas administrativas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@lib/supabase/server';
import { logger } from '@lib/logger';

/**
 * Cria cliente Supabase a partir da requisição
 */
function getSupabaseForRequest(_request: NextRequest) {
  return createClient();
}

/**
 * Verifica se o usuário autenticado é admin
 * 
 * @param request - NextRequest da rota
 * @returns null se não autenticado, false se não admin, true se admin
 */
export async function verifyAdmin(request: NextRequest): Promise<boolean | null> {
  try {
    const supabase = getSupabaseForRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null; // Não autenticado
    }

    // Verificar role do usuário no banco de dados
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.warn('User profile not found for admin check', {
        component: 'admin-middleware',
        userId: user.id,
        error: profileError?.message
      });
      return false;
    }

    const isAdmin = profile.role === 'admin';
    
    if (isAdmin) {
      logger.debug('Admin access granted', {
        component: 'admin-middleware',
        userId: user.id
      });
    }

    return isAdmin;
  } catch (error) {
    logger.error('Error verifying admin status', error instanceof Error ? error : new Error(String(error)), {
      component: 'admin-middleware'
    });
    return false;
  }
}

/**
 * Middleware helper que requer admin
 * Retorna objeto com status e resposta HTTP se necessário
 * 
 * @param request - NextRequest da rota
 * @returns Objeto com isAdmin (boolean) e response opcional (NextResponse)
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { isAdmin, response } = await requireAdmin(request);
 *   if (!isAdmin) return response!;
 *   
 *   // Código da rota admin aqui
 * }
 * ```
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ isAdmin: boolean; response?: NextResponse }> {
  const adminStatus = await verifyAdmin(request);

  if (adminStatus === null) {
    logger.warn('Admin route accessed without authentication', {
      component: 'admin-middleware',
      path: request.nextUrl.pathname
    });
    
    return {
      isAdmin: false,
      response: NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      ),
    };
  }

  if (!adminStatus) {
    logger.warn('Admin route accessed by non-admin user', {
      component: 'admin-middleware',
      path: request.nextUrl.pathname
    });
    
    return {
      isAdmin: false,
      response: NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      ),
    };
  }

  return { isAdmin: true };
}

/**
 * Legacy function - mantida para compatibilidade
 * @deprecated Use requireAdmin() ao invés desta função
 */
export function isAdminUser(email?: string | null): boolean {
  if (!email) return false;
  // TODO: Move to environment variable or database check
  const adminEmails = ['admin@estudioia.com', 'admin@cursostecno.com.br'];
  return adminEmails.includes(email);
}
