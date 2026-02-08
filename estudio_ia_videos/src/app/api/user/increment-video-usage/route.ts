import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { getServerAuth } from '@lib/auth/unified-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cliente admin para updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/user/increment-video-usage
 * Incrementa o contador de vídeos usados do usuário
 * Deve ser chamado quando um vídeo é criado com sucesso
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
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

    // Buscar subscription atual
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('videos_used_this_month, plan_id')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      // Se não existe subscription, criar uma com plano free
      const { error: createError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: 'free',
          status: 'active',
          videos_used_this_month: 1,
        });

      if (createError) {
        logger.error('Erro ao criar subscription', new Error(createError.message), { userId });
        return NextResponse.json(
          { error: 'Erro ao registrar uso' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        videos_used: 1,
        message: 'Uso registrado (nova subscription criada)',
      });
    }

    // Incrementar contador
    const newCount = (subscription.videos_used_this_month || 0) + 1;
    
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        videos_used_this_month: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      logger.error('Erro ao incrementar uso', new Error(updateError.message), { userId });
      return NextResponse.json(
        { error: 'Erro ao registrar uso' },
        { status: 500 }
      );
    }

    logger.info('Uso de vídeo incrementado', { userId, newCount });

    return NextResponse.json({
      success: true,
      videos_used: newCount,
      message: 'Uso registrado com sucesso',
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao incrementar uso de vídeo', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
