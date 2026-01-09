'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import {
    Sparkles,
    Video,
    Wand2,
    TrendingUp,
    Volume2,
    Palette,
    Zap,
    CheckCircle,
    Star,
    Brain,
    Settings
} from 'lucide-react'
import VideoUpscaler from './components/VideoUpscaler'
import NoiseReduction from './components/NoiseReduction'
import FrameInterpolation from './components/FrameInterpolation'
import ColorEnhancement from './components/ColorEnhancement'

export default function VideoEnhancementPage() {
    const [activeTab, setActiveTab] = useState('upscale')

    const features = [
        {
            icon: <TrendingUp className="w-8 h-8" />,
            title: "AI Upscaling",
            description: "Melhore resolução de 480p para 4K com IA",
            color: "bg-blue-500"
        },
        {
            icon: <Volume2 className="w-8 h-8" />,
            title: "Redução de Ruído",
            description: "Remova ruídos e artefatos automaticamente",
            color: "bg-green-500"
        },
        {
            icon: <Zap className="w-8 h-8" />,
            title: "Frame Interpolation",
            description: "Aumente FPS para vídeos mais fluidos",
            color: "bg-purple-500"
        },
        {
            icon: <Palette className="w-8 h-8" />,
            title: "Color Grading IA",
            description: "Correção de cor profissional automática",
            color: "bg-orange-500"
        }
    ]

    const stats = [
        { label: "Vídeos Processados", value: "10,000+", icon: Video },
        { label: "Taxa de Sucesso", value: "98%", icon: CheckCircle },
        { label: "Melhoria Média", value: "3.5x", icon: TrendingUp },
        { label: "Tempo Médio", value: "5min", icon: Zap }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                AI Video Enhancement
                            </h1>
                            <p className="text-gray-600">Melhore a qualidade dos seus vídeos com inteligência artificial</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="px-3 py-1">
                            <Brain className="w-4 h-4 mr-2" />
                            Real-ESRGAN
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                            <Zap className="w-4 h-4 mr-2" />
                            Processamento em Nuvem
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                            <Star className="w-4 h-4 mr-2" />
                            Qualidade Profissional
                        </Badge>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <Card key={index} className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-center mb-3 text-indigo-600">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {features.map((feature, index) => (
                        <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <div className={`w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    {feature.icon}
                                </div>
                                <h3 className="font-semibold mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-600">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Enhancement Tools */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wand2 className="w-5 h-5" />
                            Ferramentas de Melhoria
                        </CardTitle>
                        <CardDescription>
                            Selecione a ferramenta de IA para melhorar seu vídeo
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm">
                                <TabsTrigger value="upscale" className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Upscaling
                                </TabsTrigger>
                                <TabsTrigger value="denoise" className="flex items-center gap-2">
                                    <Volume2 className="w-4 h-4" />
                                    Denoise
                                </TabsTrigger>
                                <TabsTrigger value="interpolate" className="flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    FPS Boost
                                </TabsTrigger>
                                <TabsTrigger value="color" className="flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    Color Grade
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="upscale" className="mt-6">
                                <VideoUpscaler />
                            </TabsContent>

                            <TabsContent value="denoise" className="mt-6">
                                <NoiseReduction />
                            </TabsContent>

                            <TabsContent value="interpolate" className="mt-6">
                                <FrameInterpolation />
                            </TabsContent>

                            <TabsContent value="color" className="mt-6">
                                <ColorEnhancement />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Info Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>© 2024 AI Video Enhancement - Powered by Real-ESRGAN & Advanced AI Models</p>
                </div>
            </div>
        </div>
    )
}
