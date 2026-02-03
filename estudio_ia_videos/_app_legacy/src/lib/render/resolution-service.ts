/**
 * Resolution Service
 * Sistema de múltiplas resoluções para renderização de vídeo
 * 
 * Features:
 * - 720p, 1080p, 4K
 * - Formatos: 16:9, 9:16 (vertical), 1:1 (square)
 * - Presets otimizados para diferentes plataformas
 * - Bitrate adaptativo
 * 
 * @module lib/render/resolution-service
 */

// ============================================================================
// TYPES
// ============================================================================

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';

export type QualityPreset = '720p' | '1080p' | '1440p' | '4k';

export type PlatformPreset = 
  | 'youtube' 
  | 'youtube_shorts' 
  | 'instagram_feed' 
  | 'instagram_stories' 
  | 'instagram_reels'
  | 'tiktok'
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'whatsapp_status'
  | 'custom';

export interface Resolution {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  name: string;
}

export interface VideoQuality {
  preset: QualityPreset;
  resolution: Resolution;
  videoBitrate: string;     // ex: '5M', '10M'
  audioBitrate: string;     // ex: '128k', '192k', '320k'
  fps: number;
  codec: 'h264' | 'h265' | 'vp9' | 'av1';
  pixelFormat: string;
  profile?: string;
  level?: string;
}

export interface PlatformConfig {
  platform: PlatformPreset;
  name: string;
  description: string;
  recommendedQuality: QualityPreset;
  aspectRatio: AspectRatio;
  maxDuration?: number; // segundos
  maxFileSize?: number; // MB
  supportedFormats: string[];
}

export interface RenderSettings {
  quality: VideoQuality;
  platform?: PlatformConfig;
  customWidth?: number;
  customHeight?: number;
  customFps?: number;
  customBitrate?: string;
  twoPass?: boolean;
  hardwareAcceleration?: 'none' | 'nvidia' | 'vaapi' | 'videotoolbox';
}

export interface FFmpegConfig {
  inputOptions: string[];
  outputOptions: string[];
  filters: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:3': 4 / 3,
  '21:9': 21 / 9,
};

export const RESOLUTIONS: Record<string, Resolution> = {
  // 16:9 Horizontal
  '720p_16:9': { width: 1280, height: 720, aspectRatio: '16:9', name: 'HD (720p)' },
  '1080p_16:9': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'Full HD (1080p)' },
  '1440p_16:9': { width: 2560, height: 1440, aspectRatio: '16:9', name: 'QHD (1440p)' },
  '4k_16:9': { width: 3840, height: 2160, aspectRatio: '16:9', name: '4K UHD' },

  // 9:16 Vertical (Stories/Reels/Shorts)
  '720p_9:16': { width: 720, height: 1280, aspectRatio: '9:16', name: 'HD Vertical (720p)' },
  '1080p_9:16': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Full HD Vertical (1080p)' },
  '1440p_9:16': { width: 1440, height: 2560, aspectRatio: '9:16', name: 'QHD Vertical (1440p)' },
  '4k_9:16': { width: 2160, height: 3840, aspectRatio: '9:16', name: '4K Vertical' },

  // 1:1 Square (Instagram Feed)
  '720p_1:1': { width: 720, height: 720, aspectRatio: '1:1', name: 'HD Square (720p)' },
  '1080p_1:1': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'Full HD Square (1080p)' },
  '1440p_1:1': { width: 1440, height: 1440, aspectRatio: '1:1', name: 'QHD Square (1440p)' },
  '4k_1:1': { width: 2160, height: 2160, aspectRatio: '1:1', name: '4K Square' },

  // 4:3 Classic
  '720p_4:3': { width: 960, height: 720, aspectRatio: '4:3', name: 'HD Classic (720p)' },
  '1080p_4:3': { width: 1440, height: 1080, aspectRatio: '4:3', name: 'Full HD Classic (1080p)' },
};

export const QUALITY_PRESETS: Record<QualityPreset, Omit<VideoQuality, 'resolution' | 'preset'>> = {
  '720p': {
    videoBitrate: '5M',
    audioBitrate: '128k',
    fps: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.0',
  },
  '1080p': {
    videoBitrate: '10M',
    audioBitrate: '192k',
    fps: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.1',
  },
  '1440p': {
    videoBitrate: '20M',
    audioBitrate: '256k',
    fps: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '5.0',
  },
  '4k': {
    videoBitrate: '40M',
    audioBitrate: '320k',
    fps: 30,
    codec: 'h265',
    pixelFormat: 'yuv420p',
    profile: 'main',
    level: '5.1',
  },
};

