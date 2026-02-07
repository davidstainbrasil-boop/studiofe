/**
 * Audio Mixer - Mix background music with narration
 *
 * Features:
 * - Mix video audio with background music
 * - Audio ducking (lower music during narration)
 * - Volume normalization
 * - Fade in/out effects
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import { Logger } from '@lib/logger';

const execAsync = promisify(exec);
const logger = new Logger('audio-mixer');

// =============================================================================
// Types
// =============================================================================

export interface MixVideoWithMusicOptions {
  videoPath: string;
  musicPath: string;
  outputPath: string;
  musicVolume?: number; // 0-1, default 0.3
  duckingEnabled?: boolean;
  duckingLevel?: number; // Volume during ducking, 0-1, default 0.2
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
  loopMusic?: boolean;
}

export interface MixResult {
  success: boolean;
  outputPath?: string;
  duration?: number;
  error?: string;
}

export interface NormalizeOptions {
  inputPath: string;
  outputPath: string;
  targetLoudness?: number; // LUFS, default -16
  targetPeak?: number; // dB, default -1.5
}

export interface FadeOptions {
  inputPath: string;
  outputPath: string;
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
  duration?: number; // total duration (needed for fadeOut)
}

// =============================================================================
// Audio Mixer Class
// =============================================================================

export class AudioMixer {
  /**
   * Mix video audio with background music
   * Includes audio ducking - lowers music volume when narration is present
   */
  async mixVideoWithMusic(options: MixVideoWithMusicOptions): Promise<MixResult> {
    const {
      videoPath,
      musicPath,
      outputPath,
      musicVolume = 0.3,
      duckingEnabled = true,
      duckingLevel = 0.2,
      fadeIn = 2,
      fadeOut = 3,
      loopMusic = true,
    } = options;

    logger.info('Starting audio mix', {
      videoPath,
      musicPath,
      musicVolume,
      duckingEnabled,
      component: 'AudioMixer',
    });

    try {
      // Validate input files
      if (!existsSync(videoPath)) {
        throw new Error(`Vídeo não encontrado: ${videoPath}`);
      }

      // Get video duration
      const videoDuration = await this.getMediaDuration(videoPath);

      // Build FFmpeg filter complex
      let filterComplex: string;

      if (duckingEnabled) {
        // Advanced ducking using sidechaincompress
        // This automatically lowers music when voice is detected
        filterComplex = this.buildDuckingFilter({
          musicVolume,
          duckingLevel,
          fadeIn,
          fadeOut,
          videoDuration,
          loopMusic,
        });
      } else {
        // Simple mixing without ducking
        filterComplex = this.buildSimpleMixFilter({
          musicVolume,
          fadeIn,
          fadeOut,
          videoDuration,
          loopMusic,
        });
      }

      // Check if music file exists, if not use URL directly
      const musicInput = existsSync(musicPath)
        ? `"${musicPath}"`
        : musicPath.startsWith('/')
          ? `"${join(process.cwd(), 'public', musicPath)}"`
          : `"${musicPath}"`;

      // Build FFmpeg command
      const command = `ffmpeg -y -i "${videoPath}" -i ${musicInput} -filter_complex "${filterComplex}" -map "[v]" -map "[aout]" -c:v copy -c:a aac -b:a 192k "${outputPath}"`;

      logger.debug('FFmpeg command', { command, component: 'AudioMixer' });

      // Execute FFmpeg
      await execAsync(command, {
        timeout: 600000, // 10 minutes max
      });

      // Verify output
      if (!existsSync(outputPath)) {
        throw new Error('Arquivo de saída não foi gerado');
      }

      const duration = await this.getMediaDuration(outputPath);

      logger.info('Audio mix completed', {
        outputPath,
        duration,
        component: 'AudioMixer',
      });

      return {
        success: true,
        outputPath,
        duration,
      };
    } catch (error) {
      logger.error('Audio mix failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'AudioMixer',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Normalize audio volume using loudnorm filter
   */
  async normalizeVolume(options: NormalizeOptions): Promise<MixResult> {
    const {
      inputPath,
      outputPath,
      targetLoudness = -16,
      targetPeak = -1.5,
    } = options;

    try {
      if (!existsSync(inputPath)) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      // Use loudnorm filter for EBU R128 normalization
      const command = `ffmpeg -y -i "${inputPath}" -af "loudnorm=I=${targetLoudness}:TP=${targetPeak}:LRA=11" -c:v copy -c:a aac -b:a 192k "${outputPath}"`;

      await execAsync(command, { timeout: 300000 });

      if (!existsSync(outputPath)) {
        throw new Error('Arquivo normalizado não foi gerado');
      }

      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Apply fade in/out to audio
   */
  async fadeInOut(options: FadeOptions): Promise<MixResult> {
    const {
      inputPath,
      outputPath,
      fadeIn = 0,
      fadeOut = 0,
    } = options;

    try {
      if (!existsSync(inputPath)) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      let duration = options.duration;
      if (!duration) {
        duration = await this.getMediaDuration(inputPath);
      }

      const filters: string[] = [];

      if (fadeIn > 0) {
        filters.push(`afade=t=in:st=0:d=${fadeIn}`);
      }

      if (fadeOut > 0 && duration > fadeOut) {
        const fadeOutStart = duration - fadeOut;
        filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOut}`);
      }

      if (filters.length === 0) {
        // No fades needed, just copy
        const copyCommand = `cp "${inputPath}" "${outputPath}"`;
        await execAsync(copyCommand);
        return { success: true, outputPath };
      }

      const filterString = filters.join(',');
      const command = `ffmpeg -y -i "${inputPath}" -af "${filterString}" -c:v copy "${outputPath}"`;

      await execAsync(command, { timeout: 300000 });

      if (!existsSync(outputPath)) {
        throw new Error('Arquivo com fade não foi gerado');
      }

      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Mix multiple audio files together
   */
  async mixAudioFiles(options: {
    inputPaths: string[];
    outputPath: string;
    volumes?: number[]; // Volume for each input, 0-1
  }): Promise<MixResult> {
    const { inputPaths, outputPath, volumes } = options;

    try {
      if (inputPaths.length === 0) {
        throw new Error('Nenhum arquivo de áudio fornecido');
      }

      // Build input arguments
      const inputs = inputPaths.map((p) => `-i "${p}"`).join(' ');

      // Build amix filter
      const adjustedVolumes = volumes || inputPaths.map(() => 1);
      const volumeFilters = inputPaths
        .map((_, i) => `[${i}:a]volume=${adjustedVolumes[i]}[a${i}]`)
        .join(';');

      const mixInputs = inputPaths.map((_, i) => `[a${i}]`).join('');
      const mixFilter = `${mixInputs}amix=inputs=${inputPaths.length}:duration=longest[aout]`;

      const filterComplex = `${volumeFilters};${mixFilter}`;

      const command = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[aout]" -c:a aac -b:a 192k "${outputPath}"`;

      await execAsync(command, { timeout: 300000 });

      if (!existsSync(outputPath)) {
        throw new Error('Arquivo mixado não foi gerado');
      }

      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Build FFmpeg filter for audio ducking
   */
  private buildDuckingFilter(options: {
    musicVolume: number;
    duckingLevel: number;
    fadeIn: number;
    fadeOut: number;
    videoDuration: number;
    loopMusic: boolean;
  }): string {
    const { musicVolume, duckingLevel, fadeIn, fadeOut, videoDuration, loopMusic } = options;

    // Calculate fade out start time
    const fadeOutStart = Math.max(0, videoDuration - fadeOut);

    // Music processing chain:
    // 1. Loop if needed
    // 2. Trim to video duration
    // 3. Apply fade in/out
    // 4. Apply base volume
    const musicLoopFilter = loopMusic ? `aloop=loop=-1:size=2e+09,` : '';
    const musicChain = `[1:a]${musicLoopFilter}atrim=0:${videoDuration},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},volume=${musicVolume}[music]`;

    // Voice from video
    const voiceChain = `[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice]`;

    // Sidechain compression: duck music when voice is present
    // threshold: when voice is above this level, compression kicks in
    // ratio: amount of compression
    // attack/release: how fast the ducking responds
    const sidechainFilter = `[music][voice]sidechaincompress=threshold=0.03:ratio=10:attack=50:release=500:level_sc=1,volume=${duckingLevel}[duckedmusic]`;

    // Final mix
    const mixFilter = `[voice][duckedmusic]amix=inputs=2:duration=first:weights=1 0.5[aout]`;

    // Video pass-through
    const videoFilter = `[0:v]copy[v]`;

    return `${musicChain};${voiceChain};${sidechainFilter};${mixFilter};${videoFilter}`;
  }

  /**
   * Build simple mix filter without ducking
   */
  private buildSimpleMixFilter(options: {
    musicVolume: number;
    fadeIn: number;
    fadeOut: number;
    videoDuration: number;
    loopMusic: boolean;
  }): string {
    const { musicVolume, fadeIn, fadeOut, videoDuration, loopMusic } = options;

    const fadeOutStart = Math.max(0, videoDuration - fadeOut);

    const musicLoopFilter = loopMusic ? `aloop=loop=-1:size=2e+09,` : '';
    const musicChain = `[1:a]${musicLoopFilter}atrim=0:${videoDuration},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},volume=${musicVolume}[music]`;

    const voiceChain = `[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice]`;

    const mixFilter = `[voice][music]amix=inputs=2:duration=first:weights=1 0.3[aout]`;

    const videoFilter = `[0:v]copy[v]`;

    return `${musicChain};${voiceChain};${mixFilter};${videoFilter}`;
  }

  /**
   * Get media duration using ffprobe
   */
  private async getMediaDuration(path: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path}"`
      );
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Detect if audio has voice/speech
   */
  async detectVoicePresence(audioPath: string): Promise<boolean> {
    try {
      // Use silencedetect to check for non-silent segments
      const { stdout } = await execAsync(
        `ffmpeg -i "${audioPath}" -af silencedetect=n=-30dB:d=0.5 -f null - 2>&1 | grep silence_end`
      );
      return stdout.length > 0;
    } catch {
      return true; // Assume voice if detection fails
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let mixerInstance: AudioMixer | null = null;

export function getAudioMixer(): AudioMixer {
  if (!mixerInstance) {
    mixerInstance = new AudioMixer();
  }
  return mixerInstance;
}

export default AudioMixer;
