import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface VoiceCloningModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (voiceId: string) => void
}

export function VoiceCloningModal({ isOpen, onClose, onSuccess }: VoiceCloningModalProps) {
    const [name, setName] = useState('')
    const [files, setFiles] = useState<FileList | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleUpload = async () => {
        if (!name || !files || files.length === 0) {
            toast.error('Preencha o nome e selecione arquivos')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('name', name)
            Array.from(files).forEach((file) => {
                formData.append('files', file)
            })

            const res = await fetch('/api/voice/clone', {
                method: 'POST',
                body: formData
            })

            const json = await res.json()

            if (!res.ok) throw new Error(json.error || 'Failed to clone')

            toast.success('Voz clonada com sucesso!')
            onSuccess(json.data.voiceId)

        } catch (error) {
            toast.error('Erro ao clonar voz: ' + (error as Error).message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Clonar Voz (Instant)</DialogTitle>
                    <DialogDescription>
                        Envie amostras de áudio (1-5 min) para clonar uma voz instantaneamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nome da Voz</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Minha Voz Profissional"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Amostras de Áudio (.mp3, .wav)</Label>
                        <Input
                            type="file"
                            multiple
                            accept="audio/*"
                            onChange={(e) => setFiles(e.target.files)}
                        />
                        <p className="text-xs text-muted-foreground">Recomendado: 3-5 arquivos limpos, sem ruído.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
                    <Button onClick={handleUpload} disabled={uploading}>
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Clonando...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Criar Voz
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
