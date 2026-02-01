/**
 * 📐 Video Resolution Profiles - Configurações de Resolução de Vídeo
 * 
 * Suporta múltiplas resoluções e aspect ratios:
 * - 720p, 1080p, 4K (landscape)
 * - Vertical (9:16) para Stories/Reels
 * - Quadrado (1:1) para Instagram Feed
 */

import { Logger } from '@lib/logger';

const logger = new Logger('video-resolution');

// =============================================================================
// Types
// =============================================================================

export type ResolutionPreset = 
  | '720p'   // 1280x720
  | '1080p'  // 1920x1080
  | '4k'     // 3840x2160
  | '480p'   // 854x480 (economical)
  | 'vertical-hd'    // 1080x1920 (Stories/Reels)
  | 'vertical-full'  // 1080x1920 at higher bitrate
  | 'square-hd'      // 1080x1080 (Instagram Feed)
  | 'square-small'   // 720x720
  | 'custom';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';

export type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1';

export type VideoQuality = 'draft' | 'standard' | 'high' | 'maximum';

export interface Resolution {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
}

export interface VideoProfile {
  name: string;
  preset: ResolutionPreset;
  resolution: Resolution;
  bitrate: number;          // in kbps
  maxBitrate: number;       // in kbps
  audioBitrate: number;     // in kbps
  frameRate: number;        // fps
  codec: VideoCodec;
  pixelFormat: string;
  profile: string;          // h264 profile (baseline, main, high)
  level: string;            // h264 level
  keyframeInterval: number; // GOP size in frames
  description: string;
  platform: string[];       // Recommended platforms
  estimatedSizeMBPerMinute: number;
}

export interface EncodingOptions {
  twoPass: boolean;
  fastStart: boolean;       // moov atom at beginning for streaming
  deinterlace: boolean;
  denoise: boolean;
  hardwareAcceleration?: 'nvidia' | 'intel' | 'amd' | 'apple' | 'none';
}

export interface RenderConfig {
  profile: VideoProfile;
  options: EncodingOptions;
  outputFormat: 'mp4' | 'webm' | 'mov';
}

// =============================================================================
// Predefined Resolution Profiles
// =============================================================================

