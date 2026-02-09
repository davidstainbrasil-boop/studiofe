'use client';
import { logger } from '@/lib/logger';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X, Zap, Building2, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface PlanFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}

const features: PlanFeature[] = [
  { name: 'Vídeos por mês', free: '1', pro: '10', business: 'Ilimitado' },
  { name: 'Resolução máxima', free: '720p', pro: '1080p', business: '4K' },
  { name: 'Templates NR', free: '5 básicos', pro: 'Todos (38)', business: 'Todos + Custom' },
  { name: 'Vozes TTS', free: '2 vozes', pro: '10 vozes', business: 'Todas + Clonagem' },
  { name: 'Avatar IA', free: false, pro: true, business: true },
  { name: 'Lip-sync avançado', free: false, pro: true, business: true },
  { name: 'Marca d\'água', free: true, pro: false, business: false },
  { name: 'White-label', free: false, pro: false, business: true },
  { name: 'API access', free: false, pro: false, business: true },
  { name: 'Multi-usuário', free: false, pro: false, business: true },
  { name: 'Export SCORM', free: false, pro: true, business: true },
  { name: 'Suporte', free: 'Comunidade', pro: 'Email', business: 'Prioritário 24/7' },
];

const plans = [
  {
    id: 'free',
    name: 'Grátis',
    description: 'Para experimentar a plataforma',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    icon: Sparkles,
    popular: false,
    cta: 'Começar Grátis',
    ctaLoggedIn: 'Plano Atual',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para profissionais e pequenas equipes',
    priceMonthly: 97,
    priceYearly: 930, // ~20% desconto
    stripePriceIdMonthly: 'pro_monthly',
    stripePriceIdYearly: 'pro_yearly',
    icon: Zap,
    popular: true,
    cta: 'Assinar Pro',
    ctaLoggedIn: 'Fazer Upgrade',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Para consultorias e empresas',
    priceMonthly: 297,
    priceYearly: 2850, // ~20% desconto
    stripePriceIdMonthly: 'business_monthly',
    stripePriceIdYearly: 'business_yearly',
    icon: Building2,
    popular: false,
    cta: 'Assinar Business',
    ctaLoggedIn: 'Fazer Upgrade',
  },
];

// Loading component for Suspense
function PricingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-violet-950">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );
}

