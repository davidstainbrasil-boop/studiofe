/**
 * Feature Gate - Controle de acesso a features por plano
 * 
 * Sistema para verificar se usuário tem acesso a features premium
 * e mostrar upgrade modal quando necessário
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

export type PlanTier = 'free' | 'pro' | 'business';

export type FeatureKey = 
  | 'video_create'
  | 'video_hd'
  | 'video_4k'
  | 'avatar'
  | 'lip_sync'
  | 'tts_advanced'
  | 'white_label'
  | 'api_access'
  | 'multi_user'
  | 'scorm_export'
  | 'custom_branding'
  | 'priority_render'
  | 'unlimited_storage';

export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: PlanTier;
  currentPlan: PlanTier;
  limit?: number;
  used?: number;
}

// =============================================================================
// Feature Requirements
// =============================================================================

export const FEATURE_REQUIREMENTS: Record<FeatureKey, PlanTier[]> = {
  video_create: ['free', 'pro', 'business'],
  video_hd: ['pro', 'business'],
  video_4k: ['business'],
  avatar: ['pro', 'business'],
  lip_sync: ['pro', 'business'],
  tts_advanced: ['pro', 'business'],
  white_label: ['business'],
  api_access: ['business'],
  multi_user: ['business'],
  scorm_export: ['pro', 'business'],
  custom_branding: ['business'],
  priority_render: ['business'],
  unlimited_storage: ['business'],
};

// =============================================================================
// Plan Limits
// =============================================================================

export const PLAN_VIDEO_LIMITS: Record<PlanTier, number> = {
  free: 1,
  pro: 10,
  business: 999999, // unlimited
};

export const PLAN_STORAGE_LIMITS_GB: Record<PlanTier, number> = {
  free: 1,
  pro: 20,
  business: 100,
};

// =============================================================================
// Feature Gate Service
// =============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Verifica se usuário pode usar uma feature específica
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureKey
): Promise<FeatureGateResult> {
  try {
    // Buscar plano do usuário
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single();

    const currentPlan = (subscription?.plan as PlanTier) || 'free';
    const status = subscription?.status || 'active';

    // Se subscription não está ativa, tratar como free
    const effectivePlan = status === 'active' || status === 'trialing' ? currentPlan : 'free';

    const allowedPlans = FEATURE_REQUIREMENTS[feature];
    const allowed = allowedPlans.includes(effectivePlan);

    if (allowed) {
      return {
        allowed: true,
        currentPlan: effectivePlan,
      };
    }

    // Determinar qual plano é necessário
    const upgradeRequired = allowedPlans[0] as PlanTier; // Menor plano que permite

    return {
      allowed: false,
      reason: `Esta feature requer plano ${upgradeRequired.toUpperCase()}`,
      upgradeRequired,
      currentPlan: effectivePlan,
    };
  } catch (error) {
    logger.error('Erro ao verificar feature access', error instanceof Error ? error : new Error(String(error)));
    // Em caso de erro, permitir para não bloquear usuário
    return {
      allowed: true,
      currentPlan: 'free',
    };
  }
}

/**
 * Verifica se usuário pode criar mais vídeos no mês
 */
export async function checkVideoLimit(userId: string): Promise<FeatureGateResult> {
  try {
    // Buscar subscription e usage
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single();

    const plan = (subscription?.plan as PlanTier) || 'free';
    const limit = PLAN_VIDEO_LIMITS[plan];

    // Buscar usage do mês atual
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('videos_created')
      .eq('user_id', userId)
      .gte('period_start', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .single();

    const used = usage?.videos_created || 0;
    const allowed = used < limit;

    if (allowed) {
      return {
        allowed: true,
        currentPlan: plan,
        limit,
        used,
      };
    }

    // Determinar upgrade necessário
    let upgradeRequired: PlanTier = 'pro';
    if (plan === 'pro') {
      upgradeRequired = 'business';
    }

    return {
      allowed: false,
      reason: `Você atingiu o limite de ${limit} vídeos/mês do plano ${plan.toUpperCase()}`,
      upgradeRequired,
      currentPlan: plan,
      limit,
      used,
    };
  } catch (error) {
    logger.error('Erro ao verificar limite de vídeos', error instanceof Error ? error : new Error(String(error)));
    return {
      allowed: true,
      currentPlan: 'free',
      limit: 1,
      used: 0,
    };
  }
}

/**
 * Verifica limite de storage
 */
export async function checkStorageLimit(userId: string, additionalBytes: number = 0): Promise<FeatureGateResult> {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();

    const plan = (subscription?.plan as PlanTier) || 'free';
    const limitBytes = PLAN_STORAGE_LIMITS_GB[plan] * 1024 * 1024 * 1024;

    // Buscar usage atual
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('storage_used_bytes')
      .eq('user_id', userId)
      .gte('period_start', periodStart.toISOString())
      .single();

    const usedBytes = (usage?.storage_used_bytes || 0) + additionalBytes;
    const usedGb = usedBytes / (1024 * 1024 * 1024);
    const limitGb = PLAN_STORAGE_LIMITS_GB[plan];
    const allowed = usedBytes <= limitBytes;

    if (allowed) {
      return {
        allowed: true,
        currentPlan: plan,
        limit: limitGb,
        used: Math.round(usedGb * 100) / 100,
      };
    }

    let upgradeRequired: PlanTier = 'pro';
    if (plan === 'pro') upgradeRequired = 'business';

    return {
      allowed: false,
      reason: `Você atingiu o limite de ${limitGb}GB do plano ${plan.toUpperCase()}`,
      upgradeRequired,
      currentPlan: plan,
      limit: limitGb,
      used: Math.round(usedGb * 100) / 100,
    };
  } catch (error) {
    logger.error('Erro ao verificar limite de storage', error instanceof Error ? error : new Error(String(error)));
    return {
      allowed: true,
      currentPlan: 'free',
    };
  }
}

/**
 * Incrementa contadores de uso
 */
export async function incrementUsage(
  userId: string,
  type: 'video' | 'storage' | 'tts',
  amount: number = 1
): Promise<void> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Buscar ou criar registro
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, videos_created, storage_used_bytes, tts_minutes_used')
      .eq('user_id', userId)
      .gte('period_start', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .single();

    const updateData: Record<string, number> = {};
    
    if (type === 'video') {
      updateData.videos_created = (existing?.videos_created || 0) + amount;
    } else if (type === 'storage') {
      updateData.storage_used_bytes = (existing?.storage_used_bytes || 0) + amount;
    } else if (type === 'tts') {
      updateData.tts_minutes_used = (existing?.tts_minutes_used || 0) + amount;
    }

    if (existing) {
      await supabase
        .from('usage_tracking')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          videos_created: type === 'video' ? amount : 0,
          storage_used_bytes: type === 'storage' ? amount : 0,
          tts_minutes_used: type === 'tts' ? amount : 0,
        });
    }

    logger.info('Usage incrementado', { userId, type, amount });
  } catch (error) {
    logger.error('Erro ao incrementar usage', error instanceof Error ? error : new Error(String(error)));
  }
}
