/**
 * Video Quality Presets
 * 
 * Predefined quality settings for video rendering including 4K support.
 */

export type VideoQuality = 'low' | 'medium' | 'high' | 'ultra' | '4k';

export interface QualityPreset {
  id: VideoQuality;
  name: string;
  description: string;
  width: number;
  height: number;
  fps: number;
  bitrate: string;
  audioBitrate: string;
  codec: 'h264' | 'h265' | 'vp9';
  estimatedSizePerMinute: number; // MB
  requiresPlan: 'free' | 'starter' | 'professional' | 'enterprise';
  badge?: string;
}

export const QUALITY_PRESETS: Record<VideoQuality, QualityPreset> = {
  low: {
    id: 'low',
    name: 'Rascunho',
    description: 'Para preview rápido (480p)',
    width: 854,
    height: 480,
    fps: 24,
    bitrate: '1500k',
    audioBitrate: '96k',
    codec: 'h264',
    estimatedSizePerMinute: 12,
    requiresPlan: 'free',
  },
  medium: {
    id: 'medium',
    name: 'HD',
    description: 'Qualidade padrão (720p)',
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: '3000k',
    audioBitrate: '128k',
    codec: 'h264',
    estimatedSizePerMinute: 25,
    requiresPlan: 'free',
  },
  high: {
    id: 'high',
    name: 'Full HD',
    description: 'Alta qualidade (1080p)',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: '5000k',
    audioBitrate: '192k',
    codec: 'h264',
    estimatedSizePerMinute: 45,
    requiresPlan: 'starter',
    badge: 'Recomendado',
  },
  ultra: {
    id: 'ultra',
    name: 'Full HD+',
    description: 'Máxima qualidade 1080p (60fps)',
    width: 1920,
    height: 1080,
    fps: 60,
    bitrate: '8000k',
    audioBitrate: '256k',
    codec: 'h264',
    estimatedSizePerMinute: 70,
    requiresPlan: 'professional',
  },
  '4k': {
    id: '4k',
    name: '4K UHD',
    description: 'Ultra HD (3840x2160)',
    width: 3840,
    height: 2160,
    fps: 30,
    bitrate: '25000k',
    audioBitrate: '320k',
    codec: 'h265',
    estimatedSizePerMinute: 200,
    requiresPlan: 'enterprise',
    badge: 'Premium',
  },
};

// Aspect ratios
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

export const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number; name: string }> = {
  '16:9': { width: 16, height: 9, name: 'Widescreen (YouTube, LMS)' },
  '9:16': { width: 9, height: 16, name: 'Vertical (Stories, Reels)' },
  '1:1': { width: 1, height: 1, name: 'Quadrado (Instagram, LinkedIn)' },
  '4:3': { width: 4, height: 3, name: 'Tradicional (Apresentações)' },
};

// Calculate dimensions for aspect ratio
export function calculateDimensions(
  quality: VideoQuality,
  aspectRatio: AspectRatio
): { width: number; height: number } {
  const preset = QUALITY_PRESETS[quality];
  const ratio = ASPECT_RATIOS[aspectRatio];
  
  // Base on height for consistency
  const baseHeight = preset.height;
  const baseWidth = Math.round(baseHeight * (ratio.width / ratio.height));
  
  // Ensure even numbers (required by most codecs)
  return {
    width: baseWidth % 2 === 0 ? baseWidth : baseWidth + 1,
    height: baseHeight % 2 === 0 ? baseHeight : baseHeight + 1,
  };
}

// Estimate render time based on video duration and quality
export function estimateRenderTime(
  durationSeconds: number,
  quality: VideoQuality
): number {
  // Base multipliers (render time = video duration * multiplier)
  const multipliers: Record<VideoQuality, number> = {
    low: 0.3,
    medium: 0.5,
    high: 0.8,
    ultra: 1.2,
    '4k': 2.5,
  };
  
  const baseTime = durationSeconds * multipliers[quality];
  // Add overhead for processing
  return Math.ceil(baseTime + 30);
}

// Estimate file size
export function estimateFileSize(
  durationSeconds: number,
  quality: VideoQuality
): number {
  const preset = QUALITY_PRESETS[quality];
  const minutes = durationSeconds / 60;
  return Math.ceil(preset.estimatedSizePerMinute * minutes);
}

// Format file size
export function formatFileSize(mb: number): string {
  if (mb < 1024) {
    return `${mb} MB`;
  }
  return `${(mb / 1024).toFixed(1)} GB`;
}

// Check if user's plan supports quality
export function canUseQuality(
  quality: VideoQuality,
  userPlan: 'free' | 'starter' | 'professional' | 'enterprise'
): boolean {
  const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
  const preset = QUALITY_PRESETS[quality];
  const requiredIndex = planHierarchy.indexOf(preset.requiresPlan);
  const userIndex = planHierarchy.indexOf(userPlan);
  return userIndex >= requiredIndex;
}

// Get available qualities for a plan
export function getAvailableQualities(
  userPlan: 'free' | 'starter' | 'professional' | 'enterprise'
): VideoQuality[] {
  return (Object.keys(QUALITY_PRESETS) as VideoQuality[]).filter(
    quality => canUseQuality(quality, userPlan)
  );
}

export default QUALITY_PRESETS;
