/**
 * Edge TTS Service - Síntese de voz real usando Microsoft Edge TTS
 * Vozes brasileiras de alta qualidade GRATUITAS
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

// Diretório para armazenar arquivos de áudio
const AUDIO_DIR = join(process.cwd(), 'public', 'audio');

// Garantir que o diretório existe
if (!existsSync(AUDIO_DIR)) {
  mkdirSync(AUDIO_DIR, { recursive: true });
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string;
  locale: string;
}

export interface TTSOptions {
  text: string;
  voice?: string;
  rate?: string;  // +0%, -10%, +20%
  volume?: string;
  pitch?: string;
}

export interface TTSResult {
  success: boolean;
  fileUrl: string;
  filePath: string;
  duration: number;
  voice: string;
  format: string;
  fileSize: number;
  error?: string;
}

// Vozes disponíveis em Português Brasileiro
export const BRAZILIAN_VOICES: Voice[] = [
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', gender: 'female', language: 'Português', locale: 'pt-BR' },
  { id: 'pt-BR-AntonioNeural', name: 'Antonio', gender: 'male', language: 'Português', locale: 'pt-BR' },
  { id: 'pt-BR-ThalitaMultilingualNeural', name: 'Thalita', gender: 'female', language: 'Português', locale: 'pt-BR' },
];

// Vozes adicionais em outros idiomas
export const ALL_VOICES: Voice[] = [
  ...BRAZILIAN_VOICES,
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', language: 'English', locale: 'en-US' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', language: 'English', locale: 'en-US' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira', gender: 'female', language: 'Español', locale: 'es-ES' },
];

/**
 * Sintetiza texto para áudio usando Edge TTS
 */
export async function synthesize(options: TTSOptions): Promise<TTSResult> {
  const {
    text,
    voice = 'pt-BR-FranciscaNeural',
    rate = '+0%',
    volume = '+0%',
    pitch = '+0Hz',
  } = options;

  if (!text || text.trim().length === 0) {
    return {
      success: false,
      fileUrl: '',
      filePath: '',
      duration: 0,
      voice,
      format: 'mp3',
      fileSize: 0,
      error: 'Text is required',
    };
  }

  const fileId = randomUUID();
  const fileName = `${fileId}.mp3`;
  const filePath = join(AUDIO_DIR, fileName);
  const fileUrl = `/audio/${fileName}`;

  try {
    // Escapar aspas no texto
    const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
    
    // Construir comando edge-tts
    let command = `edge-tts --voice "${voice}" --text "${escapedText}" --write-media "${filePath}"`;
    
    // Adicionar parâmetros opcionais
    if (rate !== '+0%') {
      command += ` --rate="${rate}"`;
    }
    if (volume !== '+0%') {
      command += ` --volume="${volume}"`;
    }
    if (pitch !== '+0Hz') {
      command += ` --pitch="${pitch}"`;
    }

    // Executar edge-tts
    await execAsync(command, { timeout: 60000 });

    // Verificar se arquivo foi criado
    if (!existsSync(filePath)) {
      throw new Error('Audio file was not created');
    }

    // Obter tamanho do arquivo
    const stats = statSync(filePath);
    const fileSize = stats.size;

    // Estimar duração baseado no tamanho (aproximado para MP3)
    // MP3 a 128kbps ≈ 16KB por segundo
    const estimatedDuration = Math.ceil(fileSize / 16000);

    // Calcular duração mais precisa baseado no texto
    const words = text.trim().split(/\s+/).length;
    const wordsPerMinute = 150;
    const calculatedDuration = Math.max(1, Math.round((words / wordsPerMinute) * 60));

    // Usar o maior valor entre estimativa e cálculo
    const duration = Math.max(estimatedDuration, calculatedDuration);

    return {
      success: true,
      fileUrl,
      filePath,
      duration,
      voice,
      format: 'mp3',
      fileSize,
    };
  } catch (error) {
    console.error('Edge TTS Error:', error);
    return {
      success: false,
      fileUrl: '',
      filePath: '',
      duration: 0,
      voice,
      format: 'mp3',
      fileSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sintetiza múltiplos textos em batch
 */
export async function synthesizeBatch(
  texts: Array<{ id: string; text: string; voice?: string }>
): Promise<Map<string, TTSResult>> {
  const results = new Map<string, TTSResult>();

  // Processar em paralelo (máximo 5 simultâneos)
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const promises = batch.map(async ({ id, text, voice }) => {
      const result = await synthesize({ text, voice });
      results.set(id, result);
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * Lista vozes disponíveis
 */
export async function listVoices(locale?: string): Promise<Voice[]> {
  if (locale) {
    return ALL_VOICES.filter(v => v.locale === locale);
  }
  return ALL_VOICES;
}

/**
 * Obtém vozes brasileiras
 */
export function getBrazilianVoices(): Voice[] {
  return BRAZILIAN_VOICES;
}

/**
 * Estima duração do áudio baseado no texto
 */
export function estimateDuration(text: string, wordsPerMinute = 150): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / wordsPerMinute) * 60));
}

// Exportar como serviço
export const EdgeTTSService = {
  synthesize,
  synthesizeBatch,
  listVoices,
  getBrazilianVoices,
  estimateDuration,
  BRAZILIAN_VOICES,
  ALL_VOICES,
};

export default EdgeTTSService;

