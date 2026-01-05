'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Scissors,
    Video,
    Brain,
    Sparkles,
    Eye,
    Target,
    Zap,
    CheckCircle,
    Download
} from 'lucide-react'
import SceneAnalyzer from './components/SceneAnalyzer'
import SceneTimeline from './components/SceneTimeline'
import SceneExporter from './components/SceneExporter'

export default function SceneDetectionPage() {
    const [scenes, setScenes] = useState<any[]>([])
    const [videoFile, setVideoFile] = useState<File | null>(null)

    const features = [
        {
            icon: <Brain className="w-8 h-8" />,
            title: "Detecção Inteligente",
            description: "IA identifica mudanças de cena automaticamente",
            color: "bg-purple-500"
        },
        {
            icon: <Scissors className="w-8 h-8" />,
            title: "Corte Automático",
            description: "Divida vídeos em cenas individuais",
            color: "bg-blue-500"
        },
        {
            icon: <Eye className="w-8 h-8" />,
            title: "Detecção de Highlights",
            description: "Identifique momentos importantes",
            color: "bg-green-500"
        },
        {
            icon: <Target className="w-8 h-8" />,
            title: "Precisão Alta",
            description: "95%+ de acurácia na detecção",
            color: "bg-orange-500"
        }
    ]

    const stats = [
        { label: "Cenas Detectadas", value: "50,000+", icon: Scissors },
        { label: "Precisão", value: "95%", icon: Target },
        { label: "Tempo Médio", value: "30s", icon: Zap },
        { label: "Taxa de Sucesso", value: "98%", icon: CheckCircle }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to pink-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                            <Scissors className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Smart Scene Detection
                            </h1>
                            <p className="text-gray-600">Detecção automática de cenas com inteligência artificial</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="px-3 py-1">
                            <Brain className="w-4 h-4 mr-2" />
                            Computer Vision AI
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                            <Scissors className="w-4 h-4 mr-2" />
                            Auto-Split
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                            <Target className="w-4 h-4 mr-2" />
                            95%+ Precisão
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
                                    <div className="flex items-center justify-center mb-3 text-purple-600">
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

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Analyzer */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Video className="w-5 h-5" />
                                Analisador de Cenas
                            </CardTitle>
                            <CardDescription>
                                Faça upload do vídeo para detectar cenas automaticamente
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SceneAnalyzer
                                onScenesDetected={(detectedScenes) => {
                                    setScenes(detectedScenes)
                                }}
                                onVideoUpload={(file) => setVideoFile(file)}
                            />
                        </CardContent>
                    </Card>

                    {/* Exporter */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                Exportar
                            </CardTitle>
                            <CardDescription>
                                Exporte cenas individuais
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SceneExporter scenes={scenes} videoFile={videoFile} />
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline */}
                {scenes.length > 0 && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Timeline de Cenas
                            </CardTitle>
                            <CardDescription>
                                {scenes.length} cenas detectadas • Clique para navegar
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SceneTimeline scenes={scenes} videoFile={videoFile} />
                        </CardContent>
                    </Card>
                )}

                {/* Info Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>© 2024 Smart Scene Detection - Powered by PySceneDetect & Computer Vision AI</p>
                </div>
            </div>
        </div>
    )
}
