'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    CreditCard,
    Zap,
    TrendingUp,
    Calendar,
    CheckCircle,
    Video,
    FileText,
    Sparkles,
    Star
} from 'lucide-react'
import { toast } from 'sonner'

interface UsageData {
    feature: string
    used: number
    limit: number
    icon: React.ReactNode
}

export default function UsageBillingPage() {
    const [currentPlan] = useState({
        name: 'Pro',
        price: 'R$ 49,90',
        period: '/mês',
        renewDate: new Date(Date.now() + 15 * 24 * 60 * 60000)
    })

    const usageData: UsageData[] = [
        {
            feature: 'Vídeos Processados',
            used: 145,
            limit: 200,
            icon: <Video className="w-5 h-5 text-blue-500" />
        },
        {
            feature: 'Legendas Geradas',
            used: 89,
            limit: 100,
            icon: <FileText className="w-5 h-5 text-green-500" />
        },
        {
            feature: 'Minutos de Áudio',
            used: 450,
            limit: 600,
            icon: <Sparkles className="w-5 h-5 text-purple-500" />
        },
        {
            feature: 'Armazenamento (GB)',
            used: 12,
            limit: 50,
            icon: <TrendingUp className="w-5 h-5 text-orange-500" />
        }
    ]

    const plans = [
        {
            name: 'Free',
            price: 'R$ 0',
            features: ['10 vídeos/mês', '5 legendas/mês', '60 min de áudio', '1 GB armazenamento'],
            current: false
        },
        {
            name: 'Pro',
            price: 'R$ 49,90',
            features: ['200 vídeos/mês', '100 legendas/mês', '600 min de áudio', '50 GB armazenamento', 'Suporte prioritário'],
            current: true,
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'R$ 199,90',
            features: ['Vídeos ilimitados', 'Legendas ilimitadas', 'Áudio ilimitado', '500 GB armazenamento', 'API dedicada', 'SLA garantido'],
            current: false
        }
    ]

    const invoices = [
        { date: '01/12/2024', amount: 'R$ 49,90', status: 'Pago' },
        { date: '01/11/2024', amount: 'R$ 49,90', status: 'Pago' },
        { date: '01/10/2024', amount: 'R$ 49,90', status: 'Pago' }
    ]

    const handleUpgrade = (planName: string) => {
        toast.success(`Upgrade para ${planName} iniciado!`)
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl">
                            <CreditCard className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                Uso & Faturamento
                            </h1>
                            <p className="text-gray-600">Gerencie seu plano e acompanhe o uso</p>
                        </div>
                    </div>
                </div>

                {/* Current Plan */}
                <Card className="mb-8 border-2 border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl">
                                    <Zap className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-bold">Plano {currentPlan.name}</h2>
                                        <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                                    </div>
                                    <div className="text-lg text-gray-600">
                                        <span className="text-3xl font-bold text-gray-900">{currentPlan.price}</span>
                                        {currentPlan.period}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Próxima cobrança</div>
                                <div className="font-semibold flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(currentPlan.renewDate)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Usage Stats */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Uso do Período</CardTitle>
                        <CardDescription>Acompanhe seu consumo mensal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {usageData.map((item, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {item.icon}
                                            <span className="font-medium">{item.feature}</span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            {item.used} / {item.limit}
                                        </span>
                                    </div>
                                    <Progress
                                        value={(item.used / item.limit) * 100}
                                        className="h-2"
                                    />
                                    <div className="text-right text-xs text-gray-500 mt-1">
                                        {Math.round((item.used / item.limit) * 100)}% usado
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Plans Comparison */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Planos Disponíveis</CardTitle>
                        <CardDescription>Escolha o melhor plano para você</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map((plan, index) => (
                                <Card
                                    key={index}
                                    className={`relative ${plan.current ? 'border-2 border-green-500' : ''} ${plan.popular ? 'shadow-lg' : ''}`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                            <Badge className="bg-gradient-to-r from-green-500 to-blue-600">
                                                <Star className="w-3 h-3 mr-1" />
                                                Mais Popular
                                            </Badge>
                                        </div>
                                    )}
                                    <CardContent className="p-6 pt-8">
                                        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                        <div className="text-3xl font-bold mb-4">
                                            {plan.price}
                                            <span className="text-sm font-normal text-gray-500">/mês</span>
                                        </div>
                                        <ul className="space-y-2 mb-6">
                                            {plan.features.map((feature, fIndex) => (
                                                <li key={fIndex} className="flex items-center gap-2 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            className={`w-full ${plan.current
                                                ? 'bg-gray-200 text-gray-600 cursor-default'
                                                : 'bg-gradient-to-r from-green-500 to-blue-600'}`}
                                            onClick={() => !plan.current && handleUpgrade(plan.name)}
                                            disabled={plan.current}
                                        >
                                            {plan.current ? 'Plano Atual' : 'Fazer Upgrade'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Invoices */}
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Faturas</CardTitle>
                        <CardDescription>Suas últimas cobranças</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {invoices.map((invoice, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CreditCard className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{invoice.date}</div>
                                            <div className="text-sm text-gray-500">{invoice.amount}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge className="bg-green-100 text-green-800">{invoice.status}</Badge>
                                        <Button variant="outline" size="sm">
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
