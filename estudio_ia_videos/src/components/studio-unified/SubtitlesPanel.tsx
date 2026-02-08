
import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Button } from '@components/ui/button';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { Languages, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { TimelineElement, TimelineLayer } from '@lib/types/timeline-types';

export function SubtitlesPanel() {
    const project = useTimelineStore(state => state.project);
    const addElement = useTimelineStore(state => state.addElement);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!project) return;
        setIsGenerating(true);

        try {
            // 1. Find audio layers/clips
            // Ideally we mix down the audio or take the first audio track.
            // For MVP: Check for an audio asset in the project or ask user to upload?
            // "Generate Subtitles" usually implies generating from the TIMELINE audio.
            // Since we don't have server-side timeline mixing yet (that's Remotion lambda), 
            // we will simulate by asking for an upload OR picking the first audio asset.

            // Current approach for Panel: Allow picking a file or using timeline audio if available (mocked extraction).
            // Let's assume we want to upload a file for now to test the API flow.

            // Create a hidden input to trigger file selection for "Extract"
            // OR: We just say "Generating..." and use a sample file if no timeline audio?
            // Better: Let's assume the user wants to subtitle the *current* project audio.
            // Since we can't easily extract that in the browser without complex logic, 
            // let's simplify: "Upload Audio to Caption" for this MVP step.

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*,video/*';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) {
                    setIsGenerating(false);
                    return;
                }

                setIsGenerating(true);
                const formData = new FormData();
                formData.append('file', file);
                formData.append('userId', 'user-mvp-1'); // Mock user ID for now
                formData.append('enableKaraoke', 'true');

                try {
                    toast.info('Enviando áudio para transcrição...');
                    const res = await fetch('/api/subtitles/transcribe', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) throw new Error('Falha na transcrição');

                    const data = await res.json();

                    if (data.success && data.transcription) {
                        const subtitleElement: TimelineElement = {
                            id: crypto.randomUUID(),
                            type: 'text',
                            name: 'Auto-Captions',
                            start: 0,
                            duration: data.transcription.duration || 10,
                            layer: 10, // Default layer index
                            layerId: 'subtitle-layer-new', // Will trigger new layer creation in store
                            source: '',
                            properties: {
                                isSubtitle: true,
                            },
                            data: {
                                subtitles: data.transcription.segments.map((s: any) => ({
                                    text: s.text,
                                    start: s.startTime,
                                    end: s.endTime
                                }))
                            }
                        };

                        addElement(subtitleElement);
                        toast.success('Legendas geradas com sucesso!');
                    }

                } catch (error) {
                    logger.error(error);
                    toast.error('Erro ao transcrever áudio.');
                } finally {
                    setIsGenerating(false);
                }
            };
            input.click();

        } catch (e) {
            logger.error(e);
            toast.error('Erro ao iniciar processo');
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full p-4 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Languages className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                    <h3 className="font-medium">Legendas Automáticas</h3>
                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                        Faça upload de um áudio/vídeo para gerar legendas com IA.
                    </p>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full max-w-[200px] gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Gerando...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Upload e Transcrever
                        </>
                    )}
                </Button>
            </div>

            {project?.layers.some(l => l.items.some(i => i.properties?.isSubtitle)) && (
                <div className="mt-8 p-4 bg-muted/30 rounded-lg text-xs">
                    <p className="font-medium text-green-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Legendas ativas
                    </p>
                    <p className="text-muted-foreground mt-1">
                        As legendas foram adicionadas à timeline.
                    </p>
                </div>
            )}
        </div>
    );
}
