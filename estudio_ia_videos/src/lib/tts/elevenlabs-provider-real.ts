/**
 * ElevenLabs TTS Provider Real
 * Integração real com API do ElevenLabs para geração de áudio
 */

import { 
  TTSProvider, 
  TTSRequest, 
  TTSResponse, 
  TTSVoice, 
  TTSError, 
  RateLimitError,
  VoiceNotFoundError,
  TTSProviderType
} from './tts-provider-abstraction';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url?: string;
  gender: 'male' | 'female' | 'neutral';
  age?: string;
  accent?: string;
  use_case?: string;
}

interface ElevenLabsAPIResponse {
  audio?: Buffer;
  duration?: number;
  error?: {
    message: string;
    status: string;
    code?: string;
  };
}

export class ElevenLabsProviderReal implements TTSProvider {
  name = TTSProviderType.ELEVENLABS;
  
  private apiKey: string;
  private baseURL = 'https://api.elevenlabs.io';
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new TTSError('ElevenLabs API key is required', 'elevenlabs');
    }
    this.apiKey = apiKey;
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    try {
      const response = await fetch(`${this.baseURL}/v1/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new TTSError(
          `Failed to fetch voices: ${response.statusText}`,
          'elevenlabs',
          response.status.toString()
        );
      }

      const data = await response.json();
      
      return data.voices.map((voice: any): TTSVoice => ({
        id: voice.voice_id,
        name: voice.name,
        language: 'en', // Default, could be enhanced
        gender: voice.gender || 'neutral',
        preview_url: voice.preview_url,
      }));
    } catch (error) {
      throw new TTSError(
        `Error fetching ElevenLabs voices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'elevenlabs'
      );
    }
  }

  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      if (!request.text || request.text.trim().length === 0) {
        return {
          success: false,
          error: 'Text is required and cannot be empty',
        };
      }

      // Get voice info if voiceId provided
      let voiceInfo: any;
      if (request.voiceId) {
        const voices = await this.getAvailableVoices();
        voiceInfo = voices.find((v: TTSVoice) => v.id === request.voiceId);
        
        if (!voiceInfo) {
          throw new VoiceNotFoundError(request.voiceId, 'elevenlabs');
        }
      }

      // Prepare request body
      const requestBody: any = {
        text: request.text.trim(),
      };

      // Add voice settings
      if (request.voiceId) {
        requestBody.voice_id = request.voiceId;
      } else {
        // Use default voice for Brazilian Portuguese
        requestBody.voice_id = 'bella'; // Good for Portuguese
      }

      // Add voice settings
      if (voiceInfo) {
        requestBody.voice_settings = {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: false,
        };
      }

      // Add optional parameters
      if (request.speed) {
        requestBody.voice_settings = {
          ...requestBody.voice_settings,
          speed: Math.max(0.5, Math.min(2.0, request.speed)),
        };
      }

      if (request.pitch) {
        requestBody.voice_settings = {
          ...requestBody.voice_settings,
          pitch: Math.max(-20, Math.min(20, request.pitch)),
        };
      }

      // Make API request
      const response = await fetch(`${this.baseURL}/v1/text-to-speech`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          const retryAfter = errorData.detail?.retry_after || 60;
          throw new RateLimitError(
            `Rate limit exceeded. Retry after ${retryAfter} seconds`,
            'elevenlabs',
            retryAfter
          );
        }

        if (response.status === 401) {
          throw new TTSError('Invalid ElevenLabs API key', 'elevenlabs', 'INVALID_API_KEY');
        }

        if (response.status === 402) {
          const cost = this.estimateCost(request.text, request.voiceId);
          throw new TTSError(
            'Insufficient credits for this request',
            'elevenlabs',
            'INSUFFICIENT_CREDITS'
          );
        }

        throw new TTSError(
          `ElevenLabs API error: ${errorData.error?.message || response.statusText}`,
          'elevenlabs',
          response.status.toString()
        );
      }

      const data = await response.json();
      
      if (!data.audio) {
        return {
          success: false,
          error: 'No audio data received from ElevenLabs',
        };
      }

      // Calculate audio duration if not provided
      const duration = data.duration || this.estimateDuration(request.text);

      return {
        success: true,
        audioBuffer: Buffer.from(data.audio, 'base64'),
        duration,
        size: Buffer.from(data.audio, 'base64').length,
        cost: this.estimateCost(request.text, request.voiceId),
        metadata: {
          provider: this.name,
          voiceId: requestBody.voice_id,
          textLength: request.text.length,
          processingTime,
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof TTSError) {
        throw error;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          provider: this.name,
          voiceId: request.voiceId || 'default',
          textLength: request.text.length,
          processingTime,
        },
      };
    }
  }

  estimateCost(text: string, voiceId?: string): number {
    // ElevenLabs pricing: ~$0.30 per 1,000 characters
    const characterCount = text.length;
    const costPerCharacter = 0.30 / 1000;
    return Math.ceil(characterCount * costPerCharacter * 100) / 100;
  }

  private estimateDuration(text: string): number {
    // Rough estimation: ~150 words per minute
    const words = text.trim().split(/\s+/).length;
    return (words / 150) * 60; // Duration in seconds
  }

  /**
   * Get Brazilian Portuguese voices optimized for NR training content
   */
  async getBrazilianVoices(): Promise<TTSVoice[]> {
    const allVoices = await this.getAvailableVoices();
    
    // Filter and prioritize voices good for Portuguese/Brazilian content
    const preferredVoiceIds = [
      'bella', // Female, good clarity
      'rachel', // Female, clear narration
      'sam', // Male, professional
      'adam', // Male, authoritative
    ];

    const brazilianOptimized = allVoices.filter(voice => 
      preferredVoiceIds.includes(voice.id)
    );

    // Add other multilingual voices as fallback
    const fallbackVoices = allVoices.filter(voice => 
      !preferredVoiceIds.includes(voice.id) && 
      voice.gender !== 'neutral'
    );

    return [...brazilianOptimized, ...fallbackVoices];
  }

  /**
   * Test voice before committing to full generation
   */
  async testVoice(voiceId: string, text: string): Promise<TTSResponse> {
    const testRequest: TTSRequest = {
      text: text.substring(0, 100), // Limit test to 100 characters
      voiceId,
      projectId: 'test',
    };

    return this.generateSpeech(testRequest);
  }

  /**
   * Get voice preview URL
   */
  getVoicePreviewUrl(voiceId: string): string | undefined {
    // ElevenLabs provides preview URLs for voices
    return `${this.baseURL}/v1/voices/${voiceId}/preview`;
  }
}