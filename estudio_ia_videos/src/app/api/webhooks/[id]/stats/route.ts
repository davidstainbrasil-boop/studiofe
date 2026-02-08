/**
 * 🔗 API Webhooks - Statistics
 * 
 * Endpoint para obter estatísticas de um webhook específico
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { webhookManager } from '@lib/webhooks-system-real'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/webhooks/[id]/stats
 * Obtém estatísticas de um webhook específico incluindo avgResponseTime
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'webhooks-stats-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = getSupabaseForRequest(request)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhookId = params.id
    const webhook = await webhookManager.getWebhook(webhookId)
    
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Verificar se o webhook pertence ao usuário
    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stats = await webhookManager.getWebhookStats(webhookId)
    return NextResponse.json(stats)
  } catch (error) {
    logger.error('Get webhook stats error', error instanceof Error ? error : new Error(String(error)), { component: 'API: webhooks/stats' })
    return NextResponse.json({ error: 'Failed to get webhook stats' }, { status: 500 })
  }
}
