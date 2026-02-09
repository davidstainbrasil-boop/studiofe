/**
 * Subscription API - Get user subscription and usage
 * GET /api/subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface UsageRecord {
  id: string
  user_id: string
  videos_created: number
  storage_used_bytes: number
  tts_minutes_used: number
  period_start: string
  period_end: string
  created_at: string
  updated_at: string
}

interface SubscriptionRecord {
  id: string
  user_id: string
  plan: 'free' | 'pro' | 'business'
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

const PLAN_LIMITS = {
  free: { videos: 1, storage_gb: 1, tts_minutes: 5 },
  pro: { videos: 10, storage_gb: 20, tts_minutes: 60 },
  business: { videos: 999999, storage_gb: 100, tts_minutes: 500 },
}

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'subscription-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Autenticação obrigatória - impedir IDOR
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    // Usar userId do token autenticado (não do query param)
    const userId = authResult.userId;

    // Buscar subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      logger.error('Erro ao buscar subscription', new Error(subError.message), { code: subError.code, userId })
    }

    // Determinar plano
    const plan = subscription?.plan || 'free'
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]

    // Buscar ou criar usage para o período atual
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    let usage: UsageRecord | null = null

    const { data: existingUsage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('period_start', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      logger.error('Erro ao buscar usage', new Error(usageError.message), { code: usageError.code, userId })
    }

    if (existingUsage) {
      usage = existingUsage
    } else {
      // Criar novo registro de usage para o mês
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
        logger.warn('Erro ao criar usage tracking', { error: createError, userId })
      } else {
        usage = newUsage
      }
    }

    // Formatar resposta
    const response = {
      subscription: subscription ? {
        id: subscription.id,
        userId: subscription.user_id,
        plan: subscription.plan,
        status: subscription.status,
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
      } : null,
      usage: usage ? {
        videosCreatedThisMonth: usage.videos_created,
        videosLimit: limits.videos,
        storageUsedGb: usage.storage_used_bytes / (1024 * 1024 * 1024),
        storageLimit: limits.storage_gb,
        ttsMinutesUsed: usage.tts_minutes_used,
        ttsMinutesLimit: limits.tts_minutes,
        lastResetDate: usage.period_start,
        nextResetDate: usage.period_end,
      } : {
        videosCreatedThisMonth: 0,
        videosLimit: limits.videos,
        storageUsedGb: 0,
        storageLimit: limits.storage_gb,
        ttsMinutesUsed: 0,
        ttsMinutesLimit: limits.tts_minutes,
        lastResetDate: periodStart.toISOString(),
        nextResetDate: periodEnd.toISOString(),
      },
      plan,
      limits: {
        videosPerMonth: limits.videos,
        storageGb: limits.storage_gb,
        ttsMinutes: limits.tts_minutes,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Erro na API de subscription', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
