/**
 * Stripe Checkout Session API
 * POST /api/stripe/checkout
 * 
 * Cria uma sessão de checkout do Stripe para upgrade de plano
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { getAppOrigin, resolveTrustedAppUrl } from '@/lib/config/app-url';

// Inicializa Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Supabase para buscar/atualizar dados do usuário
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Mapeamento de planos para price IDs do Stripe
const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || 'price_business_monthly',
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || 'price_business_yearly',
};

interface CheckoutRequest {
  userId?: string;
  priceId: keyof typeof PRICE_IDS;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(req: NextRequest) {
  const authSession = await getServerAuth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(req, 'stripe-checkout', 5);
    if (blocked) return blocked;

    const body = await req.json() as CheckoutRequest;
    const { userId: requestedUserId, priceId, successUrl, cancelUrl } = body;
    const userId = authSession.user.id;
    const appOrigin = getAppOrigin();
    const successRedirect = resolveTrustedAppUrl(successUrl, {
      baseOrigin: appOrigin,
      fallbackPath: '/dashboard?upgrade=success',
    });
    const cancelRedirect = resolveTrustedAppUrl(cancelUrl, {
      baseOrigin: appOrigin,
      fallbackPath: '/pricing',
    });

    // Validação
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'Operação não permitida para este usuário' },
        { status: 403 }
      );
    }

    if (!priceId || !PRICE_IDS[priceId]) {
      return NextResponse.json(
        { error: 'priceId inválido. Use: pro_monthly, pro_yearly, business_monthly, business_yearly' },
        { status: 400 }
      );
    }

    // Buscar usuário no Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logger.warn('Usuário não encontrado para checkout', { userId, error: userError });
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar ou criar customer no Stripe
    let stripeCustomerId: string;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id;
    } else {
      // Criar novo customer no Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          supabase_user_id: userId,
        },
      });
      stripeCustomerId = customer.id;

      // Salvar customer_id no Supabase
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          plan: 'free',
          status: 'active',
        }, {
          onConflict: 'user_id'
        });
    }

    // Criar sessão de checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[priceId],
          quantity: 1,
        },
      ],
      success_url: successRedirect,
      cancel_url: cancelRedirect,
      metadata: {
        user_id: userId,
        price_id: priceId,
      },
      locale: 'pt-BR',
      billing_address_collection: 'required',
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          user_id: userId,
        },
      },
    });

    logger.info('Sessão de checkout criada', {
      sessionId: checkoutSession.id,
      userId,
      priceId,
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao criar sessão de checkout', err);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar sessão de checkout' },
      { status: 500 }
    );
  }
}

// GET - Retorna URLs do portal de billing
export async function GET() {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Buscar customer_id
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      );
    }

    // Criar sessão do portal de billing
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getAppOrigin()}/settings`,
    });

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao criar sessão do portal', err);
    return NextResponse.json(
      { error: 'Erro ao criar sessão do portal de billing' },
      { status: 500 }
    );
  }
}
