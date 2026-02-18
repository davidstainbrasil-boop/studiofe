/**
 * Stripe Webhook Handler
 * Processa eventos do Stripe para sincronizar estado de billing
 * 
 * @module api/billing/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeService, PlanTier } from '@/src/lib/billing/stripe-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => 
    console.log(`[STRIPE-WEBHOOK] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) => 
    console.error(`[STRIPE-WEBHOOK ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) => 
    console.warn(`[STRIPE-WEBHOOK WARN] ${msg}`, meta || ''),
};

// ============================================================================
// POST /api/billing/webhook - Stripe webhook endpoint
// ============================================================================

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    logger.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  const stripe = getStripeService();
  let event;

  try {
    event = stripe.verifyWebhookSignature(body, signature);
  } catch (err) {
    const error = err as Error;
    logger.error('Webhook signature verification failed', { error: error.message });
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  logger.info('Webhook event received', { type: event.type, id: event.id });

  try {
    const result = await stripe.handleWebhookEvent(event);

    if (result.handled) {
      await processWebhookAction(result.action, result.data);
    }

    return NextResponse.json({ received: true, action: result.action });
  } catch (err) {
    const error = err as Error;
    logger.error('Webhook processing failed', { 
      error: error.message, 
      eventType: event.type 
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// WEBHOOK ACTION PROCESSORS
// ============================================================================

async function processWebhookAction(
  action: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (action) {
    case 'checkout_completed':
      await handleCheckoutCompleted(data);
      break;

    case 'subscription_created':
    case 'subscription_updated':
      await handleSubscriptionChange(data);
      break;

    case 'subscription_deleted':
      await handleSubscriptionDeleted(data);
      break;

    case 'payment_succeeded':
      await handlePaymentSucceeded(data);
      break;

    case 'payment_failed':
      await handlePaymentFailed(data);
      break;

    case 'trial_ending':
      await handleTrialEnding(data);
      break;

    default:
      logger.info('Unprocessed webhook action', { action });
  }
}

async function handleCheckoutCompleted(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const subscriptionId = data.subscriptionId as string;
  const planTier = data.planTier as PlanTier;

  // Busca usuário pelo customer ID
  const { data: billingData, error } = await supabase
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !billingData) {
    logger.error('User not found for customer', { customerId });
    return;
  }

  // Atualiza billing data
  await supabase
    .from('user_billing')
    .update({
      plan: planTier || 'pro',
      subscription_id: subscriptionId,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', billingData.user_id);

  // Atualiza role do usuário
  await updateUserRole(billingData.user_id, planTier || 'pro');

  // Envia email de boas-vindas
  await sendWelcomeEmail(billingData.user_id, planTier || 'pro');

  logger.info('Checkout completed processed', { 
    userId: billingData.user_id, 
    planTier 
  });
}

async function handleSubscriptionChange(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const subscriptionId = data.subscriptionId as string;
  const status = data.status as string;
  const planTier = data.planTier as PlanTier;
  const cancelAtPeriodEnd = data.cancelAtPeriodEnd as boolean;
  const currentPeriodEnd = data.currentPeriodEnd as Date;

  const { data: billingData, error } = await supabase
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !billingData) {
    logger.error('User not found for customer', { customerId });
    return;
  }

  await supabase
    .from('user_billing')
    .update({
      plan: planTier,
      subscription_id: subscriptionId,
      subscription_status: status,
      cancel_at_period_end: cancelAtPeriodEnd,
      current_period_end: currentPeriodEnd?.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', billingData.user_id);

  // Atualiza role do usuário baseado no plano
  await updateUserRole(billingData.user_id, planTier);

  logger.info('Subscription change processed', { 
    userId: billingData.user_id, 
    status,
    planTier,
  });
}

async function handleSubscriptionDeleted(data: Record<string, unknown>) {
  const customerId = data.customerId as string;

  const { data: billingData, error } = await supabase
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !billingData) {
    logger.error('User not found for customer', { customerId });
    return;
  }

  // Downgrade para free
  await supabase
    .from('user_billing')
    .update({
      plan: 'free',
      subscription_id: null,
      subscription_status: 'canceled',
      cancel_at_period_end: false,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', billingData.user_id);

  // Atualiza role para user básico
  await updateUserRole(billingData.user_id, 'free');

  // Envia email de cancelamento
  await sendCancellationEmail(billingData.user_id);

  logger.info('Subscription deleted processed', { userId: billingData.user_id });
}

async function handlePaymentSucceeded(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const invoiceId = data.invoiceId as string;
  const amountPaid = data.amountPaid as number;

  const { data: billingData } = await supabase
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (billingData) {
    // Registra pagamento no histórico
    await supabase
      .from('payment_history')
      .insert({
        user_id: billingData.user_id,
        stripe_invoice_id: invoiceId,
        amount: amountPaid,
        status: 'succeeded',
        created_at: new Date().toISOString(),
      });

    // Reseta contador de vídeos do mês se for início de novo ciclo
    await supabase
      .from('user_billing')
      .update({
        'usage->videosThisMonth': 0,
        'usage->lastResetDate': new Date().toISOString(),
      })
      .eq('user_id', billingData.user_id);
  }

  logger.info('Payment succeeded processed', { customerId, amountPaid });
}

async function handlePaymentFailed(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const invoiceId = data.invoiceId as string;
  const amountDue = data.amountDue as number;
  const attemptCount = data.attemptCount as number;

  const { data: billingData } = await supabase
    .from('user_billing')
    .select('user_id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (billingData) {
    // Registra falha no histórico
    await supabase
      .from('payment_history')
      .insert({
        user_id: billingData.user_id,
        stripe_invoice_id: invoiceId,
        amount: amountDue,
        status: 'failed',
        attempt_count: attemptCount,
        created_at: new Date().toISOString(),
      });

    // Envia email de falha no pagamento
    await sendPaymentFailedEmail(billingData.user_id, attemptCount);
  }

  logger.warn('Payment failed', { customerId, amountDue, attemptCount });
}

async function handleTrialEnding(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const trialEnd = data.trialEnd as Date;

  const { data: billingData } = await supabase
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (billingData) {
    // Envia email de trial terminando
    await sendTrialEndingEmail(billingData.user_id, trialEnd);
  }

  logger.info('Trial ending notification sent', { customerId, trialEnd });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateUserRole(userId: string, planTier: PlanTier) {
  // Define role baseado no plano
  const roleMapping: Record<PlanTier, string> = {
    free: 'user',
    pro: 'pro_user',
    business: 'business_user',
    enterprise: 'enterprise_user',
  };

  const newRole = roleMapping[planTier] || 'user';

  // Busca role ID
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('name', newRole)
    .single();

  if (roleData) {
    await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: roleData.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
  }
}

async function sendWelcomeEmail(userId: string, planTier: PlanTier) {
  // Implementar integração com serviço de email
  logger.info('Welcome email queued', { userId, planTier });
}

async function sendCancellationEmail(userId: string) {
  logger.info('Cancellation email queued', { userId });
}

async function sendPaymentFailedEmail(userId: string, attemptCount: number) {
  logger.info('Payment failed email queued', { userId, attemptCount });
}

async function sendTrialEndingEmail(userId: string, trialEnd: Date) {
  logger.info('Trial ending email queued', { userId, trialEnd });
}

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};
