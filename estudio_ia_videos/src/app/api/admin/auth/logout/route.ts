import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@lib/logger';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Remover cookie de autenticação
    cookieStore.delete('admin_token');

    return NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    logger.error('Erro no logout admin', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: admin/auth/logout'
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
