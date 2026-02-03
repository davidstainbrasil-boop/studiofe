'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Building2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type PlanTier = 'free' | 'pro' | 'business';

export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  currentPlan: PlanTier;
  requiredPlan: PlanTier;
  userId: string;
  message?: string;
}

// =============================================================================
// Plan Data
// =============================================================================

const PLANS = {
  pro: {
    name: 'Pro',
    price: 97,
    icon: Zap,
    color: 'violet',
    features: [
      '10 vídeos por mês',
      'Resolução Full HD (1080p)',
      'Avatar com IA',
      'Lip-sync avançado',
      'Sem marca d\'água',
      'Export SCORM',
      '20GB de armazenamento',
    ],
  },
  business: {
    name: 'Business',
    price: 297,
    icon: Building2,
    color: 'indigo',
    features: [
      'Vídeos ilimitados',
      'Resolução 4K',
      'White-label (sua marca)',
      'API access',
      'Multi-usuário',
      'Suporte prioritário 24/7',
      '100GB de armazenamento',
    ],
  },
};

// =============================================================================
// Component
// =============================================================================

export function PaywallModal({
  isOpen,
  onClose,
  feature,
  currentPlan,
  requiredPlan,
  userId,
  message,
}: PaywallModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS[requiredPlan as keyof typeof PLANS];
  if (!plan) return null;

  const Icon = plan.icon;

  const handleUpgrade = async (priceId: 'pro_monthly' | 'pro_yearly' | 'business_monthly' | 'business_yearly') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          priceId,
          successUrl: `${window.location.origin}/dashboard?upgrade=success`,
          cancelUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar checkout');
      }

      // Redirecionar para Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar upgrade');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPricing = () => {
    router.push('/pricing');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              'p-2 rounded-lg',
              requiredPlan === 'pro' ? 'bg-violet-100 text-violet-600' : 'bg-indigo-100 text-indigo-600'
            )}>
              <Lock className="w-5 h-5" />
            </div>
            <Badge variant="secondary" className="uppercase text-xs">
              Requer {plan.name}
            </Badge>
          </div>
          <DialogTitle className="text-xl">
            Desbloqueie esta feature
          </DialogTitle>
          <DialogDescription className="text-base">
            {message || `"${feature}" requer o plano ${plan.name} ou superior.`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'p-2 rounded-lg',
              requiredPlan === 'pro' ? 'bg-violet-100 text-violet-600' : 'bg-indigo-100 text-indigo-600'
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-sm text-slate-500">
                A partir de R$ {plan.price}/mês
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {plan.features.slice(0, 5).map((feat, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}

        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={() => handleUpgrade(requiredPlan === 'pro' ? 'pro_monthly' : 'business_monthly')}
            disabled={isLoading}
            className={cn(
              'w-full',
              requiredPlan === 'pro' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'
            )}
          >
            {isLoading ? 'Processando...' : `Upgrade para ${plan.name} - R$ ${plan.price}/mês`}
          </Button>
          
          <Button
            variant="outline"
            onClick={goToPricing}
            disabled={isLoading}
            className="w-full"
          >
            Ver todos os planos
          </Button>
        </div>

        <p className="text-xs text-center text-slate-500 mt-2">
          7 dias de teste grátis • Cancele a qualquer momento
        </p>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Hook: useFeatureGate
// =============================================================================

import { useCallback, useState as useStateHook } from 'react';

interface UseFeatureGateOptions {
  userId: string;
  onBlocked?: (feature: string, plan: PlanTier) => void;
}

interface UseFeatureGateReturn {
  checkFeature: (feature: string) => Promise<boolean>;
  showPaywall: (feature: string, requiredPlan: PlanTier, message?: string) => void;
  PaywallDialog: () => JSX.Element | null;
}

export function useFeatureGate({ userId, onBlocked }: UseFeatureGateOptions): UseFeatureGateReturn {
  const [paywallState, setPaywallState] = useStateHook<{
    isOpen: boolean;
    feature: string;
    requiredPlan: PlanTier;
    currentPlan: PlanTier;
    message?: string;
  }>({
    isOpen: false,
    feature: '',
    requiredPlan: 'pro',
    currentPlan: 'free',
  });

  const checkFeature = useCallback(async (feature: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/billing/check-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, feature }),
      });

      const result = await response.json();

      if (!result.allowed) {
        setPaywallState({
          isOpen: true,
          feature,
          requiredPlan: result.upgradeRequired || 'pro',
          currentPlan: result.currentPlan || 'free',
          message: result.reason,
        });
        onBlocked?.(feature, result.upgradeRequired);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking feature:', error);
      // Em caso de erro, permitir para não bloquear usuário
      return true;
    }
  }, [userId, onBlocked]);

  const showPaywall = useCallback((feature: string, requiredPlan: PlanTier, message?: string) => {
    setPaywallState({
      isOpen: true,
      feature,
      requiredPlan,
      currentPlan: 'free',
      message,
    });
  }, []);

  const PaywallDialog = useCallback(() => {
    if (!paywallState.isOpen) return null;

    return (
      <PaywallModal
        isOpen={paywallState.isOpen}
        onClose={() => setPaywallState(prev => ({ ...prev, isOpen: false }))}
        feature={paywallState.feature}
        currentPlan={paywallState.currentPlan}
        requiredPlan={paywallState.requiredPlan}
        userId={userId}
        message={paywallState.message}
      />
    );
  }, [paywallState, userId]);

  return {
    checkFeature,
    showPaywall,
    PaywallDialog,
  };
}

export default PaywallModal;
