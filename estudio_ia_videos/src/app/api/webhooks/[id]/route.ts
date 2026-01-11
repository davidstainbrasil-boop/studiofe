/**
 * 🔗 API Webhooks - Individual Webhook Management
 * 
 * Endpoints para gerenciar um webhook específico
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { webhookManager } from '@lib/webhooks-system-real'
import { logger } from '@lib/logger'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/webhooks/[id]
 * Obtém um webhook específico
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = getSupabaseForRequest(request)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhook = await webhookManager.getWebhook(id)
    
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Verificar se o usuário é dono do webhook
    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(webhook)
  } catch (error) {
    logger.error('Get webhook error', error instanceof Error ? error : new Error(String(error)), { component: 'API: webhooks/[id]' })
    return NextResponse.json({ error: 'Failed to get webhook' }, { status: 500 })
  }
}

/**
 * DELETE /api/webhooks/[id]
 * Remove um webhook
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = getSupabaseForRequest(request)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await webhookManager.deleteWebhook(id, session.user.id)

    return NextResponse.json({ success: true, message: 'Webhook deleted' })
  } catch (error) {
    logger.error('Delete webhook error', error instanceof Error ? error : new Error(String(error)), { component: 'API: webhooks/[id]' })
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}

/**
 * PATCH /api/webhooks/[id]
 * Atualiza um webhook (ativa/desativa)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = getSupabaseForRequest(request)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    // Verificar se o webhook existe e pertence ao usuário
    const webhook = await webhookManager.getWebhook(id)
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }
    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Atualizar webhook via prisma direto (webhookManager não tem update)
    const { prisma } = await import('@/lib/prisma')
    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        active: data.active ?? webhook.active,
        url: data.url ?? webhook.url,
        events: data.events ?? webhook.events,
      }
    })

    logger.info('Webhook updated', { webhookId: id, userId: session.user.id })
    return NextResponse.json(updated)
  } catch (error) {
    logger.error('Update webhook error', error instanceof Error ? error : new Error(String(error)), { component: 'API: webhooks/[id]' })
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
  }
}
