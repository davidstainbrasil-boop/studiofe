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

// Price IDs mapping (configure in Stripe Dashboard)
const PRICE_IDS: Record<string, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
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
  created_at: string
  updated_at: string
}

// =============================================================================
// POST - Create Checkout Session
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

    const body = await req.json()
    const { priceId, successUrl, cancelUrl } = body

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    // Get the actual Stripe price ID
    const stripePriceId = PRICE_IDS[priceId]
    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | null = null

    // Check if user already has a Stripe customer ID (use untyped table)
    const { data: subscriptionData } = await fromUntypedTable<SubscriptionRecord>(
      supabase,
      'subscriptions'
    )
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const subscription = subscriptionData as SubscriptionRecord | null

    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      stripeCustomerId = customer.id

      // Store customer ID (upsert into subscriptions)
      await fromUntypedTable(supabase, 'subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          plan: 'free',
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id' 
        })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?upgrade=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/dashboard?upgrade=canceled`,
      metadata: {
        user_id: user.id,
        price_id: priceId,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    logger.info('Checkout session created', {
      userId: user.id,
      sessionId: session.id,
      priceId,
    })

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    logger.error('Checkout session error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET - Get Session Status
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })

    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_details?.email,
      subscriptionId: typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription?.id,
    })
  } catch (error) {
    logger.error('Get session error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to get session status' },
      { status: 500 }
    )
  }
}
