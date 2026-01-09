'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Separator } from '@components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import {
    Upload,
    FileVideo,
    Languages,
    Download,
    Play,
    Settings,
    Sparkles,
    CheckCircle,
    Clock,
    FileText,
    Edit,
    RefreshCw,
    Brain
} from 'lucide-react'
import SubtitleEditor from './components/SubtitleEditor'
import SubtitleUploader from './components/SubtitleUploader'
import SubtitleGenerator from './components/SubtitleGenerator'
import SubtitleExporter from './components/SubtitleExporter'

export default function AutoSubtitlesPage() {
    const [currentStep, setCurrentStep] = useState<'upload' | 'generate' | 'edit' | 'export'>('upload')
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [subtitles, setSubtitles] = useState<any[]>([])
    const [isGenerating, setIsGenerating] = useState(false)

    const steps = [
        { id: 'upload', label: 'Upload Vídeo', icon: Upload, completed: !!videoFile },
        { id: 'generate', label: 'Gerar Legendas', icon: Brain, completed: subtitles.length > 0 },
        { id: 'edit', label: 'Editar', icon: Edit, completed: false },
        { id: 'export', label: 'Exportar', icon: Download, completed: false }
    ]

    const features = [
        {
            icon: <Brain className="w-6 h-6" />,
            title: "IA Whisper OpenAI",
            description: "Transcrição automática com precisão superior a 95%",
            color: "bg-blue-500"
        },
        {
            icon: <Languages className="w-6 h-6" />,
            title: "Multi-idioma",
            description: "Suporte para 90+ idiomas com detecção automática",
            color: "bg-green-500"
        },
        {
            icon: <Clock className="w-6 h-6" />,
            title: "Sincronização Precisa",
            description: "Timestamps automáticos com precisão de milissegundos",
            color: "bg-purple-500"
        },
        {
            icon: <Edit className="w-6 h-6" />,
            title: "Editor Profissional",
            description: "Edite texto e timing com interface drag-and-drop",
            color: "bg-orange-500"
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Auto-Subtitles com IA
                            </h1>
                            <p className="text-gray-600">Geração automática de legendas com Whisper AI</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="px-3 py-1">
                            <Brain className="w-4 h-4 mr-2" />
                            OpenAI Whisper
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                            <Languages className="w-4 h-4 mr-2" />
                            90+ Idiomas
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            95%+ Precisão
                        </Badge>
                    </div>
                </div>

                {/* Progress Steps */}
                <Card className="mb-8">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
                                const Icon = step.icon
                                const isActive = step.id === currentStep
                                const isCompleted = step.completed

                                return (
                                    <div key={step.id} className="flex items-center flex-1">
                                        <div className="flex flex-col items-center flex-1">
                                            <div
                                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${isCompleted
                                                        ? 'bg-green-500 text-white'
                                                        : isActive
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-gray-200 text-gray-500'
                                                    }`}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle className="w-6 h-6" />
                                                ) : (
                                                    <Icon className="w-6 h-6" />
                                                )}
                                            </div>
                                            <span
                                                className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                                                    }`}
                                            >
                                                {step.label}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div
                                                className={`h-1 flex-1 -mt-10 ${steps[index + 1].completed ? 'bg-green-500' : 'bg-gray-200'
                                                    }`}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {features.map((feature, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center text-white mb-4`}>
                                    {feature.icon}
                                </div>
                                <h3 className="font-semibold mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-600">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            {currentStep === 'upload' && 'Upload de Vídeo'}
                            {currentStep === 'generate' && 'Gerar Legendas'}
                            {currentStep === 'edit' && 'Editar Legendas'}
                            {currentStep === 'export' && 'Exportar Legendas'}
                        </CardTitle>
                        <CardDescription>
                            {currentStep === 'upload' && 'Faça upload do vídeo para gerar legendas automáticas'}
                            {currentStep === 'generate' && 'Configure as opções de geração de legendas'}
                            {currentStep === 'edit' && 'Edite o texto e ajuste o timing das legendas'}
                            {currentStep === 'export' && 'Exporte as legendas nos formatos desejados'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as any)}>
                            <TabsList className="hidden" />

                            <TabsContent value="upload">
                                <SubtitleUploader
                                    onVideoUpload={(file) => {
                                        setVideoFile(file)
                                        setCurrentStep('generate')
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="generate">
                                <SubtitleGenerator
                                    videoFile={videoFile}
                                    onSubtitlesGenerated={(subs) => {
                                        setSubtitles(subs)
                                        setCurrentStep('edit')
                                    }}
                                    onBack={() => setCurrentStep('upload')}
                                />
                            </TabsContent>

                            <TabsContent value="edit">
                                <SubtitleEditor
                                    videoFile={videoFile}
                                    subtitles={subtitles}
                                    onChange={setSubtitles}
                                    onNext={() => setCurrentStep('export')}
                                    onBack={() => setCurrentStep('generate')}
                                />
                            </TabsContent>

                            <TabsContent value="export">
                                <SubtitleExporter
                                    subtitles={subtitles}
                                    videoFile={videoFile}
                                    onBack={() => setCurrentStep('edit')}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Info Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>© 2024 Auto-Subtitles - Powered by OpenAI Whisper</p>
                </div>
            </div>
        </div>
    )
}
