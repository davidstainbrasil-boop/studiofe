/**
 * 🎤 PPTX TTS Sync Service
 *
 * Generates TTS audio from speaker notes and measures real audio duration
 * for precise slide timing synchronization.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateTTSAudio } from '@lib/elevenlabs-service';
import { logger } from '@lib/logger';
import type { UniversalSlide } from './parsers/element-parser';

const execAsync = promisify(exec);

export interface TTSSyncOptions {
  voiceId?: string;
  modelId?: string;
  language?: string;
  outputDir?: string;
}

export interface SlideAudioData {
  slideNumber: number;
  audioPath: string;
  audioUrl?: string;
  durationMs: number;
  durationSeconds: number;
  transcript: string;
}

export interface TTSSyncResult {
  success: boolean;
  slides: SlideAudioData[];
  totalDurationMs: number;
  errors: string[];
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    );
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error('Failed to parse duration from ffprobe output');
    }
    return duration;
  } catch (error) {
    logger.warn('ffprobe failed, falling back to estimate', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fallback: estimate from file size (MP3 at 128kbps = ~16KB/s)
    const stats = await fs.promises.stat(filePath);
    return stats.size / 16000;
  }
}

/**
 * Generate TTS audio for speaker notes and get real duration
 */
export async function generateSlideAudio(
  notes: string,
  slideNumber: number,
  options: TTSSyncOptions = {},
): Promise<SlideAudioData | null> {
  if (!notes || notes.trim().length === 0) {
    return null;
  }

  const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const tempDir = options.outputDir || path.join(os.tmpdir(), 'pptx-tts');

  try {
    // Ensure temp directory exists
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Generate TTS audio
    const audioBuffer = await generateTTSAudio(notes, voiceId, options.modelId);

    // Save to temp file
    const audioPath = path.join(tempDir, `slide-${slideNumber}-${Date.now()}.mp3`);
    await fs.promises.writeFile(audioPath, Buffer.from(audioBuffer));

    // Get real duration using ffprobe
    const durationSeconds = await getAudioDuration(audioPath);
    const durationMs = Math.round(durationSeconds * 1000);

    logger.info(`Generated TTS for slide ${slideNumber}`, {
      component: 'PPTXTTSSync',
      durationMs,
      textLength: notes.length,
    });

    return {
      slideNumber,
      audioPath,
      durationMs,
      durationSeconds,
      transcript: notes,
    };
  } catch (error) {
    logger.error(
      `Failed to generate TTS for slide ${slideNumber}`,
      error instanceof Error ? error : new Error(String(error)),
      { component: 'PPTXTTSSync' },
    );
    return null;
  }
}

/**
 * Generate TTS for all slides with notes and sync durations
 */
export async function syncSlidesWithTTS(
  slides: UniversalSlide[],
  options: TTSSyncOptions = {},
): Promise<TTSSyncResult> {
  const errors: string[] = [];
  const slideAudioData: SlideAudioData[] = [];
  let totalDurationMs = 0;

  // Process slides sequentially to avoid rate limits
  for (const slide of slides) {
    if (!slide.notes || slide.notes.trim().length === 0) {
      // No notes, keep original duration
      continue;
    }

    const audioData = await generateSlideAudio(slide.notes, slide.slideNumber, options);

    if (audioData) {
      slideAudioData.push(audioData);
      totalDurationMs += audioData.durationMs;

      // Update slide duration to match audio (plus small buffer)
      slide.duration = audioData.durationSeconds + 0.5; // 0.5s buffer
    } else {
      errors.push(`Failed to generate TTS for slide ${slide.slideNumber}`);
    }
  }

  return {
    success: errors.length === 0,
    slides: slideAudioData,
    totalDurationMs,
    errors,
  };
}

/**
 * Apply TTS audio to UniversalSlide data
 * Returns updated slides with accurate durations and audio paths
 */
export async function applyTTSToPresentation(
  slides: UniversalSlide[],
  options: TTSSyncOptions = {},
): Promise<{ slides: UniversalSlide[]; audioData: SlideAudioData[] }> {
  const syncResult = await syncSlidesWithTTS(slides, options);

  // Map audio data back to slides
  for (const audioData of syncResult.slides) {
    const slide = slides.find((s) => s.slideNumber === audioData.slideNumber);
    if (slide) {
      // Update duration to match audio (plus small buffer)
      slide.duration = audioData.durationSeconds + 0.5;

      // Set audio reference for Remotion
      slide.audio = {
        src: audioData.audioPath,
        duration: audioData.durationSeconds,
      };
    }
  }

  if (syncResult.errors.length > 0) {
    logger.warn('Some TTS generation errors occurred', {
      component: 'PPTXTTSSync',
      errors: syncResult.errors,
    });
  }

  return {
    slides,
    audioData: syncResult.slides,
  };
}

/**
 * Clean up temp audio files
 */
export async function cleanupTempAudio(audioData: SlideAudioData[]): Promise<void> {
  for (const data of audioData) {
    try {
      await fs.promises.unlink(data.audioPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
