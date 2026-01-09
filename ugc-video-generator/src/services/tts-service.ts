/**
 * 🎙️ TTS Service - Text-to-Speech
 * Converte texto em áudio narrado usando Edge TTS (grátis)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuid } from 'uuid';

const execAsync = promisify(exec);

// ============================================
// TIPOS
// ============================================

export interface TTSOptions {
  text: string;
  voice?: string;
  rate?: string;    // ex: "+10%" ou "-20%"
  pitch?: string;   // ex: "+5Hz" ou "-10Hz"
  volume?: string;  // ex: "+50%" ou "-30%"
  outputPath?: string;
}

export interface TTSResult {
  success: boolean;
  audioPath: string;
  duration: number; // segundos
  text: string;
  voice: string;
  error?: string;
}

export interface VoiceInfo {
  name: string;
  shortName: string;
  gender: 'Male' | 'Female';
  locale: string;
}

// ============================================
// VOZES DISPONÍVEIS (PT-BR)
// ============================================

export const BRAZILIAN_VOICES: VoiceInfo[] = [
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, FranciscaNeural)', shortName: 'pt-BR-FranciscaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, AntonioNeural)', shortName: 'pt-BR-AntonioNeural', gender: 'Male', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, BrendaNeural)', shortName: 'pt-BR-BrendaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, DonatoNeural)', shortName: 'pt-BR-DonatoNeural', gender: 'Male', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, ElzaNeural)', shortName: 'pt-BR-ElzaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, FabioNeural)', shortName: 'pt-BR-FabioNeural', gender: 'Male', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, GiovannaNeural)', shortName: 'pt-BR-GiovannaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, HumbertoNeural)', shortName: 'pt-BR-HumbertoNeural', gender: 'Male', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, JulioNeural)', shortName: 'pt-BR-JulioNeural', gender: 'Male', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, LeilaNeural)', shortName: 'pt-BR-LeilaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, LeticiaNeural)', shortName: 'pt-BR-LeticiaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, ManuelaNeural)', shortName: 'pt-BR-ManuelaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, NicolauNeural)', shortName: 'pt-BR-NicolauNeural', gender: 'Male', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, ThalitaNeural)', shortName: 'pt-BR-ThalitaNeural', gender: 'Female', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, ValerioNeural)', shortName: 'pt-BR-ValerioNeural', gender: 'Male', locale: 'pt-BR' },
  { name: 'Microsoft Server Speech Text to Speech Voice (pt-BR, YaraNeural)', shortName: 'pt-BR-YaraNeural', gender: 'Female', locale: 'pt-BR' },
];

// Vozes recomendadas para UGC
export const RECOMMENDED_VOICES = {
  female_energetic: 'pt-BR-FranciscaNeural',  // Mais usada, energética
  female_calm: 'pt-BR-LeticiaNeural',          // Calma, profissional
  female_young: 'pt-BR-ThalitaNeural',         // Jovem, dinâmica
  male_confident: 'pt-BR-AntonioNeural',       // Confiante, vendedor
  male_friendly: 'pt-BR-FabioNeural',          // Amigável, casual
};

// ============================================
// TTS SERVICE
// ============================================

export class TTSService {
  private tempDir: string;
  private defaultVoice: string;

  constructor(options?: { tempDir?: string; defaultVoice?: string }) {
    this.tempDir = options?.tempDir || './temp/audio';
    this.defaultVoice = options?.defaultVoice || RECOMMENDED_VOICES.female_energetic;
  }

  /**
   * Inicializar diretório temporário
   */
  async init(): Promise<void> {
    await fs.ensureDir(this.tempDir);
  }

  /**
   * Gerar áudio a partir de texto
   */
  async generateAudio(options: TTSOptions): Promise<TTSResult> {
    const {
      text,
      voice = this.defaultVoice,
      rate = '+0%',
      pitch = '+0Hz',
      volume = '+0%',
    } = options;

    // Gerar nome de arquivo único
    const filename = `tts_${uuid().substring(0, 8)}.mp3`;
    const outputPath = options.outputPath || path.join(this.tempDir, filename);

    // Garantir diretório existe
    await fs.ensureDir(path.dirname(outputPath));

    try {
      // Escapar texto para linha de comando
      const escapedText = this.escapeText(text);

      // Construir comando edge-tts
      const command = this.buildCommand({
        text: escapedText,
        voice,
        rate,
        pitch,
        volume,
        outputPath,
      });

      console.log(`🎙️ Gerando áudio: "${text.substring(0, 50)}..."`);

      // Executar edge-tts
      await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

      // Verificar se arquivo foi criado
      if (!await fs.pathExists(outputPath)) {
        throw new Error('Arquivo de áudio não foi gerado');
      }

      // Obter duração do áudio
      const duration = await this.getAudioDuration(outputPath);

      console.log(`✅ Áudio gerado: ${path.basename(outputPath)} (${duration.toFixed(2)}s)`);

      return {
        success: true,
        audioPath: outputPath,
        duration,
        text,
        voice,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`❌ Erro ao gerar áudio: ${errorMsg}`);

      return {
        success: false,
        audioPath: '',
        duration: 0,
        text,
        voice,
        error: errorMsg,
      };
    }
  }

  /**
   * Gerar áudio para múltiplas cenas
   */
  async generateBatch(
    scenes: Array<{ id: string; text: string }>,
    voice?: string
  ): Promise<Map<string, TTSResult>> {
    const results = new Map<string, TTSResult>();

    for (const scene of scenes) {
      const result = await this.generateAudio({
        text: scene.text,
        voice,
        outputPath: path.join(this.tempDir, `${scene.id}.mp3`),
      });
      results.set(scene.id, result);
    }

    return results;
  }

  /**
   * Construir comando edge-tts
   */
  private buildCommand(options: {
    text: string;
    voice: string;
    rate: string;
    pitch: string;
    volume: string;
    outputPath: string;
  }): string {
    const { text, voice, rate, pitch, volume, outputPath } = options;

    // edge-tts usa Python, então chamamos via comando
    const args = [
      'edge-tts',
      `--voice "${voice}"`,
      `--rate="${rate}"`,
      `--pitch="${pitch}"`,
      `--volume="${volume}"`,
      `--text "${text}"`,
      `--write-media "${outputPath}"`,
    ];

    return args.join(' ');
  }

  /**
   * Escapar texto para uso em linha de comando
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`')
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * Obter duração do áudio usando ffprobe
   */
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      return parseFloat(stdout.trim()) || 0;
    } catch {
      // Fallback: estimar baseado no tamanho do arquivo
      // MP3 ~16KB/segundo para qualidade padrão
      const stats = await fs.stat(filePath);
      return stats.size / 16000;
    }
  }

  /**
   * Verificar se edge-tts está instalado
   */
  async checkInstallation(): Promise<boolean> {
    try {
      await execAsync('edge-tts --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Listar vozes disponíveis
   */
  async listVoices(locale?: string): Promise<VoiceInfo[]> {
    if (locale === 'pt-BR' || !locale) {
      return BRAZILIAN_VOICES;
    }
    
    // Para outros locales, executar edge-tts --list-voices
    try {
      const { stdout } = await execAsync('edge-tts --list-voices');
      // Parse output... (simplificado)
      return BRAZILIAN_VOICES;
    } catch {
      return BRAZILIAN_VOICES;
    }
  }

  /**
   * Limpar arquivos temporários
   */
  async cleanup(): Promise<void> {
    if (await fs.pathExists(this.tempDir)) {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          await fs.remove(path.join(this.tempDir, file));
        }
      }
    }
  }
}

// Singleton export
export const ttsService = new TTSService();

// ============================================
// INSTALAÇÃO DO EDGE-TTS
// ============================================
/*
Para instalar edge-tts (requer Python 3.8+):

pip install edge-tts

Ou com pipx (recomendado):

pipx install edge-tts

Testar:

edge-tts --text "Olá, isso é um teste" --write-media test.mp3 --voice pt-BR-FranciscaNeural
*/
