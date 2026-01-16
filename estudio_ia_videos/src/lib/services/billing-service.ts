/**
 * 💳 Billing Service
 * Stripe integration for subscription management
 */

import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { getOptionalEnv } from '@lib/env';

// Plan pricing
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '3 Projects',
      '500 MB Storage',
      '10 min Video Export',
      '5 Exports/month'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: getOptionalEnv('STRIPE_PRO_PRICE_ID'),
    features: [
      '50 Projects',
      '10 GB Storage',
      '120 min Video Export',
      '100 Exports/month',
      'Priority Support'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: getOptionalEnv('STRIPE_ENTERPRISE_PRICE_ID'),
    features: [
      'Unlimited Projects',
      'Unlimited Storage',
      'Unlimited Video Export',
      'Unlimited Exports',
      'Custom Branding',
      'SSO Integration',
      'Dedicated Support'
    ]
  }
};

export type PlanId = keyof typeof PLANS;

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(
  userId: string,
  planId: PlanId,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | { error: string }> {
  const stripeSecretKey = getOptionalEnv('STRIPE_SECRET_KEY');
  
  if (!stripeSecretKey) {
    logger.warn('Stripe not configured, returning mock checkout', { component: 'BillingService' });
    return {
      url: `${successUrl}?mock=true&plan=${planId}`
    };
  }

  try {
    const plan = PLANS[planId];
    if (!plan || !plan.priceId) {
      return { error: 'Invalid plan' };
    }

    // Dynamic import to avoid build issues if stripe not installed
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

    // Get user email
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user?.email,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId
      }
    });

    logger.info('Checkout session created', {
      component: 'BillingService',
      userId,
      planId,
      sessionId: session.id
    });

    return { url: session.url || successUrl };
  } catch (error) {
    logger.error('Failed to create checkout session', error instanceof Error ? error : new Error(String(error)));
    return { error: 'Failed to create checkout session' };
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
  payload: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  const stripeSecretKey = getOptionalEnv('STRIPE_SECRET_KEY');
  const webhookSecret = getOptionalEnv('STRIPE_WEBHOOK_SECRET');

  if (!stripeSecretKey || !webhookSecret) {
    logger.warn('Stripe not configured', { component: 'BillingService' });
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { metadata?: { userId?: string; planId?: string } };
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (userId && planId) {
          await updateUserPlan(userId, planId as PlanId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { metadata?: { userId?: string } };
        const userId = subscription.metadata?.userId;

        if (userId) {
          await updateUserPlan(userId, 'free');
        }
        break;
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Webhook handling failed', error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: 'Webhook verification failed' };
  }
}

/**
 * Update user's plan in database
 */
async function updateUserPlan(userId: string, planId: PlanId): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });

    const currentMetadata = (user?.metadata as Record<string, unknown>) || {};

    await prisma.users.update({
      where: { id: userId },
      data: {
        metadata: {
          ...currentMetadata,
          plan: planId,
          planUpdatedAt: new Date().toISOString()
        }
      }
    });

    logger.info(`User plan updated to ${planId}`, {
      component: 'BillingService',
      userId
    });
  } catch (error) {
    logger.error('Failed to update user plan', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get customer portal URL for managing subscription
 */
export async function getCustomerPortalUrl(
  userId: string,
  returnUrl: string
): Promise<{ url: string } | { error: string }> {
  const stripeSecretKey = getOptionalEnv('STRIPE_SECRET_KEY');

  if (!stripeSecretKey) {
    return { error: 'Stripe not configured' };
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

    // Get user's Stripe customer ID
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });

    const metadata = user?.metadata as Record<string, unknown> | null;
    const customerId = metadata?.stripeCustomerId as string;

    if (!customerId) {
      return { error: 'No billing account found' };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return { url: session.url };
  } catch (error) {
    logger.error('Failed to create portal session', error instanceof Error ? error : new Error(String(error)));
    return { error: 'Failed to create portal session' };
  }
}