export const RESOLUTION_PROFILES: Record<string, VideoProfile> = {
  // === Landscape Resolutions ===
  
  '720p-standard': {
    name: 'HD 720p Standard',
    preset: '720p',
    resolution: { width: 1280, height: 720, aspectRatio: '16:9' },
    bitrate: 4000,
    maxBitrate: 6000,
    audioBitrate: 128,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'main',
    level: '3.1',
    keyframeInterval: 60,
    description: 'HD padrão, ótimo para web e LMS',
    platform: ['YouTube', 'LMS', 'Web'],
    estimatedSizeMBPerMinute: 30,
  },

  '720p-high': {
    name: 'HD 720p High Quality',
    preset: '720p',
    resolution: { width: 1280, height: 720, aspectRatio: '16:9' },
    bitrate: 6000,
    maxBitrate: 8000,
    audioBitrate: 192,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.0',
    keyframeInterval: 60,
    description: 'HD alta qualidade para apresentações detalhadas',
    platform: ['YouTube', 'LMS', 'Download'],
    estimatedSizeMBPerMinute: 45,
  },

  '1080p-standard': {
    name: 'Full HD 1080p Standard',
    preset: '1080p',
    resolution: { width: 1920, height: 1080, aspectRatio: '16:9' },
    bitrate: 8000,
    maxBitrate: 12000,
    audioBitrate: 192,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.1',
    keyframeInterval: 60,
    description: 'Full HD padrão, recomendado para a maioria dos casos',
    platform: ['YouTube', 'Vimeo', 'LMS', 'Download'],
    estimatedSizeMBPerMinute: 60,
  },

  '1080p-high': {
    name: 'Full HD 1080p High Quality',
    preset: '1080p',
    resolution: { width: 1920, height: 1080, aspectRatio: '16:9' },
    bitrate: 12000,
    maxBitrate: 16000,
    audioBitrate: 320,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.2',
    keyframeInterval: 60,
    description: 'Full HD alta qualidade para conteúdo premium',
    platform: ['YouTube', 'Vimeo', 'Download'],
    estimatedSizeMBPerMinute: 90,
  },

  '1080p-60fps': {
    name: 'Full HD 1080p 60fps',
    preset: '1080p',
    resolution: { width: 1920, height: 1080, aspectRatio: '16:9' },
    bitrate: 15000,
    maxBitrate: 20000,
    audioBitrate: 320,
    frameRate: 60,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.2',
    keyframeInterval: 120,
    description: 'Full HD 60fps para animações suaves',
    platform: ['YouTube', 'Gaming'],
    estimatedSizeMBPerMinute: 112,
  },

  '4k-standard': {
    name: '4K UHD Standard',
    preset: '4k',
    resolution: { width: 3840, height: 2160, aspectRatio: '16:9' },
    bitrate: 35000,
    maxBitrate: 45000,
    audioBitrate: 320,
    frameRate: 30,
    codec: 'h265',
    pixelFormat: 'yuv420p10le',
    profile: 'main',
    level: '5.1',
    keyframeInterval: 60,
    description: '4K UHD para máxima qualidade e detalhes',
    platform: ['YouTube 4K', 'Smart TV', 'Download'],
    estimatedSizeMBPerMinute: 262,
  },

  '4k-high': {
    name: '4K UHD High Quality',
    preset: '4k',
    resolution: { width: 3840, height: 2160, aspectRatio: '16:9' },
    bitrate: 50000,
    maxBitrate: 65000,
    audioBitrate: 320,
    frameRate: 30,
    codec: 'h265',
    pixelFormat: 'yuv420p10le',
    profile: 'main10',
    level: '5.2',
    keyframeInterval: 60,
    description: '4K UHD premium para qualidade máxima',
    platform: ['YouTube 4K', 'Smart TV', 'Cinema'],
    estimatedSizeMBPerMinute: 375,
  },

  // === Vertical Resolutions (Stories/Reels) ===

  'vertical-standard': {
    name: 'Vertical HD Standard',
    preset: 'vertical-hd',
    resolution: { width: 1080, height: 1920, aspectRatio: '9:16' },
    bitrate: 8000,
    maxBitrate: 12000,
    audioBitrate: 192,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.1',
    keyframeInterval: 60,
    description: 'Formato vertical para Stories, Reels e TikTok',
    platform: ['Instagram Stories', 'Instagram Reels', 'TikTok', 'YouTube Shorts'],
    estimatedSizeMBPerMinute: 60,
  },

  'vertical-high': {
    name: 'Vertical HD High Quality',
    preset: 'vertical-full',
    resolution: { width: 1080, height: 1920, aspectRatio: '9:16' },
    bitrate: 12000,
    maxBitrate: 16000,
    audioBitrate: 256,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.2',
    keyframeInterval: 60,
    description: 'Vertical alta qualidade para conteúdo premium',
    platform: ['Instagram Reels', 'TikTok'],
    estimatedSizeMBPerMinute: 90,
  },

  'vertical-720': {
    name: 'Vertical 720p',
    preset: 'vertical-hd',
    resolution: { width: 720, height: 1280, aspectRatio: '9:16' },
    bitrate: 4000,
    maxBitrate: 6000,
    audioBitrate: 128,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'main',
    level: '3.1',
    keyframeInterval: 60,
    description: 'Vertical econômico para uploads rápidos',
    platform: ['WhatsApp Status', 'Stories'],
    estimatedSizeMBPerMinute: 30,
  },

  // === Square Resolutions (Instagram Feed) ===

  'square-standard': {
    name: 'Square HD Standard',
    preset: 'square-hd',
    resolution: { width: 1080, height: 1080, aspectRatio: '1:1' },
    bitrate: 6000,
    maxBitrate: 8000,
    audioBitrate: 192,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.0',
    keyframeInterval: 60,
    description: 'Formato quadrado para Instagram Feed',
    platform: ['Instagram Feed', 'Facebook Feed', 'LinkedIn'],
    estimatedSizeMBPerMinute: 45,
  },

  'square-high': {
    name: 'Square HD High Quality',
    preset: 'square-hd',
    resolution: { width: 1080, height: 1080, aspectRatio: '1:1' },
    bitrate: 10000,
    maxBitrate: 14000,
    audioBitrate: 256,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.1',
    keyframeInterval: 60,
    description: 'Quadrado alta qualidade para conteúdo premium',
    platform: ['Instagram Feed', 'Facebook'],
    estimatedSizeMBPerMinute: 75,
  },

  'square-small': {
    name: 'Square 720p',
    preset: 'square-small',
    resolution: { width: 720, height: 720, aspectRatio: '1:1' },
    bitrate: 3000,
    maxBitrate: 4500,
    audioBitrate: 128,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'main',
    level: '3.1',
    keyframeInterval: 60,
    description: 'Quadrado econômico para web',
    platform: ['Web', 'Email'],
    estimatedSizeMBPerMinute: 22,
  },

  // === Economical/Draft Resolutions ===

  '480p-draft': {
    name: 'SD 480p Draft',
    preset: '480p',
    resolution: { width: 854, height: 480, aspectRatio: '16:9' },
    bitrate: 1500,
    maxBitrate: 2000,
    audioBitrate: 96,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'baseline',
    level: '3.0',
    keyframeInterval: 60,
    description: 'Qualidade rascunho para preview rápido',
    platform: ['Preview', 'Web (low bandwidth)'],
    estimatedSizeMBPerMinute: 11,
  },

  '480p-standard': {
    name: 'SD 480p Standard',
    preset: '480p',
    resolution: { width: 854, height: 480, aspectRatio: '16:9' },
    bitrate: 2500,
    maxBitrate: 3500,
    audioBitrate: 128,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'main',
    level: '3.0',
    keyframeInterval: 60,
    description: 'SD padrão para dispositivos antigos',
    platform: ['Mobile (2G/3G)', 'Old devices'],
    estimatedSizeMBPerMinute: 18,
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get profile by name
 */
export function getProfile(name: string): VideoProfile | undefined {
  return RESOLUTION_PROFILES[name];
}

/**
 * Get recommended profile for a platform
 */
export function getProfileForPlatform(platform: string): VideoProfile {
  const platformLower = platform.toLowerCase();
  
  // Find profiles that match the platform
  const matchingProfiles = Object.values(RESOLUTION_PROFILES).filter(profile =>
    profile.platform.some(p => p.toLowerCase().includes(platformLower))
  );

  if (matchingProfiles.length === 0) {
    // Default to 1080p standard
    return RESOLUTION_PROFILES['1080p-standard'];
  }

  // Return the highest quality matching profile
  return matchingProfiles.sort((a, b) => b.bitrate - a.bitrate)[0];
}

/**
 * Get profiles by aspect ratio
 */
export function getProfilesByAspectRatio(aspectRatio: AspectRatio): VideoProfile[] {
  return Object.values(RESOLUTION_PROFILES).filter(
    profile => profile.resolution.aspectRatio === aspectRatio
  );
}

/**
 * Get profiles by quality tier
 */
export function getProfilesByQuality(quality: VideoQuality): VideoProfile[] {
  const qualityRanges: Record<VideoQuality, [number, number]> = {
    draft: [0, 2500],
    standard: [2500, 8000],
    high: [8000, 20000],
    maximum: [20000, Infinity],
  };

  const [min, max] = qualityRanges[quality];
  return Object.values(RESOLUTION_PROFILES).filter(
    profile => profile.bitrate >= min && profile.bitrate < max
  );
}

/**
 * Estimate file size for a given profile and duration
 */
export function estimateFileSize(profile: VideoProfile, durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  return Math.round(profile.estimatedSizeMBPerMinute * durationMinutes);
}

/**
 * Estimate render time (rough estimate based on resolution and bitrate)
 */
export function estimateRenderTime(
  profile: VideoProfile, 
  durationSeconds: number,
  cpuCores: number = 4
): number {
  // Base multiplier: 720p at 4000kbps takes ~1x real-time on 4 cores
  const baseRenderRatio = 1.0;
  
  // Resolution factor (more pixels = more time)
  const pixels = profile.resolution.width * profile.resolution.height;
  const resolutionFactor = pixels / (1280 * 720);
  
  // Bitrate factor (higher bitrate = more time)
  const bitrateFactor = profile.bitrate / 4000;
  
  // Codec factor (h265/vp9/av1 are slower)
  const codecFactors: Record<VideoCodec, number> = {
    h264: 1.0,
    h265: 2.5,
    vp9: 2.0,
    av1: 4.0,
  };
  const codecFactor = codecFactors[profile.codec];
  
  // CPU factor (more cores = faster, with diminishing returns)
  const cpuFactor = Math.max(0.5, 4 / (cpuCores * 0.7));

  const totalFactor = baseRenderRatio * resolutionFactor * bitrateFactor * codecFactor * cpuFactor;
  
  return Math.round(durationSeconds * totalFactor);
}

/**
 * Generate FFmpeg arguments for a profile
 */
export function generateFFmpegArgs(
  profile: VideoProfile,
  options: EncodingOptions = { twoPass: false, fastStart: true, deinterlace: false, denoise: false }
): string[] {
  const args: string[] = [];

  // Input options would be added before this

  // Video codec
  switch (profile.codec) {
    case 'h264':
      args.push('-c:v', 'libx264');
      args.push('-preset', options.twoPass ? 'slow' : 'medium');
      args.push('-profile:v', profile.profile);
      args.push('-level', profile.level);
      break;
    case 'h265':
      args.push('-c:v', 'libx265');
      args.push('-preset', options.twoPass ? 'slow' : 'medium');
      args.push('-x265-params', `profile=${profile.profile}:level=${profile.level}`);
      break;
    case 'vp9':
      args.push('-c:v', 'libvpx-vp9');
      args.push('-quality', options.twoPass ? 'good' : 'realtime');
      args.push('-speed', options.twoPass ? '1' : '4');
      break;
    case 'av1':
      args.push('-c:v', 'libaom-av1');
      args.push('-cpu-used', options.twoPass ? '4' : '8');
      break;
  }

  // Bitrate
  args.push('-b:v', `${profile.bitrate}k`);
  args.push('-maxrate', `${profile.maxBitrate}k`);
  args.push('-bufsize', `${profile.maxBitrate * 2}k`);

  // Resolution
  args.push('-s', `${profile.resolution.width}x${profile.resolution.height}`);

  // Frame rate
  args.push('-r', profile.frameRate.toString());

  // Pixel format
  args.push('-pix_fmt', profile.pixelFormat);

  // Keyframe interval
  args.push('-g', profile.keyframeInterval.toString());
  args.push('-keyint_min', Math.floor(profile.keyframeInterval / 2).toString());

  // Audio
  args.push('-c:a', 'aac');
  args.push('-b:a', `${profile.audioBitrate}k`);
  args.push('-ar', '48000');
  args.push('-ac', '2');

  // FastStart for streaming (MP4 only)
  if (options.fastStart) {
    args.push('-movflags', '+faststart');
  }

  // Deinterlace
  if (options.deinterlace) {
    args.push('-vf', 'yadif');
  }

  // Denoise
  if (options.denoise) {
    const vf = args.find((_, i) => args[i - 1] === '-vf');
    if (vf) {
      const idx = args.indexOf(vf);
      args[idx] = `${vf},hqdn3d`;
    } else {
      args.push('-vf', 'hqdn3d');
    }
  }

  return args;
}

/**
 * Get all available profiles as a summary list
 */
export function listProfiles(): Array<{
  id: string;
  name: string;
  resolution: string;
  aspectRatio: AspectRatio;
  bitrate: string;
  platform: string[];
}> {
  return Object.entries(RESOLUTION_PROFILES).map(([id, profile]) => ({
    id,
    name: profile.name,
    resolution: `${profile.resolution.width}x${profile.resolution.height}`,
    aspectRatio: profile.resolution.aspectRatio,
    bitrate: `${profile.bitrate}kbps`,
    platform: profile.platform,
  }));
}

/**
 * Create a custom resolution profile
 */
export function createCustomProfile(
  width: number,
  height: number,
  options: Partial<VideoProfile> = {}
): VideoProfile {
  // Determine aspect ratio
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;
  
  let aspectRatio: AspectRatio = '16:9';
  if (ratioW === 16 && ratioH === 9) aspectRatio = '16:9';
  else if (ratioW === 9 && ratioH === 16) aspectRatio = '9:16';
  else if (ratioW === 1 && ratioH === 1) aspectRatio = '1:1';
  else if (ratioW === 4 && ratioH === 3) aspectRatio = '4:3';
  else if (ratioW === 21 && ratioH === 9) aspectRatio = '21:9';

  // Calculate appropriate bitrate based on resolution
  const pixels = width * height;
  const baseBitrate = Math.round(pixels / 100); // ~10kbps per 1000 pixels

  const defaultProfile: VideoProfile = {
    name: `Custom ${width}x${height}`,
    preset: 'custom',
    resolution: { width, height, aspectRatio },
    bitrate: baseBitrate,
    maxBitrate: Math.round(baseBitrate * 1.5),
    audioBitrate: 192,
    frameRate: 30,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.1',
    keyframeInterval: 60,
    description: 'Custom resolution profile',
    platform: ['Custom'],
    estimatedSizeMBPerMinute: Math.round(baseBitrate / 133), // rough estimate
  };

  return { ...defaultProfile, ...options };
}

// =============================================================================
// Logger
// =============================================================================

logger.info('Video resolution profiles loaded', { 
  profileCount: Object.keys(RESOLUTION_PROFILES).length,
});