export const PLATFORM_CONFIGS: Record<PlatformPreset, PlatformConfig> = {
  youtube: {
    platform: 'youtube',
    name: 'YouTube',
    description: 'Vídeos padrão do YouTube',
    recommendedQuality: '1080p',
    aspectRatio: '16:9',
    maxDuration: 43200, // 12 horas
    supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
  },
  youtube_shorts: {
    platform: 'youtube_shorts',
    name: 'YouTube Shorts',
    description: 'Vídeos verticais curtos',
    recommendedQuality: '1080p',
    aspectRatio: '9:16',
    maxDuration: 60,
    supportedFormats: ['mp4', 'webm'],
  },
  instagram_feed: {
    platform: 'instagram_feed',
    name: 'Instagram Feed',
    description: 'Vídeos para o feed do Instagram',
    recommendedQuality: '1080p',
    aspectRatio: '1:1',
    maxDuration: 60,
    maxFileSize: 250,
    supportedFormats: ['mp4'],
  },
  instagram_stories: {
    platform: 'instagram_stories',
    name: 'Instagram Stories',
    description: 'Vídeos para Stories',
    recommendedQuality: '1080p',
    aspectRatio: '9:16',
    maxDuration: 15,
    supportedFormats: ['mp4'],
  },
  instagram_reels: {
    platform: 'instagram_reels',
    name: 'Instagram Reels',
    description: 'Vídeos para Reels',
    recommendedQuality: '1080p',
    aspectRatio: '9:16',
    maxDuration: 90,
    supportedFormats: ['mp4'],
  },
  tiktok: {
    platform: 'tiktok',
    name: 'TikTok',
    description: 'Vídeos para TikTok',
    recommendedQuality: '1080p',
    aspectRatio: '9:16',
    maxDuration: 180,
    maxFileSize: 287,
    supportedFormats: ['mp4'],
  },
  linkedin: {
    platform: 'linkedin',
    name: 'LinkedIn',
    description: 'Vídeos profissionais',
    recommendedQuality: '1080p',
    aspectRatio: '16:9',
    maxDuration: 600,
    maxFileSize: 200,
    supportedFormats: ['mp4'],
  },
  twitter: {
    platform: 'twitter',
    name: 'Twitter/X',
    description: 'Vídeos para Twitter',
    recommendedQuality: '1080p',
    aspectRatio: '16:9',
    maxDuration: 140,
    maxFileSize: 512,
    supportedFormats: ['mp4'],
  },
  facebook: {
    platform: 'facebook',
    name: 'Facebook',
    description: 'Vídeos para Facebook',
    recommendedQuality: '1080p',
    aspectRatio: '16:9',
    maxDuration: 14400, // 4 horas
    maxFileSize: 4096,
    supportedFormats: ['mp4', 'mov'],
  },
  whatsapp_status: {
    platform: 'whatsapp_status',
    name: 'WhatsApp Status',
    description: 'Vídeos para Status',
    recommendedQuality: '720p',
    aspectRatio: '9:16',
    maxDuration: 30,
    maxFileSize: 16,
    supportedFormats: ['mp4'],
  },
  custom: {
    platform: 'custom',
    name: 'Personalizado',
    description: 'Configuração personalizada',
    recommendedQuality: '1080p',
    aspectRatio: '16:9',
    supportedFormats: ['mp4', 'webm', 'mov', 'mkv'],
  },
};

