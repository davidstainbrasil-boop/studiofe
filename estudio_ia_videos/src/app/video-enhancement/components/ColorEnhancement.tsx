'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Label } from '@components/ui/label'
import { Progress } from '@components/ui/progress'
import { Upload, Palette, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function ColorEnhancement() {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const colorPresets = [
        { id: 'cinematic', name: 'Cinematográfico', description: 'Tons quentes e contraste alto', color: 'bg-gradient-to-r from-orange-400 to-red-500' },
        { id: 'vibrant', name: 'Vibrante', description: 'Cores saturadas e vivas', color: 'bg-gradient-to-r from-pink-400 to-purple-500' },
        { id: 'natural', name: 'Natural', description: 'Cores equilibradas e realistas', color: 'bg-gradient-to-r from-green-400 to-blue-500' },
        { id: 'blackwhite', name: 'Preto e Branco', description: 'Monocromático profissional', color: 'bg-gradient-to-r from-gray-600 to-gray-900' },
        { id: 'vintage', name: 'Vintage', description: 'Estilo retrô e nostálgico', color: 'bg-gradient-to-r from-yellow-600 to-orange-700' },
        { id: 'cool', name: 'Cool Tone', description: 'Tons frios e modernos', color: 'bg-gradient-to-r from-blue-400 to-cyan-500' }
    ]

    const handleProcess = async () => {
        if (!videoFile || !selectedPreset) return

        setIsProcessing(true)
        setProgress(0)

        try {
            const formData = new FormData()
            formData.append('video', videoFile)
            formData.append('preset', selectedPreset)

            // Simulate processing
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 12, 100))
            }, 500)

            await new Promise(resolve => setTimeout(resolve, 4000))
            clearInterval(interval)

            setProgress(100)
            toast.success('Correção de cor aplicada com sucesso!')
        } catch (error) {
            toast.error('Erro ao processar vídeo')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="space-y-6">
            {!videoFile ? (
                <div
                    className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-orange-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="p-4 bg-orange-100 rounded-full inline-block mb-4">
                        <Upload className="w-12 h-12 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Upload de Vídeo</h3>
                    <p className="text-gray-600">Clique para selecionar seu vídeo</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => e.target.files && setVideoFile(e.target.files[0])}
                        className="hidden"
                    />
                </div>
            ) : (
                <>
                    <Card>
                        <CardContent className="p-6">
                            <h4 className="font-semibold mb-2">{videoFile.name}</h4>
                            <p className="text-sm text-gray-600">
                                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Label>Preset de Cor</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {colorPresets.map((preset) => (
                                <Card
                                    key={preset.id}
                                    className={`cursor-pointer transition-all ${selectedPreset === preset.id
                                            ? 'ring-2 ring-orange-500 shadow-lg'
                                            : 'hover:shadow-md'
                                        }`}
                                    onClick={() => setSelectedPreset(preset.id)}
                                >
                                    <CardContent className="p-4">
                                        <div className={`w-full h-20 rounded-lg mb-3 ${preset.color}`} />
                                        <h4 className="font-semibold mb-1">{preset.name}</h4>
                                        <p className="text-xs text-gray-600">{preset.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {isProcessing && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <Progress value={progress} className="h-3" />
                                    <div className="flex items-center gap-2 text-sm text-blue-800">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Aplicando correção de cor...
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        onClick={handleProcess}
                        disabled={!selectedPreset || isProcessing}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600"
                        size="lg"
                    >
                        <Palette className="w-5 h-5 mr-2" />
                        Aplicar Cor Grading
                    </Button>
                </>
            )}
        </div>
    )
}
