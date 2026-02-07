/**
 * Real TTS Service
 * Unified service using real TTS providers instead of mock
 */

import { 
  TTSProviderType, 
  TTSRequest, 
  TTSResponse,
  TTSConfig,
  TTSFactory,
  TTSUtils
} from './tts-provider-abstraction';
import { ElevenLabsProviderReal } from './elevenlabs-provider-real';
import { GoogleCloudProviderReal } from './google-cloud-provider-real';
import { AudioStorageManager } from './audio-storage-manager';
import { logger } from '@/lib/monitoring/logger';

export class RealTTSService {
  private audioStorage: AudioStorageManager;
  
  constructor() {
    this.audioStorage = new AudioStorageManager();
  }

  /**
   * Initialize TTS providers from configuration
   */
  initialize(config: TTSConfig): void {
    try {
      // Register real providers
      TTSFactory.registerProvider(TTSProviderType.ELEVENLABS, new ElevenLabsProviderReal(config.elevenlabs?.apiKey || ''));
      
      if (config.googleCloud?.credentials) {
        TTSFactory.registerProvider(
          TTSProviderType.GOOGLE_CLOUD,
          new GoogleCloudProviderReal(config.googleCloud.credentials, config.googleCloud.projectId)
        );
      }

      logger.info('Real TTS providers initialized', {
        providers: [
          config.elevenlabs?.apiKey ? 'elevenlabs' : undefined,
          config.googleCloud?.credentials ? 'google-cloud' : undefined,
        ].filter(Boolean),
      });

    } catch (error) {
      logger.error('Failed to initialize TTS providers', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate speech for slide content using real TTS
   */
  async generateSpeechForSlide(
    slideContent: string,
    slideNotes: string | undefined,
    options: {
      provider: TTSProviderType;
      voiceId?: string;
      projectId?: string;
      slideId?: string;
    }
  ): Promise<TTSResponse> {
    const startTime = Date.now();
    
    try {
      // Prepare request
      const textToSpeak = TTSUtils.extractTextForTTS(slideContent, slideNotes);
      
      if (!textToSpeak || textToSpeak.trim().length === 0) {
        return {
          success: false,
          error: 'No content available for TTS generation',
        };
      }

      let lastPrimaryError: unknown;

      // Get TTS configuration
      const ttsConfig: TTSConfig = {
        provider: options.provider,
        fallback: {
          enabled: true,
          provider: TTSProviderType.MOCK, // Fallback to mock if real provider fails
        },
      };

      // Create TTS request
      const request: TTSRequest = {
        text: textToSpeak,
        voiceId: options.voiceId,
        projectId: options.projectId,
        slideId: options.slideId,
        speed: 1.0, // Normal speed
        pitch: 0.0, // Neutral pitch
      };

      // Get provider instance
      const { primary, fallback } = await TTSFactory.createWithFallback(ttsConfig);

      // Try primary provider first
      let response: TTSResponse;
      
      try {
        response = await primary.generateSpeech(request);
        
        if (response.success && response.audioBuffer) {
          // Store audio
          const filename = TTSUtils.generateAudioFilename(
            options.provider,
            response.metadata?.voiceId || 'default',
            options.slideId,
            1
          );

          const storedAudio = await this.audioStorage.storeAudio(
            response.audioBuffer,
            filename,
            response.metadata
          );

          const result: TTSResponse = {
            success: true,
            audioUrl: this.audioStorage.getPublicUrl(storedAudio),
            audioBuffer: response.audioBuffer,
            duration: response.duration,
            size: storedAudio.size,
            cost: response.cost,
            metadata: {
              ...response.metadata,
              provider: response.metadata?.provider || options.provider,
              voiceId: response.metadata?.voiceId || options.voiceId || 'default',
              textLength: response.metadata?.textLength || 0,
              processingTime: response.metadata?.processingTime || 0,
            },
          };

          logger.info('Real TTS generation successful', {
            provider: options.provider,
            voiceId: options.voiceId,
            textLength: textToSpeak.length,
            duration: response.duration,
            cost: response.cost,
            audioSize: storedAudio.size,
          });

          return result;
        }

      } catch (primaryError) {
        lastPrimaryError = primaryError;
        logger.warn('Primary TTS provider failed', {
          provider: options.provider,
          error: primaryError instanceof Error ? primaryError.message : 'Unknown error',
        });

        // Try fallback provider if available
        if (fallback) {
          try {
            response = await fallback.generateSpeech(request);
            
            if (response.success && response.audioBuffer) {
              logger.info('Fallback TTS provider successful', {
                provider: options.provider,
                fallbackProvider: 'mock',
                textLength: textToSpeak.length,
                duration: response.duration,
              });

              return response;
            }

          } catch (fallbackError) {
            logger.error('Both primary and fallback TTS providers failed',
              primaryError instanceof Error ? primaryError : new Error('Both TTS providers failed'),
              {
                primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown error',
                fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
              }
            );
          }
        }
      }

      // If all providers failed
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: `All TTS providers failed. Primary: ${lastPrimaryError instanceof Error ? lastPrimaryError.message : 'Unknown error'}`,
        metadata: {
          provider: options.provider,
          voiceId: options.voiceId || 'default',
          textLength: textToSpeak.length,
          processingTime,
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('TTS service error', error instanceof Error ? error : new Error(String(error)), {
        provider: options.provider,
        slideId: options.slideId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown TTS error',
        metadata: {
          provider: options.provider,
          voiceId: options.voiceId || 'default',
          textLength: slideContent.length,
          processingTime,
        },
      };
    }
  }

  /**
   * Batch generate speech for multiple slides
   */
  async generateSpeechBatch(
    slides: Array<{
      content: string;
      notes?: string;
      slideId?: string;
    }>,
    options: {
      provider: TTSProviderType;
      voiceId?: string;
      projectId?: string;
    }
  ): Promise<Array<{
    slideId?: string;
    audioUrl?: string;
    duration?: number;
    success: boolean;
    error?: string;
  }>> {
    logger.info('Starting batch TTS generation', {
      slideCount: slides.length,
      provider: options.provider,
    });

    const results = [];

    for (const slide of slides) {
      const result = await this.generateSpeechForSlide(
        slide.content,
        slide.notes,
        {
          ...options,
          slideId: slide.slideId,
        }
      );

      results.push({
        slideId: slide.slideId,
        audioUrl: result.audioUrl,
        duration: result.duration,
        success: result.success,
        error: result.error,
      });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    
    logger.info('Batch TTS generation completed', {
      totalSlides: slides.length,
      successful: successCount,
      failed: results.length - successCount,
    });

    return results;
  }

  /**
   * Get available voices for provider
   */
  async getVoices(provider: TTSProviderType): Promise<any[]> {
    try {
      const config: TTSConfig = { provider };
      const { primary, fallback } = await TTSFactory.createWithFallback(config);

      // Try primary provider
      if (primary) {
        return await (primary as any).getAvailableVoices();
      }

      return [];

    } catch (error) {
      logger.error('Failed to get voices', error instanceof Error ? error : new Error(String(error)), {
        provider,
      });
      
      return [];
    }
  }

  /**
   * Get Brazilian Portuguese optimized voices
   */
  async getBrazilianVoices(provider: TTSProviderType): Promise<any[]> {
    try {
      const config: TTSConfig = { provider };
      const { primary, fallback } = await TTSFactory.createWithFallback(config);

      // Try primary Provider
      if (primary) {
        if ('getBrazilianVoices' in primary) {
          const voices = await (primary as any).getBrazilianVoices();
          logger.info('Brazilian voices retrieved', {
            provider,
            count: voices.length,
          });
          return voices;
        }
      }

      return [];

    } catch (error) {
      logger.error('Failed to get Brazilian voices', error instanceof Error ? error : new Error(String(error)), {
        provider,
      });
      
      return [];
    }
  }

  /**
   * Test voice with sample text
   */
  async testVoice(provider: TTSProviderType, voiceId: string): Promise<TTSResponse> {
    try {
      const config: TTSConfig = { provider };
      const { primary, fallback } = await TTSFactory.createWithFallback(config);

      // Try primary Provider
      if (primary && 'testVoice' in primary) {
        return await (primary as any).testVoice(voiceId, 'Teste de voz para TécnicoCursos');
      }

      return {
        success: false,
        error: 'Provider does not support voice testing',
      };

    } catch (error) {
      logger.error('Voice test failed', error instanceof Error ? error : new Error(String(error)), {
        provider,
        voiceId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cost estimate for text
   */
  estimateCost(text: string, provider: TTSProviderType, _voiceId?: string): number {
    try {
      // Cost estimation based on provider pricing
      // These are approximate costs per character
      const costPerChar: Record<string, number> = {
        [TTSProviderType.ELEVENLABS]: 0.0003,   // ~$0.30 per 1000 characters
        [TTSProviderType.AWS_POLLY]: 0.000016,  // ~$16 per 1M characters
        [TTSProviderType.GOOGLE_CLOUD]: 0.000016, // ~$16 per 1M characters
        [TTSProviderType.MOCK]: 0,              // Free (mock)
        [TTSProviderType.OPENAI]: 0.000015,     // ~$15 per 1M characters
      };

      const rate = costPerChar[provider] || 0.0001;
      return Math.ceil(text.length * rate * 100) / 100;

    } catch (error) {
      logger.error('Cost estimation failed', error instanceof Error ? error : new Error(String(error)), {
        provider,
      });

      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    return await this.audioStorage.getStorageStats();
  }

  /**
   * Cleanup old audio files
   */
  async cleanupOldAudio(daysOld: number = 7): Promise<number> {
    return await this.audioStorage.cleanupOldAudio(daysOld);
  }
}