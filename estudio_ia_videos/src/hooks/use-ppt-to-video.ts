'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface PPTSlide {
    id: string;
    index: number;
    title: string;
    content: string;
    imageUrl: string;
    notes?: string;
    duration: number;
}

export interface PPTParseResult {
    projectId: string;
    slides: PPTSlide[];
    title: string;
    totalSlides: number;
}

export interface PPTRenderParams {
    projectId: string;
    slides: PPTSlide[];
    voiceId: string;
    avatarId?: string;
    config: {
        resolution: '720p' | '1080p' | '4K';
        quality: 'medium' | 'high' | 'ultra';
        transition: 'fade' | 'none' | 'slide';
        transitionDuration: number;
    };
}

export interface RenderJob {
    id: string;
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    videoUrl?: string;
    error?: string;
    estimatedTime?: number;
}

interface UsePPTToVideoReturn {
    // Upload state
    isUploading: boolean;
    uploadProgress: number;
    parsedPPT: PPTParseResult | null;
    
    // Render state  
    isRendering: boolean;
    renderProgress: number;
    renderJob: RenderJob | null;
    
    // Error
    error: string | null;
    
    // Actions
    uploadPPT: (file: File) => Promise<PPTParseResult | null>;
    updateSlide: (slideId: string, updates: Partial<PPTSlide>) => void;
    reorderSlides: (startIndex: number, endIndex: number) => void;
    removeSlide: (slideId: string) => void;
    startRender: (params: PPTRenderParams) => Promise<RenderJob | null>;
    pollRenderStatus: (jobId: string) => Promise<RenderJob | null>;
    reset: () => void;
}

