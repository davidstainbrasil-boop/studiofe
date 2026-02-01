'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  Zap, 
  Crown, 
  ArrowUpRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Paywall, useVideoLimit } from '@/components/billing/paywall';

interface SubscriptionStatusProps {
  userId: string;
  onUpgrade?: () => void;
  compact?: boolean;
}

interface UsageData {
  can_create: boolean;
  videos_used: number;
  video_limit: number | string;
  plan_name: string;
  plan_id: string;
  remaining: number;
  subscription_status?: string;
  current_period_end?: string;
}

export function SubscriptionStatus({ userId, onUpgrade, compact = false }: SubscriptionStatusProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showPaywall, setShowPaywall, checkLimit } = useVideoLimit();

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch(`/api/user/video-limit?userId=${userId}`);
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError('Erro ao carregar dados de uso');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUsage();
    }
  }, [userId]);

  if (loading) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className={cn("flex items-center justify-center", compact ? 'p-0' : 'py-8')}>
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className={cn("flex items-center gap-2 text-amber-600", compact ? 'p-0' : 'py-4')}>
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error || 'Erro ao carregar'}</span>
        </CardContent>
      </Card>
    );
  }

  const isUnlimited = usage.video_limit === 'Ilimitado' || usage.video_limit === -1;
  const usagePercent = isUnlimited ? 0 : (usage.videos_used / (usage.video_limit as number)) * 100;
  const isNearLimit = !isUnlimited && usagePercent >= 80;
  const isAtLimit = !isUnlimited && usage.videos_used >= (usage.video_limit as number);

  const getPlanIcon = () => {
    switch (usage.plan_id) {
      case 'business':
        return <Crown className="w-4 h-4 text-indigo-500" />;
      case 'pro':
        return <Zap className="w-4 h-4 text-violet-500" />;
      default:
        return <Video className="w-4 h-4 text-slate-500" />;
    }
  };

  const getPlanBadgeColor = () => {
    switch (usage.plan_id) {
      case 'business':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'pro':
        return 'bg-violet-100 text-violet-700 border-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Versão compacta para header/sidebar
  if (compact) {
    return (
      <>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border">
          <div className="flex items-center gap-2">
            {getPlanIcon()}
            <Badge variant="outline" className={cn("text-xs", getPlanBadgeColor())}>
              {usage.plan_name}
            </Badge>
          </div>
          
          {!isUnlimited && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={isAtLimit ? 'text-red-600 font-medium' : 'text-slate-600'}>
                  {usage.videos_used}/{usage.video_limit} vídeos
                </span>
              </div>
              <Progress 
                value={usagePercent} 
                className={cn(
                  "h-1.5",
                  isAtLimit && "[&>div]:bg-red-500",
                  isNearLimit && !isAtLimit && "[&>div]:bg-amber-500"
                )}
              />
            </div>
          )}
          
          {isUnlimited && (
            <span className="text-xs text-indigo-600 font-medium">∞ Ilimitado</span>
          )}

          {usage.plan_id === 'free' && (
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
              onClick={onUpgrade}
            >
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          )}
        </div>

        <Paywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          videosUsed={usage.videos_used}
          videoLimit={usage.video_limit as number}
          currentPlan={usage.plan_name}
          userId={userId}
        />
      </>
    );
  }

  // Versão completa para dashboard
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {getPlanIcon()}
              Seu Plano
            </CardTitle>
            <Badge variant="outline" className={getPlanBadgeColor()}>
              {usage.plan_name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!isUnlimited ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold">{usage.videos_used}</span>
                  <span className="text-slate-500 ml-1">/ {usage.video_limit}</span>
                </div>
                <span className="text-sm text-slate-500">vídeos este mês</span>
              </div>
              
              <Progress 
                value={usagePercent} 
                className={cn(
                  "h-2",
                  isAtLimit && "[&>div]:bg-red-500",
                  isNearLimit && !isAtLimit && "[&>div]:bg-amber-500"
                )}
              />

              {isAtLimit && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Você atingiu o limite mensal
                </div>
              )}

              {isNearLimit && !isAtLimit && (
                <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg">
                  Restam apenas {usage.remaining} vídeos
                </div>
              )}

              {usage.plan_id === 'free' && (
                <Button 
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  onClick={onUpgrade}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Fazer Upgrade
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Crown className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
              <p className="text-lg font-medium text-indigo-700">Vídeos Ilimitados</p>
              <p className="text-sm text-slate-500">
                {usage.videos_used} vídeos criados este mês
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Paywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        videosUsed={usage.videos_used}
        videoLimit={usage.video_limit as number}
        currentPlan={usage.plan_name}
        userId={userId}
      />
    </>
  );
}

// Hook para verificar limite antes de criar vídeo
export function useCanCreateVideo(userId: string) {
  const [canCreate, setCanCreate] = useState(true);
  const [checking, setChecking] = useState(false);
  const { showPaywall, setShowPaywall, checkLimit } = useVideoLimit();

  const verifyAndCreate = async (onAllowed: () => void) => {
    setChecking(true);
    const allowed = await checkLimit(userId);
    setChecking(false);
    
    if (allowed) {
      onAllowed();
    }
    // Se não permitido, o hook useVideoLimit já mostra o paywall
  };

  return {
    canCreate,
    checking,
    verifyAndCreate,
    showPaywall,
    setShowPaywall,
  };
}
