import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Mic, Plus } from 'lucide-react'
import { VoiceCloningModal } from './VoiceCloningModal'

interface Voice {
    id: string
    name: string
    category: string
    provider: string
}

interface VoiceSelectorProps {
    value: string
    onChange: (voiceId: string) => void
    label?: string
}

export function VoiceSelector({ value, onChange, label = "Voz da Narração" }: VoiceSelectorProps) {
    const [voices, setVoices] = useState<Voice[]>([])
    const [loading, setLoading] = useState(false)
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)

    const fetchVoices = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/voice/generate')
            const json = await res.json()
            if (json.success) {
                // Merge Azure and ElevenLabs
                const allVoices = [
                    ...(json.data.elevenLabs || []).map((v: any) => ({ ...v, provider: 'elevenlabs' })),
                    ...(json.data.azure || []).map((v: any) => ({ ...v, provider: 'azure' }))
                ]
                setVoices(allVoices)
            }
        } catch (error) {
            console.error('Failed to fetch voices', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVoices()
    }, [])

    const handleVoiceCreated = (voiceId: string) => {
        fetchVoices()
        onChange(voiceId)
        setIsCloneModalOpen(false)
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium">{label}</label>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setIsCloneModalOpen(true)}
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Nova Voz
                </Button>
            </div>

            <Select value={value} onValueChange={onChange} disabled={loading}>
                <SelectTrigger>
                    <SelectValue placeholder={loading ? "Carregando vozes..." : "Selecione uma voz"} />
                </SelectTrigger>
                <SelectContent>
                    {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{voice.name}</span>
                                <span className="text-xs text-muted-foreground capitalize">({voice.provider})</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <VoiceCloningModal
                isOpen={isCloneModalOpen}
                onClose={() => setIsCloneModalOpen(false)}
                onSuccess={handleVoiceCreated}
            />
        </div>
    )
}