// Inner component that uses useSearchParams
function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  
  const [isYearly, setIsYearly] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check auth status and current plan
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email || '' });
        
        // Fetch current subscription
        try {
          const response = await fetch(`/api/subscription?userId=${authUser.id}`);
          if (response.ok) {
            const data = await response.json();
            setCurrentPlan(data.plan || 'free');
          }
        } catch (e) {
          logger.error('Error fetching subscription:', e);
        }
      }
    };
    
    checkUser();

    // Check for success/error in URL params
    const upgradeStatus = searchParams?.get('upgrade');
    if (upgradeStatus === 'success') {
      // Show success message
      setError(null);
    } else if (upgradeStatus === 'canceled') {
      setError('Checkout cancelado. Você pode tentar novamente quando quiser.');
    }
  }, [supabase, searchParams]);

  // Handle checkout
  const handleCheckout = async (planId: string, stripePriceId: string | null) => {
    if (!stripePriceId) {
      // Free plan - just redirect to register/dashboard
      router.push(user ? '/dashboard' : '/register');
      return;
    }

    if (!user) {
      // Not logged in - redirect to register with plan param
      router.push(`/register?plan=${planId}`);
      return;
    }

    // Already on this plan or higher
    if (currentPlan === planId) {
      return;
    }

    setLoadingPlan(planId);
    setError(null);

    try {
      const priceId = isYearly ? `${planId}_yearly` : `${planId}_monthly`;
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          priceId,
          successUrl: `${window.location.origin}/dashboard?upgrade=success`,
          cancelUrl: `${window.location.origin}/pricing?upgrade=canceled`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar checkout');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  // Get button text and state for a plan
  const getPlanButton = (plan: typeof plans[0]) => {
    const isCurrentPlan = user && currentPlan === plan.id;
    const isUpgrade = user && ['free'].includes(currentPlan) && plan.id !== 'free';
    const isLoading = loadingPlan === plan.id;
    
    if (isCurrentPlan) {
      return { text: 'Plano Atual', disabled: true };
    }
    if (isLoading) {
      return { text: 'Processando...', disabled: true, loading: true };
    }
    if (user && isUpgrade) {
      return { text: plan.ctaLoggedIn, disabled: false };
    }
    return { text: plan.cta, disabled: false };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <Badge variant="secondary" className="mb-4">
            💰 Economize 20% no plano anual
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            Escolha o plano ideal para você
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Comece grátis e faça upgrade quando precisar. Cancele a qualquer momento.
          </p>
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          
          {/* Toggle Mensal/Anual */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className={cn("text-sm font-medium", !isYearly && "text-violet-600")}>
              Mensal
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-violet-600"
            />
            <span className={cn("text-sm font-medium", isYearly && "text-violet-600")}>
              Anual
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                -20%
              </Badge>
            </span>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            const monthlyEquivalent = isYearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
            const buttonState = getPlanButton(plan);
            const priceId = isYearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
            
            return (
              <Card 
                key={plan.id}
                className={cn(
                  "relative flex flex-col transition-all hover:shadow-xl",
                  plan.popular && "border-violet-500 border-2 shadow-lg scale-105",
                  user && currentPlan === plan.id && "ring-2 ring-green-500"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white px-4 py-1">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                {user && currentPlan === plan.id && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-green-600 text-white px-4 py-1">
                      Seu Plano
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={cn(
                    "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4",
                    plan.id === 'free' && "bg-slate-100 text-slate-600",
                    plan.id === 'pro' && "bg-violet-100 text-violet-600",
                    plan.id === 'business' && "bg-indigo-100 text-indigo-600"
                  )}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-slate-500">R$</span>
                      <span className="text-5xl font-bold text-slate-900 dark:text-white">
                        {monthlyEquivalent}
                      </span>
                      <span className="text-slate-500">/mês</span>
                    </div>
                    {isYearly && price > 0 && (
                      <p className="text-sm text-slate-500 mt-1">
                        R$ {price}/ano (cobrado anualmente)
                      </p>
                    )}
                  </div>
                  
                  <ul className="space-y-3">
                    {features.slice(0, 6).map((feature) => {
                      const value = feature[plan.id as keyof typeof feature];
                      const hasFeature = value !== false;
                      
                      return (
                        <li key={feature.name} className="flex items-center gap-3">
                          {hasFeature ? (
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="w-5 h-5 text-slate-300 flex-shrink-0" />
                          )}
                          <span className={cn(
                            "text-sm",
                            hasFeature ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
                          )}>
                            {feature.name}
                            {typeof value === 'string' && (
                              <span className="text-slate-500 ml-1">({value})</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    onClick={() => handleCheckout(plan.id, priceId)}
                    disabled={buttonState.disabled}
                    className={cn(
                      "w-full h-12 text-base",
                      plan.popular && !buttonState.disabled && "bg-violet-600 hover:bg-violet-700",
                      buttonState.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {buttonState.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {buttonState.text}
                    {!buttonState.disabled && !buttonState.loading && (
                      <ArrowRight className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features Comparison Table */}
      <section className="px-6 py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Comparativo Completo</h2>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-4 font-medium text-slate-500">Recurso</th>
                  <th className="text-center p-4 font-semibold">Grátis</th>
                  <th className="text-center p-4 font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/20">Pro</th>
                  <th className="text-center p-4 font-semibold">Business</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr 
                    key={feature.name}
                    className={cn(
                      "border-b border-slate-100 dark:border-slate-700/50",
                      index % 2 === 0 && "bg-slate-50/50 dark:bg-slate-800/50"
                    )}
                  >
                    <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {feature.name}
                    </td>
                    {['free', 'pro', 'business'].map((planId) => {
                      const value = feature[planId as keyof typeof feature];
                      return (
                        <td 
                          key={planId}
                          className={cn(
                            "p-4 text-center",
                            planId === 'pro' && "bg-violet-50/50 dark:bg-violet-900/10"
                          )}
                        >
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {value}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Perguntas Frequentes</h2>
          
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <h3 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Sim! Você pode cancelar sua assinatura a qualquer momento. Você continuará tendo acesso 
                até o final do período pago.
              </p>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <h3 className="font-semibold mb-2">Quais formas de pagamento são aceitas?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex) e PIX. O pagamento é processado 
                de forma segura pela Stripe.
              </p>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <h3 className="font-semibold mb-2">O que acontece se eu passar do limite de vídeos?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Você receberá uma notificação e poderá fazer upgrade para um plano maior ou aguardar 
                o próximo mês para os créditos renovarem.
              </p>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <h3 className="font-semibold mb-2">Posso mudar de plano depois?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento. Se fizer upgrade, 
                o valor é ajustado proporcionalmente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-20 bg-violet-600 text-white text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="text-violet-100 text-lg">
            Crie seu primeiro vídeo gratuitamente. Sem compromisso.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-violet-600 hover:bg-violet-50 h-14 px-8 text-lg">
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-slate-950 text-slate-500 text-sm text-center">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Studio IA. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white">Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-white">Privacidade</Link>
            <Link href="mailto:suporte@studioia.com.br" className="hover:text-white">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Main export with Suspense boundary
export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent />
    </Suspense>
  );
}
