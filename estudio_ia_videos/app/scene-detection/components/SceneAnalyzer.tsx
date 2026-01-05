'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Brain, RefreshCw, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface SceneAnalyzerProps {
    onScenesDetected: (scenes: any[]) => void
    onVideoUpload: (file: File) => void
}

export default function SceneAnalyzer({ onScenesDetected, onVideoUpload }: SceneAnalyzerProps) {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [sensitivity, setSensitivity] = useState([50])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('video/')) {
            toast.error('Por favor, selecione um arquivo de vídeo')
            return
        }

        setVideoFile(file)
        onVideoUpload(file)
        toast.success('Vídeo carregado com sucesso!')
    }

    const handleAnalyze = async () => {
        if (!videoFile) return

        setIsAnalyzing(true)
        setProgress(0)

        try {
            const formData = new FormData()
            formData.append('video', videoFile)
            formData.append('sensitivity', sensitivity[0].toString())

            // Simulate analysis
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) {
                        clearInterval(interval)
                        return prev
                    }
                    return prev + 5
                })
            }, 300)

            // Mock response after delay
            await new Promise(resolve => setTimeout(resolve, 3000))
            clearInterval(interval)

            // Generate mock scenes
            const mockScenes = [
                { id: 1, startTime: 0, endTime: 5.2, thumbnail: null, description: 'Introdução' },
                { id: 2, startTime: 5.2, endTime: 12.5, thumbnail: null, description: 'Cena principal' },
                { id: 3, startTime: 12.5, endTime: 18.9, thumbnail: null, description: 'Transição' },
                { id: 4, startTime: 18.9, endTime: 25.0, thumbnail: null, description: 'Conclusão' }
            ]

            setProgress(100)
            onScenesDetected(mockScenes)
            toast.success(`${mockScenes.length} cenas detectadas!`)
        } catch (error) {
            console.error('Error analyzing video:', error)
            toast.error('Erro ao analisar vídeo')
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="space-y-6">
            {!videoFile ? (
                <div
                    className="border-2 border-dashed rounded-xl p-12 text-center hover:border-purple-400 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-purple-100 rounded-full">
                            <Upload className="w-12 h-12 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Upload de Vídeo</h3>
                            <p className="text-gray-600 mb-4">Clique para selecionar seu vídeo</p>
                            <Button className="bg-gradient-to-r from-purple-500 to-pink-600">
                                Selecionar Vídeo
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                            Formatos: MP4, AVI, MOV, WebM • Máximo: 500MB
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                        className="hidden"
                    />
                </div>
            ) : (
                <>
                    <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold mb-1">{videoFile.name}</h4>
                                    <p className="text-sm text-gray-600">
                                        {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                                <Button onClick={() => setVideoFile(null)} variant="outline">
                                    Remover
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Label>Sensibilidade de Detecção</Label>
                        <Slider
                            value={sensitivity}
                            onValueChange={setSensitivity}
                            max={100}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Menos cenas</span>
                            <span>{sensitivity[0]}%</span>
                            <span>Mais cenas</span>
                        </div>
                    </div>

                    <Alert>
                        <Eye className="w-4 h-4" />
                        <AlertDescription>
                            A sensibilidade controla quantas mudanças de cena serão detectadas.
                            Valores maiores detectam mais cenas.
                        </AlertDescription>
                    </Alert>

                    {isAnalyzing && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-blue-900">
                                            Analisando com IA...
                                        </span>
                                        <span className="text-sm font-medium text-blue-900">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-3" />
                                    <div className="flex items-center gap-2 text-sm text-blue-800">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Detectando mudanças de cena
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                        size="lg"
                    >
                        {isAnalyzing ? (
                            <>
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Brain className="w-5 h-5 mr-2" />
                                Detectar Cenas
                            </>
                        )}
                    </Button>
                </>
            )}
        </div>
    )
}
