'use client'

import React, { useState } from 'react'
import { AvatarQualitySelector } from '@/components/studio-unified/AvatarQualitySelector'
import { AvatarQuality } from '@/lib/avatar/quality-tier-system'
import { Button } from '@/components/ui/button'
import { VoiceSelector } from '@/components/studio-unified/VoiceSelector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

export default function AvatarLabPage() {
    const [quality, setQuality] = useState<AvatarQuality>(AvatarQuality.STANDARD)
    const [voiceId, setVoiceId] = useState<string>('')
    const [text, setText] = useState('Olá, este é um teste do sistema de avatares.')
    const [sourceImage, setSourceImage] = useState('https://img.freepik.com/free-photo/portrait-white-man-isolated_53876-40306.jpg')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleGenerate = async () => {
        setLoading(true)
        setResult(null)

        try {
            const response = await fetch('/api/avatar/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    sourceImageUrl: sourceImage,
                    quality,
                    voiceId
                })
            })

            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Failed to generate')

            setResult(data)
            toast.success(`Job iniciado: ${data.data.jobId}`)

        } catch (error) {
            toast.error('Erro ao gerar avatar: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">🧪 Avatar Lab (Phase 2 Validation)</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuração</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL da Imagem</label>
                            <Input value={sourceImage} onChange={e => setSourceImage(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Texto</label>
                            <Input value={text} onChange={e => setText(e.target.value)} />
                        </div>

                        <VoiceSelector
                            value={voiceId}
                            onChange={setVoiceId}
                        />

                        <AvatarQualitySelector
                            value={quality}
                            onChange={setQuality}
                            userPlan="pro" // Simulating PRO user
                        />

                        <Button
                            className="w-full"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Gerar Avatar
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-muted rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="font-bold">Status:</span>
                                        <span>{result.data.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Custo:</span>
                                        <span>{result.data.cost} créditos</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold">Job ID:</span>
                                        <span className="text-xs font-mono">{result.data.jobId}</span>
                                    </div>
                                    {result.data.videoUrl && (
                                        <div className="mt-4">
                                            <p className="font-bold mb-2">Video URL:</p>
                                            <a href={result.data.videoUrl} target="_blank" className="text-blue-500 hover:underline break-all text-xs">
                                                {result.data.videoUrl}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {result.negotiation && (
                                    <div className="text-xs text-muted-foreground">
                                        <p>Negotiation: {result.negotiation.requested} &rarr; {result.negotiation.actual}</p>
                                        <p>Reason: {result.negotiation.reason}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                Aguardando geração...
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
