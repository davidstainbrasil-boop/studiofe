/**
 * SRT Subtitle Generator
 * Gera arquivos de legenda no formato SRT
 */

import { writeFile, mkdir } from 'fs/promises';
import { logger } from '@/lib/logger';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const SUBTITLES_DIR = join(process.cwd(), 'public', 'subtitles');

// Garantir diretório existe
async function ensureDirectory() {
  if (!existsSync(SUBTITLES_DIR)) {
    await mkdir(SUBTITLES_DIR, { recursive: true });
  }
}

export interface SubtitleSegment {
  id?: number;
  startTime: number; // em segundos
  endTime: number;   // em segundos
  text: string;
}

export interface SRTGeneratorResult {
  success: boolean;
  srtUrl?: string;
  srtPath?: string;
  vttUrl?: string;
  segmentCount?: number;
  error?: string;
}

/**
 * Formata segundos para o formato SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Formata segundos para o formato VTT (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Gera conteúdo SRT
 */
export function generateSRTContent(segments: SubtitleSegment[]): string {
  return segments
    .map((segment, index) => {
      const id = segment.id || index + 1;
      const start = formatSRTTime(segment.startTime);
      const end = formatSRTTime(segment.endTime);
      return `${id}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');
}

/**
 * Gera conteúdo VTT (WebVTT)
 */
export function generateVTTContent(segments: SubtitleSegment[]): string {
  const header = 'WEBVTT\n\n';
  const content = segments
    .map((segment, index) => {
      const id = segment.id || index + 1;
      const start = formatVTTTime(segment.startTime);
      const end = formatVTTTime(segment.endTime);
      return `${id}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');
  return header + content;
}

/**
 * Divide texto em segmentos de legenda
 */
export function splitTextIntoSegments(
  text: string,
  startTime: number,
  duration: number,
  maxCharsPerSegment: number = 80,
  maxWordsPerSegment: number = 12
): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return segments;

  const wordsPerSecond = words.length / duration;
  let currentSegment: string[] = [];
  let currentCharCount = 0;
  let segmentStartTime = startTime;
  let wordIndex = 0;

  for (const word of words) {
    const willExceedChars = currentCharCount + word.length + 1 > maxCharsPerSegment;
    const willExceedWords = currentSegment.length >= maxWordsPerSegment;

    if ((willExceedChars || willExceedWords) && currentSegment.length > 0) {
      // Calcular tempo do segmento
      const segmentDuration = currentSegment.length / wordsPerSecond;
      const segmentEndTime = segmentStartTime + segmentDuration;

      segments.push({
        startTime: segmentStartTime,
        endTime: segmentEndTime,
        text: currentSegment.join(' '),
      });

      segmentStartTime = segmentEndTime;
      currentSegment = [];
      currentCharCount = 0;
    }

    currentSegment.push(word);
    currentCharCount += word.length + 1;
    wordIndex++;
  }

  // Último segmento
  if (currentSegment.length > 0) {
    segments.push({
      startTime: segmentStartTime,
      endTime: startTime + duration,
      text: currentSegment.join(' '),
    });
  }

  return segments;
}

/**
 * Gera legendas a partir de slides
 */
export async function generateSubtitlesFromSlides(
  slides: Array<{
    id: string;
    text: string;
    duration: number;
  }>,
  projectId?: string
): Promise<SRTGeneratorResult> {
  await ensureDirectory();

  try {
    const segments: SubtitleSegment[] = [];
    let currentTime = 0;

    for (const slide of slides) {
      if (slide.text && slide.text.trim().length > 0) {
        const slideSegments = splitTextIntoSegments(
          slide.text,
          currentTime,
          slide.duration
        );
        segments.push(...slideSegments);
      }
      currentTime += slide.duration;
    }

    if (segments.length === 0) {
      return { success: false, error: 'Nenhum texto para gerar legendas' };
    }

    // Gerar arquivos
    const fileId = projectId || randomUUID();
    const srtFileName = `${fileId}.srt`;
    const vttFileName = `${fileId}.vtt`;
    const srtPath = join(SUBTITLES_DIR, srtFileName);
    const vttPath = join(SUBTITLES_DIR, vttFileName);

    const srtContent = generateSRTContent(segments);
    const vttContent = generateVTTContent(segments);

    await writeFile(srtPath, srtContent, 'utf-8');
    await writeFile(vttPath, vttContent, 'utf-8');

    return {
      success: true,
      srtUrl: `/subtitles/${srtFileName}`,
      srtPath,
      vttUrl: `/subtitles/${vttFileName}`,
      segmentCount: segments.length,
    };
  } catch (error) {
    logger.error('[SRT Generator] Erro:', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Gera legendas a partir de texto simples
 */
export async function generateSubtitlesFromText(
  text: string,
  duration: number,
  projectId?: string
): Promise<SRTGeneratorResult> {
  await ensureDirectory();

  try {
    const segments = splitTextIntoSegments(text, 0, duration);

    if (segments.length === 0) {
      return { success: false, error: 'Nenhum texto para gerar legendas' };
    }

    const fileId = projectId || randomUUID();
    const srtFileName = `${fileId}.srt`;
    const vttFileName = `${fileId}.vtt`;
    const srtPath = join(SUBTITLES_DIR, srtFileName);
    const vttPath = join(SUBTITLES_DIR, vttFileName);

    const srtContent = generateSRTContent(segments);
    const vttContent = generateVTTContent(segments);

    await writeFile(srtPath, srtContent, 'utf-8');
    await writeFile(vttPath, vttContent, 'utf-8');

    return {
      success: true,
      srtUrl: `/subtitles/${srtFileName}`,
      srtPath,
      vttUrl: `/subtitles/${vttFileName}`,
      segmentCount: segments.length,
    };
  } catch (error) {
    logger.error('[SRT Generator] Erro:', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Exportar serviço
export const SRTGenerator = {
  generateFromSlides: generateSubtitlesFromSlides,
  generateFromText: generateSubtitlesFromText,
  generateSRTContent,
  generateVTTContent,
  splitTextIntoSegments,
};

export default SRTGenerator;

