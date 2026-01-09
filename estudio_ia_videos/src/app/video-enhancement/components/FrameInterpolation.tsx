'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Label } from '@components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import { Progress } from '@components/ui/progress'
import { Upload, Zap, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function FrameInterpolation() {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [targetFps, setTargetFps] = useState('60')
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fpsOptions = [
        { value: '30', label: '30 FPS', description: 'Padrão' },
        { value: '60', label: '60 FPS', description: 'Fluido' },
        { value: '120', label: '120 FPS', description: 'Ultra fluido' },
        { value: '240', label: '240 FPS', description: 'Slow motion' }
    ]

    const handleProcess = async () => {
        if (!videoFile) return

        setIsProcessing(true)
        setProgress(0)

        try {
            const formData = new FormData()
            formData.append('video', videoFile)
            formData.append('fps', targetFps)

            // Simulate processing
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 8, 100))
            }, 500)

            await new Promise(resolve => setTimeout(resolve, 6000))
            clearInterval(interval)

            setProgress(100)
            toast.success('FPS aumentado com sucesso!')
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
                    className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="p-4 bg-purple-100 rounded-full inline-block mb-4">
                        <Upload className="w-12 h-12 text-purple-600" />
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
                        <Label htmlFor="fps">FPS de Saída</Label>
                        <Select value={targetFps} onValueChange={setTargetFps}>
                            <SelectTrigger id="fps">
                                <SelectValue placeholder="Selecione o FPS" />
                            </SelectTrigger>
                            <SelectContent>
                                {fpsOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div>
                                            <div className="font-medium">{option.label}</div>
                                            <div className="text-xs text-gray-500">{option.description}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isProcessing && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <Progress value={progress} className="h-3" />
                                    <div className="flex items-center gap-2 text-sm text-blue-800">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Interpolando frames com IA...
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
                        size="lg"
                    >
                        <Zap className="w-5 h-5 mr-2" />
                        Aumentar para {targetFps} FPS
                    </Button>
                </>
            )}
        </div>
    )
}
