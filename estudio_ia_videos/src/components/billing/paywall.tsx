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
import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, 
  Building2, 
  Check, 
  ArrowRight, 
  Video,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  videosUsed: number;
  videoLimit: number;
  currentPlan: string;
  userId: string;
}

const upgradePlans = [
  {
    id: 'pro',
    name: 'Pro',
    price: 97,
    priceId: 'pro_monthly',
    icon: Zap,
    color: 'violet',
    features: [
      '10 vídeos por mês',
      'Resolução 1080p',
      'Todos os templates NR',
      'Avatar IA com lip-sync',
      'Sem marca d\'água',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 297,
    priceId: 'business_monthly',
    icon: Building2,
    color: 'indigo',
    features: [
      'Vídeos ilimitados',
      'Resolução 4K',
      'White-label',
      'API access',
      'Suporte prioritário',
    ],
  },
];

export function Paywall({
  isOpen,
  onClose,
  videosUsed,
  videoLimit,
  currentPlan,
  userId,
}: PaywallProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string) => {
    setLoading(priceId);
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          priceId,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Erro ao criar checkout');
      }
    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
      // TODO: Toast de erro
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-amber-600" />
          </div>
          <DialogTitle className="text-2xl">
            Você atingiu seu limite de vídeos
          </DialogTitle>
          <DialogDescription className="text-base">
            Você usou <span className="font-semibold text-slate-900">{videosUsed}</span> de{' '}
            <span className="font-semibold text-slate-900">{videoLimit}</span> vídeos 
            disponíveis no plano <Badge variant="secondary" className="ml-1">{currentPlan}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {upgradePlans.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.priceId;
            
            return (
              <Card 
                key={plan.id}
                className={cn(
                  "relative cursor-pointer transition-all hover:shadow-lg",
                  plan.id === 'pro' && "border-violet-200 bg-violet-50/50"
                )}
              >
                {plan.id === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600">Recomendado</Badge>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      plan.id === 'pro' && "bg-violet-100 text-violet-600",
                      plan.id === 'business' && "bg-indigo-100 text-indigo-600"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-sm text-slate-500">
                        R$ {plan.price}/mês
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full",
                      plan.id === 'pro' && "bg-violet-600 hover:bg-violet-700"
                    )}
                    variant={plan.id === 'pro' ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.priceId)}
                    disabled={!!loading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        Assinar {plan.name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-4 border-t">
          <p className="text-sm text-slate-500 mb-3">
            Ou aguarde até o próximo mês para os créditos renovarem
          </p>
          <Button variant="ghost" onClick={onClose}>
            Voltar ao Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook para verificar limite e mostrar paywall
export function useVideoLimit() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [limitData, setLimitData] = useState<{
    canCreate: boolean;
    videosUsed: number;
    videoLimit: number;
    planName: string;
  } | null>(null);

  const checkLimit = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/video-limit?userId=${userId}`);
      const data = await response.json();
      
      setLimitData({
        canCreate: data.can_create,
        videosUsed: data.videos_used,
        videoLimit: data.video_limit,
        planName: data.plan_name,
      });

      if (!data.can_create) {
        setShowPaywall(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar limite:', error);
      return true; // Em caso de erro, permitir (fail-open)
    }
  };

  return {
    showPaywall,
    setShowPaywall,
    limitData,
    checkLimit,
  };
}
