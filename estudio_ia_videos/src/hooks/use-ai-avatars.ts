'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface Avatar {
    id: string;
    name: string;
    thumbnailUrl: string;
    gender: 'male' | 'female';
    style: 'realistic' | 'cartoon' | 'corporate';
    tags?: string[];
    provider?: string;
}

export interface AvatarGenerationParams {
    avatarId: string;
    script: string;
    voiceId: string;
    backgroundUrl?: string;
    language?: string;
}

export interface GeneratedAvatarVideo {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface UseAIAvatarsReturn {
    avatars: Avatar[];
    isLoading: boolean;
    isGenerating: boolean;
    generationProgress: number;
    generatedVideo: GeneratedAvatarVideo | null;
    error: string | null;
    fetchAvatars: () => Promise<void>;
    generateAvatarVideo: (params: AvatarGenerationParams) => Promise<GeneratedAvatarVideo | null>;
    pollGenerationStatus: (jobId: string) => Promise<GeneratedAvatarVideo | null>;
}

export function useAIAvatars(): UseAIAvatarsReturn {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generatedVideo, setGeneratedVideo] = useState<GeneratedAvatarVideo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchAvatars = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/avatars');
            if (!response.ok) throw new Error('Failed to fetch avatars');
            const data = await response.json();
            
            // Transform API data to our Avatar type
            const avatarList: Avatar[] = (data.data || []).map((a: any) => ({
                id: a.id,
                name: a.name,
                thumbnailUrl: a.ready_player_me_url || a.thumbnail_url || '/avatars/default.png',
                gender: a.gender || 'male',
                style: a.style || 'realistic',
                tags: a.properties?.tags || [],
                provider: a.provider || 'heygen',
            }));
            
            setAvatars(avatarList);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar avatares';
            setError(message);
            // Don't show toast on initial load failure - might be expected
        } finally {
            setIsLoading(false);
        }
    }, []);

    const pollGenerationStatus = useCallback(async (jobId: string): Promise<GeneratedAvatarVideo | null> => {
        try {
            const response = await fetch(`/api/avatars/render?jobId=${jobId}`);
            if (!response.ok) throw new Error('Failed to get generation status');
            
            const data = await response.json();
            const status = data.data;
            
            setGenerationProgress(status.progress || 0);
            
            if (status.status === 'completed') {
                const video: GeneratedAvatarVideo = {
                    id: jobId,
                    videoUrl: status.videoUrl,
                    thumbnailUrl: status.thumbnailUrl || '',
                    duration: status.duration || 0,
                    status: 'completed',
                };
                setGeneratedVideo(video);
                return video;
            }
            
            if (status.status === 'failed') {
                throw new Error(status.error || 'Generation failed');
            }
            
            return null; // Still processing
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao verificar status';
            setError(message);
            return null;
        }
    }, []);

    const generateAvatarVideo = useCallback(async (params: AvatarGenerationParams): Promise<GeneratedAvatarVideo | null> => {
        setIsGenerating(true);
        setGenerationProgress(0);
        setError(null);
        
        try {
            // Start generation
            const response = await fetch('/api/avatars/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    avatarId: params.avatarId,
                    script: params.script,
                    voiceId: params.voiceId,
                    background: params.backgroundUrl,
                    language: params.language || 'pt-BR',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start generation');
            }

            const data = await response.json();
            const jobId = data.data?.jobId;
            
            if (!jobId) throw new Error('No job ID returned');
            
            toast.info('Geração iniciada! Isso pode levar alguns minutos...');
            
            // Poll for completion
            const maxAttempts = 60; // 5 minutes max
            for (let i = 0; i < maxAttempts; i++) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s between polls
                
                const result = await pollGenerationStatus(jobId);
                if (result) {
                    setIsGenerating(false);
                    toast.success('Vídeo com avatar gerado com sucesso!');
                    return result;
                }
            }
            
            throw new Error('Generation timed out');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao gerar vídeo';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [pollGenerationStatus]);

    // Load avatars on mount
    useEffect(() => {
        fetchAvatars();
    }, [fetchAvatars]);

    return {
        avatars,
        isLoading,
        isGenerating,
        generationProgress,
        generatedVideo,
        error,
        fetchAvatars,
        generateAvatarVideo,
        pollGenerationStatus,
    };
}
