'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// =============================================================================
// Types
// =============================================================================

export type PlanTier = 'free' | 'pro' | 'business'

export interface PlanLimits {
  videosPerMonth: number
  maxResolution: '720p' | '1080p' | '4k'
  maxDurationMinutes: number
  ttsVoices: number
  hasAvatar: boolean
  hasLipSync: boolean
  hasWatermark: boolean
  hasWhiteLabel: boolean
  hasApiAccess: boolean
  hasMultiUser: boolean
  hasScormExport: boolean
  storageGb: number
  supportLevel: 'community' | 'email' | 'priority'
}

export interface Subscription {
  id: string
  userId: string
  plan: PlanTier
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid'
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UsageStats {
  videosCreatedThisMonth: number
  videosLimit: number
  storageUsedGb: number
  storageLimit: number
  ttsMinutesUsed: number
  ttsMinutesLimit: number
  lastResetDate: Date
  nextResetDate: Date
}

export interface SubscriptionState {
  subscription: Subscription | null
  usage: UsageStats | null
  limits: PlanLimits
  isLoading: boolean
  error: string | null
}

export interface UseSubscriptionReturn extends SubscriptionState {
  // Computed
  plan: PlanTier
  isActive: boolean
  isPro: boolean
  isBusiness: boolean
  isFree: boolean
  canCreateVideo: boolean
  videosRemaining: number
  usagePercentage: number
  daysUntilRenewal: number
  
  // Actions
  refresh: () => Promise<void>
  checkLimit: (resource: 'video' | 'storage' | 'tts') => { allowed: boolean; message?: string }
  openUpgradeModal: () => void
  openBillingPortal: () => Promise<void>
}

// =============================================================================
// Constants
// =============================================================================

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    videosPerMonth: 1,
    maxResolution: '720p',
    maxDurationMinutes: 5,
    ttsVoices: 2,
    hasAvatar: false,
    hasLipSync: false,
    hasWatermark: true,
    hasWhiteLabel: false,
    hasApiAccess: false,
    hasMultiUser: false,
    hasScormExport: false,
    storageGb: 1,
    supportLevel: 'community',
  },
  pro: {
    videosPerMonth: 10,
    maxResolution: '1080p',
    maxDurationMinutes: 30,
    ttsVoices: 10,
    hasAvatar: true,
    hasLipSync: true,
    hasWatermark: false,
    hasWhiteLabel: false,
    hasApiAccess: false,
    hasMultiUser: false,
    hasScormExport: true,
    storageGb: 20,
    supportLevel: 'email',
  },
  business: {
    videosPerMonth: 999999, // unlimited
    maxResolution: '4k',
    maxDurationMinutes: 120,
    ttsVoices: 999, // all
    hasAvatar: true,
    hasLipSync: true,
    hasWatermark: false,
    hasWhiteLabel: true,
    hasApiAccess: true,
    hasMultiUser: true,
    hasScormExport: true,
    storageGb: 100,
    supportLevel: 'priority',
  },
}

export const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 97, yearly: 930 },
  business: { monthly: 297, yearly: 2850 },
}

const DEFAULT_USAGE: UsageStats = {
  videosCreatedThisMonth: 0,
  videosLimit: 1,
  storageUsedGb: 0,
  storageLimit: 1,
  ttsMinutesUsed: 0,
  ttsMinutesLimit: 5,
  lastResetDate: new Date(),
  nextResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
}

// =============================================================================
// Hook: useSubscription
// =============================================================================

