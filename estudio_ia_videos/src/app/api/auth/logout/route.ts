/**
 * API de Logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@lib/auth/auth-middleware';
import { logger } from '@lib/logger';
import { createClient } from '@lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Sign out from Supabase
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore Supabase signout errors
    }

    // Preparar resposta
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

    // Limpar cookies de autenticação
    AuthMiddleware.clearAuthCookies(response);

    // Log de segurança
    logger.info('User logged out', { component: 'API: auth/logout', timestamp: new Date().toISOString() });

    return response;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Logout error', err, { component: 'API: auth/logout' });
    
    // Mesmo com erro, limpar cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado'
    });

    AuthMiddleware.clearAuthCookies(response);
    return response;
  }
}
