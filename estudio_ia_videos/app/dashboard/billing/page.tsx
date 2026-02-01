'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Crown,
  Zap,
  Building2,
  Check,
  AlertCircle,
  Clock,
  TrendingUp,
  Video,
  HardDrive,
  Mic,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaywallModal, UpgradeBanner } from '@/components/billing/paywall-modal'
import { useSubscription } from '@/hooks/use-subscription'

// =============================================================================
// Types
// =============================================================================

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  downloadUrl?: string
}

// =============================================================================
// Mock Invoices (will be replaced with real data)
// =============================================================================

const mockInvoices: Invoice[] = [
  {
    id: 'INV-2024-001',
    date: '2024-01-15',
    amount: 9700,
    status: 'paid',
    downloadUrl: '#',
  },
  {
    id: 'INV-2023-012',
    date: '2023-12-15',
    amount: 9700,
    status: 'paid',
    downloadUrl: '#',
  },
  {
    id: 'INV-2023-011',
    date: '2023-11-15',
    amount: 9700,
    status: 'paid',
    downloadUrl: '#',
  },
]

// =============================================================================
// BillingPage Component
// =============================================================================

export default function BillingPage() {
  const {
    plan,
    subscription,
    usage,
    limits,
    isLoading,
    openUpgradeModal,
  } = useSubscription()

  // Extract status info from subscription
  const status = subscription?.status || 'active'
  const billingPeriod = 'monthly' as 'monthly' | 'yearly' // Default, could be derived from subscription metadata
  const currentPeriodEnd = subscription?.currentPeriodEnd
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false

  const [showPaywall, setShowPaywall] = useState(false)
  const [isPortalLoading, setIsPortalLoading] = useState(false)
  const [invoices] = useState<Invoice[]>(mockInvoices)

  const handleManageSubscription = async () => {
    setIsPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Portal error:', error)
      // TODO: Show error toast
    } finally {
      setIsPortalLoading(false)
    }
  }

  const getPlanIcon = () => {
    switch (plan) {
      case 'business':
        return <Building2 className="h-6 w-6" />
      case 'pro':
        return <Zap className="h-6 w-6" />
      default:
        return <Crown className="h-6 w-6" />
    }
  }

  const getPlanColor = () => {
    switch (plan) {
      case 'business':
        return 'bg-amber-100 text-amber-700'
      case 'pro':
        return 'bg-violet-100 text-violet-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativo</Badge>
      case 'past_due':
        return <Badge variant="destructive">Pagamento pendente</Badge>
      case 'canceled':
        return <Badge variant="secondary">Cancelado</Badge>
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Trial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          className="h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Cobrança e Assinatura</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu plano, visualize uso e acesse faturas.
        </p>
      </div>

      {/* Upgrade Banner for Free Users */}
      {plan === 'free' && (
        <UpgradeBanner
          currentPlan={plan}
          usage={usage || undefined}
          limits={limits}
          variant="full"
        />
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-xl p-3', getPlanColor())}>
                {getPlanIcon()}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plano {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  {getStatusBadge()}
                </CardTitle>
                <CardDescription>
                  {plan === 'free' ? 'Plano gratuito' : billingPeriod === 'yearly' ? 'Cobrança anual' : 'Cobrança mensal'}
                </CardDescription>
              </div>
            </div>

            {plan !== 'free' && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <motion.div
                    className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Gerenciar assinatura
              </Button>
            )}

            {plan === 'free' && (
              <Button onClick={() => setShowPaywall(true)}>
                <Zap className="h-4 w-4 mr-2" />
                Fazer upgrade
              </Button>
            )}
          </div>
        </CardHeader>

        {cancelAtPeriodEnd && (
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <span>
                Sua assinatura será cancelada em{' '}
                {currentPeriodEnd && new Date(currentPeriodEnd).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </CardContent>
        )}

        {plan !== 'free' && currentPeriodEnd && !cancelAtPeriodEnd && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Próxima cobrança em{' '}
                {new Date(currentPeriodEnd).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Uso do Mês
          </CardTitle>
          <CardDescription>
            Acompanhe seu consumo mensal de recursos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Videos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Vídeos criados</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage?.videosCreatedThisMonth || 0} / {limits?.videosPerMonth || 1}
              </span>
            </div>
            <Progress
              value={((usage?.videosCreatedThisMonth || 0) / (limits?.videosPerMonth || 1)) * 100}
              className="h-2"
            />
          </div>

          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Armazenamento</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {(usage?.storageUsedGb || 0).toFixed(1)} GB / {limits?.storageGb || 1} GB
              </span>
            </div>
            <Progress
              value={((usage?.storageUsedGb || 0) / (limits?.storageGb || 1)) * 100}
              className="h-2"
            />
          </div>

          {/* TTS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Narração TTS</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage?.ttsMinutesUsed || 0} / {usage?.ttsMinutesLimit || 5} min
              </span>
            </div>
            <Progress
              value={((usage?.ttsMinutesUsed || 0) / (usage?.ttsMinutesLimit || 5)) * 100}
              className="h-2"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Clock className="h-3 w-3" />
            <span>
              Renova em{' '}
              {usage?.nextResetDate
                ? new Date(usage.nextResetDate).toLocaleDateString('pt-BR')
                : 'N/A'}
            </span>
          </div>
        </CardContent>

        {plan !== 'business' && (
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPaywall(true)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Aumentar limites
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>{limits?.videosPerMonth} vídeos/mês</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Resolução até {limits?.maxResolution}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>{limits?.ttsVoices} vozes TTS</span>
            </div>
            <div className="flex items-center gap-2">
              {limits?.hasAvatar ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Avatar IA</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Avatar IA (Pro+)</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!limits?.hasWatermark ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Sem marca d'água</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Com marca d'água</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {limits?.hasApiAccess ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Acesso à API</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">API (Business)</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      {plan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      {new Date(invoice.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      R$ {(invoice.amount / 100).toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell>
                      {invoice.status === 'paid' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Pago
                        </Badge>
                      )}
                      {invoice.status === 'pending' && (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                      {invoice.status === 'failed' && (
                        <Badge variant="destructive">Falhou</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!invoice.downloadUrl}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {invoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma fatura disponível
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleManageSubscription}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver todas as faturas no Stripe
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Payment Method */}
      {plan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Método de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Gerencie seus métodos de pagamento diretamente no portal do Stripe.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleManageSubscription}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Gerenciar pagamento
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        currentPlan={plan}
        usage={usage || undefined}
        limits={limits}
      />
    </div>
  )
}
