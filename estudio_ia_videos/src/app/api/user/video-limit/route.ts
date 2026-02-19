import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cliente admin para consultas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Tipos locais para as tabelas que ainda não estão no schema gerado
interface Plan {
  id: string;
  name: string;
  video_limit: number;
}

interface Subscription {
  user_id: string;
  plan_id: string;
  status: string;
  videos_used_this_month: number;
  current_period_end: string | null;
  plan?: Plan;
}

/**
 * GET /api/user/video-limit
 * Verifica o limite de vídeos do usuário
 * 
 * Query params:
 * - userId: opcional (apenas para compatibilidade; o endpoint usa o usuário autenticado)
 */
export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'user-video-limit-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');
    const userId = session.user.id;

    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Buscar subscription do usuário
    const { data, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Cast para nosso tipo local
    const subscription = data as Subscription | null;

    if (subError || !subscription) {
      // Se não encontrou subscription, retornar valores default (plano free)
      return NextResponse.json({
        can_create: true,
        videos_used: 0,
        video_limit: 2,
        plan_name: 'Free',
        plan_id: 'free',
        remaining: 2,
      });
    }

    // Buscar dados do plano
    const { data: planData } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();

    const plan = planData as Plan | null;
    const videosUsed = subscription.videos_used_this_month || 0;
    const videoLimit = plan?.video_limit || 2;
    const isUnlimited = videoLimit === -1;
    const canCreate = isUnlimited || videosUsed < videoLimit;
    const remaining = isUnlimited ? -1 : Math.max(0, videoLimit - videosUsed);

    return NextResponse.json({
      can_create: canCreate,
      videos_used: videosUsed,
      video_limit: isUnlimited ? 'Ilimitado' : videoLimit,
      plan_name: plan?.name || 'Free',
      plan_id: plan?.id || 'free',
      remaining: remaining,
      subscription_status: subscription.status,
      current_period_end: subscription.current_period_end,
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao verificar limite de vídeos', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
