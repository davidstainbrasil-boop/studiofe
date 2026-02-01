import Stripe from 'stripe'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fromUntypedTable } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// =============================================================================
// Stripe Webhook Handler
// =============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// Plan mapping from Stripe price IDs
const PLAN_FROM_PRICE: Record<string, 'free' | 'pro' | 'business'> = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY || '']: 'pro',
  [process.env.STRIPE_PRICE_PRO_YEARLY || '']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '']: 'business',
  [process.env.STRIPE_PRICE_BUSINESS_YEARLY || '']: 'business',
}

// =============================================================================
// Types
// =============================================================================

interface SubscriptionRecord {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: string
  status: string
}

// =============================================================================
// POST - Handle Stripe Webhooks
// =============================================================================

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.info('Unhandled webhook event', { type: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook handler error', error instanceof Error ? error : new Error(String(error)), { eventType: event.type })
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId) {
    logger.warn('Checkout completed without user_id', { sessionId: session.id })
    return
  }

  logger.info('Checkout completed', {
    userId,
    customerId,
    subscriptionId,
  })

  // The subscription update webhook will handle the plan update
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id
  const customerId = subscription.customer as string

  let actualUserId = userId

  if (!actualUserId) {
    // Try to find user by customer ID
    const { data: existingSub } = await fromUntypedTable<SubscriptionRecord>(
      supabaseAdmin,
      'subscriptions'
    )
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!existingSub) {
      logger.warn('Subscription update without user mapping', {
        subscriptionId: subscription.id,
        customerId,
      })
      return
    }
    actualUserId = (existingSub as SubscriptionRecord).user_id
  }

  // Get the price ID to determine plan
  const priceId = subscription.items.data[0]?.price?.id
  const plan = priceId ? (PLAN_FROM_PRICE[priceId] || 'free') : 'free'

  // Determine billing period
  const interval = subscription.items.data[0]?.price?.recurring?.interval
  const billingPeriod = interval === 'year' ? 'yearly' : 'monthly'

  // Update subscription in database
  const { error } = await fromUntypedTable(supabaseAdmin, 'subscriptions')
    .upsert({
      user_id: actualUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      billing_period: billingPeriod,
      status: mapStripeStatus(subscription.status),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    logger.error('Failed to update subscription', error instanceof Error ? error : new Error(String(error)), { userId: actualUserId })
    throw error
  }

  logger.info('Subscription updated', {
    userId: actualUserId,
    plan,
    status: subscription.status,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Find user by customer ID
  const { data: existingSub } = await fromUntypedTable<SubscriptionRecord>(
    supabaseAdmin,
    'subscriptions'
  )
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!existingSub) return

  const userId = (existingSub as SubscriptionRecord).user_id

  // Downgrade to free plan
  const { error } = await fromUntypedTable(supabaseAdmin, 'subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to handle subscription deletion', error instanceof Error ? error : new Error(String(error)), { userId })
    throw error
  }

  logger.info('Subscription deleted, downgraded to free', { userId })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Find user by customer ID
  const { data: existingSub } = await fromUntypedTable<SubscriptionRecord>(
    supabaseAdmin,
    'subscriptions'
  )
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!existingSub) return

  const userId = (existingSub as SubscriptionRecord).user_id

  // Record payment in billing_history (optional table)
  logger.info('Invoice paid', {
    userId,
    amount: invoice.amount_paid,
    invoiceId: invoice.id,
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Find user by customer ID
  const { data: existingSub } = await fromUntypedTable<SubscriptionRecord>(
    supabaseAdmin,
    'subscriptions'
  )
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!existingSub) return

  const userId = (existingSub as SubscriptionRecord).user_id

  // Update subscription status
  const { error } = await fromUntypedTable(supabaseAdmin, 'subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to update status after payment failure', error instanceof Error ? error : new Error(String(error)), { userId })
  }

  logger.warn('Payment failed', {
    userId,
    invoiceId: invoice.id,
  })

  // TODO: Send email notification to user
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    trialing: 'trialing',
    unpaid: 'past_due',
    paused: 'paused',
  }

  return statusMap[stripeStatus] || 'active'
}
