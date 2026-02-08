import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cliente admin para updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/user/complete-onboarding
 * Marca o onboarding do usuário como completo
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Atualizar o perfil do usuário
    // Nota: A coluna onboarding_completed pode não existir ainda
    // Vamos usar metadata para armazenar este estado
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        metadata: {
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('Erro ao completar onboarding', new Error(error.message), { userId });
      return NextResponse.json(
        { error: 'Erro ao salvar progresso' },
        { status: 500 }
      );
    }

    logger.info('Onboarding completado', { userId });

    return NextResponse.json({
      success: true,
      message: 'Onboarding completado com sucesso',
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao completar onboarding', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