export function usePPTToVideo(): UsePPTToVideoReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [parsedPPT, setParsedPPT] = useState<PPTParseResult | null>(null);
    
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
    
    const [error, setError] = useState<string | null>(null);

    const uploadPPT = useCallback(async (file: File): Promise<PPTParseResult | null> => {
        setIsUploading(true);
        setUploadProgress(0);
        setError(null);
        
        try {
            // Validate file
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.ms-powerpoint',
            ];
            if (!validTypes.includes(file.type) && !file.name.match(/\.(pptx?|ppt)$/i)) {
                throw new Error('Por favor, envie um arquivo PowerPoint (.pptx ou .ppt)');
            }

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);

            // Start progress before request; final value is set after response.
            setUploadProgress(15);

            const response = await fetch('/api/pptx/upload', {
                method: 'POST',
                body: formData,
            });

            setUploadProgress(100);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao processar apresentação');
            }

            const data = await response.json();
            
            // Transform response to our format
            const result: PPTParseResult = {
                projectId: data.projectId || data.id,
                title: data.title || file.name.replace(/\.[^/.]+$/, ''),
                totalSlides: data.slides?.length || 0,
                slides: (data.slides || []).map((slide: any, index: number) => ({
                    id: slide.id || `slide-${index}`,
                    index,
                    title: slide.title || `Slide ${index + 1}`,
                    content: slide.content || slide.text || '',
                    imageUrl: slide.imageUrl || slide.thumbnail || '',
                    notes: slide.notes || '',
                    duration: slide.duration || 5,
                })),
            };

            setParsedPPT(result);
            toast.success(`${result.totalSlides} slides carregados com sucesso!`);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao fazer upload';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setIsUploading(false);
        }
    }, []);

    const updateSlide = useCallback((slideId: string, updates: Partial<PPTSlide>) => {
        setParsedPPT(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                slides: prev.slides.map(slide =>
                    slide.id === slideId ? { ...slide, ...updates } : slide
                ),
            };
        });
    }, []);

    const reorderSlides = useCallback((startIndex: number, endIndex: number) => {
        setParsedPPT(prev => {
            if (!prev) return prev;
            const newSlides = [...prev.slides];
            const [removed] = newSlides.splice(startIndex, 1);
            newSlides.splice(endIndex, 0, removed);
            return {
                ...prev,
                slides: newSlides.map((slide, index) => ({ ...slide, index })),
            };
        });
    }, []);

    const removeSlide = useCallback((slideId: string) => {
        setParsedPPT(prev => {
            if (!prev) return prev;
            const newSlides = prev.slides
                .filter(slide => slide.id !== slideId)
                .map((slide, index) => ({ ...slide, index }));
            return {
                ...prev,
                slides: newSlides,
                totalSlides: newSlides.length,
            };
        });
    }, []);

    const pollRenderStatus = useCallback(async (jobId: string): Promise<RenderJob | null> => {
        try {
            const response = await fetch(`/api/render/jobs/${jobId}`);
            if (!response.ok) throw new Error('Failed to get render status');
            
            const data = await response.json();
            const payload = data?.data || data?.job || data;
            
            const job: RenderJob = {
                id: jobId,
                status: payload.status,
                progress: payload.progress || 0,
                videoUrl: payload.videoUrl || payload.outputUrl || payload.output_url,
                error: payload.error,
                estimatedTime: payload.estimatedTime,
            };
            
            setRenderProgress(job.progress);
            setRenderJob(job);
            
            if (job.status === 'completed' || job.status === 'failed') {
                return job;
            }
            
            return null; // Still processing
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao verificar status';
            setError(message);
            return null;
        }
    }, []);

    const startRender = useCallback(async (params: PPTRenderParams): Promise<RenderJob | null> => {
        setIsRendering(true);
        setRenderProgress(0);
        setError(null);
        
        try {
            // Map resolution to dimensions
            const resolutionMap = {
                '720p': { width: 1280, height: 720 },
                '1080p': { width: 1920, height: 1080 },
                '4K': { width: 3840, height: 2160 },
            };
            
            const dimensions = resolutionMap[params.config.resolution] || resolutionMap['1080p'];

            const response = await fetch('/api/render/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: params.projectId,
                    slides: params.slides.map(slide => ({
                        id: slide.id,
                        imageUrl: slide.imageUrl,
                        duration: slide.duration,
                        transition: params.config.transition,
                        transitionDuration: params.config.transitionDuration,
                        title: slide.title,
                        content: slide.content,
                    })),
                    config: {
                        width: dimensions.width,
                        height: dimensions.height,
                        fps: 30,
                        quality: params.config.quality,
                        format: 'mp4',
                        codec: 'h264',
                        bitrate: '8000k',
                        audioCodec: 'aac',
                        audioBitrate: '192k',
                    },
                    voiceId: params.voiceId,
                    avatarId: params.avatarId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao iniciar renderização');
            }

            const data = await response.json();
            const jobId = data.jobId || data.id;
            
            if (!jobId) throw new Error('No job ID returned');
            
            toast.info('Renderização iniciada! Isso pode levar alguns minutos...');
            
            // Poll for completion
            const maxAttempts = 120; // 10 minutes max
            for (let i = 0; i < maxAttempts; i++) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const result = await pollRenderStatus(jobId);
                if (result) {
                    setIsRendering(false);
                    if (result.status === 'completed') {
                        toast.success('Vídeo renderizado com sucesso!');
                    } else {
                        toast.error(result.error || 'Renderização falhou');
                    }
                    return result;
                }
            }
            
            throw new Error('Render timed out');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro na renderização';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setIsRendering(false);
        }
    }, [pollRenderStatus]);

    const reset = useCallback(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setParsedPPT(null);
        setIsRendering(false);
        setRenderProgress(0);
        setRenderJob(null);
        setError(null);
    }, []);

    return {
        isUploading,
        uploadProgress,
        parsedPPT,
        isRendering,
        renderProgress,
        renderJob,
        error,
        uploadPPT,
        updateSlide,
        reorderSlides,
        removeSlide,
        startRender,
        pollRenderStatus,
        reset,
    };
}