// ============================================================================
// LOGGER
// ============================================================================

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[RESOLUTION] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[RESOLUTION ERROR] ${msg}`, meta || ''),
};

// ============================================================================
// RESOLUTION SERVICE
// ============================================================================

export class ResolutionService {
  // ==========================================================================
  // RESOLUTION MANAGEMENT
  // ==========================================================================

  /**
   * Obtém resolução baseada em preset de qualidade e aspect ratio
   */
  getResolution(quality: QualityPreset, aspectRatio: AspectRatio = '16:9'): Resolution {
    const key = `${quality}_${aspectRatio}`;
    const resolution = RESOLUTIONS[key];

    if (resolution) {
      return resolution;
    }

    // Calcula resolução customizada baseada na altura
    const heights: Record<QualityPreset, number> = {
      '720p': 720,
      '1080p': 1080,
      '1440p': 1440,
      '4k': 2160,
    };

    const height = heights[quality];
    const ratio = ASPECT_RATIOS[aspectRatio];
    const width = Math.round(height * ratio);

    // Garante que width seja par
    const evenWidth = width % 2 === 0 ? width : width + 1;

    return {
      width: evenWidth,
      height,
      aspectRatio,
      name: `${quality} ${aspectRatio}`,
    };
  }

  /**
   * Obtém configuração completa de qualidade
   */
  getQualityConfig(preset: QualityPreset, aspectRatio: AspectRatio = '16:9'): VideoQuality {
    const baseConfig = QUALITY_PRESETS[preset];
    const resolution = this.getResolution(preset, aspectRatio);

    return {
      ...baseConfig,
      preset,
      resolution,
    };
  }

  /**
   * Obtém configuração para plataforma específica
   */
  getPlatformConfig(platform: PlatformPreset): PlatformConfig {
    return PLATFORM_CONFIGS[platform];
  }

  /**
   * Obtém settings otimizados para plataforma
   */
  getSettingsForPlatform(platform: PlatformPreset): RenderSettings {
    const config = PLATFORM_CONFIGS[platform];
    const quality = this.getQualityConfig(
      config.recommendedQuality,
      config.aspectRatio
    );

    // Ajusta bitrate para limites de tamanho da plataforma
    if (config.maxFileSize && config.maxDuration) {
      const maxBitrateKbps = (config.maxFileSize * 8 * 1024) / config.maxDuration;
      const qualityBitrateKbps = this.parseBitrate(quality.videoBitrate);

      if (qualityBitrateKbps > maxBitrateKbps * 0.9) {
        quality.videoBitrate = `${Math.floor(maxBitrateKbps * 0.85 / 1000)}M`;
      }
    }

    return {
      quality,
      platform: config,
    };
  }

  /**
   * Lista todas as resoluções disponíveis
   */
  listResolutions(): Resolution[] {
    return Object.values(RESOLUTIONS);
  }

  /**
   * Lista resoluções por aspect ratio
   */
  listResolutionsByAspectRatio(aspectRatio: AspectRatio): Resolution[] {
    return Object.values(RESOLUTIONS).filter(r => r.aspectRatio === aspectRatio);
  }

  /**
   * Lista todas as plataformas suportadas
   */
  listPlatforms(): PlatformConfig[] {
    return Object.values(PLATFORM_CONFIGS).filter(p => p.platform !== 'custom');
  }

  // ==========================================================================
  // FFMPEG CONFIGURATION
  // ==========================================================================

  /**
   * Gera configuração FFmpeg para renderização
   */
  generateFFmpegConfig(settings: RenderSettings): FFmpegConfig {
    const { quality, customFps, customBitrate, twoPass, hardwareAcceleration } = settings;
    const { resolution, codec, videoBitrate, audioBitrate, fps, pixelFormat, profile, level } = quality;

    const actualWidth = settings.customWidth || resolution.width;
    const actualHeight = settings.customHeight || resolution.height;
    const actualFps = customFps || fps;
    const actualBitrate = customBitrate || videoBitrate;

    const inputOptions: string[] = [];
    const outputOptions: string[] = [];
    const filters: string[] = [];

    // Hardware acceleration
    if (hardwareAcceleration === 'nvidia') {
      inputOptions.push('-hwaccel', 'cuda');
      inputOptions.push('-hwaccel_output_format', 'cuda');
    } else if (hardwareAcceleration === 'vaapi') {
      inputOptions.push('-hwaccel', 'vaapi');
      inputOptions.push('-hwaccel_output_format', 'vaapi');
    } else if (hardwareAcceleration === 'videotoolbox') {
      inputOptions.push('-hwaccel', 'videotoolbox');
    }

    // Scale filter
    filters.push(`scale=${actualWidth}:${actualHeight}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${actualWidth}:${actualHeight}:(ow-iw)/2:(oh-ih)/2:black`);

    // Video codec
    if (codec === 'h264') {
      if (hardwareAcceleration === 'nvidia') {
        outputOptions.push('-c:v', 'h264_nvenc');
      } else {
        outputOptions.push('-c:v', 'libx264');
      }
    } else if (codec === 'h265') {
      if (hardwareAcceleration === 'nvidia') {
        outputOptions.push('-c:v', 'hevc_nvenc');
      } else {
        outputOptions.push('-c:v', 'libx265');
      }
    } else if (codec === 'vp9') {
      outputOptions.push('-c:v', 'libvpx-vp9');
    } else if (codec === 'av1') {
      outputOptions.push('-c:v', 'libaom-av1');
    }

    // Profile and level (H.264/H.265)
    if (profile && (codec === 'h264' || codec === 'h265')) {
      outputOptions.push('-profile:v', profile);
    }
    if (level && (codec === 'h264' || codec === 'h265')) {
      outputOptions.push('-level', level);
    }

    // Bitrate
    outputOptions.push('-b:v', actualBitrate);

    // Two-pass encoding
    if (twoPass) {
      outputOptions.push('-pass', '2');
    }

    // Frame rate
    outputOptions.push('-r', actualFps.toString());

    // Pixel format
    outputOptions.push('-pix_fmt', pixelFormat);

    // Audio
    outputOptions.push('-c:a', 'aac');
    outputOptions.push('-b:a', audioBitrate);

    // Additional optimizations
    outputOptions.push('-movflags', '+faststart'); // Web optimization
    outputOptions.push('-preset', 'medium');

    logger.info('FFmpeg config gerado', { resolution: `${actualWidth}x${actualHeight}`, codec, bitrate: actualBitrate });

    return { inputOptions, outputOptions, filters };
  }

  /**
   * Gera comando FFmpeg completo
   */
  generateFFmpegCommand(
    inputPath: string,
    outputPath: string,
    settings: RenderSettings
  ): string {
    const config = this.generateFFmpegConfig(settings);

    const inputOpts = config.inputOptions.join(' ');
    const filterComplex = config.filters.length > 0 
      ? `-vf "${config.filters.join(',')}"` 
      : '';
    const outputOpts = config.outputOptions.join(' ');

    return `ffmpeg ${inputOpts} -i "${inputPath}" ${filterComplex} ${outputOpts} "${outputPath}"`;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Calcula tamanho estimado do arquivo
   */
  estimateFileSize(
    durationSeconds: number,
    videoBitrate: string,
    audioBitrate: string
  ): number {
    const videoBps = this.parseBitrate(videoBitrate);
    const audioBps = this.parseBitrate(audioBitrate);
    const totalBps = videoBps + audioBps;
    
    // Retorna em MB
    return (totalBps * durationSeconds) / (8 * 1024 * 1024);
  }

  /**
   * Verifica se configuração é válida para plataforma
   */
  validateForPlatform(
    durationSeconds: number,
    quality: VideoQuality,
    platform: PlatformPreset
  ): { valid: boolean; errors: string[] } {
    const config = PLATFORM_CONFIGS[platform];
    const errors: string[] = [];

    // Verifica duração
    if (config.maxDuration && durationSeconds > config.maxDuration) {
      errors.push(
        `Duração (${durationSeconds}s) excede o limite de ${config.maxDuration}s para ${config.name}`
      );
    }

    // Verifica tamanho estimado
    if (config.maxFileSize) {
      const estimatedSize = this.estimateFileSize(
        durationSeconds,
        quality.videoBitrate,
        quality.audioBitrate
      );
      if (estimatedSize > config.maxFileSize) {
        errors.push(
          `Tamanho estimado (${estimatedSize.toFixed(0)}MB) excede o limite de ${config.maxFileSize}MB para ${config.name}`
        );
      }
    }

    // Verifica aspect ratio
    if (quality.resolution.aspectRatio !== config.aspectRatio) {
      errors.push(
        `Aspect ratio ${quality.resolution.aspectRatio} não é recomendado para ${config.name} (use ${config.aspectRatio})`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Converte string de bitrate para número (kbps)
   */
  private parseBitrate(bitrate: string): number {
    const match = bitrate.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmg])?/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || '';

    switch (unit) {
      case 'k':
        return value * 1000;
      case 'm':
        return value * 1000 * 1000;
      case 'g':
        return value * 1000 * 1000 * 1000;
      default:
        return value;
    }
  }

  /**
   * Encontra melhor configuração para limite de tamanho
   */
  findBestQualityForSize(
    durationSeconds: number,
    maxSizeMB: number,
    aspectRatio: AspectRatio = '16:9'
  ): VideoQuality | null {
    const presets: QualityPreset[] = ['4k', '1440p', '1080p', '720p'];

    for (const preset of presets) {
      const quality = this.getQualityConfig(preset, aspectRatio);
      const estimatedSize = this.estimateFileSize(
        durationSeconds,
        quality.videoBitrate,
        quality.audioBitrate
      );

      if (estimatedSize <= maxSizeMB * 0.95) {
        return quality;
      }
    }

    // Se nenhum preset serve, retorna 720p com bitrate reduzido
    const fallback = this.getQualityConfig('720p', aspectRatio);
    const targetBitrate = (maxSizeMB * 0.9 * 8 * 1024 * 1024) / durationSeconds;
    fallback.videoBitrate = `${Math.floor(targetBitrate / 1000)}k`;
    
    return fallback;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let resolutionServiceInstance: ResolutionService | null = null;

export function getResolutionService(): ResolutionService {
  if (!resolutionServiceInstance) {
    resolutionServiceInstance = new ResolutionService();
  }
  return resolutionServiceInstance;
}

export default ResolutionService;