export function useSubscription(userId?: string): UseSubscriptionReturn {
  const router = useRouter()
  
  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    usage: null,
    limits: PLAN_LIMITS.free,
    isLoading: true,
    error: null,
  })

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(`/api/subscription?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const data = await response.json()

      const plan = (data.subscription?.plan || 'free') as PlanTier
      
      setState({
        subscription: data.subscription ? {
          ...data.subscription,
          currentPeriodStart: new Date(data.subscription.currentPeriodStart),
          currentPeriodEnd: new Date(data.subscription.currentPeriodEnd),
          createdAt: new Date(data.subscription.createdAt),
          updatedAt: new Date(data.subscription.updatedAt),
        } : null,
        usage: data.usage ? {
          ...data.usage,
          lastResetDate: new Date(data.usage.lastResetDate),
          nextResetDate: new Date(data.usage.nextResetDate),
        } : DEFAULT_USAGE,
        limits: PLAN_LIMITS[plan],
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error fetching subscription:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }, [userId])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  // Computed values
  const plan = state.subscription?.plan || 'free'
  const isActive = state.subscription?.status === 'active' || state.subscription?.status === 'trialing'
  const isPro = plan === 'pro' && isActive
  const isBusiness = plan === 'business' && isActive
  const isFree = plan === 'free' || !isActive

  const usage = state.usage || DEFAULT_USAGE
  const limits = state.limits

  const videosRemaining = Math.max(0, limits.videosPerMonth - usage.videosCreatedThisMonth)
  const canCreateVideo = videosRemaining > 0
  const usagePercentage = Math.min(100, (usage.videosCreatedThisMonth / limits.videosPerMonth) * 100)

  const daysUntilRenewal = useMemo(() => {
    if (!state.subscription?.currentPeriodEnd) return 30
    const now = new Date()
    const end = new Date(state.subscription.currentPeriodEnd)
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [state.subscription?.currentPeriodEnd])

  // Check resource limit
  const checkLimit = useCallback((resource: 'video' | 'storage' | 'tts'): { allowed: boolean; message?: string } => {
    switch (resource) {
      case 'video':
        if (usage.videosCreatedThisMonth >= limits.videosPerMonth) {
          return {
            allowed: false,
            message: `Você atingiu o limite de ${limits.videosPerMonth} vídeo${limits.videosPerMonth > 1 ? 's' : ''} por mês no plano ${plan.toUpperCase()}. Faça upgrade para continuar criando.`,
          }
        }
        return { allowed: true }

      case 'storage':
        if (usage.storageUsedGb >= limits.storageGb) {
          return {
            allowed: false,
            message: `Você atingiu o limite de ${limits.storageGb}GB de armazenamento. Exclua vídeos antigos ou faça upgrade.`,
          }
        }
        return { allowed: true }

      case 'tts':
        if (usage.ttsMinutesUsed >= usage.ttsMinutesLimit) {
          return {
            allowed: false,
            message: `Você atingiu o limite de TTS para este mês. Faça upgrade para mais minutos de narração.`,
          }
        }
        return { allowed: true }

      default:
        return { allowed: true }
    }
  }, [usage, limits, plan])

  // Open upgrade modal (dispatch event for modal component to listen)
  const openUpgradeModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-upgrade-modal', {
      detail: {
        currentPlan: plan,
        usage,
        limits,
      }
    }))
  }, [plan, usage, limits])

  // Open Stripe billing portal
  const openBillingPortal = useCallback(async () => {
    if (!userId) {
      router.push('/login')
      return
    }

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error opening billing portal:', error)
      // Fallback to billing page
      router.push('/dashboard/billing')
    }
  }, [userId, router])

  return {
    // State
    ...state,
    
    // Computed
    plan,
    isActive,
    isPro,
    isBusiness,
    isFree,
    canCreateVideo,
    videosRemaining,
    usagePercentage,
    daysUntilRenewal,
    
    // Actions
    refresh: fetchSubscription,
    checkLimit,
    openUpgradeModal,
    openBillingPortal,
  }
}

// =============================================================================
// Hook: useUsageTracker
// =============================================================================

export function useUsageTracker(userId?: string) {
  const { refresh, checkLimit, openUpgradeModal } = useSubscription(userId)

  const trackVideoCreation = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const videoCheck = checkLimit('video')
    if (!videoCheck.allowed) {
      openUpgradeModal()
      return { success: false, error: videoCheck.message }
    }

    try {
      const response = await fetch('/api/usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resource: 'video' }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.code === 'LIMIT_EXCEEDED') {
          openUpgradeModal()
          return { success: false, error: data.message }
        }
        throw new Error(data.error || 'Failed to track usage')
      }

      await refresh()
      return { success: true }
    } catch (error) {
      console.error('Error tracking video creation:', error)
      return { success: false, error: 'Erro ao verificar limites' }
    }
  }, [userId, checkLimit, openUpgradeModal, refresh])

  const trackStorageUsage = useCallback(async (sizeBytes: number): Promise<{ success: boolean; error?: string }> => {
    const storageCheck = checkLimit('storage')
    if (!storageCheck.allowed) {
      openUpgradeModal()
      return { success: false, error: storageCheck.message }
    }

    try {
      await fetch('/api/usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resource: 'storage', amount: sizeBytes }),
      })
      await refresh()
      return { success: true }
    } catch (error) {
      console.error('Error tracking storage:', error)
      return { success: false, error: 'Erro ao registrar storage' }
    }
  }, [userId, checkLimit, openUpgradeModal, refresh])

  return {
    trackVideoCreation,
    trackStorageUsage,
    checkLimit,
  }
}

// =============================================================================
// Hook: useFeatureGate
// =============================================================================

export function useFeatureGate(userId?: string) {
  const { limits, isFree, isPro, isBusiness, openUpgradeModal } = useSubscription(userId)

  const hasFeature = useCallback((feature: keyof PlanLimits): boolean => {
    const value = limits[feature]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value > 0
    return true
  }, [limits])

  const requireFeature = useCallback((feature: keyof PlanLimits, requiredPlan?: PlanTier): boolean => {
    if (hasFeature(feature)) return true
    
    openUpgradeModal()
    return false
  }, [hasFeature, openUpgradeModal])

  const gatedFeatures = useMemo(() => ({
    avatar: limits.hasAvatar,
    lipSync: limits.hasLipSync,
    noWatermark: !limits.hasWatermark,
    whiteLabel: limits.hasWhiteLabel,
    apiAccess: limits.hasApiAccess,
    multiUser: limits.hasMultiUser,
    scormExport: limits.hasScormExport,
    hd1080p: limits.maxResolution === '1080p' || limits.maxResolution === '4k',
    resolution4k: limits.maxResolution === '4k',
    unlimitedVideos: limits.videosPerMonth > 100,
  }), [limits])

  return {
    hasFeature,
    requireFeature,
    gatedFeatures,
    isFree,
    isPro,
    isBusiness,
    limits,
  }
}

// =============================================================================
// Exports
// =============================================================================

export default useSubscription
