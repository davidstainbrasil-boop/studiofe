/**
 * 💳 Billing Service
 * Stripe integration for subscription management
 */

import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { getOptionalEnv, getRequiredEnv } from '@lib/env';
import Stripe from 'stripe';

function asMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

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

export class BillingService {
  private stripe: Stripe;

  constructor() {
    const stripeKey = getRequiredEnv('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16', // Fixed version or use '2024-12-18.acacia' if supported by installed lib
      typescript: true,
    });
  }

  /**
   * Create a Stripe checkout session
   */
  async createCheckoutSession(
    userId: string,
    planId: PlanId,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string }> {
    try {
      const plan = PLANS[planId];
      if (!plan || !plan.priceId) {
        throw new Error('Invalid plan or missing price ID');
      }

      // Get user email
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { email: true, metadata: true }
      });

      if (!user) throw new Error('User not found');

      // Check for existing customer ID
      const metadata = asMetadataRecord(user.metadata);
      let customerId = typeof metadata.stripeCustomerId === 'string' ? metadata.stripeCustomerId : undefined;

      // If no customer ID, create one (or let Checkout create it, but better to link explicitely)
      if (!customerId && user.email) {
          const customer = await this.stripe.customers.create({
              email: user.email,
              metadata: { userId }
          });
          customerId = customer.id;
          
          // Save customer ID
          await prisma.users.update({
              where: { id: userId },
              data: {
                  metadata: { ...metadata, stripeCustomerId: customerId }
              }
          });
      }

      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: customerId, // If null, Stripe creates new customer. Better to provide if we have it.
        customer_email: customerId ? undefined : user.email, // If customer provided, email inferred
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
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      if (!session.url) throw new Error('Failed to generate session URL');

      logger.info('Checkout session created', {
        component: 'BillingService',
        userId,
        planId,
        sessionId: session.id
      });

      return { url: session.url };
    } catch (error) {
      logger.error('Failed to create checkout session', error instanceof Error ? error : new Error(String(error)));
      throw error; // Throw to let caller handle 500
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    const webhookSecret = getRequiredEnv('STRIPE_WEBHOOK_SECRET');

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      logger.info(`Processing Stripe webhook: ${event.type}`, { eventId: event.id });

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;

          if (userId && planId) {
            await this.updateUserPlan(userId, planId as PlanId);
            
            // Link customer ID if not already
            if (session.customer) {
                await this.updateStripeCustomerId(userId, session.customer as string);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          // Find user by customer ID
          const customerId = subscription.customer as string;
          const user = await this.findUserByCustomerId(customerId);
          
          if (user) {
            await this.updateUserPlan(user.id, 'free');
            logger.info('Subscription deleted, downgraded to free', { userId: user.id });
          }
          break;
        }
        
        case 'customer.subscription.updated': {
             // Handle plan changes or renewals
             const subscription = event.data.object as Stripe.Subscription;
             // Logic to sync status (active, past_due, etc)
             break;
        }
      }

    } catch (error) {
      logger.error('Webhook handling failed', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Webhook Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update user's plan in database
   */
  private async updateUserPlan(userId: string, planId: PlanId): Promise<void> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { metadata: true }
      });

      const currentMetadata = asMetadataRecord(user?.metadata);

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
  
  private async updateStripeCustomerId(userId: string, customerId: string): Promise<void> {
      const user = await prisma.users.findUnique({ where: { id: userId }, select: { metadata: true }});
      const metadata = asMetadataRecord(user?.metadata);
      const existingCustomerId =
        typeof metadata.stripeCustomerId === 'string' ? metadata.stripeCustomerId : undefined;

      if (existingCustomerId !== customerId) {
          await prisma.users.update({
              where: { id: userId },
              data: { metadata: { ...metadata, stripeCustomerId: customerId } }
          });
      }
  }
  
  private async findUserByCustomerId(customerId: string): Promise<{ id: string } | null> {
      const user = await prisma.users.findFirst({
        where: {
          metadata: {
            path: ['stripeCustomerId'],
            equals: customerId
          }
        },
        select: { id: true }
      });

      if (!user) {
        logger.warn('No user found for Stripe customer', {
          component: 'BillingService',
          customerId
        });
      }

      return user;
  }

  /**
   * Get customer portal URL for managing subscription
   */
  async getCustomerPortalUrl(
    userId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });

    const metadata = asMetadataRecord(user?.metadata);
    const customerId = typeof metadata.stripeCustomerId === 'string' ? metadata.stripeCustomerId : null;

    if (!customerId) {
      throw new Error('No billing account found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return { url: session.url };
  }
}

export const billingService = new BillingService();
