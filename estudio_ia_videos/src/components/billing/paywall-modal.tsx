'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Crown,
  Building2,
  Check,
  X,
  ArrowRight,
  CreditCard,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PLAN_LIMITS, PLAN_PRICES, type PlanTier, type PlanLimits, type UsageStats } from '@/hooks/use-subscription'

// =============================================================================
// Types
// =============================================================================

interface PaywallModalProps {
  isOpen?: boolean
  onClose?: () => void
  currentPlan?: PlanTier
  usage?: UsageStats
  limits?: PlanLimits
  reason?: 'video_limit' | 'storage_limit' | 'tts_limit' | 'feature_locked' | 'upgrade'
  lockedFeature?: string
  onUpgrade?: (plan: PlanTier, billing: 'monthly' | 'yearly') => Promise<void>
}

interface UpgradeModalDetail {
  currentPlan: PlanTier
  usage: UsageStats
  limits: PlanLimits
}

// =============================================================================
// Constants
// =============================================================================

const PLAN_FEATURES = {
  free: [
    '1 vídeo por mês',
    'Resolução 720p',
    '5 templates NR básicos',
    '2 vozes TTS',
    'Marca d\'água obrigatória',
    'Suporte da comunidade',
  ],
  pro: [
    '10 vídeos por mês',
    'Resolução Full HD 1080p',
    'Todos os 38 templates NR',
    '10 vozes TTS premium',
    'Avatar IA com lip-sync',
    'Sem marca d\'água',
    'Export SCORM para LMS',
    'Suporte por email',
  ],
  business: [
    'Vídeos ilimitados',
    'Resolução até 4K',
    'Templates customizados',
    'Todas as vozes + clonagem',
    'Avatar IA avançado',
    'White-label completo',
    'Acesso à API',
    'Multi-usuário',
    'Suporte prioritário 24/7',
  ],
}

const PLAN_ICONS = {
  free: Sparkles,
  pro: Zap,
  business: Building2,
}

const PLAN_COLORS = {
  free: 'bg-slate-100 text-slate-700 border-slate-200',
  pro: 'bg-violet-100 text-violet-700 border-violet-200',
  business: 'bg-amber-100 text-amber-700 border-amber-200',
}

// =============================================================================
// PaywallModal Component
// =============================================================================

