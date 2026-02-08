import { NextRequest, NextResponse } from 'next/server'
import { DIDWebhookHandler } from '@/lib/services/avatar/did-webhook-handler'
import { logger } from '@/lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'

const handler = new DIDWebhookHandler()

export async function POST(req: NextRequest) {
  try {
    const blocked = await applyRateLimit(req, 'avatar-webhook', 30);
    if (blocked) return blocked;

    // Basic security check (optional: verify secret if D-ID supports it or use custom header)
    // const signature = req.headers.get('x-did-signature')
    
    const payload = await req.json()
    
    // Process async to avoid blocking D-ID
    handler.handleWebhook(payload).catch(err => {
        logger.error('Async webhook processing failed', err)
    })

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    logger.error('Error handling D-ID webhook', error as Error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
