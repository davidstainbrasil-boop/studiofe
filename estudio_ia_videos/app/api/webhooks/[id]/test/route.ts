/**
 * 🔗 API Webhooks - Test Endpoint
 * 
 * Endpoint para testar um webhook enviando um evento de teste
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabase/server'
import { webhookManager, triggerWebhook } from '@/lib/webhooks-system-real'
import { logger } from '@/lib/logger'
import { createHmac, randomUUID } from 'crypto'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * POST /api/webhooks/[id]/test
 * Envia um evento de teste para o webhook
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = getSupabaseForRequest(request)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se o webhook existe e pertence ao usuário
    const webhook = await webhookManager.getWebhook(id)
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }
    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!webhook.active) {
      return NextResponse.json({ error: 'Webhook is not active' }, { status: 400 })
    }

    // Enviar evento de teste diretamente
    const testPayload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      webhookId: id,
      message: 'This is a test event from Estúdio IA Videos',
      testId: randomUUID()
    }

    const timestamp = Date.now()
    const signature = createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${JSON.stringify(testPayload)}`)
      .digest('hex')

    const startTime = Date.now()
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': 'test.ping',
          'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
          'User-Agent': 'EstudioIA-Webhooks/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      const duration = Date.now() - startTime
      const responseBody = await response.text()

      logger.info('Webhook test sent', { 
        webhookId: id, 
        userId: session.user.id,
        status: response.status,
        duration
      })

      return NextResponse.json({
        success: response.ok,
        testId: testPayload.testId,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseBody.substring(0, 500), // Truncate long responses
          duration
        },
        payload: testPayload
      })
    } catch (fetchError) {
      const duration = Date.now() - startTime
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error'
      
      logger.warn('Webhook test failed', { 
        webhookId: id, 
        error: errorMessage,
        duration
      })

      return NextResponse.json({
        success: false,
        testId: testPayload.testId,
        error: errorMessage,
        duration,
        payload: testPayload
      }, { status: 200 }) // Return 200 even on failure - the test itself succeeded
    }
  } catch (error) {
    logger.error('Webhook test error', error instanceof Error ? error : new Error(String(error)), { component: 'API: webhooks/[id]/test' })
    return NextResponse.json({ error: 'Failed to test webhook' }, { status: 500 })
  }
}
