'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Label } from '@components/ui/label'
import { Slider } from '@components/ui/slider'
import { Progress } from '@components/ui/progress'
import { Upload, Volume2, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function NoiseReduction() {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [intensity, setIntensity] = useState([50])
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleProcess = async () => {
        if (!videoFile) return

        setIsProcessing(true)
        setProgress(0)

        try {
            const formData = new FormData()
            formData.append('video', videoFile)
            formData.append('intensity', intensity[0].toString())

            // Simulate processing
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 100))
            }, 500)

            await new Promise(resolve => setTimeout(resolve, 5000))
            clearInterval(interval)

            setProgress(100)
            toast.success('Ruído removido com sucesso!')
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
                    className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-green-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="p-4 bg-green-100 rounded-full inline-block mb-4">
                        <Upload className="w-12 h-12 text-green-600" />
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
                        <Label>Intensidade da Redução de Ruído</Label>
                        <Slider
                            value={intensity}
                            onValueChange={setIntensity}
                            max={100}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Suave</span>
                            <span>{intensity[0]}%</span>
                            <span>Forte</span>
                        </div>
                    </div>

                    {isProcessing && (
                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <Progress value={progress} className="h-3" />
                                    <div className="flex items-center gap-2 text-sm text-blue-800">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Removendo ruídos com IA...
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-green-500 to-teal-600"
                        size="lg"
                    >
                        <Volume2 className="w-5 h-5 mr-2" />
                        Reduzir Ruído
                    </Button>
                </>
            )}
        </div>
    )
}
