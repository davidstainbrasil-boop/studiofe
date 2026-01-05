'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Sparkles,
    Mic,
    FileText,
    TrendingUp,
    Scissors,
    Zap,
    Brain,
    Video,
    Wand2,
    ArrowRight,
    CheckCircle,
    Star,
    Users,
    Clock
} from 'lucide-react'

export default function AIFeaturesHub() {
    const aiFeatures = [
        {
            id: 'voice-cloning',
            icon: Mic,
            title: 'Voice Cloning',
            description: 'Clone qualquer voz com apenas 30 segundos de áudio usando IA neural',
            color: 'from-blue-600 to-cyan-600',
            bgColor: 'bg-blue-500',
            href: '/voice-cloning-advanced',
            stats: [
                { label: 'Vozes', value: '50K+' },
                { label: 'Idiomas', value: '25+' },
                { label: 'Precisão', value: '95%' }
            ],
            features: [
                'Clonagem instantânea',
                'Controle de emoção',
                'Síntese em tempo real',
                'Qualidade broadcast'
            ],
            status: 'ready'
        },
        {
            id: 'auto-subtitles',
            icon: FileText,
            title: 'Auto-Subtitles',
            description: 'Geração automática de legendas com Whisper AI e precisão superior a 95%',
            color: 'from-green-600 to-teal-600',
            bgColor: 'bg-green-500',
            href: '/auto-subtitles',
            stats: [
                { label: 'Idiomas', value: '90+' },
                { label: 'Precisão', value: '95%' },
                { label: 'Formatos', value: '4' }
            ],
            features: [
                'Transcrição automática',
                'Editor profissional',
                'Multi-idioma',
                'Exportação SRT/VTT/ASS'
            ],
            status: 'ready'
        },
        {
            id: 'video-enhancement',
            icon: TrendingUp,
            title: 'Video Enhancement',
            description: 'Melhore a qualidade do vídeo com upscaling AI, denoise e color grading',
            color: 'from-indigo-600 to-purple-600',
            bgColor: 'bg-indigo-500',
            href: '/video-enhancement',
            stats: [
                { label: 'Upscale até', value: '4K' },
                { label: 'FPS máximo', value: '240' },
                { label: 'Presets', value: '6' }
            ],
            features: [
                'Upscaling 480p → 4K',
                'Redução de ruído AI',
                'Interpolação de frames',
                'Color grading profissional'
            ],
            status: 'ready'
        },
        {
            id: 'scene-detection',
            icon: Scissors,
            title: 'Scene Detection',
            description: 'Detecte e separe cenas automaticamente com computer vision AI',
            color: 'from-pink-600 to-rose-600',
            bgColor: 'bg-pink-500',
            href: '/scene-detection',
            stats: [
                { label: 'Precisão', value: '95%' },
                { label: 'Detecção', value: 'Auto' },
                { label: 'Export', value: 'Batch' }
            ],
            features: [
                'Detecção automática',
                'Timeline visual',
                'Exportação em lote',
                'Ajuste de sensibilidade'
            ],
            status: 'ready'
        }
    ]

    const stats = [
        { icon: Brain, label: 'AI Models', value: '10+', color: 'text-purple-600' },
        { icon: Users, label: 'Usuários', value: '5,000+', color: 'text-blue-600' },
        { icon: Video, label: 'Vídeos Processados', value: '100K+', color: 'text-green-600' },
        { icon: Star, label: 'Satisfação', value: '98%', color: 'text-yellow-600' }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="p-4 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl">
                            <Sparkles className="w-12 h-12 text-white" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                AI Features Hub
                            </h1>
                            <p className="text-gray-600 text-lg">
                                Ferramentas de IA para profissionalizar seus vídeos
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Badge variant="secondary" className="px-4 py-2 text-sm">
                            <Brain className="w-4 h-4 mr-2" />
                            10+ Modelos de IA
                        </Badge>
                        <Badge variant="secondary" className="px-4 py-2 text-sm">
                            <Zap className="w-4 h-4 mr-2" />
                            Processamento em Tempo Real
                        </Badge>
                        <Badge variant="secondary" className="px-4 py-2 text-sm">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            100% Funcional
                        </Badge>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <Card key={index} className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                                <CardContent className="p-6">
                                    <div className={`flex items-center justify-center mb-3 ${stat.color}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* AI Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {aiFeatures.map((feature) => {
                        const Icon = feature.icon
                        return (
                            <Card key={feature.id} className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
                                <div className={`h-2 bg-gradient-to-r ${feature.color}`} />
                                <CardHeader>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 ${feature.bgColor} rounded-xl`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                        <Badge className="bg-green-100 text-green-800 border-0">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            {feature.status === 'ready' ? 'Pronto' : 'Em breve'}
                                        </Badge>
                                    </div>

                                    <CardTitle className="text-2xl mb-2">{feature.title}</CardTitle>
                                    <CardDescription className="text-base">
                                        {feature.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-4">
                                        {feature.stats.map((stat, idx) => (
                                            <div key={idx} className="text-center">
                                                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                                                <div className="text-xs text-gray-600">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Features List */}
                                    <div className="space-y-2">
                                        {feature.features.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                                <span className="text-gray-700">{item}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA Button */}
                                    <Button
                                        onClick={() => window.location.href = feature.href}
                                        className={`w-full bg-gradient-to-r ${feature.color} hover:opacity-90 text-white`}
                                        size="lg"
                                    >
                                        <Wand2 className="w-5 h-5 mr-2" />
                                        Acessar Feature
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Coming Soon Section */}
                <Card className="border-2 border-dashed border-purple-300 bg-purple-50/50">
                    <CardContent className="p-8 text-center">
                        <Clock className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Mais features em desenvolvimento
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Estamos constantemente adicionando novas ferramentas de IA para melhorar sua experiência
                        </p>
                        <div className="flex justify-center gap-2 flex-wrap">
                            <Badge variant="outline">AI Script Generation</Badge>
                            <Badge variant="outline">Background Removal</Badge>
                            <Badge variant="outline">Auto B-Roll</Badge>
                            <Badge variant="outline">Smart Thumbnails</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="mt-12 text-center text-sm text-gray-500">
                    <p>© 2024 MVP Video TécnicoCursos - AI-Powered Video Platform</p>
                </div>
            </div>
        </div>
    )
}
