'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface Voice {
    id: string;
    name: string;
    language: string;
    gender: 'male' | 'female';
    provider: string;
    previewUrl?: string;
    tags?: string[];
}

export interface VoiceGenerationParams {
    text: string;
    voiceId: string;
    speed?: number;
    pitch?: number;
    stability?: number;
}

export interface VoiceCloneParams {
    name: string;
    audioFile: File;
    description?: string;
}

interface UseVoiceStudioReturn {
    voices: Voice[];
    isLoading: boolean;
    isGenerating: boolean;
    generatedAudio: string | null;
    error: string | null;
    fetchVoices: () => Promise<void>;
    generateVoice: (params: VoiceGenerationParams) => Promise<string | null>;
    cloneVoice: (params: VoiceCloneParams) => Promise<Voice | null>;
    previewVoice: (voiceId: string, text?: string) => Promise<void>;
}

export function useVoiceStudio(): UseVoiceStudioReturn {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchVoices = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/voice/generate');
            if (!response.ok) throw new Error('Failed to fetch voices');
            const data = await response.json();
            setVoices(data.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar vozes';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const generateVoice = useCallback(async (params: VoiceGenerationParams): Promise<string | null> => {
        setIsGenerating(true);
        setError(null);
        try {
            const response = await fetch('/api/voice/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: params.text,
                    voiceId: params.voiceId,
                    provider: 'azure', // Default provider
                    options: {
                        speed: params.speed || 1.0,
                        pitch: params.pitch || 0,
                        stability: params.stability || 0.75,
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate voice');
            }

            const data = await response.json();
            const audioUrl = `data:audio/mpeg;base64,${data.data.audioBase64}`;
            setGeneratedAudio(audioUrl);
            toast.success('Áudio gerado com sucesso!');
            return audioUrl;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao gerar áudio';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const cloneVoice = useCallback(async (params: VoiceCloneParams): Promise<Voice | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('name', params.name);
            formData.append('audio', params.audioFile);
            if (params.description) {
                formData.append('description', params.description);
            }

            const response = await fetch('/api/voice/clone', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to clone voice');
            }

            const data = await response.json();
            toast.success('Voz clonada com sucesso!');
            
            // Refresh voices list
            await fetchVoices();
            
            return data.data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao clonar voz';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [fetchVoices]);

    const previewVoice = useCallback(async (voiceId: string, text?: string) => {
        const previewText = text || 'Olá! Esta é uma prévia da minha voz. Como você pode ouvir, sou muito natural.';
        await generateVoice({ text: previewText, voiceId });
    }, [generateVoice]);

    // Load voices on mount
    useEffect(() => {
        fetchVoices();
    }, [fetchVoices]);

    return {
        voices,
        isLoading,
        isGenerating,
        generatedAudio,
        error,
        fetchVoices,
        generateVoice,
        cloneVoice,
        previewVoice,
    };
}
