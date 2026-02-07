import ElevenLabs from 'elevenlabs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface VoiceConfig {
  voiceId: string;
  text: string;
  language: 'pt-BR' | 'en-US' | 'es-ES';
  model?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speaker_boost?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface AudioGenerationResult {
  success: boolean;
  audioPath?: string;
  audioUrl?: string;
  duration?: number;
  characters: number;
  error?: string;
  metadata?: {
    voiceId: string;
    model: string;
    generatedAt: string;
  };
}

export class ElevenLabsService {
  private apiKey: string;
  private client: any;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('ElevenLabs API key não configurada - usando modo de desenvolvimento');
    } else {
      this.client = new ElevenLabs({ apiKey: this.apiKey });
    }
  }

  /**
   * Gera áudio a partir do texto usando ElevenLabs
   */
  async generateAudio(config: VoiceConfig, outputPath?: string): Promise<AudioGenerationResult> {
    try {
      if (!this.apiKey) {
        return this.generateMockAudio(config, outputPath);
      }

      // Validar configuração
      const validation = this.validateVoiceConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          characters: config.text.length,
          error: `Configuração inválida: ${validation.errors.join(', ')}`,
        };
      }

      // Configurar diretório de saída
      if (!outputPath) {
        const tempDir = join(process.cwd(), 'temp', 'audio');
        if (!existsSync(tempDir)) {
          await mkdir(tempDir, { recursive: true });
        }
        const timestamp = Date.now();
        outputPath = join(tempDir, `audio_${timestamp}.mp3`);
      }

      // Gerar áudio com ElevenLabs
      const audio = await this.client.voices.generate({
        voice: config.voiceId,
        text: config.text,
        model_id: config.model || 'eleven_multilingual_v2',
        voice_settings: {
          stability: config.stability ?? 0.75,
          similarity_boost: config.similarity_boost ?? 0.75,
          style: config.style ?? 0.5,
          speaker_boost: config.speaker_boost ?? false,
        },
        pronounce_dictionary: null,
        seed: null,
      });

      // Salvar áudio
      const audioBuffer = Buffer.from(await audio.arrayBuffer());
      await writeFile(outputPath, audioBuffer);

      // Obter duração
      const duration = await this.getAudioDuration(outputPath);

      return {
        success: true,
        audioPath: outputPath,
        audioUrl: `/temp/audio/${outputPath.split('/').pop()}`,
        duration,
        characters: config.text.length,
        metadata: {
          voiceId: config.voiceId,
          model: config.model || 'eleven_multilingual_v2',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Erro na geração de áudio ElevenLabs:', error);
      return {
        success: false,
        characters: config.text.length,
        error: error.message || 'Erro desconhecido',
      };
    }
  }

  /**
   * Gera áudio mock para desenvolvimento/testes
   */
  private async generateMockAudio(
    config: VoiceConfig,
    outputPath?: string,
  ): Promise<AudioGenerationResult> {
    try {
      if (!outputPath) {
        const tempDir = join(process.cwd(), 'temp', 'audio');
        if (!existsSync(tempDir)) {
          await mkdir(tempDir, { recursive: true });
        }
        const timestamp = Date.now();
        outputPath = join(tempDir, `mock_audio_${timestamp}.mp3`);
      }

      // Gerar áudio silencioso com tom de teste
      await this.generateSilentAudio(config.text.length, outputPath);

      // Estimar duração baseado no texto
      const wordsPerMinute = 150;
      const words = config.text.split(' ').length;
      const estimatedDuration = (words / wordsPerMinute) * 60;

      return {
        success: true,
        audioPath: outputPath,
        audioUrl: `/temp/audio/${outputPath.split('/').pop()}`,
        duration: estimatedDuration,
        characters: config.text.length,
        metadata: {
          voiceId: config.voiceId,
          model: 'mock',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        characters: config.text.length,
        error: `Erro mock: ${error.message}`,
      };
    }
  }

  /**
   * Lista todas as vozes disponíveis
   */
  async getVoices(): Promise<any[]> {
    try {
      if (!this.apiKey) {
        return this.getMockVoices();
      }

      const voices = await this.client.voices.getAll();
      return voices;
    } catch (error) {
      console.error('Erro ao obter vozes:', error);
      return this.getMockVoices();
    }
  }

  /**
   * Obtém informações de uma voz específica
   */
  async getVoice(voiceId: string): Promise<any> {
    try {
      if (!this.apiKey) {
        const mockVoices = this.getMockVoices();
        return mockVoices.find((voice) => voice.voice_id === voiceId) || null;
      }

      const voice = await this.client.voices.get(voiceId);
      return voice;
    } catch (error) {
      console.error('Erro ao obter voz:', error);
      return null;
    }
  }

  /**
   * Valida configuração de voz
   */
  private validateVoiceConfig(config: VoiceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.text || config.text.trim().length === 0) {
      errors.push('Texto é obrigatório');
    }

    if (!config.voiceId) {
      errors.push('voiceId é obrigatório');
    }

    if (config.text.length > 5000) {
      errors.push('Texto muito longo (máximo 5000 caracteres)');
    }

    if (config.stability !== undefined && (config.stability < 0 || config.stability > 1)) {
      errors.push('stability deve estar entre 0 e 1');
    }

    if (
      config.similarity_boost !== undefined &&
      (config.similarity_boost < 0 || config.similarity_boost > 1)
    ) {
      errors.push('similarity_boost deve estar entre 0 e 1');
    }

    if (config.style !== undefined && (config.style < 0 || config.style > 1)) {
      errors.push('style deve estar entre 0 e 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gera áudio silencioso para testes
   */
  private async generateSilentAudio(textLength: number, outputPath: string): Promise<void> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      // Estimar duração baseada no texto (2 segundos + 0.1s por caractere)
      const duration = Math.max(2, textLength * 0.1);

      const ffmpeg = spawn('ffmpeg', [
        '-f',
        'lavfi',
        '-i',
        `anullsrc=r=44100:cl=mono`,
        '-t',
        duration.toString(),
        '-b:a',
        '192k',
        '-y',
        outputPath,
      ]);

      ffmpeg.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg falhou com código ${code}`));
        }
      });
    });
  }

  /**
   * Obtém duração do áudio
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      ffprobe.on('close', () => {
        const duration = parseFloat(output.trim());
        resolve(duration || 0);
      });

      ffprobe.on('error', reject);
    });
  }

  /**
   * Obtém vozes mock para desenvolvimento
   */
  private getMockVoices(): any[] {
    return [
      {
        voice_id: 'rachel',
        name: 'Rachel',
        category: 'female',
        description: 'Voz feminina profissional e clara',
        preview_url: '',
        language: 'pt-BR',
      },
      {
        voice_id: 'domi',
        name: 'Domi',
        category: 'female',
        description: 'Voz feminina amigável e casual',
        preview_url: '',
        language: 'pt-BR',
      },
      {
        voice_id: 'bella',
        name: 'Bella',
        category: 'female',
        description: 'Voz feminina suave e educada',
        preview_url: '',
        language: 'pt-BR',
      },
      {
        voice_id: 'adam',
        name: 'Adam',
        category: 'male',
        description: 'Voz masculina autoritária e clara',
        preview_url: '',
        language: 'pt-BR',
      },
      {
        voice_id: 'sam',
        name: 'Sam',
        category: 'male',
        description: 'Voz masculina amigável e natural',
        preview_url: '',
        language: 'pt-BR',
      },
      {
        voice_id: 'antoni',
        name: 'Antoni',
        category: 'male',
        description: 'Voz masculina profissional e confiante',
        preview_url: '',
        language: 'pt-BR',
      },
    ];
  }

  /**
   * Obtém vozes por idioma
   */
  async getVoicesByLanguage(language: string): Promise<any[]> {
    const allVoices = await this.getVoices();
    return allVoices.filter(
      (voice) => voice.language === language || voice.labels?.language?.includes(language),
    );
  }

  /**
   * Obtém vozes por categoria
   */
  async getVoicesByCategory(category: string): Promise<any[]> {
    const allVoices = await this.getVoices();
    return allVoices.filter((voice) => voice.category === category);
  }

  /**
   * Clona voz a partir de áudio (se disponível na API)
   */
  async cloneVoice(audioPath: string, name: string): Promise<any> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'API key não configurada',
        };
      }

      // Implementar clone de voz (se suportado)
      const result = await this.client.voices.add({
        name: name,
        files: [audioPath],
      });

      return {
        success: true,
        voice_id: result.voice_id,
        name: name,
      };
    } catch (error) {
      console.error('Erro ao clonar voz:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sincroniza texto com áudio (gera timestamps)
   */
  async syncTextWithAudio(audioPath: string, text: string): Promise<any> {
    try {
      // Usar Whisper ou similar para obter timestamps
      const { spawn } = require('child_process');
      const pythonScript = join(process.cwd(), 'scripts', 'sync_text_audio.py');

      return new Promise((resolve, reject) => {
        const process = spawn('python3', [
          pythonScript,
          '--audio',
          audioPath,
          '--text',
          text,
          '--output',
          'json',
        ]);

        let output = '';
        process.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        process.on('close', (code: number) => {
          if (code === 0) {
            try {
              const result = JSON.parse(output);
              resolve(result);
            } catch (e) {
              reject(new Error('Falha ao parsear resultado'));
            }
          } else {
            reject(new Error(`Processo falhou com código ${code}`));
          }
        });
      });
    } catch (error) {
      console.error('Erro no sync de texto e áudio:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Singleton instance
export const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;
