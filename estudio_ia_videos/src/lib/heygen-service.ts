import { createClient } from '@supabase/supabase-js';
import { logger } from '@lib/logger';
import { getRequiredEnv, getOptionalEnv } from '@lib/env';
import { withRetry } from '@lib/error-handling';
import { withCircuitBreaker } from '@lib/resilience/circuit-breaker';
import type { HeyGenVoice, HeyGenGenerateVideoResponse } from '@types/external-apis';

export interface HeyGenAvatar {
  avatar_id: string;
  name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url?: string;
}

export interface HeyGenVideoRequest {
  video_inputs: {
    character: {
      type: 'avatar';
      avatar_id: string;
      avatar_style: string;
    };
    voice: {
      type: 'audio';
      audio_url: string; // URL of the audio file (e.g., from ElevenLabs)
    } | {
      type: 'text';
      input_text: string;
      voice_id: string; // HeyGen voice ID
    };
    background: {
      type: 'color' | 'image' | 'video';
      value: string; // Hex color or URL
    };
  }[];
  dimension?: {
    width: number;
    height: number;
  };
  test?: boolean; // If true, generates a watermarked preview (cheaper/free)
}

export interface HeyGenJobStatus {
  videoId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  error?: string;
}

export class HeyGenService {
  private static instance: HeyGenService;
  private apiKey: string;
  private supabase;

  constructor() {
    this.apiKey = getOptionalEnv('HEYGEN_API_KEY');
    
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): HeyGenService {
    if (!HeyGenService.instance) {
      HeyGenService.instance = new HeyGenService();
    }
    return HeyGenService.instance;
  }

  private async request(endpoint: string, method: string = 'GET', body?: Record<string, unknown>) {
    if (!this.apiKey || this.apiKey === '') {
      logger.info('HeyGen API Key não configurada, funcionalidades de avatar indisponíveis.', { 
        component: 'HeyGenService',
        endpoint 
      });
      throw new Error('HeyGen API Key not configured');
    }

    // Use retry pattern with circuit breaker for external API calls
    return withCircuitBreaker(
      'heygen-api',
      async () => {
        return withRetry(
          async () => {
            const response = await fetch(`https://api.heygen.com/v2/${endpoint}`, {
              method,
              headers: {
                'X-Api-Key': this.apiKey,
                'Content-Type': 'application/json',
              },
              body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
              const errorText = await response.text();
              const error = new Error(`HeyGen API Error: ${response.status} - ${errorText}`);
              
              // Don't retry on 4xx errors (client errors)
              if (response.status >= 400 && response.status < 500) {
                throw error;
              }
              
              // Retry on 5xx errors (server errors)
              throw error;
            }

            return await response.json();
          },
          {
            maxAttempts: 3,
            delayMs: 1000,
            backoffMultiplier: 2,
            shouldRetry: (error) => {
              // Only retry on network errors and 5xx status codes
              const errorMessage = error instanceof Error ? error.message : String(error);
              return (
                errorMessage.includes('network') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('ECONNRESET') ||
                errorMessage.includes('ETIMEDOUT') ||
                errorMessage.includes('5')
              );
            },
          }
        );
      },
      {
        failureThreshold: 5,
        timeout: 60000,
        name: 'heygen-api',
      },
      () => {
        throw new Error('HeyGen service temporarily unavailable. Please try again later.');
      }
    );
  }

  async listAvatars(): Promise<HeyGenAvatar[]> {
    try {
      const data = await this.request('avatars');
      return data.data.avatars.map((a: { avatar_id: string; name: string; gender: string; preview_image_url: string; previewVideoUrl: string }) => ({
        avatar_id: a.avatar_id,
        name: a.name,
        gender: a.gender,
        preview_image_url: a.preview_image_url,
        previewVideoUrl: a.previewVideoUrl,
      }));
    } catch (error) {
      logger.info('HeyGen avatares não disponíveis, retornando lista mock.', { 
        component: 'HeyGenService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return mock avatars for development/demo
      return [
        {
          avatar_id: 'mock-avatar-1',
          name: 'Instrutor Virtual (Demo)',
          gender: 'male',
          preview_image_url: '/placeholder-avatar.jpg',
          previewVideoUrl: undefined
        },
        {
          avatar_id: 'mock-avatar-2', 
          name: 'Instrutora Virtual (Demo)',
          gender: 'female',
          preview_image_url: '/placeholder-avatar.jpg',
          previewVideoUrl: undefined
        }
      ];
    }
  }

  async listVoices(): Promise<HeyGenVoice[]> {
    try {
      const data = await this.request('voices') as { data: { voices: HeyGenVoice[] } };
      return data.data.voices;
    } catch (error) {
      logger.error('Failed to list HeyGen voices:', error instanceof Error ? error : new Error(String(error)), { component: 'HeygenService' });
      return [];
    }
  }

  async generateVideo(request: HeyGenVideoRequest): Promise<string> {
    logger.info('🎬 Starting HeyGen video generation...', { component: 'HeygenService' });
    
    const data = await this.request('video/generate', 'POST', request as unknown as Record<string, unknown>);
    
    if (!data.data || !data.data.videoId) {
      throw new Error('Failed to get video_id from HeyGen response');
    }

    return data.data.videoId;
  }

  async checkStatus(videoId: string): Promise<HeyGenJobStatus> {
    const data = await this.request(`video_status.get?video_id=${videoId}`);
    
    const status = data.data.status;
    const result: HeyGenJobStatus = {
      videoId: videoId,
      status: status === 'completed' ? 'completed' : 
              status === 'failed' ? 'failed' : 
              status === 'processing' ? 'processing' : 'pending',
    };

    if (status === 'completed') {
      result.video_url = data.data.video_url;
      result.thumbnailUrl = data.data.thumbnailUrl;
    } else if (status === 'failed') {
      result.error = data.data.error?.message || 'Unknown error';
    }

    return result;
  }

  async getQuota(): Promise<HeyGenQuota> {
    try {
      const data = await this.request('user/remaining_quota');
      return {
        remaining_quota: data.data.remaining_quota ?? 0,
        used_quota: data.data.used_quota ?? 0,
        quota_reset_date: data.data.quota_reset_date,
      };
    } catch (error) {
      logger.error('Failed to get HeyGen quota:', error instanceof Error ? error : new Error(String(error)), { component: 'HeygenService' });
      return {
        remaining_quota: 0,
        used_quota: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export interface HeyGenQuota {
  remaining_quota: number;
  used_quota: number;
  quota_reset_date?: string;
  error?: string;
}

export const heyGenService = new HeyGenService();
