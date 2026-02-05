/**
 * Google Cloud TTS Provider Real
 * Integração real com Google Cloud Text-to-Speech API
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { 
  TTSProvider, 
  TTSRequest, 
  TTSResponse, 
  TTSVoice, 
  TTSError, 
  RateLimitError,
  TTSProviderType
} from './tts-provider-abstraction';

interface GoogleTTSVoice {
  name: string[];
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

interface GoogleAudioConfig {
  audioEncoding: string;
  speakingRate: number;
  pitch: number;
  sampleRateHertz: number;
  effectsProfileId?: string;
}

export class GoogleCloudProviderReal implements TTSProvider {
  name = TTSProviderType.GOOGLE_CLOUD;
  
  private client: TextToSpeechClient;
  private projectId?: string;
  
  constructor(credentials: { client_email: string; private_key: string }, projectId?: string) {
    if (!credentials || !credentials.client_email || !credentials.private_key) {
      throw new TTSError('Google Cloud credentials are required', 'google-cloud');
    }

    this.client = new TextToSpeechClient({
      projectId,
      credentials,
    });
    this.projectId = projectId;
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    try {
      const [response] = await this.client.listVoices();
      
      if (!response || !response.voices) {
        return [];
      }

      return response.voices
        .filter(voice => voice.languageCodes?.includes('pt-BR') || voice.languageCodes?.includes('en-US'))
        .map((voice: GoogleTTSVoice): TTSVoice => ({
          id: voice.name?.[0] || 'default',
          name: voice.name?.[0] || 'Unknown Voice',
          language: voice.languageCodes?.[0] || 'en',
          gender: this.mapSsmlGender(voice.ssmlGender),
          preview_url: undefined, // Google doesn't provide preview URLs
        }));
    } catch (error) {
      throw new TTSError(
        `Error fetching Google Cloud voices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'google-cloud'
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
      let selectedVoice = request.voiceId;
      if (request.voiceId) {
        const voices = await this.getAvailableVoices();
        const voiceInfo = voices.find(v => v.id === request.voiceId);
        
        if (!voiceInfo) {
          throw new TTSError(`Voice ${request.voiceId} not found`, 'google-cloud', 'VOICE_NOT_FOUND');
        }
        selectedVoice = request.voiceId;
      } else {
        // Use default Brazilian Portuguese voice
        selectedVoice = 'pt-BR-Standard-C'; // Google's standard Brazilian male voice
      }

      // Configure audio
      const audioConfig: GoogleAudioConfig = {
        audioEncoding: 'MP3',
        speakingRate: request.speed || 1.0,
        pitch: request.pitch || 0.0,
        sampleRateHertz: 24000,
      };

      // Configure voice
      const voice = {
        name: selectedVoice,
        languageCode: 'pt-BR', // Default to Brazilian Portuguese
      };

      // Prepare request
      const synthesisRequest = {
        input: {
          text: request.text.trim(),
        },
        voice: voice,
        audioConfig: audioConfig,
      };

      // Make API request
      const [response] = await this.client.synthesizeSpeech(synthesisRequest);
      
      const processingTime = Date.now() - startTime;

      if (!response || !response.audio) {
        return {
          success: false,
          error: 'No audio data received from Google Cloud',
        };
      }

      // Calculate duration estimation
      const duration = this.estimateDuration(request.text);

      return {
        success: true,
        audioBuffer: response.audio,
        duration,
        size: response.audio.length,
        cost: this.estimateCost(request.text),
        metadata: {
          provider: this.name,
          voiceId: selectedVoice,
          textLength: request.text.length,
          processingTime,
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof TTSError) {
        throw error;
      }

      // Handle Google Cloud specific errors
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw new RateLimitError(
            'Google Cloud quota exceeded',
            'google-cloud'
          );
        }

        if (error.message.includes('permission')) {
          throw new TTSError(
            'Insufficient permissions for Google Cloud TTS',
            'google-cloud',
            'PERMISSION_DENIED'
          );
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          provider: this.name,
          voiceId: selectedVoice || 'default',
          textLength: request.text.length,
          processingTime,
        },
      };
    }
  }

  estimateCost(text: string, voiceId?: string): number {
    // Google Cloud pricing: ~$4.00 per 1M characters
    const characterCount = text.length;
    const costPerCharacter = 4.00 / 1000000;
    return Math.ceil(characterCount * costPerCharacter * 100) / 100;
  }

  private estimateDuration(text: string): number {
    // Estimation: ~150 words per minute
    const words = text.trim().split(/\s+/).length;
    return (words / 150) * 60; // Duration in seconds
  }

  private mapSsmlGender(ssmlGender?: string): 'male' | 'female' | 'neutral' {
    switch (ssmlGender) {
      case 'MALE':
        return 'male';
      case 'FEMALE':
        return 'female';
      default:
        return 'neutral';
    }
  }

  /**
   * Get Brazilian Portuguese voices optimized for NR content
   */
  async getBrazilianVoices(): Promise<TTSVoice[]> {
    const allVoices = await this.getAvailableVoices();
    
    // Filter voices specifically for Brazilian Portuguese
    const brazilianVoices = allVoices.filter(voice => 
      voice.language === 'pt-BR'
    );

    // If no Brazilian voices, use Portuguese voices
    if (brazilianVoices.length === 0) {
      const portugueseVoices = allVoices.filter(voice => 
        voice.language?.startsWith('pt-')
      );
      return portugueseVoices;
    }

    return brazilianVoices;
  }

  /**
   * Test voice with short text
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
   * Get available audio encodings
   */
  getAvailableEncodings(): string[] {
    return [
      'MP3',
      'OGG_OPUS',
      'WAV',
      'LINEAR16',
    ];
  }

  /**
   * Get supported languages for NR content
   */
  getSupportedLanguages(): string[] {
    return [
      'pt-BR', // Brazilian Portuguese
      'pt-PT', // European Portuguese
      'en-US', // US English
      'es-ES', // Spanish
    ];
  }
}