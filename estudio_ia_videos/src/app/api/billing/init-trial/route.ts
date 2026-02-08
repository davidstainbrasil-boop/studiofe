/**
 * Initialize Trial API
 * POST /api/billing/init-trial
 * 
 * Cria subscription de trial para novos usuários
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, plan = 'pro', trialDays = 7 } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, plan, status')
      .eq('user_id', userId)
      .single();

    // Se já tem subscription paga, não sobrescrever
    if (existing && existing.plan !== 'free' && existing.status === 'active') {
      return NextResponse.json({
        success: true,
        message: 'Usuário já possui assinatura ativa',
        subscription: existing,
      });
    }

    // Calcular período de trial
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    // Criar ou atualizar subscription para trial
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan,
        status: 'trialing',
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (subError) {
      logger.error('Erro ao criar subscription de trial', new Error(subError.message));
      return NextResponse.json(
        { error: 'Erro ao iniciar trial' },
        { status: 500 }
      );
    }

    // Criar registro de usage para o período
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        videos_created: 0,
        storage_used_bytes: 0,
        tts_minutes_used: 0,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      }, {
        onConflict: 'user_id,period_start'
      });

    logger.info('Trial iniciado com sucesso', {
      userId,
      plan,
      trialDays,
      trialEnd: trialEnd.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Trial de ${trialDays} dias do plano ${plan} iniciado!`,
      subscription,
      trialEndsAt: trialEnd.toISOString(),
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao iniciar trial', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
