/**
 * Billing API Routes
 * API REST para gerenciamento de billing e subscriptions
 * 
 * Endpoints:
 * - POST /api/billing/checkout - Criar checkout session
 * - POST /api/billing/portal - Criar customer portal session
 * - GET /api/billing/subscription - Status da subscription
 * - POST /api/billing/cancel - Cancelar subscription
 * - GET /api/billing/invoices - Listar invoices
 * - GET /api/billing/plans - Listar planos disponíveis
 * - POST /api/billing/validate-coupon - Validar cupom
 * 
 * @module api/billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getStripeService, 
  getPaywallService,
  PLANS,
  PlanTier,
  PlanConfig,
  BillingInterval,
} from '@/src/lib/billing/stripe-service';

// ============================================================================
// HELPERS
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  return user;
}

async function getUserBillingData(userId: string) {
  const { data, error } = await supabase
    .from('user_billing')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching billing data:', error);
  }

  return data;
}

async function updateUserBillingData(userId: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from('user_billing')
    .upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating billing data:', error);
    throw error;
  }
}

// ============================================================================
// GET /api/billing - Get billing status
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'subscription':
        return getSubscriptionStatus(user.id);
      case 'invoices':
        return getInvoices(user.id);
      case 'plans':
        return getPlans();
      case 'usage':
        return getUsage(user.id);
      default:
        return getSubscriptionStatus(user.id);
    }
  } catch (error) {
    console.error('Billing GET error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function getSubscriptionStatus(userId: string) {
  const billingData = await getUserBillingData(userId);
  
  if (!billingData?.stripe_customer_id) {
    return NextResponse.json({
      plan: 'free',
      status: 'active',
      limits: PLANS.free.limits,
      usage: {
        videosThisMonth: 0,
        storageUsedGB: 0,
      },
    });
  }

  const stripe = getStripeService();
  const subscription = await stripe.getActiveSubscription(billingData.stripe_customer_id);

  if (!subscription) {
    return NextResponse.json({
      plan: 'free',
      status: 'active',
      limits: PLANS.free.limits,
      usage: billingData.usage || {
        videosThisMonth: 0,
        storageUsedGB: 0,
      },
    });
  }

  const planTier = (subscription.metadata?.planTier || 'pro') as PlanTier;

  return NextResponse.json({
    plan: planTier,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    limits: PLANS[planTier]?.limits || PLANS.free.limits,
    usage: billingData.usage || {
      videosThisMonth: 0,
      storageUsedGB: 0,
    },
  });
}

async function getInvoices(userId: string) {
  const billingData = await getUserBillingData(userId);
  
  if (!billingData?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] });
  }

  const stripe = getStripeService();
  const invoices = await stripe.listInvoices(billingData.stripe_customer_id);

  return NextResponse.json({ invoices });
}

async function getPlans() {
  const plans = Object.values(PLANS).map((plan: PlanConfig) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    features: plan.features,
    pricing: {
      monthly: plan.pricing.monthly / 100,
      yearly: plan.pricing.yearly / 100,
      monthlySavings: ((plan.pricing.monthly * 12) - plan.pricing.yearly) / 100,
    },
    limits: plan.limits,
    popular: plan.popular || false,
  }));

  return NextResponse.json({ plans });
}

async function getUsage(userId: string) {
  const billingData = await getUserBillingData(userId);
  const planTier = (billingData?.plan || 'free') as PlanTier;
  const limits = PLANS[planTier]?.limits || PLANS.free.limits;

  // Calcula uso real dos vídeos
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: videosThisMonth } = await supabase
    .from('render_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', startOfMonth.toISOString());

  // Calcula storage usado
  const { data: storageData } = await supabase
    .from('projects')
    .select('storage_size')
    .eq('user_id', userId);

  const storageUsedBytes = storageData?.reduce((acc, p) => acc + (p.storage_size || 0), 0) || 0;
  const storageUsedGB = storageUsedBytes / (1024 * 1024 * 1024);

  return NextResponse.json({
    usage: {
      videosThisMonth: videosThisMonth || 0,
      videosLimit: limits.videosPerMonth,
      videosRemaining: limits.videosPerMonth === -1 
        ? 'unlimited' 
        : Math.max(0, limits.videosPerMonth - (videosThisMonth || 0)),
      storageUsedGB: Math.round(storageUsedGB * 100) / 100,
      storageLimit: limits.maxStorageGB,
      storageRemaining: limits.maxStorageGB === -1
        ? 'unlimited'
        : Math.max(0, limits.maxStorageGB - storageUsedGB),
    },
    limits,
    plan: planTier,
  });
}

// ============================================================================
// POST /api/billing - Billing actions
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'checkout':
        return createCheckout(user.id, user.email!, body);
      case 'portal':
        return createPortal(user.id, body);
      case 'cancel':
        return cancelSubscription(user.id, body);
      case 'reactivate':
        return reactivateSubscription(user.id);
      case 'validate-coupon':
        return validateCoupon(body);
      case 'check-paywall':
        return checkPaywall(user.id, body);
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Billing POST error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function createCheckout(
  userId: string,
  email: string,
  body: { planTier: PlanTier; interval: BillingInterval; couponCode?: string }
) {
  const { planTier, interval, couponCode } = body;

  if (!planTier || !interval) {
    return NextResponse.json(
      { error: 'planTier e interval são obrigatórios' },
      { status: 400 }
    );
  }

  if (planTier === 'free') {
    return NextResponse.json(
      { error: 'Não é possível fazer checkout do plano gratuito' },
      { status: 400 }
    );
  }

  if (planTier === 'enterprise') {
    return NextResponse.json(
      { error: 'Plano Enterprise requer contato comercial' },
      { status: 400 }
    );
  }

  const stripe = getStripeService();

  // Busca ou cria customer
  let billingData = await getUserBillingData(userId);
  let customerId = billingData?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.getOrCreateCustomer(userId, email);
    customerId = customer.id;

    await updateUserBillingData(userId, {
      stripe_customer_id: customerId,
      plan: 'free',
    });
  }

  // Cria checkout session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const session = await stripe.createCheckoutSession({
    customerId,
    planTier,
    interval,
    successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/billing/cancel`,
    couponCode,
    trialDays: planTier === 'pro' ? 7 : undefined, // 7 dias de trial para Pro
    metadata: { userId },
  });

  return NextResponse.json({
    checkoutUrl: session.url,
    sessionId: session.id,
  });
}

async function createPortal(userId: string, body: { returnUrl?: string }) {
  const billingData = await getUserBillingData(userId);
  
  if (!billingData?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Nenhuma conta de billing encontrada' },
      { status: 400 }
    );
  }

  const stripe = getStripeService();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.createPortalSession({
    customerId: billingData.stripe_customer_id,
    returnUrl: body.returnUrl || `${baseUrl}/settings/billing`,
  });

  return NextResponse.json({
    portalUrl: session.url,
  });
}

async function cancelSubscription(userId: string, body: { immediately?: boolean }) {
  const billingData = await getUserBillingData(userId);
  
  if (!billingData?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Nenhuma subscription encontrada' },
      { status: 400 }
    );
  }

  const stripe = getStripeService();
  const subscription = await stripe.getActiveSubscription(billingData.stripe_customer_id);

  if (!subscription) {
    return NextResponse.json(
      { error: 'Nenhuma subscription ativa' },
      { status: 400 }
    );
  }

  await stripe.cancelSubscription(subscription.id, body.immediately || false);

  return NextResponse.json({
    message: body.immediately 
      ? 'Subscription cancelada imediatamente'
      : 'Subscription será cancelada no fim do período',
    cancelAtPeriodEnd: !body.immediately,
  });
}

async function reactivateSubscription(userId: string) {
  const billingData = await getUserBillingData(userId);
  
  if (!billingData?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Nenhuma subscription encontrada' },
      { status: 400 }
    );
  }

  const stripe = getStripeService();
  const subscription = await stripe.getActiveSubscription(billingData.stripe_customer_id);

  if (!subscription) {
    return NextResponse.json(
      { error: 'Nenhuma subscription ativa' },
      { status: 400 }
    );
  }

  await stripe.reactivateSubscription(subscription.id);

  return NextResponse.json({
    message: 'Subscription reativada com sucesso',
  });
}

async function validateCoupon(body: { code: string }) {
  const { code } = body;
  
  if (!code) {
    return NextResponse.json(
      { error: 'Código do cupom é obrigatório' },
      { status: 400 }
    );
  }

  const stripe = getStripeService();
  const coupon = await stripe.validateCoupon(code);

  if (!coupon) {
    return NextResponse.json({
      valid: false,
      message: 'Cupom inválido ou expirado',
    });
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      id: coupon.id,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
      duration: coupon.duration,
      name: coupon.name,
    },
  });
}

async function checkPaywall(userId: string, body: { 
  action: 'create_video' | 'export_scorm' | 'api_access' | 'white_label';
  videoLength?: number;
  resolution?: '720p' | '1080p' | '4k';
}) {
  const billingData = await getUserBillingData(userId);
  const planTier = (billingData?.plan || 'free') as PlanTier;

  const paywall = getPaywallService();

  // Verifica ação
  const actionResult = paywall.canPerformAction(
    planTier,
    body.action,
    billingData?.usage
  );

  if (!actionResult.allowed) {
    const paywallInfo = actionResult.upgradeRequired 
      ? paywall.getPaywallInfo(actionResult.upgradeRequired)
      : null;

    return NextResponse.json({
      allowed: false,
      reason: actionResult.reason,
      currentLimit: actionResult.currentLimit,
      upgrade: paywallInfo,
    }, { status: 403 });
  }

  // Se for criação de vídeo, verifica limites adicionais
  if (body.action === 'create_video' && body.videoLength && body.resolution) {
    const videoResult = paywall.checkVideoLimits(
      planTier,
      body.videoLength,
      body.resolution
    );

    if (!videoResult.allowed) {
      const paywallInfo = videoResult.upgradeRequired 
        ? paywall.getPaywallInfo(videoResult.upgradeRequired)
        : null;

      return NextResponse.json({
        allowed: false,
        reason: videoResult.reason,
        currentLimit: videoResult.currentLimit,
        upgrade: paywallInfo,
      }, { status: 403 });
    }
  }

  return NextResponse.json({ allowed: true });
}
