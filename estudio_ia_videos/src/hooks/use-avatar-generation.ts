/**
 * Hook: useAvatarGeneration
 * Hook React para geração de avatares 3D reais (API v2)
 * 
 * Features:
 * - Iniciar geração (/api/v2/avatars/render)
 * - Polling automático de status (/api/v2/avatars/render/status/[id])
 * - Gerenciamento de estado
 * - Error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface AvatarJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  output: {
    videoUrl?: string;
    thumbnailUrl?: string;
  };
  error?: string;
}

interface GenerateAvatarOptions {
  avatarId: string;
  animation: string; // 'idle', 'talking', etc
  text?: string;
  audioFile?: File;
  voiceCloning?: boolean;
}

interface UseAvatarGenerationReturn {
  generateAvatar: (options: GenerateAvatarOptions) => Promise<void>;
  job: AvatarJob | null;
  isGenerating: boolean;
  error: string | null;
  reset: () => void;
  onComplete?: (videoUrl: string) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAvatarGeneration(onSuccess?: (videoUrl: string) => void): UseAvatarGenerationReturn {
  const [job, setJob] = useState<AvatarJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // ==========================================================================
  // POLLING
  // ==========================================================================

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/v2/avatars/render/status/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao verificar status do job');
      }

      const data = await response.json();
      const jobData = data.data.job;
      const outputData = data.data.output;

      setJob({
          id: jobData.id,
          status: jobData.status,
          progress: jobData.progress,
          output: outputData,
          error: jobData.error
      });

      // Se concluído ou falhou, parar polling
      if (jobData.status === 'completed' || jobData.status === 'failed' || jobData.status === 'cancelled') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setIsGenerating(false);

        if (jobData.status === 'completed') {
          toast.success('Avatar gerado com sucesso!');
          if (outputData.videoUrl && onSuccess) {
              onSuccess(outputData.videoUrl);
          }
        } else {
          toast.error(`Erro ao gerar avatar: ${jobData.error || 'Falha no processamento'}`);
          setError(jobData.error || 'Erro desconhecido');
        }
      }
    } catch (err) {
      logger.error('Erro ao fazer polling', err as Error, { component: 'useAvatarGeneration' });
    }
  }, [pollingInterval, onSuccess]);

  // ==========================================================================
  // GENERATE AVATAR
  // ==========================================================================

  const generateAvatar = useCallback(async (options: GenerateAvatarOptions) => {
    try {
      if (isGenerating) return;
      
      setIsGenerating(true);
      setError(null);
      setJob(null);

      toast.loading('Iniciando pipeline de renderização...', { duration: 2000 });

      // Preparar FormData
      const formData = new FormData();
      formData.append('avatarId', options.avatarId);
      formData.append('animation', options.animation);
      if (options.text) formData.append('text', options.text);
      if (options.audioFile) formData.append('audioFile', options.audioFile);
      if (options.voiceCloning) formData.append('voiceCloning', 'true');

      // 1. Iniciar geração
      const response = await fetch('/api/v2/avatars/render', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Erro ao iniciar renderização');
      }

      const data = await response.json();
      const jobId = data.data.jobId;

      setJob({
          id: jobId,
          status: 'queued',
          progress: 0,
          output: {}
      });

      toast.success('Job iniciado! Processando...', { duration: 2000 });

      // 2. Iniciar polling
      const interval = setInterval(() => {
        pollJobStatus(jobId);
      }, 2000); // Poll a cada 2 segundos

      setPollingInterval(interval);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Erro ao gerar avatar', err as Error, { component: 'useAvatarGeneration' });
      setError(errorMessage);
      setIsGenerating(false);
      toast.error(errorMessage);
    }
  }, [pollJobStatus, isGenerating]);

  // ==========================================================================
  // RESET
  // ==========================================================================

  const reset = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setJob(null);
    setIsGenerating(false);
    setError(null);
  }, [pollingInterval]);

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return {
    generateAvatar,
    job,
    isGenerating,
    error,
    reset,
  };
}

export default useAvatarGeneration;
