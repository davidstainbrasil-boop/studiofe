/**
 * usePPTXToVideo - Hook unificado para o fluxo PPTX → Video
 *
 * Gerencia todo o estado e lógica do wizard de 3 passos:
 * 1. Upload PPTX → extração de slides
 * 2. Customização → avatar, voz, música, legendas
 * 3. Geração → renderização e download
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { MusicTrack } from '@/lib/audio/music-library';

// =============================================================================
// Types
// =============================================================================

export interface ExtractedSlide {
  id: string;
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  selected: boolean;
}

export interface SelectedAvatar {
  id: string;
  name: string;
  mode: 'generic' | 'realistic';
  gender?: 'male' | 'female' | 'neutral';
  // Generic mode
  provider?: 'did' | 'heygen' | 'rpm' | 'synthesia' | 'local';
  thumbnailUrl?: string;
  language?: string;
  previewUrl?: string;
  // Realistic mode
  imageUrl?: string;
  isCustom?: boolean;
  realisticProvider?: 'musetalk' | 'sadtalker' | 'auto';
}

export interface SelectedVoice {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'azure' | 'edge' | 'google';
  language: string;
  gender: 'male' | 'female' | 'neutral';
  previewUrl?: string;
}

export interface VideoSettings {
  avatar: SelectedAvatar | null;
  voice: SelectedVoice | null;
  music: MusicTrack | null;
  musicVolume: number; // 0-100
  subtitlesEnabled: boolean;
  subtitleStyle: 'default' | 'netflix' | 'minimal' | 'bold';
  quality: '720p' | '1080p' | '4k';
  transitionType: 'fade' | 'slide' | 'none';
  transitionDuration: number; // seconds
}

export interface GenerationProgress {
  stage: 'idle' | 'preparing' | 'tts' | 'avatar' | 'composing' | 'subtitles' | 'music' | 'finalizing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  currentSlide?: number;
  totalSlides?: number;
}

export interface GenerationResult {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  fileSize?: number;
  subtitlesUrl?: string;
  error?: string;
}

export type WizardStep = 'upload' | 'customize' | 'generate';

export interface PPTXToVideoState {
  // Step management
  currentStep: WizardStep;
  completedSteps: WizardStep[];

  // Step 1: Upload
  file: File | null;
  projectId: string | null;
  extractionProgress: number;
  slides: ExtractedSlide[];
  metadata: {
    title: string;
    author: string;
    totalSlides: number;
  } | null;

  // Step 2: Customize
  settings: VideoSettings;

  // Step 3: Generate
  generationProgress: GenerationProgress;
  result: GenerationResult | null;

  // General
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_SETTINGS: VideoSettings = {
  avatar: null,
  voice: null,
  music: null,
  musicVolume: 20,
  subtitlesEnabled: true,
  subtitleStyle: 'default',
  quality: '1080p',
  transitionType: 'fade',
  transitionDuration: 0.5,
};

const INITIAL_STATE: PPTXToVideoState = {
  currentStep: 'upload',
  completedSteps: [],
  file: null,
  projectId: null,
  extractionProgress: 0,
  slides: [],
  metadata: null,
  settings: DEFAULT_SETTINGS,
  generationProgress: {
    stage: 'idle',
    progress: 0,
    message: '',
  },
  result: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// Hook
// =============================================================================

export function usePPTXToVideo() {
  const [state, setState] = useState<PPTXToVideoState>(INITIAL_STATE);

  // ---------------------------------------------------------------------------
  // Step Navigation
  // ---------------------------------------------------------------------------

  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step, error: null }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const steps: WizardStep[] = ['upload', 'customize', 'generate'];
      const currentIndex = steps.indexOf(prev.currentStep);
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
      const completedSteps = prev.completedSteps.includes(prev.currentStep)
        ? prev.completedSteps
        : [...prev.completedSteps, prev.currentStep];

      return {
        ...prev,
        currentStep: steps[nextIndex],
        completedSteps,
        error: null,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const steps: WizardStep[] = ['upload', 'customize', 'generate'];
      const currentIndex = steps.indexOf(prev.currentStep);
      const prevIndex = Math.max(currentIndex - 1, 0);

      return {
        ...prev,
        currentStep: steps[prevIndex],
        error: null,
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Step 1: Upload & Extract
  // ---------------------------------------------------------------------------

  const uploadAndExtract = useCallback(async (file: File) => {
    setState((prev) => ({
      ...prev,
      file,
      isLoading: true,
      error: null,
      extractionProgress: 0,
    }));

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload and extract
      setState((prev) => ({ ...prev, extractionProgress: 10 }));

      const response = await fetch('/api/pptx/upload-and-extract', {
        method: 'POST',
        body: formData,
      });

      setState((prev) => ({ ...prev, extractionProgress: 50 }));

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao processar PPTX');
      }

      const data = await response.json();
      setState((prev) => ({ ...prev, extractionProgress: 80 }));

      // Map slides to our format
      const slides: ExtractedSlide[] = data.slides.map((slide: {
        slideNumber: number;
        title?: string;
        content: string;
        notes?: string;
        images?: string[];
        duration?: number;
      }) => ({
        id: `slide-${slide.slideNumber}`,
        slideNumber: slide.slideNumber,
        title: slide.title || `Slide ${slide.slideNumber}`,
        content: slide.content || '',
        notes: slide.notes || '',
        imageUrl: slide.images?.[0] || null,
        thumbnailUrl: slide.images?.[0] || null,
        duration: slide.duration || 5,
        selected: true,
      }));

      setState((prev) => ({
        ...prev,
        projectId: data.projectId,
        slides,
        metadata: data.metadata || {
          title: file.name.replace('.pptx', ''),
          author: 'Desconhecido',
          totalSlides: slides.length,
        },
        extractionProgress: 100,
        isLoading: false,
      }));

      // Auto-advance to next step
      nextStep();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
    }
  }, [nextStep]);

  const toggleSlideSelection = useCallback((slideId: string) => {
    setState((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) =>
        slide.id === slideId ? { ...slide, selected: !slide.selected } : slide
      ),
    }));
  }, []);

  const updateSlideDuration = useCallback((slideId: string, duration: number) => {
    setState((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) =>
        slide.id === slideId ? { ...slide, duration } : slide
      ),
    }));
  }, []);

  const selectAllSlides = useCallback((selected: boolean) => {
    setState((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) => ({ ...slide, selected })),
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Step 2: Customize Settings
  // ---------------------------------------------------------------------------

  const setAvatar = useCallback((avatar: SelectedAvatar | null) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, avatar },
    }));
  }, []);

  const setVoice = useCallback((voice: SelectedVoice | null) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, voice },
    }));
  }, []);

  const setMusic = useCallback((music: MusicTrack | null) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, music },
    }));
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, musicVolume: Math.max(0, Math.min(100, volume)) },
    }));
  }, []);

  const toggleSubtitles = useCallback((enabled?: boolean) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        subtitlesEnabled: enabled ?? !prev.settings.subtitlesEnabled,
      },
    }));
  }, []);

  const setSubtitleStyle = useCallback((style: VideoSettings['subtitleStyle']) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, subtitleStyle: style },
    }));
  }, []);

  const setQuality = useCallback((quality: VideoSettings['quality']) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, quality },
    }));
  }, []);

  const setTransition = useCallback((type: VideoSettings['transitionType'], duration?: number) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        transitionType: type,
        transitionDuration: duration ?? prev.settings.transitionDuration,
      },
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Step 3: Generate Video
  // ---------------------------------------------------------------------------

  const updateProgress = useCallback((progress: Partial<GenerationProgress>) => {
    setState((prev) => ({
      ...prev,
      generationProgress: { ...prev.generationProgress, ...progress },
    }));
  }, []);

  const generateVideo = useCallback(async () => {
    const { projectId, slides, settings } = state;

    if (!projectId) {
      setState((prev) => ({ ...prev, error: 'Projeto não encontrado' }));
      return;
    }

    const selectedSlides = slides.filter((s) => s.selected);
    if (selectedSlides.length === 0) {
      setState((prev) => ({ ...prev, error: 'Nenhum slide selecionado' }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      generationProgress: {
        stage: 'preparing',
        progress: 0,
        message: 'Preparando geração...',
        totalSlides: selectedSlides.length,
      },
    }));

    try {
      // Prepare request payload
      const payload = {
        projectId,
        slides: selectedSlides.map((s) => ({
          id: s.id,
          slideNumber: s.slideNumber,
          title: s.title,
          content: s.content,
          notes: s.notes,
          imageUrl: s.imageUrl,
          duration: s.duration,
        })),
        settings: {
          avatarId: settings.avatar?.id,
          avatarProvider: settings.avatar?.provider,
          avatarMode: settings.avatar?.mode === 'realistic' ? 'realistic' : 'none',
          avatarImageUrl: settings.avatar?.imageUrl,
          voiceId: settings.voice?.id,
          voiceProvider: settings.voice?.provider,
          musicId: settings.music?.id,
          musicVolume: settings.musicVolume,
          subtitlesEnabled: settings.subtitlesEnabled,
          subtitleStyle: settings.subtitleStyle,
          quality: settings.quality,
          transitionType: settings.transitionType,
          transitionDuration: settings.transitionDuration,
        },
      };

      // Start generation via API
      const response = await fetch('/api/pptx-to-video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha na geração do vídeo');
      }

      const data = await response.json();

      // If it's a job-based system, poll for status
      if (data.jobId) {
        await pollJobStatus(data.jobId);
      } else {
        // Direct result
        setState((prev) => ({
          ...prev,
          isLoading: false,
          generationProgress: {
            stage: 'complete',
            progress: 100,
            message: 'Vídeo gerado com sucesso!',
          },
          result: {
            success: true,
            videoUrl: data.videoUrl,
            duration: data.duration,
            fileSize: data.fileSize,
            subtitlesUrl: data.subtitlesUrl,
          },
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        generationProgress: {
          stage: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Erro na geração',
        },
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
    }
  }, [state]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('Tempo limite excedido');
      }

      const response = await fetch(`/api/pptx-to-video/status/${jobId}`);
      if (!response.ok) {
        throw new Error('Falha ao verificar status');
      }

      const data = await response.json();

      // Update progress
      updateProgress({
        stage: data.stage,
        progress: data.progress,
        message: data.message,
        currentSlide: data.currentSlide,
      });

      if (data.status === 'completed') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          generationProgress: {
            stage: 'complete',
            progress: 100,
            message: 'Vídeo gerado com sucesso!',
          },
          result: {
            success: true,
            videoUrl: data.videoUrl,
            duration: data.duration,
            fileSize: data.fileSize,
            subtitlesUrl: data.subtitlesUrl,
          },
        }));
        return;
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Falha na geração');
      }

      // Continue polling
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return poll();
    };

    await poll();
  }, [updateProgress]);

  // ---------------------------------------------------------------------------
  // Reset & Utils
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const canProceedToCustomize = useMemo(() => {
    return state.slides.length > 0 && state.slides.some((s) => s.selected);
  }, [state.slides]);

  const canProceedToGenerate = useMemo(() => {
    const { settings, slides } = state;
    const hasSelectedSlides = slides.some((s) => s.selected);
    // Voice is required, avatar is optional
    return hasSelectedSlides && settings.voice !== null;
  }, [state]);

  const totalDuration = useMemo(() => {
    return state.slides
      .filter((s) => s.selected)
      .reduce((acc, s) => acc + s.duration, 0);
  }, [state.slides]);

  const selectedSlidesCount = useMemo(() => {
    return state.slides.filter((s) => s.selected).length;
  }, [state.slides]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    ...state,

    // Navigation
    goToStep,
    nextStep,
    prevStep,

    // Step 1: Upload
    uploadAndExtract,
    toggleSlideSelection,
    updateSlideDuration,
    selectAllSlides,

    // Step 2: Customize
    setAvatar,
    setVoice,
    setMusic,
    setMusicVolume,
    toggleSubtitles,
    setSubtitleStyle,
    setQuality,
    setTransition,

    // Step 3: Generate
    generateVideo,

    // Utils
    reset,
    canProceedToCustomize,
    canProceedToGenerate,
    totalDuration,
    selectedSlidesCount,
  };
}

export type UsePPTXToVideoReturn = ReturnType<typeof usePPTXToVideo>;
