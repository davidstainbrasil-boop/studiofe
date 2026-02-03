/**
 * 📐 Video Resolution API - Gerenciamento de Resoluções
 * 
 * Endpoints:
 * - GET /api/render/resolution - Lista perfis disponíveis
 * - GET /api/render/resolution?profile=1080p-standard - Detalhes do perfil
 * - POST /api/render/resolution/estimate - Estima tamanho e tempo
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Logger } from '@lib/logger';

const logger = new Logger('resolution-api');

// =============================================================================
// Types
// =============================================================================

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1';
type VideoQuality = 'draft' | 'standard' | 'high' | 'maximum';

interface Resolution {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
}

interface VideoProfile {
  name: string;
  resolution: Resolution;
  bitrate: number;
  maxBitrate: number;
  audioBitrate: number;
  frameRate: number;
  codec: VideoCodec;
  pixelFormat: string;
  profile: string;
  level: string;
  keyframeInterval: number;
  description: string;
  platform: string[];
  estimatedSizeMBPerMinute: number;
}

interface ProfileSummary {
  id: string;
  name: string;
  resolution: string;
  aspectRatio: AspectRatio;
  bitrate: string;
  platform: string[];
}

// =============================================================================
// Predefined Resolution Profiles
// =============================================================================

const RESOLUTION_PROFILES: Record<string, VideoProfile> = {
  '720p-standard': {
    name: 'HD 720p Standard',
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
  '1080p-standard': {
    name: 'Full HD 1080p Standard',
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
  '4k-standard': {
    name: '4K UHD Standard',
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
  'vertical-standard': {
    name: 'Vertical HD Standard',
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
  'square-standard': {
    name: 'Square HD Standard',
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
  '480p-draft': {
    name: 'SD 480p Draft',
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
};

// =============================================================================
// Helper Functions
// =============================================================================

function getProfile(name: string): VideoProfile | undefined {
  return RESOLUTION_PROFILES[name];
}

function getProfileForPlatform(platform: string): VideoProfile {
  const platformLower = platform.toLowerCase();
  const matchingProfiles = Object.values(RESOLUTION_PROFILES).filter((profile: VideoProfile) =>
    profile.platform.some((p: string) => p.toLowerCase().includes(platformLower))
  );
  return matchingProfiles.length > 0 
    ? matchingProfiles.sort((a: VideoProfile, b: VideoProfile) => b.bitrate - a.bitrate)[0]
    : RESOLUTION_PROFILES['1080p-standard'];
}

function getProfilesByAspectRatio(aspectRatio: AspectRatio): VideoProfile[] {
  return Object.values(RESOLUTION_PROFILES).filter(
    (profile: VideoProfile) => profile.resolution.aspectRatio === aspectRatio
  );
}

function getProfilesByQuality(quality: VideoQuality): VideoProfile[] {
  const qualityRanges: Record<VideoQuality, [number, number]> = {
    draft: [0, 2500],
    standard: [2500, 8000],
    high: [8000, 20000],
    maximum: [20000, Infinity],
  };
  const [min, max] = qualityRanges[quality];
  return Object.values(RESOLUTION_PROFILES).filter(
    (profile: VideoProfile) => profile.bitrate >= min && profile.bitrate < max
  );
}

function listProfiles(): ProfileSummary[] {
  return Object.entries(RESOLUTION_PROFILES).map(([id, profile]: [string, VideoProfile]) => ({
    id,
    name: profile.name,
    resolution: `${profile.resolution.width}x${profile.resolution.height}`,
    aspectRatio: profile.resolution.aspectRatio,
    bitrate: `${profile.bitrate}kbps`,
    platform: profile.platform,
  }));
}

function estimateFileSize(profile: VideoProfile, durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  return Math.round(profile.estimatedSizeMBPerMinute * durationMinutes);
}

function estimateRenderTime(profile: VideoProfile, durationSeconds: number, cpuCores: number = 4): number {
  const pixels = profile.resolution.width * profile.resolution.height;
  const resolutionFactor = pixels / (1280 * 720);
  const bitrateFactor = profile.bitrate / 4000;
  const codecFactors: Record<VideoCodec, number> = { h264: 1.0, h265: 2.5, vp9: 2.0, av1: 4.0 };
  const codecFactor = codecFactors[profile.codec];
  const cpuFactor = Math.max(0.5, 4 / (cpuCores * 0.7));
  return Math.round(durationSeconds * resolutionFactor * bitrateFactor * codecFactor * cpuFactor);
}

function generateFFmpegArgs(profile: VideoProfile): string[] {
  const args: string[] = [];
  
  switch (profile.codec) {
    case 'h264':
      args.push('-c:v', 'libx264', '-preset', 'medium', '-profile:v', profile.profile, '-level', profile.level);
      break;
    case 'h265':
      args.push('-c:v', 'libx265', '-preset', 'medium', '-x265-params', `profile=${profile.profile}:level=${profile.level}`);
      break;
    default:
      args.push('-c:v', 'libx264', '-preset', 'medium');
  }
  
  args.push('-b:v', `${profile.bitrate}k`);
  args.push('-maxrate', `${profile.maxBitrate}k`);
  args.push('-bufsize', `${profile.maxBitrate * 2}k`);
  args.push('-s', `${profile.resolution.width}x${profile.resolution.height}`);
  args.push('-r', profile.frameRate.toString());
  args.push('-pix_fmt', profile.pixelFormat);
  args.push('-g', profile.keyframeInterval.toString());
  args.push('-c:a', 'aac');
  args.push('-b:a', `${profile.audioBitrate}k`);
  args.push('-ar', '48000');
  args.push('-ac', '2');
  args.push('-movflags', '+faststart');
  
  return args;
}

function createCustomProfile(width: number, height: number): VideoProfile {
  let aspectRatio: AspectRatio = '16:9';
  const ratio = width / height;
  if (Math.abs(ratio - 16/9) < 0.01) aspectRatio = '16:9';
  else if (Math.abs(ratio - 9/16) < 0.01) aspectRatio = '9:16';
  else if (Math.abs(ratio - 1) < 0.01) aspectRatio = '1:1';
  
  const pixels = width * height;
  const baseBitrate = Math.round(pixels / 100);

  return {
    name: `Custom ${width}x${height}`,
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
    estimatedSizeMBPerMinute: Math.round(baseBitrate / 133),
  };
}

// =============================================================================
// Schemas
// =============================================================================

const estimateSchema = z.object({
  profileId: z.string().optional(),
  durationSeconds: z.number().positive().max(7200),
  cpuCores: z.number().min(1).max(128).optional().default(4),
  customWidth: z.number().min(320).max(7680).optional(),
  customHeight: z.number().min(240).max(4320).optional(),
});

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Get specific profile
  const profileId = searchParams.get('profile');
  if (profileId) {
    const profile = getProfile(profileId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado', availableProfiles: Object.keys(RESOLUTION_PROFILES) },
        { status: 404 }
      );
    }
    return NextResponse.json({
      profile,
      ffmpegArgs: generateFFmpegArgs(profile),
    });
  }

  // Filter by platform
  const platform = searchParams.get('platform');
  if (platform) {
    const profile = getProfileForPlatform(platform);
    return NextResponse.json({
      recommendedProfile: profile,
      searchedPlatform: platform,
    });
  }

  // Filter by aspect ratio
  const aspectRatio = searchParams.get('aspectRatio') as AspectRatio | null;
  if (aspectRatio && ['16:9', '9:16', '1:1', '4:3', '21:9'].includes(aspectRatio)) {
    const profiles = getProfilesByAspectRatio(aspectRatio);
    return NextResponse.json({
      aspectRatio,
      profiles: profiles.map((p: VideoProfile) => ({
        id: Object.entries(RESOLUTION_PROFILES).find(([, v]: [string, VideoProfile]) => v === p)?.[0],
        ...p,
      })),
    });
  }

  // Filter by quality
  const quality = searchParams.get('quality') as VideoQuality | null;
  if (quality && ['draft', 'standard', 'high', 'maximum'].includes(quality)) {
    const profiles = getProfilesByQuality(quality);
    return NextResponse.json({
      quality,
      profiles: profiles.map((p: VideoProfile) => ({
        id: Object.entries(RESOLUTION_PROFILES).find(([, v]: [string, VideoProfile]) => v === p)?.[0],
        ...p,
      })),
    });
  }

  // List all profiles (summary)
  const profiles = listProfiles();
  
  // Group by aspect ratio
  const grouped = {
    landscape: profiles.filter((p: ProfileSummary) => p.aspectRatio === '16:9'),
    vertical: profiles.filter((p: ProfileSummary) => p.aspectRatio === '9:16'),
    square: profiles.filter((p: ProfileSummary) => p.aspectRatio === '1:1'),
    other: profiles.filter((p: ProfileSummary) => !['16:9', '9:16', '1:1'].includes(p.aspectRatio)),
  };

  return NextResponse.json({
    totalProfiles: profiles.length,
    profiles: grouped,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '21:9'],
    qualities: ['draft', 'standard', 'high', 'maximum'],
  });
}

// =============================================================================
// POST Handler - Estimate
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = estimateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profileId, durationSeconds, cpuCores, customWidth, customHeight } = parsed.data;

    let profile: VideoProfile;

    if (customWidth && customHeight) {
      profile = createCustomProfile(customWidth, customHeight);
      logger.info('Created custom profile', { width: customWidth, height: customHeight });
    } else if (profileId) {
      const foundProfile = getProfile(profileId);
      if (!foundProfile) {
        return NextResponse.json(
          { error: 'Perfil não encontrado', availableProfiles: Object.keys(RESOLUTION_PROFILES) },
          { status: 404 }
        );
      }
      profile = foundProfile;
    } else {
      profile = RESOLUTION_PROFILES['1080p-standard'];
    }

    const fileSizeMB = estimateFileSize(profile, durationSeconds);
    const renderTimeSeconds = estimateRenderTime(profile, durationSeconds, cpuCores);

    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;
    };

    const result = {
      profile: {
        name: profile.name,
        resolution: `${profile.resolution.width}x${profile.resolution.height}`,
        aspectRatio: profile.resolution.aspectRatio,
        bitrate: `${profile.bitrate}kbps`,
        codec: profile.codec,
        frameRate: profile.frameRate,
      },
      input: {
        duration: durationSeconds,
        durationFormatted: formatDuration(durationSeconds),
        cpuCores,
      },
      estimates: {
        fileSizeMB,
        fileSizeFormatted: fileSizeMB >= 1024 
          ? `${(fileSizeMB / 1024).toFixed(2)} GB` 
          : `${fileSizeMB} MB`,
        renderTimeSeconds,
        renderTimeFormatted: formatDuration(renderTimeSeconds),
        renderRatio: (renderTimeSeconds / durationSeconds).toFixed(2) + 'x',
      },
      ffmpegArgs: generateFFmpegArgs(profile),
    };

    logger.info('Estimate calculated', {
      profileName: profile.name,
      duration: durationSeconds,
      estimatedSize: fileSizeMB,
      estimatedRenderTime: renderTimeSeconds,
    });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Erro ao calcular estimativa', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
