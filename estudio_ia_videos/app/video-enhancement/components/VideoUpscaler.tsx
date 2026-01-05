'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, TrendingUp, Download, Play, RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function VideoUpscaler() {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [resolution, setResolution] = useState('1080p')
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [outputUrl, setOutputUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const resolutions = [
        { value: '720p', label: '720p (HD)', description: 'Rápido, boa qualidade' },
        { value: '1080p', label: '1080p (Full HD)', description: 'Equilíbrio perfeito' },
        { value: '1440p', label: '1440p (2K)', description: 'Alta qualidade' },
        { value: '2160p', label: '2160p (4K)', description: 'Máxima qualidade' }
    ]

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('video/')) {
            toast.error('Por favor, selecione um arquivo de vídeo')
            return
        }

        const maxSize = 500 * 1024 * 1024 // 500MB
        if (file.size > maxSize) {
            toast.error('Arquivo muito grande. Máximo: 500MB')
            return
        }

        setVideoFile(file)
        toast.success('Vídeo carregado com sucesso!')
    }

    const handleUpscale = async () => {
        if (!videoFile) return

        setIsProcessing(true)
        setProgress(0)

        try {
            const formData = new FormData()
            formData.append('video', videoFile)
            formData.append('resolution', resolution)

            // Simulate progress
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) {
                        clearInterval(interval)
                        return prev
                    }
                    return prev + 5
                })
            }, 500)

            const response = await fetch('/api/ai/enhance-video', {
                method: 'POST',
                body: formData
            })

            clearInterval(interval)

            if (!response.ok) {
                throw new Error('Erro ao processar vídeo')
            }

            const data = await response.json()
            setProgress(100)
            setOutputUrl(data.outputUrl || '#')
            toast.success('Vídeo upscaled com sucesso!')
        } catch (error) {
            console.error('Error upscaling video:', error)
            toast.error('Erro ao fazer upscale do vídeo')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            {!videoFile ? (
                <div
                    className="border-2 border-dashed rounded-xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-indigo-100 rounded-full">
                            <Upload className="w-12 h-12 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Upload de Vídeo</h3>
                            <p className="text-gray-600 mb-4">
                                Clique para selecionar ou arraste seu vídeo aqui
                            </p>
                            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                                Selecionar Vídeo
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                            Máximo: 500MB • Formatos: MP4, AVI, MOV, WebM
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
                <Card className="border-indigo-200 bg-indigo-50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold mb-1">{videoFile.name}</h4>
                                <p className="text-sm text-gray-600">
                                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                            <Button
                                onClick={() => setVideoFile(null)}
                                variant="outline"
                            >
                                Remover
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Settings */}
            {videoFile && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="resolution">Resolução de Saída</Label>
                        <Select value={resolution} onValueChange={setResolution}>
                            <SelectTrigger id="resolution">
                                <SelectValue placeholder="Selecione a resolução" />
                            </SelectTrigger>
                            <SelectContent>
                                {resolutions.map((res) => (
                                    <SelectItem key={res.value} value={res.value}>
                                        <div>
                                            <div className="font-medium">{res.label}</div>
                                            <div className="text-xs text-gray-500">{res.description}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Alert>
                        <Info className="w-4 h-4" />
                        <AlertDescription>
                            O processo de upscaling pode levar vários minutos dependendo do tamanho do vídeo.
                            Você será notificado quando estiver pronto.
                        </AlertDescription>
                    </Alert>

                    {/* Processing */}
                    {isProcessing && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-blue-900">
                                            Processando com IA...
                                        </span>
                                        <span className="text-sm font-medium text-blue-900">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-3" />
                                    <div className="flex items-center gap-2 text-sm text-blue-800">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Upscaling com Real-ESRGAN
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Output */}
                    {outputUrl && (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-green-900 mb-2">
                                            Vídeo Upscaled com Sucesso!
                                        </h4>
                                        <p className="text-sm text-green-800">
                                            Resolução: {resolution} • Qualidade: Alta
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            <Play className="w-4 h-4 mr-2" />
                                            Preview
                                        </Button>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700"
                                            size="sm"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Button */}
                    {!isProcessing && !outputUrl && (
                        <Button
                            onClick={handleUpscale}
                            disabled={!videoFile}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                            size="lg"
                        >
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Fazer Upscale para {resolution}
                        </Button>
                    )}
                </>
            )}
        </div>
    )
}
