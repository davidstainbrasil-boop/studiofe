/**
 * Stripe Customer Portal API
 * POST /api/stripe/portal
 * 
 * Cria uma sessão do Stripe Customer Portal para o usuário gerenciar sua assinatura
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { getAppOrigin, resolveTrustedAppUrl } from '@/lib/config/app-url';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface PortalRequest {
  userId?: string;
  returnUrl?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(req, 'stripe-portal', 10);
    if (blocked) return blocked;

    const body = await req.json() as PortalRequest;
    const { userId: requestedUserId, returnUrl } = body;
    const userId = session.user.id;
    const resolvedReturnUrl = resolveTrustedAppUrl(returnUrl, {
      baseOrigin: getAppOrigin(),
      fallbackPath: '/dashboard/billing',
    });

    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'Operação não permitida para este usuário' },
        { status: 403 }
      );
    }

    // Buscar customer_id do usuário
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      logger.warn('Usuário sem customer_id no Stripe', { userId });
      return NextResponse.json(
        { error: 'Nenhuma assinatura encontrada. Assine um plano primeiro.' },
        { status: 400 }
      );
    }

    // Criar sessão do portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: resolvedReturnUrl,
    });

    logger.info('Sessão do portal criada', {
      userId,
      customerId: subscription.stripe_customer_id,
    });

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao criar sessão do portal', err);
    return NextResponse.json(
      { error: 'Erro ao criar sessão do portal' },
      { status: 500 }
    );
  }
}
