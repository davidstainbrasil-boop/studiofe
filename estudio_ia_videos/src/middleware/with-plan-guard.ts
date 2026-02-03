/**
 * Plan Guard Middleware (API)
 *
 * Bloqueia acesso a features premium baseado no plano do usuário.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';

export type PlanTier = 'free' | 'pro' | 'business';

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export interface PlanGuardOptions {
  requiredPlan: PlanTier;
  feature?: string;
  allowTrial?: boolean;
}

export function withPlanGuard(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  options: PlanGuardOptions
) {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    const { requiredPlan, feature, allowTrial = true } = options;

    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { plan: currentPlan, status } = await resolveUserPlan(supabase, user.id, allowTrial);

    if (PLAN_RANK[currentPlan] < PLAN_RANK[requiredPlan]) {
      logger.warn('Acesso premium bloqueado', {
        userId: user.id,
        feature,
        currentPlan,
        requiredPlan,
        status,
      });

      return NextResponse.json(
        {
          error: 'Plano insuficiente para esta feature',
          code: 'PLAN_REQUIRED',
          feature,
          currentPlan,
          requiredPlan,
          upgradeUrl: '/pricing',
        },
        { status: 402 }
      );
    }

    return handler(req, context);
  };
}

async function resolveUserPlan(
  supabase: ReturnType<typeof getSupabaseForRequest>,
  userId: string,
  allowTrial: boolean
): Promise<{ plan: PlanTier; status: string }> {
  try {
    // Cast to any to bypass Supabase type checking for subscriptions table
    const { data: subscription, error } = await (supabase as any)
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single() as { data: { plan: string; status: string } | null; error: any };

    if (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode !== 'PGRST116') {
        logger.warn('Erro ao buscar subscription no plan guard', {
          userId,
          error: error.message,
          code: errorCode,
        });
      }

      return { plan: 'free', status: 'none' };
    }

    const plan = (subscription?.plan as PlanTier) || 'free';
    const status = subscription?.status || 'active';
    const isActive = ACTIVE_STATUSES.has(status) || (allowTrial && status === 'trialing');

    return {
      plan: isActive ? plan : 'free',
      status,
    };
  } catch (error) {
    logger.warn('Falha ao resolver plano do usuário', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return { plan: 'free', status: 'error' };
  }
}
