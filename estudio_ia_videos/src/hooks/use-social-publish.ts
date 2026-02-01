/**
 * 🎬 Social Video Publishing Hook
 * Integração com YouTube, Vimeo e outras plataformas de vídeo
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type Platform = 'youtube' | 'vimeo' | 'tiktok' | 'instagram';

export interface PlatformAccount {
  id: string;
  platform: Platform;
  name: string;
  email?: string;
  avatarUrl?: string;
  channelUrl?: string;
  isConnected: boolean;
  tokenExpiry?: Date;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  visibility: 'public' | 'private' | 'unlisted';
  scheduledPublishTime?: Date;
  thumbnail?: File | string;
  playlistId?: string;
  language?: string;
  license?: string;
  madeForKids?: boolean;
}

export interface PublishProgress {
  stage: 'idle' | 'preparing' | 'uploading' | 'processing' | 'publishing' | 'complete' | 'error';
  progress: number;
  message: string;
  uploadedBytes?: number;
  totalBytes?: number;
  videoId?: string;
  videoUrl?: string;
}

export interface PublishResult {
  success: boolean;
  platform: Platform;
  videoId: string;
  videoUrl: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  publishedAt: Date;
}

// ============================================================================
// PLATFORM CONFIGS
// ============================================================================

const PLATFORM_CONFIG: Record<Platform, {
  name: string;
  icon: string;
  color: string;
  maxTitleLength: number;
  maxDescriptionLength: number;
  maxTags: number;
  supportedFormats: string[];
  maxFileSize: number; // in bytes
  authUrl: string;
}> = {
  youtube: {
    name: 'YouTube',
    icon: '📺',
    color: '#FF0000',
    maxTitleLength: 100,
    maxDescriptionLength: 5000,
    maxTags: 500,
    supportedFormats: ['mp4', 'mov', 'avi', 'wmv', 'webm'],
    maxFileSize: 256 * 1024 * 1024 * 1024, // 256 GB
    authUrl: '/api/auth/youtube',
  },
  vimeo: {
    name: 'Vimeo',
    icon: '🎬',
    color: '#1AB7EA',
    maxTitleLength: 128,
    maxDescriptionLength: 3000,
    maxTags: 20,
    supportedFormats: ['mp4', 'mov', 'wmv', 'avi', 'webm', 'mkv'],
    maxFileSize: 500 * 1024 * 1024, // 500 MB (basic plan)
    authUrl: '/api/auth/vimeo',
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#000000',
    maxTitleLength: 150,
    maxDescriptionLength: 2200,
    maxTags: 5,
    supportedFormats: ['mp4', 'mov'],
    maxFileSize: 287 * 1024 * 1024, // ~287 MB
    authUrl: '/api/auth/tiktok',
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#E4405F',
    maxTitleLength: 0, // Uses description
    maxDescriptionLength: 2200,
    maxTags: 30,
    supportedFormats: ['mp4'],
    maxFileSize: 650 * 1024 * 1024, // ~650 MB
    authUrl: '/api/auth/instagram',
  },
};

const YOUTUBE_CATEGORIES: Record<string, string> = {
  '1': 'Filme e animação',
  '2': 'Automóveis e veículos',
  '10': 'Música',
  '15': 'Animais',
  '17': 'Esportes',
  '19': 'Viagem e eventos',
  '20': 'Jogos',
  '22': 'Pessoas e blogs',
  '23': 'Comédia',
  '24': 'Entretenimento',
  '25': 'Notícias e política',
  '26': 'Estilo',
  '27': 'Educação',
  '28': 'Ciência e tecnologia',
  '29': 'Ativismo e organizações sem fins lucrativos',
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSocialPublish() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [progress, setProgress] = useState<PublishProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Inicia fluxo OAuth para conectar conta
   */
  const connectAccount = useCallback(async (platform: Platform): Promise<boolean> => {
    const config = PLATFORM_CONFIG[platform];
    
    try {
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      const popup = window.open(
        config.authUrl,
        `${platform}_auth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Wait for OAuth callback
      return new Promise((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === `${platform}_auth_success`) {
            const account: PlatformAccount = {
              id: event.data.accountId,
              platform,
              name: event.data.name,
              email: event.data.email,
              avatarUrl: event.data.avatarUrl,
              channelUrl: event.data.channelUrl,
              isConnected: true,
              tokenExpiry: event.data.tokenExpiry ? new Date(event.data.tokenExpiry) : undefined,
            };

            setAccounts((prev) => {
              const existing = prev.findIndex((a) => a.platform === platform);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = account;
                return updated;
              }
              return [...prev, account];
            });

            window.removeEventListener('message', handleMessage);
            popup.close();
            resolve(true);
          } else if (event.data?.type === `${platform}_auth_error`) {
            window.removeEventListener('message', handleMessage);
            popup.close();
            logger.error('OAuth failed', undefined, { platform, error: event.data.error });
            resolve(false);
          }
        };

        window.addEventListener('message', handleMessage);

        // Timeout after 5 minutes
        setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          if (!popup.closed) {
            popup.close();
          }
          resolve(false);
        }, 5 * 60 * 1000);
      });
    } catch (error) {
      logger.error('Failed to connect account', error instanceof Error ? error : undefined, { platform });
      return false;
    }
  }, []);

  /**
   * Desconecta conta
   */
  const disconnectAccount = useCallback(async (platform: Platform): Promise<boolean> => {
    try {
      const response = await fetch(`/api/auth/${platform}/disconnect`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setAccounts((prev) => prev.filter((a) => a.platform !== platform));
      return true;
    } catch (error) {
      logger.error('Failed to disconnect account', error instanceof Error ? error : undefined, { platform });
      return false;
    }
  }, []);

  /**
   * Valida metadados para plataforma específica
   */
  const validateMetadata = useCallback((platform: Platform, metadata: VideoMetadata): string[] => {
    const config = PLATFORM_CONFIG[platform];
    const errors: string[] = [];

    if (metadata.title.length > config.maxTitleLength && config.maxTitleLength > 0) {
      errors.push(`Título muito longo (máximo ${config.maxTitleLength} caracteres)`);
    }

    if (metadata.description.length > config.maxDescriptionLength) {
      errors.push(`Descrição muito longa (máximo ${config.maxDescriptionLength} caracteres)`);
    }

    if (metadata.tags.length > config.maxTags) {
      errors.push(`Muitas tags (máximo ${config.maxTags})`);
    }

    return errors;
  }, []);

  /**
   * Publica vídeo em uma plataforma
   */
  const publish = useCallback(
    async (
      platform: Platform,
      videoFile: File | Blob | string,
      metadata: VideoMetadata
    ): Promise<PublishResult | null> => {
      const account = accounts.find((a) => a.platform === platform);
      if (!account?.isConnected) {
        setProgress({
          stage: 'error',
          progress: 0,
          message: 'Conta não conectada',
        });
        return null;
      }

      const validationErrors = validateMetadata(platform, metadata);
      if (validationErrors.length > 0) {
        setProgress({
          stage: 'error',
          progress: 0,
          message: validationErrors.join('\n'),
        });
        return null;
      }

      setIsLoading(true);
      setProgress({
        stage: 'preparing',
        progress: 5,
        message: 'Preparando upload...',
      });

      try {
        // Create FormData
        const formData = new FormData();
        
        if (typeof videoFile === 'string') {
          // If it's a URL, fetch the video first
          setProgress({
            stage: 'preparing',
            progress: 10,
            message: 'Baixando vídeo do servidor...',
          });
          
          const response = await fetch(videoFile);
          const blob = await response.blob();
          formData.append('video', blob, 'video.mp4');
        } else {
          formData.append('video', videoFile);
        }

        formData.append('metadata', JSON.stringify(metadata));

        // Upload to platform
        setProgress({
          stage: 'uploading',
          progress: 20,
          message: `Enviando para ${PLATFORM_CONFIG[platform].name}...`,
        });

        const xhr = new XMLHttpRequest();
        
        const uploadPromise = new Promise<PublishResult>((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const uploadProgress = 20 + (event.loaded / event.total) * 60;
              setProgress({
                stage: 'uploading',
                progress: uploadProgress,
                message: `Enviando: ${Math.round((event.loaded / event.total) * 100)}%`,
                uploadedBytes: event.loaded,
                totalBytes: event.total,
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } else {
              reject(new Error(xhr.responseText || 'Upload failed'));
            }
          };

          xhr.onerror = () => reject(new Error('Network error'));
        });

        xhr.open('POST', `/api/publish/${platform}`);
        xhr.send(formData);

        const result = await uploadPromise;

        setProgress({
          stage: 'processing',
          progress: 85,
          message: 'Processando vídeo na plataforma...',
        });

        // Poll for processing status
        let attempts = 0;
        while (attempts < 60) {
          await new Promise((r) => setTimeout(r, 5000));
          
          const statusResponse = await fetch(
            `/api/publish/${platform}/status/${result.videoId}`
          );
          const status = await statusResponse.json();

          if (status.status === 'ready' || status.status === 'published') {
            setProgress({
              stage: 'complete',
              progress: 100,
              message: 'Publicado com sucesso!',
              videoId: result.videoId,
              videoUrl: result.videoUrl,
            });

            return {
              success: true,
              platform,
              videoId: result.videoId,
              videoUrl: result.videoUrl,
              embedUrl: status.embedUrl,
              thumbnailUrl: status.thumbnailUrl,
              publishedAt: new Date(),
            };
          }

          if (status.status === 'failed') {
            throw new Error(status.error || 'Processing failed');
          }

          setProgress({
            stage: 'processing',
            progress: 85 + (attempts / 60) * 10,
            message: `Processando: ${status.message || 'aguarde...'}`,
          });

          attempts++;
        }

        throw new Error('Processing timeout');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setProgress({
          stage: 'error',
          progress: 0,
          message: errorMessage,
        });
        logger.error('Publish failed', error instanceof Error ? error : undefined, { platform });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [accounts, validateMetadata]
  );

  /**
   * Reseta estado
   */
  const reset = useCallback(() => {
    setProgress({ stage: 'idle', progress: 0, message: '' });
    setIsLoading(false);
  }, []);

  return {
    // State
    accounts,
    progress,
    isLoading,
    
    // Config
    platformConfig: PLATFORM_CONFIG,
    youtubeCategories: YOUTUBE_CATEGORIES,

    // Actions
    connectAccount,
    disconnectAccount,
    validateMetadata,
    publish,
    reset,
  };
}

export default useSocialPublish;
