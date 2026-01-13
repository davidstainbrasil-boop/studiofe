/**
 * Voice Cloning
 * Sistema de clonagem de voz com IA (ElevenLabs Implementation)
 */

import { logger } from '@lib/logger';
import { ElevenLabsProvider } from '@lib/tts/providers/elevenlabs';

// Configuração do Provider (deve vir de var de ambiente)
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const elevenLabs = new ElevenLabsProvider({ apiKey: ELEVENLABS_API_KEY });

export interface VoiceProfile {
  id: string;
  name: string;
  sampleAudioPath: string; // URL ou path do sample original
  characteristics: {
    pitch: number;
    speed: number;
    timbre: string;
  };
  // Added for compatibility with route
  voiceId?: string;
  status?: 'ready' | 'pending' | 'failed';
  qualityScore?: number;
}

export interface CloneOptions {
  profileId: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited';
  speed?: number;
}

export interface TrainVoiceOptions {
  name: string;
  description?: string;
  samples: File[] | Buffer[];
  userId?: string;
}

export class VoiceCloning {
  /**
   * Cria um perfil de voz clonada na ElevenLabs (Instant Voice Cloning)
   */
  async createProfile(name: string, audioSamples: Buffer[]): Promise<VoiceProfile> {
    logger.info('Creating voice profile on ElevenLabs', { component: 'VoiceCloning', name });
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    try {
      // 1. Preparar FormData para ElevenLabs API
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', 'Voice cloned via Estudio IA Videos');
      
      // Anexar samples
      audioSamples.forEach((buffer, index) => {
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        formData.append('files', blob, `sample_${index}.mp3`);
      });

      // 2. Chamar API ElevenLabs (POST /v1/voices/add)
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          // Note: Content-Type is auto-set by fetch when using FormData
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`ElevenLabs API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const voiceId = data.voice_id;
      
      logger.info('Voice created successfully', { component: 'VoiceCloning', voiceId });

      return {
        id: voiceId,
        name,
        sampleAudioPath: '', // Não armazenamos o sample localmente por enquanto
        characteristics: {
          pitch: 1.0,
          speed: 1.0,
          timbre: 'cloned', // Timbre é definido pela clonagem
        },
        voiceId: voiceId,
        status: 'ready',
        qualityScore: 1.0 // Assumindo sucesso, score alto
      };

    } catch (error) {
      logger.error('Failed to create voice clone', error, { component: 'VoiceCloning' });
      throw error;
    }
  }
  
  /**
   * Sintetiza áudio usando uma voz clonada
   */
  async synthesize(options: CloneOptions): Promise<Buffer> {
    logger.info('Synthesizing voice', { component: 'VoiceCloning', options });

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    try {
      // Usar o provider existente para síntese
      const result = await elevenLabs.textToSpeech({
        text: options.text,
        voiceId: options.profileId, // profileId é o voiceId da ElevenLabs
        stability: 0.5,
        similarityBoost: 0.75,
        style: options.emotion === 'happy' ? 0.8 : 0, // Mapeamento básico de estilo
      });

      return result.audio;
    } catch (error) {
      logger.error('Synthesis failed', error, { component: 'VoiceCloning' });
      throw error;
    }
  }
  
  async listProfiles(): Promise<VoiceProfile[]> {
    try {
      if (!ELEVENLABS_API_KEY) return [];
      
      const voices = await elevenLabs.getVoices();
      // Filtrar apenas vozes clonadas se possível, ou retornar todas
      return voices.filter(v => v.category === 'cloned').map(v => ({
        id: v.voiceId,
        voiceId: v.voiceId,
        name: v.name,
        sampleAudioPath: v.previewUrl || '',
        characteristics: { pitch: 1, speed: 1, timbre: 'cloned' },
        status: 'ready',
        qualityScore: 1
      }));
    } catch (error) {
      logger.error('Failed to list profiles', error, { component: 'VoiceCloning' });
      return [];
    }
  }
}

export const voiceCloning = new VoiceCloning();

/**
 * Train a new voice model from audio samples
 * AGORA REAL: Chama a API da ElevenLabs
 */
export async function trainVoice(options: TrainVoiceOptions): Promise<VoiceProfile> {
  logger.info('Starting training (Real ElevenLabs)', { component: 'VoiceCloning', name: options.name });
  
  const buffers: Buffer[] = [];
  for (const sample of options.samples) {
    if (sample instanceof File) {
      const arrayBuffer = await sample.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    } else {
      buffers.push(sample);
    }
  }
  
  // Chama a implementação real
  return await voiceCloning.createProfile(options.name, buffers);
}
