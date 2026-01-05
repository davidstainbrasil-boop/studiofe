'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    Plug,
    Youtube,
    Instagram,
    Twitter,
    Facebook,
    Linkedin,
    CheckCircle,
    XCircle,
    ExternalLink,
    RefreshCw,
    Settings,
    Zap
} from 'lucide-react'
import { toast } from 'sonner'

interface Integration {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    color: string
    connected: boolean
    lastSync?: Date
    features: string[]
}

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: 'youtube',
            name: 'YouTube',
            description: 'Publique vídeos diretamente no YouTube',
            icon: <Youtube className="w-8 h-8" />,
            color: 'bg-red-500',
            connected: true,
            lastSync: new Date(Date.now() - 2 * 60 * 60000),
            features: ['Auto-upload', 'Thumbnails', 'Playlists', 'Analytics']
        },
        {
            id: 'instagram',
            name: 'Instagram',
            description: 'Compartilhe Reels e Stories',
            icon: <Instagram className="w-8 h-8" />,
            color: 'bg-gradient-to-r from-purple-500 to-pink-500',
            connected: true,
            lastSync: new Date(Date.now() - 24 * 60 * 60000),
            features: ['Reels', 'Stories', 'IGTV', 'Carousel']
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            description: 'Publique vídeos curtos no TikTok',
            icon: <span className="text-2xl">📱</span>,
            color: 'bg-black',
            connected: false,
            features: ['Auto-upload', 'Hashtags', 'Analytics']
        },
        {
            id: 'twitter',
            name: 'Twitter/X',
            description: 'Compartilhe clipes e teasers',
            icon: <Twitter className="w-8 h-8" />,
            color: 'bg-blue-400',
            connected: false,
            features: ['Video tweets', 'Threads', 'Scheduling']
        },
        {
            id: 'facebook',
            name: 'Facebook',
            description: 'Publique em páginas e grupos',
            icon: <Facebook className="w-8 h-8" />,
            color: 'bg-blue-600',
            connected: false,
            features: ['Pages', 'Groups', 'Reels', 'Lives']
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            description: 'Compartilhe conteúdo profissional',
            icon: <Linkedin className="w-8 h-8" />,
            color: 'bg-blue-700',
            connected: false,
            features: ['Posts', 'Articles', 'Company pages']
        }
    ])

    const handleConnect = (id: string) => {
        setIntegrations(prev => prev.map(i =>
            i.id === id ? { ...i, connected: true, lastSync: new Date() } : i
        ))
        toast.success('Integração conectada com sucesso!')
    }

    const handleDisconnect = (id: string) => {
        setIntegrations(prev => prev.map(i =>
            i.id === id ? { ...i, connected: false, lastSync: undefined } : i
        ))
        toast.success('Integração desconectada')
    }

    const handleSync = (id: string) => {
        setIntegrations(prev => prev.map(i =>
            i.id === id ? { ...i, lastSync: new Date() } : i
        ))
        toast.success('Sincronização iniciada!')
    }

    const formatLastSync = (date: Date) => {
        const diff = Date.now() - date.getTime()
        const hours = Math.floor(diff / (60 * 60 * 1000))
        if (hours < 1) return 'Agora mesmo'
        if (hours < 24) return `${hours}h atrás`
        return `${Math.floor(hours / 24)}d atrás`
    }

    const connectedCount = integrations.filter(i => i.connected).length

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl">
                                <Plug className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                                    Integrações
                                </h1>
                                <p className="text-gray-600">Conecte suas redes sociais e serviços</p>
                            </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                            {connectedCount} conectadas
                        </Badge>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-violet-600 mb-1">{integrations.length}</div>
                            <div className="text-sm text-gray-600">Integrações Disponíveis</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">{connectedCount}</div>
                            <div className="text-sm text-gray-600">Conectadas</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                                {integrations.filter(i => i.connected).reduce((sum, i) => sum + i.features.length, 0)}
                            </div>
                            <div className="text-sm text-gray-600">Recursos Ativos</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Integrations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrations.map(integration => (
                        <Card key={integration.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            <div className={`h-2 ${integration.color}`} />
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 ${integration.color} text-white rounded-xl`}>
                                        {integration.icon}
                                    </div>
                                    <Badge className={integration.connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                        {integration.connected ? (
                                            <span className="flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Conectado
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <XCircle className="w-3 h-3" />
                                                Desconectado
                                            </span>
                                        )}
                                    </Badge>
                                </div>

                                <h3 className="font-bold text-xl mb-2">{integration.name}</h3>
                                <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

                                {/* Features */}
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {integration.features.map((feature, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                            {feature}
                                        </Badge>
                                    ))}
                                </div>

                                {/* Last Sync */}
                                {integration.connected && integration.lastSync && (
                                    <div className="text-xs text-gray-500 mb-4">
                                        Última sincronização: {formatLastSync(integration.lastSync)}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {integration.connected ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleSync(integration.id)}
                                            >
                                                <RefreshCw className="w-4 h-4 mr-1" />
                                                Sincronizar
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDisconnect(integration.id)}
                                                className="text-red-600 hover:bg-red-50"
                                            >
                                                Desconectar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
                                            onClick={() => handleConnect(integration.id)}
                                        >
                                            <Zap className="w-4 h-4 mr-2" />
                                            Conectar
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Coming Soon */}
                <Card className="mt-8 border-2 border-dashed border-gray-300">
                    <CardContent className="p-8 text-center">
                        <Plug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">
                            Mais Integrações em Breve
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Vimeo, Dropbox, Google Drive, Zapier, e muito mais!
                        </p>
                        <Button variant="outline">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Sugerir Integração
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
