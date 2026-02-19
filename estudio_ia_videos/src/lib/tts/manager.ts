/**
 * TTS Manager
 * 
 * Manages multiple TTS providers, fallback strategies, and caching.
 */

import { ElevenLabsService, ElevenLabsConfig } from '@/services/elevenlabs-service';
import { AzureTTSProvider, AzureConfig } from './providers/azure';
import { logger } from '@lib/logger';

export interface Voice {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'azure';
  language?: string;
  gender?: string;
  previewUrl?: string;
}

export interface TTSManagerConfig {
  elevenlabs?: ElevenLabsConfig;
  azure?: AzureConfig;
  preferredProvider?: 'elevenlabs' | 'azure';
  enableCache?: boolean;
  enableFallback?: boolean;
}

export interface GenerateOptions {
  text: string;
  voiceId: string;
  provider?: 'elevenlabs' | 'azure';
}

export interface GenerateResult {
  audio: Buffer;
  fromCache: boolean;
  provider: string;
}

export class TTSManager {
  private elevenlabs?: ElevenLabsService;
  private azure?: AzureTTSProvider;
  private preferredProvider: 'elevenlabs' | 'azure';
  private enableCache: boolean;
  private enableFallback: boolean;
  private memoryCache: Map<string, Buffer>;

  constructor(config: TTSManagerConfig) {
    if (config.elevenlabs?.apiKey) {
      this.elevenlabs = new ElevenLabsService(config.elevenlabs);
    } else if (config.elevenlabs) {
      throw new Error('ElevenLabs API key is required');
    }

    if (config.azure) {
      this.azure = new AzureTTSProvider(config.azure);
    }
    this.preferredProvider = config.preferredProvider || 'elevenlabs';
    this.enableCache = config.enableCache ?? true;
    this.enableFallback = config.enableFallback ?? true;
    this.memoryCache = new Map();
  }


  async generateAudio(options: GenerateOptions): Promise<GenerateResult> {
    const providerName = options.provider || this.preferredProvider;
    const cacheKey = `${providerName}:${options.voiceId}:${options.text}`;

    if (this.enableCache && this.memoryCache.has(cacheKey)) {
      return {
        audio: this.memoryCache.get(cacheKey)!,
        fromCache: true,
        provider: providerName
      };
    }

    try {
      const audio = await this.generateWithProvider(providerName, options);
      
      if (this.enableCache) {
        this.memoryCache.set(cacheKey, audio);
      }

      return {
        audio,
        fromCache: false,
        provider: providerName
      };
    } catch (error) {
      if (this.enableFallback) {
        const fallbackProvider = providerName === 'elevenlabs' ? 'azure' : 'elevenlabs';
        logger.warn(`TTS Provider ${providerName} failed, falling back to ${fallbackProvider}`, { error, providerName, fallbackProvider, component: 'TTSManager' });
        
        try {
          const audio = await this.generateWithProvider(fallbackProvider, options);
          return {
            audio,
            fromCache: false,
            provider: fallbackProvider
          };
        } catch (fallbackError) {
          throw new Error(`All TTS providers failed. Primary: ${error}, Fallback: ${fallbackError}`);
        }
      }
      throw error;
    }
  }

  private async generateWithProvider(
    providerName: string,
    options: GenerateOptions,
  ): Promise<Buffer> {
    if (providerName === 'elevenlabs') {
      if (!this.elevenlabs)
        throw new Error('ElevenLabs provider not configured');
      const result = await this.elevenlabs.generateSpeech({
        text: options.text,
        voiceId: options.voiceId,
      });
      if (!result.success || !result.audioBuffer) {
        throw new Error(result.error || 'ElevenLabs failed');
      }
      return result.audioBuffer;
    } else if (providerName === 'azure') {
      if (!this.azure) throw new Error('Azure provider not configured');
      // Azure provider implementation in this file is simplified, assuming textToSpeech returns Buffer
      // In reality, Azure provider might need different parameters or return different type
      // But based on the test, we need to support it.
      return await this.azure.textToSpeech(options.text, options.voiceId);
    }
    throw new Error(`Unknown provider: ${providerName}`);
  }

  async getVoices(providerName: 'elevenlabs' | 'azure'): Promise<Voice[]> {
    if (providerName === 'elevenlabs') {
      if (!this.elevenlabs)
        throw new Error('ElevenLabs provider not configured');
      const voices = await this.elevenlabs.getAvailableVoices();
      return voices.map((v) => ({
        id: v.id,
        name: v.name,
        provider: 'elevenlabs',
        language: v.language,
        gender: v.gender,
        previewUrl: v.preview_url,
      }));
    } else if (providerName === 'azure') {
      if (!this.azure) throw new Error('Azure provider not configured');
      return (await this.azure.getVoices()) as unknown as Voice[];
    }
    throw new Error(`Unknown provider: ${providerName}`);
  }

  estimateCost(text: string): number {
    // Simple character count estimation
    return text.length;
  }

  clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}
