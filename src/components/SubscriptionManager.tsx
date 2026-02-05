'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

interface Plan {
  id: string;
  name: string;
  price: number;
  videosPerMonth: number;
  storageGB: number;
  features: string[];
  recommended?: boolean;
  canUpgrade: boolean;
  current?: boolean;
  priceComparison?: {
    monthlyPrice: number;
    yearlySavings: number;
  };
}

export default function SubscriptionManager() {
  const { data: session } = useSession();
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (session) {
      fetchSubscriptionData();
    }
  }, [session]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription');
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      } else {
        console.error('Error fetching subscription data');
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newPlanId: string) => {
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkoutUrl;
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.error}`);
      }
    } catch (error) {
      alert('Erro ao processar upgrade. Tente novamente.');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return;

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        await fetchSubscriptionData();
        alert('Assinatura cancelada com sucesso.');
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.error}`);
      }
    } catch (error) {
      alert('Erro ao cancelar assinatura. Tente novamente.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatStorage = (gb: number) => {
    if (gb < 1) return `${Math.round(gb * 1024)} MB`;
    return `${gb.toFixed(1)} GB`;
  };

  const formatFeatureIcon = (feature: string) => {
    const icons: { [string, string] } = {
      'Basic templates': '📋',
      'Premium templates': '🎨',
      'Standard quality': '🎥',
      'HD quality': '📺',
      '4K quality': '🔥',
      'Ultra 8K quality': '🚀',
      'Priority support': '🌟',
      'Analytics': '📊',
      'Collaboration': '👥',
      'API access': '🔌',
      'Custom integrations': '🔗',
      'White label': '🏢',
      'SSO': '🔐',
      'Advanced analytics': '📈',
      'Email support': '✉️'
    };
    return icons[feature] || '✓';
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  const { subscription, availablePlans, usage, history } = subscriptionData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                💳 Assinatura
              </h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Plano Atual</h2>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">{subscription.plan.name}</h3>
                  {subscription.isOverLimit && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                      ⚠️ Limite excedido
                    </span>
                  )}
                </div>
                
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatPrice(subscription.plan.price)}
                  <span className="text-lg text-gray-600 font-normal">
                    {billingCycle === 'yearly' ? '/ano' : '/mês'}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">Status</div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscription.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : subscription.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {subscription.status === 'ACTIVE' ? 'Ativo' : 
                     subscription.status === 'CANCELLED' ? 'Cancelado' : 
                     subscription.status === 'PENDING' ? 'Pendente' : subscription.status}
                  }
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Válido até</div>
                  <div className="text-lg font-medium text-gray-900">
                    {subscription.endDate 
                      ? new Date(subscription.endDate).toLocaleDateString('pt-BR')
                      : 'Lifetime'
                    }
                  </div>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{usage.videos}</div>
                      <div className="text-sm text-gray-600">Vídeos este mês</div>
                      <div className="text-sm text-gray-500">de {subscription.limits.videosPerMonth}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{usage.storage.formatBytes(usage.storage.used)}</div>
                      <div className="text-sm text-gray-600">Armazenamento usado</div>
                      <div className="text-sm text-gray-500">de {formatStorage(subscription.limits.storageGB)}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round((usage.videos / subscription.limits.videosPerMonth) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Limite mensal</div>
                    </div>
                  </div>
                </div>

                {subscription.status === 'ACTIVE' && (
                  <button
                    onClick={handleCancelSubscription}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancelar Assinatura
                  </button>
                )}
              </div>

              {/* Features */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recursos</h3>
                <div className="space-y-3">
                  {subscription.plan.features.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <span className="text-lg">{formatFeatureIcon(feature)}</span>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Usage History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Histórico</h2>
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{item.plan}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(item.startDate).toLocaleDateString('pt-BR')}
                      </div>
                      {item.endDate && (
                        <div className="text-sm text-gray-500">
                          até {new Date(item.endDate).toLocaleDateString('pT-BR')}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {item.price > 0 ? formatPrice(item.price) : 'Grátis'}
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum histórico disponível
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {billingCycle === 'yearly' ? 'Planos Anuais' : 'Planos Mensais'}
                <button
                  onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  {billingCycle === 'monthly' ? 'Ver planos anuais (economize 20%)' : 'Ver planos mensais'}
                </button>
              </h2>

              <div className="space-y-4">
                {availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      plan.current
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => !plan.current && handleUpgrade(plan.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {plan.name}
                      </h3>
                      {plan.recommended && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Recomendado
                        </span>
                      )}
                      {plan.current && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Atual
                        </span>
                      )}
                    </div>

                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {formatPrice(
                        billingCycle === 'yearly' && plan.priceComparison
                          ? plan.priceComparison.yearlySavings / 12
                          : plan.price
                      )}
                      <span className="text-lg text-gray-600 font-normal">
                        {billingCycle === 'yearly' ? '/ano' : '/mês'}
                      </span>
                    </div>

                    {plan.priceComparison && billingCycle === 'yearly' && (
                      <div className="text-xs text-green-600">
                        Economize {formatPrice(plan.priceComparison.monthlyPrice)}/mês ({formatPrice(plan.priceComparison.yearlySavings)}/ano)
                      </div>
                    )}

                    {plan.priceComparison && billingCycle === 'monthly' && plan.priceComparison.yearlySavings > 0 && (
                      <div className="text-xs text-gray-600">
                        ou {formatPrice(plan.priceComparison.yearlySavings)}/ano
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vídeos/mês:</span>
                      <span className="font-medium text-gray-900">{plan.videosPerMonth}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Armazenamento:</span>
                      <span className="font-medium text-gray-900">{formatStorage(plan.storageGB)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Preço:</span>
                      <span className="font-medium text-gray-900">
                        {billingCycle === 'yearly' && plan.priceComparison
                          ? <span>{formatPrice(plan.priceComparison.yearlySavings)}/ano</span>
                          : <span>{formatPrice(plan.price)}/mês</span>
                        }
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Recursos</h4>
                    <div className="space-y-2">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <span className="text-lg">{formatFeatureIcon(feature)}</span>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      disabled={plan.current || !plan.canUpgrade}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                        plan.current
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : plan.canUpgrade
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-700 cursor-not-allowed'
                      }`}
                    >
                      {plan.current ? 'Plano Atual' : 
                       plan.canUpgrade ? 'Fazer Upgrade' : 'Indisponível'}
                    }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}