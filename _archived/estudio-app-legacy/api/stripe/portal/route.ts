import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, fromUntypedTable } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// =============================================================================
// Stripe Configuration
// =============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

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
// POST - Create Customer Portal Session
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's Stripe customer ID
    const { data: subscriptionData } = await fromUntypedTable<SubscriptionRecord>(
      supabase,
      'subscriptions'
    )
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const subscription = subscriptionData as SubscriptionRecord | null

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { returnUrl } = body

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || `${req.headers.get('origin')}/dashboard/billing`,
    })

    logger.info('Portal session created', {
      userId: user.id,
      customerId: subscription.stripe_customer_id,
    })

    return NextResponse.json({ 
      url: portalSession.url,
    })
  } catch (error) {
    logger.error('Portal session error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
