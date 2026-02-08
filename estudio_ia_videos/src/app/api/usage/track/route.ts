/**
 * Usage Tracking API
 * POST /api/usage/track - Increment usage for a resource
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerAuth } from '@lib/auth/unified-session'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const PLAN_LIMITS = {
  free: { videos: 1, storage_gb: 1, tts_minutes: 5 },
  pro: { videos: 10, storage_gb: 20, tts_minutes: 60 },
  business: { videos: 999999, storage_gb: 100, tts_minutes: 500 },
}

interface TrackRequest {
  userId: string
  resource: 'video' | 'storage' | 'tts'
  amount?: number
}

export async function POST(req: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json() as TrackRequest
    const { resource, amount = 1 } = body
    const userId = session.user.id

    if (!resource || !['video', 'storage', 'tts'].includes(resource)) {
      return NextResponse.json(
        { error: 'resource inválido' },
        { status: 400 }
      )
    }

    // Buscar plano do usuário
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single()

    const plan = (subscription?.plan || 'free') as keyof typeof PLAN_LIMITS
    const isActive = !subscription || subscription.status === 'active' || subscription.status === 'trialing'
    
    // Se não está ativo, usar limites do free
    const effectivePlan = isActive ? plan : 'free'
    const limits = PLAN_LIMITS[effectivePlan]

    // Buscar ou criar usage para o período atual
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    let { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('period_start', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .single()

    if (!usage) {
      const { data: newUsage, error: createError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          videos_created: 0,
          storage_used_bytes: 0,
          tts_minutes_used: 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        })
        .select()
        .single()

      if (createError) {
        logger.error('Erro ao criar usage tracking', new Error(createError.message))
        return NextResponse.json(
          { error: 'Erro ao criar registro de uso' },
          { status: 500 }
        )
      }
      usage = newUsage
    }

    // Verificar limites antes de incrementar
    let limitExceeded = false
    let limitMessage = ''

    switch (resource) {
      case 'video':
        if (usage.videos_created >= limits.videos) {
          limitExceeded = true
          limitMessage = `Limite de ${limits.videos} vídeo(s) por mês atingido. Faça upgrade para criar mais.`
        }
        break

      case 'storage':
        const currentStorageGb = usage.storage_used_bytes / (1024 * 1024 * 1024)
        const newStorageGb = currentStorageGb + (amount / (1024 * 1024 * 1024))
        if (newStorageGb >= limits.storage_gb) {
          limitExceeded = true
          limitMessage = `Limite de ${limits.storage_gb}GB de armazenamento atingido.`
        }
        break

      case 'tts':
        if (usage.tts_minutes_used + amount > limits.tts_minutes) {
          limitExceeded = true
          limitMessage = `Limite de ${limits.tts_minutes} minutos de TTS por mês atingido.`
        }
        break
    }

    if (limitExceeded) {
      logger.info('Limite de uso atingido', { userId, resource, plan: effectivePlan })
      return NextResponse.json(
        {
          error: limitMessage,
          code: 'LIMIT_EXCEEDED',
          currentUsage: {
            videos: usage.videos_created,
            storageGb: usage.storage_used_bytes / (1024 * 1024 * 1024),
            ttsMinutes: usage.tts_minutes_used,
          },
          limits: {
            videos: limits.videos,
            storageGb: limits.storage_gb,
            ttsMinutes: limits.tts_minutes,
          },
          plan: effectivePlan,
        },
        { status: 403 }
      )
    }

    // Incrementar uso
    const updates: Record<string, number> = {}
    
    switch (resource) {
      case 'video':
        updates.videos_created = usage.videos_created + 1
        break
      case 'storage':
        updates.storage_used_bytes = usage.storage_used_bytes + amount
        break
      case 'tts':
        updates.tts_minutes_used = usage.tts_minutes_used + amount
        break
    }

    const { error: updateError } = await supabase
      .from('usage_tracking')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', usage.id)

    if (updateError) {
      logger.error('Erro ao atualizar usage', new Error(updateError.message))
      return NextResponse.json(
        { error: 'Erro ao registrar uso' },
        { status: 500 }
      )
    }

    logger.info('Uso registrado', { userId, resource, amount, plan: effectivePlan })

    return NextResponse.json({
      success: true,
      resource,
      newValue: updates[Object.keys(updates)[0]],
      remaining: {
        videos: limits.videos - (resource === 'video' ? updates.videos_created : usage.videos_created),
        storageGb: limits.storage_gb - (resource === 'storage' ? updates.storage_used_bytes / (1024 * 1024 * 1024) : usage.storage_used_bytes / (1024 * 1024 * 1024)),
        ttsMinutes: limits.tts_minutes - (resource === 'tts' ? updates.tts_minutes_used : usage.tts_minutes_used),
      },
    })
  } catch (error) {
    logger.error('Erro na API de usage tracking', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