export function PaywallModal({
  isOpen: controlledOpen,
  onClose,
  currentPlan = 'free',
  usage,
  limits,
  reason = 'upgrade',
  lockedFeature,
  onUpgrade,
}: PaywallModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('pro')
  const [isLoading, setIsLoading] = useState(false)

  // Listen for global event to open modal
  useEffect(() => {
    const handleOpenModal = (event: CustomEvent<UpgradeModalDetail>) => {
      setIsOpen(true)
    }

    window.addEventListener('open-upgrade-modal', handleOpenModal as EventListener)
    return () => {
      window.removeEventListener('open-upgrade-modal', handleOpenModal as EventListener)
    }
  }, [])

  // Controlled mode
  useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen)
    }
  }, [controlledOpen])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    onClose?.()
  }, [onClose])

  const handleUpgrade = async (plan: PlanTier) => {
    setIsLoading(true)
    try {
      if (onUpgrade) {
        await onUpgrade(plan, billingPeriod)
      } else {
        // Default: redirect to Stripe checkout
        const priceId = billingPeriod === 'yearly' 
          ? `${plan}_yearly` 
          : `${plan}_monthly`
        
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId,
            successUrl: `${window.location.origin}/dashboard?upgrade=success`,
            cancelUrl: `${window.location.origin}/dashboard?upgrade=canceled`,
          }),
        })

        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      }
    } catch (error) {
      console.error('Upgrade error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getReasonTitle = () => {
    switch (reason) {
      case 'video_limit':
        return 'Limite de vídeos atingido'
      case 'storage_limit':
        return 'Armazenamento cheio'
      case 'tts_limit':
        return 'Limite de narração atingido'
      case 'feature_locked':
        return `${lockedFeature || 'Recurso'} disponível no Pro`
      default:
        return 'Faça upgrade para desbloquear'
    }
  }

  const getReasonDescription = () => {
    switch (reason) {
      case 'video_limit':
        return `Você criou ${usage?.videosCreatedThisMonth || 0} de ${limits?.videosPerMonth || 1} vídeos permitidos no plano ${currentPlan.toUpperCase()}. Faça upgrade para criar mais vídeos.`
      case 'storage_limit':
        return `Seu armazenamento de ${limits?.storageGb || 1}GB está cheio. Faça upgrade para mais espaço.`
      case 'tts_limit':
        return `Você usou todos os minutos de narração do mês. Faça upgrade para mais.`
      case 'feature_locked':
        return `${lockedFeature || 'Este recurso'} não está disponível no plano ${currentPlan.toUpperCase()}.`
      default:
        return 'Desbloqueie mais recursos e aumente sua produtividade.'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {['video_limit', 'storage_limit', 'tts_limit'].includes(reason) ? (
              <div className="rounded-full bg-amber-100 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            ) : (
              <div className="rounded-full bg-violet-100 p-2">
                <Crown className="h-5 w-5 text-violet-600" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{getReasonTitle()}</DialogTitle>
              <DialogDescription className="mt-1">
                {getReasonDescription()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Usage Progress */}
        {usage && limits && reason !== 'feature_locked' && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uso do mês</span>
              <span className="text-sm text-muted-foreground">
                {usage.videosCreatedThisMonth} / {limits.videosPerMonth} vídeos
              </span>
            </div>
            <Progress
              value={(usage.videosCreatedThisMonth / limits.videosPerMonth) * 100}
              className="h-2"
            />
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Renova em {new Date(usage.nextResetDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 py-4">
          <span className={cn('text-sm', billingPeriod === 'monthly' && 'font-semibold')}>
            Mensal
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className={cn(
              'relative h-6 w-12 rounded-full transition-colors',
              billingPeriod === 'yearly' ? 'bg-violet-600' : 'bg-slate-200'
            )}
          >
            <motion.div
              className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
              animate={{ left: billingPeriod === 'yearly' ? 'calc(100% - 20px)' : '4px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={cn('text-sm', billingPeriod === 'yearly' && 'font-semibold')}>
            Anual
            <Badge variant="secondary" className="ml-2 text-[10px]">
              -20%
            </Badge>
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 md:grid-cols-3 mt-4">
          {(['free', 'pro', 'business'] as PlanTier[]).map((plan) => {
            const Icon = PLAN_ICONS[plan]
            const price = PLAN_PRICES[plan]
            const isCurrentPlan = plan === currentPlan
            const isSelected = plan === selectedPlan
            const isDowngrade = 
              (currentPlan === 'business') ||
              (currentPlan === 'pro' && plan === 'free')

            return (
              <motion.div
                key={plan}
                whileHover={{ scale: isDowngrade ? 1 : 1.02 }}
                className={cn(
                  'relative rounded-xl border-2 p-5 transition-all cursor-pointer',
                  isSelected && !isDowngrade && 'border-violet-500 ring-2 ring-violet-100',
                  !isSelected && 'border-slate-200 hover:border-slate-300',
                  isDowngrade && 'opacity-50 cursor-not-allowed',
                  plan === 'pro' && 'bg-gradient-to-b from-violet-50 to-white'
                )}
                onClick={() => !isDowngrade && setSelectedPlan(plan)}
              >
                {plan === 'pro' && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600">
                    Mais popular
                  </Badge>
                )}

                {isCurrentPlan && (
                  <Badge variant="outline" className="absolute -top-3 right-4">
                    Atual
                  </Badge>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('rounded-lg p-2', PLAN_COLORS[plan])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold capitalize">{plan}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    R$ {billingPeriod === 'yearly' 
                      ? Math.round(price.yearly / 12) 
                      : price.monthly}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                  {billingPeriod === 'yearly' && price.yearly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      R$ {price.yearly}/ano cobrado anualmente
                    </p>
                  )}
                </div>

                <ul className="space-y-2 text-sm">
                  {PLAN_FEATURES[plan].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrentPlan && !isDowngrade && (
                  <Button
                    className="w-full mt-4"
                    variant={plan === 'pro' ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUpgrade(plan)
                    }}
                    disabled={isLoading}
                  >
                    {isLoading && selectedPlan === plan ? (
                      <motion.div
                        className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      />
                    ) : (
                      <>
                        Assinar {plan}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {isCurrentPlan && (
                  <Button className="w-full mt-4" variant="outline" disabled>
                    Plano atual
                  </Button>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            <span>Pagamento seguro via Stripe</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            <span>Cancele a qualquer momento</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>Garantia de 7 dias</span>
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-center mt-4">
          <Button variant="ghost" onClick={handleClose}>
            Continuar no plano {currentPlan}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// UpgradeBanner Component
// =============================================================================

interface UpgradeBannerProps {
  currentPlan: PlanTier
  usage?: UsageStats
  limits?: PlanLimits
  variant?: 'compact' | 'full'
  className?: string
}

export function UpgradeBanner({
  currentPlan,
  usage,
  limits,
  variant = 'compact',
  className,
}: UpgradeBannerProps) {
  const [showPaywall, setShowPaywall] = useState(false)

  if (currentPlan === 'business') return null

  const usagePercent = usage && limits 
    ? (usage.videosCreatedThisMonth / limits.videosPerMonth) * 100 
    : 0

  const isNearLimit = usagePercent >= 80
  const isAtLimit = usagePercent >= 100

  if (variant === 'compact') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center justify-between rounded-lg px-4 py-2 text-sm',
            isAtLimit 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : isNearLimit 
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-violet-50 border border-violet-200 text-violet-800',
            className
          )}
        >
          <div className="flex items-center gap-2">
            {isAtLimit ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            <span>
              {isAtLimit 
                ? 'Limite atingido!' 
                : isNearLimit 
                  ? `${usage?.videosCreatedThisMonth}/${limits?.videosPerMonth} vídeos usados`
                  : `Plano ${currentPlan.toUpperCase()}`}
            </span>
          </div>
          <Button 
            size="sm" 
            variant={isAtLimit ? 'destructive' : 'default'}
            onClick={() => setShowPaywall(true)}
          >
            Fazer upgrade
          </Button>
        </motion.div>

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          currentPlan={currentPlan}
          usage={usage}
          limits={limits}
          reason={isAtLimit ? 'video_limit' : 'upgrade'}
        />
      </>
    )
  }

  // Full variant
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'rounded-xl border bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white',
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Upgrade para Pro
            </h3>
            <p className="mt-1 text-violet-100 max-w-md">
              Desbloqueie vídeos ilimitados, avatares IA, e muito mais.
              Aumente sua produtividade em 10x.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowPaywall(true)}
          >
            Ver planos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {usage && limits && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Vídeos este mês</span>
              <span>{usage.videosCreatedThisMonth} / {limits.videosPerMonth}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </motion.div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        currentPlan={currentPlan}
        usage={usage}
        limits={limits}
      />
    </>
  )
}

// =============================================================================
// FeatureGate Component
// =============================================================================

interface FeatureGateProps {
  feature: keyof PlanLimits
  currentPlan: PlanTier
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({
  feature,
  currentPlan,
  children,
  fallback,
}: FeatureGateProps) {
  const limits = PLAN_LIMITS[currentPlan]
  const hasFeature = (() => {
    const value = limits[feature]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value > 0
    return true
  })()

  if (hasFeature) {
    return <>{children}</>
  }

  return (
    <>
      {fallback || (
        <div className="relative">
          <div className="pointer-events-none opacity-50 blur-sm">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
            <Badge variant="secondary" className="gap-1">
              <Crown className="h-3 w-3" />
              Pro
            </Badge>
          </div>
        </div>
      )}
    </>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default PaywallModal
