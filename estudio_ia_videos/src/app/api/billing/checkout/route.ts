import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@lib/auth/unified-session'
import { applyRateLimit } from '@/lib/rate-limit'
import { getAppOrigin, resolveTrustedAppUrl } from '@/lib/config/app-url'

interface BillingCheckoutRequest {
  priceId?: string
  successUrl?: string
  cancelUrl?: string
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const blocked = await applyRateLimit(request, 'billing-checkout', 5);
    if (blocked) return blocked;

    const body = await request.json() as BillingCheckoutRequest
    const priceId = process.env.STRIPE_PRICE_ID || body.priceId
    const secret = process.env.STRIPE_SECRET_KEY || ''
    const appOrigin = getAppOrigin()
    const successUrl = resolveTrustedAppUrl(body.successUrl, {
      baseOrigin: appOrigin,
      fallbackPath: '/billing/success',
    })
    const cancelUrl = resolveTrustedAppUrl(body.cancelUrl, {
      baseOrigin: appOrigin,
      fallbackPath: '/billing/cancel',
    })
    if (!secret || !priceId) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
    }
    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('success_url', successUrl)
    params.append('cancel_url', cancelUrl)
    params.append('line_items[0][price]', priceId)
    params.append('line_items[0][quantity]', '1')
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: 'Stripe error', details: data }, { status: 500 })
    }
    return NextResponse.json({ success: true, sessionId: data.id, url: data.url })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create session', details: String(e) }, { status: 500 })
  }
}
