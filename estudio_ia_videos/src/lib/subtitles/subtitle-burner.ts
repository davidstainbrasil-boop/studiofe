/**
 * Subtitle Burner - Burn-in subtitles directly into video
 *
 * Uses FFmpeg to embed subtitles into the video file
 * Supports multiple styles: default, netflix, minimal, bold
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { Logger } from '@lib/logger';

const execAsync = promisify(exec);
const logger = new Logger('subtitle-burner');

// =============================================================================
// Types
// =============================================================================

export type SubtitleStyle = 'default' | 'netflix' | 'minimal' | 'bold';

export interface BurnOptions {
  videoPath: string;
  subtitlePath: string;
  outputPath: string;
  style?: SubtitleStyle;
  fontSize?: number;
  fontName?: string;
  position?: 'bottom' | 'top' | 'middle';
  marginV?: number;
}

export interface BurnResult {
  success: boolean;
  outputPath?: string;
  duration?: number;
  error?: string;
}

// =============================================================================
// Style Configurations
// =============================================================================

interface StyleConfig {
  fontsize: number;
  primaryColour: string;
  outlineColour: string;
  backColour: string;
  outline: number;
  shadow: number;
  bold: boolean;
  borderStyle: number;
}

const STYLE_CONFIGS: Record<SubtitleStyle, StyleConfig> = {
  default: {
    fontsize: 24,
    primaryColour: '&HFFFFFF',     // White text
    outlineColour: '&H000000',     // Black outline
    backColour: '&H00000000',      // Transparent background
    outline: 2,
    shadow: 1,
    bold: false,
    borderStyle: 1,                // Outline + shadow
  },
  netflix: {
    fontsize: 22,
    primaryColour: '&HFFFFFF',     // White text
    outlineColour: '&H000000',     // Black outline
    backColour: '&H80000000',      // Semi-transparent black background
    outline: 1,
    shadow: 0,
    bold: false,
    borderStyle: 4,                // Box around text
  },
  minimal: {
    fontsize: 22,
    primaryColour: '&HFFFFFF',     // White text
    outlineColour: '&H00000000',   // No outline
    backColour: '&H00000000',      // Transparent
    outline: 0,
    shadow: 0,
    bold: false,
    borderStyle: 0,
  },
  bold: {
    fontsize: 28,
    primaryColour: '&HFFFFFF',     // White text
    outlineColour: '&H000000',     // Black outline
    backColour: '&H60000000',      // Semi-transparent background
    outline: 3,
    shadow: 2,
    bold: true,
    borderStyle: 4,
  },
};

// =============================================================================
// Subtitle Burner Class
// =============================================================================

export class SubtitleBurner {
  /**
   * Burn subtitles into video
   */
  async burn(options: BurnOptions): Promise<BurnResult> {
    const {
      videoPath,
      subtitlePath,
      outputPath,
      style = 'default',
      fontSize,
      fontName = 'Arial',
      position = 'bottom',
      marginV = 30,
    } = options;

    logger.info('Starting subtitle burn-in', {
      videoPath,
      subtitlePath,
      style,
      component: 'SubtitleBurner',
    });

    try {
      // Validate input files
      if (!existsSync(videoPath)) {
        throw new Error(`Vídeo não encontrado: ${videoPath}`);
      }

      if (!existsSync(subtitlePath)) {
        throw new Error(`Arquivo de legendas não encontrado: ${subtitlePath}`);
      }

      // Get style configuration
      const styleConfig = STYLE_CONFIGS[style];
      const finalFontSize = fontSize || styleConfig.fontsize;

      // Build FFmpeg force_style string
      const forceStyle = this.buildForceStyle({
        ...styleConfig,
        fontsize: finalFontSize,
        fontName,
        marginV,
        position,
      });

      // Escape subtitle path for FFmpeg filter
      const escapedSubPath = subtitlePath.replace(/'/g, "'\\''").replace(/:/g, '\\:');

      // Build FFmpeg command
      // Note: Using subtitles filter which supports SRT, ASS, VTT
      const command = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${escapedSubPath}':force_style='${forceStyle}'" -c:a copy -c:v libx264 -preset fast "${outputPath}"`;

      logger.debug('FFmpeg command', { command, component: 'SubtitleBurner' });

      // Execute FFmpeg
      const { stdout, stderr } = await execAsync(command, {
        timeout: 600000, // 10 minutes max
      });

      // Verify output file was created
      if (!existsSync(outputPath)) {
        throw new Error('Arquivo de saída não foi gerado');
      }

      // Get duration from output file
      const duration = await this.getVideoDuration(outputPath);

      logger.info('Subtitle burn-in completed', {
        outputPath,
        duration,
        component: 'SubtitleBurner',
      });

      return {
        success: true,
        outputPath,
        duration,
      };
    } catch (error) {
      logger.error('Subtitle burn-in failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'SubtitleBurner',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Burn ASS subtitles with karaoke effects
   */
  async burnWithKaraoke(options: {
    videoPath: string;
    assPath: string;
    outputPath: string;
  }): Promise<BurnResult> {
    const { videoPath, assPath, outputPath } = options;

    try {
      // ASS files have their own styling, so we just overlay
      const escapedAssPath = assPath.replace(/'/g, "'\\''").replace(/:/g, '\\:');

      const command = `ffmpeg -y -i "${videoPath}" -vf "ass='${escapedAssPath}'" -c:a copy -c:v libx264 -preset fast "${outputPath}"`;

      await execAsync(command, { timeout: 600000 });

      if (!existsSync(outputPath)) {
        throw new Error('Arquivo de saída não foi gerado');
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
   * Build FFmpeg force_style parameter
   */
  private buildForceStyle(config: StyleConfig & {
    fontName: string;
    marginV: number;
    position: 'bottom' | 'top' | 'middle';
  }): string {
    // ASS alignment values:
    // 1, 2, 3 = bottom left, center, right
    // 4, 5, 6 = middle left, center, right
    // 7, 8, 9 = top left, center, right
    const alignmentMap = {
      bottom: 2,
      middle: 5,
      top: 8,
    };

    const parts = [
      `FontName=${config.fontName}`,
      `FontSize=${config.fontsize}`,
      `PrimaryColour=${config.primaryColour}`,
      `OutlineColour=${config.outlineColour}`,
      `BackColour=${config.backColour}`,
      `Outline=${config.outline}`,
      `Shadow=${config.shadow}`,
      `Bold=${config.bold ? 1 : 0}`,
      `BorderStyle=${config.borderStyle}`,
      `Alignment=${alignmentMap[config.position]}`,
      `MarginV=${config.marginV}`,
    ];

    return parts.join(',');
  }

  /**
   * Get video duration using ffprobe
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check if FFmpeg has subtitle support
   */
  async checkFFmpegSubtitleSupport(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('ffmpeg -filters 2>/dev/null | grep subtitles');
      return stdout.includes('subtitles');
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let burnerInstance: SubtitleBurner | null = null;

export function getSubtitleBurner(): SubtitleBurner {
  if (!burnerInstance) {
    burnerInstance = new SubtitleBurner();
  }
  return burnerInstance;
}

export default SubtitleBurner;
