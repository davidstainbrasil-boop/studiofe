/**
 * 🎙️ ElevenLabs TTS Provider Real
 * Integração real com API do ElevenLabs para geração de áudio
 */

import { createLogger } from '@/lib/monitoring/logger';

const logger = createLogger('ElevenLabsProvider');

export interface TTSOptions {
  text: string;
  voice_id?: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  audioBuffer?: Buffer;
  duration?: number;
  error?: string;
}

export class ElevenLabsProvider {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Gera áudio usando ElevenLabs API
   */
  async generateSpeech(options: TTSOptions): Promise<TTSResponse> {
    try {
      logger.info('🎙️ Gerando TTS com ElevenLabs', {
        textLength: options.text.length,
        voiceId: options.voice_id || 'default'
      });

      // Voz padrão brasileira se não especificada
      const voiceId = options.voice_id || 'pFZP5JQG7iQjIQuC4Bku'; // Lily (Female, British)
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: options.text,
          model_id: options.model_id || 'eleven_multilingual_v2',
          voice_settings: options.voice_settings || {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Converter response para buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Calcular duração estimada (aproximadamente 150 WPM para português)
      const words = options.text.split(' ').length;
      const estimatedDuration = Math.ceil((words / 150) * 60); // em segundos

      logger.info('✅ TTS gerado com sucesso', {
        audioSize: `${(audioBuffer.length / 1024).toFixed(1)}KB`,
        estimatedDuration: `${estimatedDuration}s`
      });

      return {
        success: true,
        audioBuffer,
        duration: estimatedDuration
      };

    } catch (error) {
      logger.error('❌ Erro na geração TTS ElevenLabs', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Lista vozes disponíveis
   */
  async listVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices;

    } catch (error) {
      logger.error('❌ Erro ao listar vozes', error as Error);
      throw error;
    }
  }

  /**
   * Verifica saldo da conta
   */
  async getSubscriptionInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/user/subscription`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('❌ Erro ao verificar subscription', error as Error);
      throw error;
    }
  }
}