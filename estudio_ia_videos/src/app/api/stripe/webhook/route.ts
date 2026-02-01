/**
 * Stripe Webhook Handler
 * POST /api/stripe/webhook
 * 
 * Processa eventos do Stripe (pagamentos, cancelamentos, etc)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Mapeia price IDs para planos
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly']: 'pro',
  [process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS_MONTHLY || 'price_business_monthly']: 'business',
  [process.env.STRIPE_PRICE_BUSINESS_YEARLY || 'price_business_yearly']: 'business',
};

// Limites de vídeos por plano
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  pro: 10,
  business: -1, // ilimitado
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      logger.warn('Webhook sem assinatura');
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 400 }
      );
    }

    // Verificar assinatura do webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Invalid signature');
      logger.error('Erro ao verificar webhook', error);
      return NextResponse.json(
        { error: 'Assinatura inválida' },
        { status: 400 }
      );
    }

    logger.info('Webhook recebido', { type: event.type, id: event.id });

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info('Evento não processado', { type: event.type });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro no webhook', err);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * Checkout completado com sucesso
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    logger.warn('Checkout sem user_id nos metadata', { sessionId: session.id });
    return;
  }

  logger.info('Checkout completado', { userId, sessionId: session.id });

  // A subscription será criada pelo evento customer.subscription.created
}

/**
 * Subscription criada ou atualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    // Tentar buscar pelo customer
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();
    
    if (!sub) {
      logger.warn('Subscription sem user_id', { subscriptionId: subscription.id });
      return;
    }
  }

  // Determinar o plano baseado no price
  const priceId = subscription.items.data[0]?.price.id;
  const plan = PRICE_TO_PLAN[priceId] || 'pro';

  // Mapear status do Stripe para nosso status
  let status: string;
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'canceled';
      break;
    default:
      status = 'active';
  }

  // Atualizar no Supabase
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId || (await getUserIdFromCustomer(subscription.customer as string)),
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      plan,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    logger.error('Erro ao atualizar subscription', new Error(error.message), { subscriptionId: subscription.id });
    return;
  }

  logger.info('Subscription atualizada', {
    userId,
    plan,
    status,
    subscriptionId: subscription.id,
  });
}

/**
 * Subscription cancelada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Buscar user_id pelo customer
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!sub) {
    logger.warn('Subscription não encontrada para cancelamento', { customerId });
    return;
  }

  // Fazer downgrade para free
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      videos_used_this_month: 0, // Reset ao cancelar
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', sub.user_id);

  if (error) {
    logger.error('Erro ao cancelar subscription', new Error(error.message));
    return;
  }

  logger.info('Subscription cancelada, downgrade para free', { userId: sub.user_id });
}

/**
 * Fatura paga - reset de uso mensal
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Buscar subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id, plan')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!sub) {
    return;
  }

  // Reset do contador de vídeos usados
  await supabase
    .from('subscriptions')
    .update({
      videos_used_this_month: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', sub.user_id);

  logger.info('Fatura paga, reset de uso mensal', { userId: sub.user_id });
}

/**
 * Pagamento falhou
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!sub) {
    return;
  }

  // Marcar como past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', sub.user_id);

  logger.warn('Pagamento falhou', { userId: sub.user_id, invoiceId: invoice.id });

  // TODO: Enviar email de notificação
}

/**
 * Busca user_id pelo customer_id do Stripe
 */
async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  return data?.user_id || null;
}
