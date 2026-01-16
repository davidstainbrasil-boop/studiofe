/**
 * API Get Current User
 * GET /api/auth/local/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { LocalAuth } from '@lib/auth/local-auth';
import { cookies } from 'next/headers';
import { logger } from '@lib/logger';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado', user: null },
        { status: 401 }
      );
    }

    const user = await LocalAuth.getUser(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Token inválido', user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error) {
    logger.error('Erro ao obter usuário atual', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: auth/local/me'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Logout - remover cookie
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return NextResponse.json({
      success: true,
      message: 'Logout realizado',
    });

  } catch (error) {
    logger.error('Erro no logout', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: auth/local/me'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

