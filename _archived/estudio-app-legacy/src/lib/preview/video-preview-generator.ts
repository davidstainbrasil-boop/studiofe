/**
 * 🎬 Video Preview Generator
 * 
 * Gera previews rápidos de vídeo (30s) sem renderização completa.
 * Usa técnicas de low-quality render e cache para velocidade.
 * 
 * Features:
 * - Preview de 30 segundos máximo
 * - Resolução reduzida (480p)
 * - Mostra transições, TTS e avatar
 * - Cache de previews gerados
 * - Streaming progressivo
 */

import { Logger } from '@lib/logger';

const logger = new Logger('video-preview-generator');

// =============================================================================
// Types
// =============================================================================

export interface SlidePreviewData {
  id: string;
  index: number;
  imageUrl: string;
  duration: number;
  notes?: string;
  audioUrl?: string;
  transition?: TransitionConfig;
}

export interface TransitionConfig {
  type: 'none' | 'fade' | 'slide' | 'dissolve' | 'wipe' | 'zoom';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AvatarConfig {
  enabled: boolean;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'custom';
  size: 'small' | 'medium' | 'large';
  customX?: number;
  customY?: number;
  avatarUrl?: string;
}

export interface PreviewConfig {
  maxDuration: number;
  resolution: 'draft' | 'preview' | 'standard';
  includeAudio: boolean;
  includeTransitions: boolean;
  includeAvatar: boolean;
  startSlide?: number;
  endSlide?: number;
}

export interface PreviewRequest {
  projectId: string;
  slides: SlidePreviewData[];
  avatar?: AvatarConfig;
  config?: Partial<PreviewConfig>;
  backgroundMusic?: {
    url: string;
    volume: number;
  };
}

export interface PreviewFrame {
  slideIndex: number;
  timestamp: number;
  imageUrl: string;
  avatarOverlay?: string;
  transition?: {
    type: string;
    progress: number;
  };
}

export interface PreviewResult {
  previewId: string;
  projectId: string;
  videoUrl?: string;
  frames: PreviewFrame[];
  duration: number;
  slidesIncluded: number;
  resolution: { width: number; height: number };
  generatedAt: string;
  expiresAt: string;
  status: 'ready' | 'generating' | 'error';
  errorMessage?: string;
}

export interface PreviewProgress {
  previewId: string;
  status: 'starting' | 'generating-frames' | 'compositing' | 'encoding' | 'complete' | 'error';
  progress: number;
  currentSlide: number;
  totalSlides: number;
  estimatedTimeRemaining?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: PreviewConfig = {
  maxDuration: 30,
  resolution: 'draft',
  includeAudio: true,
  includeTransitions: true,
  includeAvatar: true,
};

const RESOLUTION_MAP = {
  draft: { width: 480, height: 270 },
  preview: { width: 854, height: 480 },
  standard: { width: 1280, height: 720 },
} as const;

const TRANSITION_DURATIONS: Record<TransitionConfig['type'], number> = {
  none: 0,
  fade: 0.5,
  slide: 0.4,
  dissolve: 0.6,
  wipe: 0.5,
  zoom: 0.6,
};

const AVATAR_SIZES = {
  small: { width: 120, height: 120 },
  medium: { width: 180, height: 180 },
  large: { width: 240, height: 240 },
} as const;

const AVATAR_POSITIONS = {
  'bottom-left': { x: 20, y: 'bottom-20' },
  'bottom-right': { x: 'right-20', y: 'bottom-20' },
  'top-left': { x: 20, y: 20 },
  'top-right': { x: 'right-20', y: 20 },
  custom: { x: 0, y: 0 },
} as const;

// =============================================================================
// Preview Cache
// =============================================================================

interface CacheEntry {
  result: PreviewResult;
  createdAt: Date;
  accessCount: number;
}

class PreviewCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100;
  private ttlMs: number = 30 * 60 * 1000; // 30 minutes

  generateKey(projectId: string, config: PreviewConfig, slidesHash: string): string {
    return `${projectId}:${JSON.stringify(config)}:${slidesHash}`;
  }

  get(key: string): PreviewResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = new Date();
    if (now.getTime() - entry.createdAt.getTime() > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.result;
  }

  set(key: string, result: PreviewResult): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result,
      createdAt: new Date(),
      accessCount: 1,
    });
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const age = Date.now() - entry.createdAt.getTime();
      const score = age / (entry.accessCount + 1);
      if (score > oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

const previewCache = new PreviewCache();

// =============================================================================
// VideoPreviewGenerator Class
// =============================================================================

export class VideoPreviewGenerator {
  private config: PreviewConfig;
  private progressCallbacks: Map<string, (progress: PreviewProgress) => void> = new Map();

  constructor(config?: Partial<PreviewConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gera um preview rápido baseado nos slides
   */
  async generatePreview(request: PreviewRequest): Promise<PreviewResult> {
    const previewId = this.generatePreviewId();
    const config = { ...this.config, ...request.config };
    
    logger.info('Starting preview generation', {
      previewId,
      projectId: request.projectId,
      slideCount: request.slides.length,
      config,
    });

    try {
      // Calculate which slides fit within maxDuration
      const { slidesToInclude, totalDuration } = this.calculateSlidesToInclude(
        request.slides,
        config
      );

      if (slidesToInclude.length === 0) {
        throw new Error('No slides to preview');
      }

      // Update progress
      this.emitProgress(previewId, {
        previewId,
        status: 'generating-frames',
        progress: 10,
        currentSlide: 0,
        totalSlides: slidesToInclude.length,
      });

      // Generate frames for each slide
      const frames = await this.generateFrames(
        previewId,
        slidesToInclude,
        request.avatar,
        config
      );

      // Update progress
      this.emitProgress(previewId, {
        previewId,
        status: 'compositing',
        progress: 70,
        currentSlide: slidesToInclude.length,
        totalSlides: slidesToInclude.length,
      });

      // Generate timeline with transitions
      const timeline = this.generateTimeline(frames, slidesToInclude, config);

      // Calculate expiration (30 minutes from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

      const result: PreviewResult = {
        previewId,
        projectId: request.projectId,
        frames: timeline,
        duration: totalDuration,
        slidesIncluded: slidesToInclude.length,
        resolution: RESOLUTION_MAP[config.resolution],
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'ready',
      };

      // Cache the result
      const cacheKey = previewCache.generateKey(
        request.projectId,
        config,
        this.hashSlides(request.slides)
      );
      previewCache.set(cacheKey, result);

      // Final progress update
      this.emitProgress(previewId, {
        previewId,
        status: 'complete',
        progress: 100,
        currentSlide: slidesToInclude.length,
        totalSlides: slidesToInclude.length,
      });

      logger.info('Preview generation complete', {
        previewId,
        duration: totalDuration,
        slidesIncluded: slidesToInclude.length,
      });

      return result;

    } catch (error) {
      logger.error('Preview generation failed', error instanceof Error ? error : undefined);
      
      this.emitProgress(previewId, {
        previewId,
        status: 'error',
        progress: 0,
        currentSlide: 0,
        totalSlides: request.slides.length,
      });

      return {
        previewId,
        projectId: request.projectId,
        frames: [],
        duration: 0,
        slidesIncluded: 0,
        resolution: RESOLUTION_MAP[config.resolution],
        generatedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gera frames individuais para cada slide
   */
  private async generateFrames(
    previewId: string,
    slides: SlidePreviewData[],
    avatar: AvatarConfig | undefined,
    config: PreviewConfig
  ): Promise<PreviewFrame[]> {
    const frames: PreviewFrame[] = [];
    let currentTime = 0;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const frameCount = Math.ceil(slide.duration * 10); // 10 frames per second for preview
      
      for (let f = 0; f < frameCount; f++) {
        const frame: PreviewFrame = {
          slideIndex: slide.index,
          timestamp: currentTime + (f / 10),
          imageUrl: this.getResizedImageUrl(slide.imageUrl, config.resolution),
        };

        // Add avatar overlay if enabled
        if (config.includeAvatar && avatar?.enabled && avatar.avatarUrl) {
          frame.avatarOverlay = this.generateAvatarOverlay(avatar);
        }

        frames.push(frame);
      }

      currentTime += slide.duration;

      // Emit progress
      this.emitProgress(previewId, {
        previewId,
        status: 'generating-frames',
        progress: 10 + Math.round((i / slides.length) * 60),
        currentSlide: i + 1,
        totalSlides: slides.length,
        estimatedTimeRemaining: (slides.length - i) * 0.5, // Rough estimate
      });
    }

    return frames;
  }

  /**
   * Gera timeline com transições entre frames
   */
  private generateTimeline(
    frames: PreviewFrame[],
    slides: SlidePreviewData[],
    config: PreviewConfig
  ): PreviewFrame[] {
    if (!config.includeTransitions) {
      return frames;
    }

    const timelineFrames: PreviewFrame[] = [];
    let currentSlideIndex = -1;
    let transitionStartTime = 0;

    for (const frame of frames) {
      // Check if we're transitioning to a new slide
      if (frame.slideIndex !== currentSlideIndex && currentSlideIndex >= 0) {
        const prevSlide = slides.find((s: SlidePreviewData) => s.index === currentSlideIndex);
        const transition = prevSlide?.transition || { type: 'fade' as const, duration: 0.5 };
        
        if (transition.type !== 'none') {
          const transitionDuration = TRANSITION_DURATIONS[transition.type];
          
          // Check if this frame is within the transition period
          if (frame.timestamp < transitionStartTime + transitionDuration) {
            const progress = (frame.timestamp - transitionStartTime) / transitionDuration;
            frame.transition = {
              type: transition.type,
              progress: Math.min(1, Math.max(0, progress)),
            };
          }
        }
        
        transitionStartTime = frame.timestamp;
      }

      currentSlideIndex = frame.slideIndex;
      timelineFrames.push(frame);
    }

    return timelineFrames;
  }

  /**
   * Calcula quais slides cabem no tempo máximo de preview
   */
  private calculateSlidesToInclude(
    slides: SlidePreviewData[],
    config: PreviewConfig
  ): { slidesToInclude: SlidePreviewData[]; totalDuration: number } {
    let totalDuration = 0;
    const slidesToInclude: SlidePreviewData[] = [];

    const startIndex = config.startSlide ?? 0;
    const endIndex = config.endSlide ?? slides.length - 1;

    for (let i = startIndex; i <= endIndex && i < slides.length; i++) {
      const slide = slides[i];
      
      if (totalDuration + slide.duration > config.maxDuration) {
        // Truncate last slide to fit
        const remaining = config.maxDuration - totalDuration;
        if (remaining > 1) { // Only include if at least 1 second fits
          slidesToInclude.push({
            ...slide,
            duration: remaining,
          });
          totalDuration += remaining;
        }
        break;
      }

      slidesToInclude.push(slide);
      totalDuration += slide.duration;
    }

    return { slidesToInclude, totalDuration };
  }

  /**
   * Gera overlay de avatar
   */
  private generateAvatarOverlay(avatar: AvatarConfig): string {
    const size = AVATAR_SIZES[avatar.size];
    const position = avatar.position === 'custom' 
      ? { x: avatar.customX ?? 0, y: avatar.customY ?? 0 }
      : AVATAR_POSITIONS[avatar.position];

    return JSON.stringify({
      avatarUrl: avatar.avatarUrl,
      size,
      position,
    });
  }

  /**
   * Retorna URL da imagem redimensionada para preview
   */
  private getResizedImageUrl(originalUrl: string, resolution: PreviewConfig['resolution']): string {
    const { width, height } = RESOLUTION_MAP[resolution];
    
    // Add resize parameters to URL (depends on image service)
    if (originalUrl.includes('supabase.co')) {
      return `${originalUrl}?width=${width}&height=${height}&resize=contain`;
    }
    
    return originalUrl;
  }

  /**
   * Gera hash dos slides para cache key
   */
  private hashSlides(slides: SlidePreviewData[]): string {
    const data = slides.map((s: SlidePreviewData) => `${s.id}:${s.duration}:${s.imageUrl}`).join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Gera ID único para preview
   */
  private generatePreviewId(): string {
    return `preview_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Registra callback para updates de progresso
   */
  onProgress(previewId: string, callback: (progress: PreviewProgress) => void): void {
    this.progressCallbacks.set(previewId, callback);
  }

  /**
   * Remove callback de progresso
   */
  offProgress(previewId: string): void {
    this.progressCallbacks.delete(previewId);
  }

  /**
   * Emite update de progresso
   */
  private emitProgress(previewId: string, progress: PreviewProgress): void {
    const callback = this.progressCallbacks.get(previewId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Busca preview no cache
   */
  getCachedPreview(
    projectId: string,
    config: Partial<PreviewConfig>,
    slides: SlidePreviewData[]
  ): PreviewResult | null {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const cacheKey = previewCache.generateKey(
      projectId,
      fullConfig,
      this.hashSlides(slides)
    );
    return previewCache.get(cacheKey);
  }

  /**
   * Limpa cache de previews
   */
  clearCache(): void {
    previewCache.clear();
    logger.info('Preview cache cleared');
  }

  /**
   * Retorna estatísticas do cache
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return previewCache.getStats();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Cria instância do gerador de preview
 */
export function createPreviewGenerator(config?: Partial<PreviewConfig>): VideoPreviewGenerator {
  return new VideoPreviewGenerator(config);
}

/**
 * Gera preview com configuração padrão
 */
export async function generateQuickPreview(
  projectId: string,
  slides: SlidePreviewData[],
  avatar?: AvatarConfig
): Promise<PreviewResult> {
  const generator = new VideoPreviewGenerator();
  return generator.generatePreview({
    projectId,
    slides,
    avatar,
  });
}

/**
 * Gera preview de alta qualidade (720p)
 */
export async function generateHQPreview(
  projectId: string,
  slides: SlidePreviewData[],
  avatar?: AvatarConfig
): Promise<PreviewResult> {
  const generator = new VideoPreviewGenerator({
    resolution: 'standard',
    maxDuration: 60,
  });
  return generator.generatePreview({
    projectId,
    slides,
    avatar,
  });
}

/**
 * Calcula duração total estimada do vídeo
 */
export function calculateTotalDuration(slides: SlidePreviewData[]): number {
  return slides.reduce((total: number, slide: SlidePreviewData) => total + slide.duration, 0);
}

/**
 * Valida se slides têm dados suficientes para preview
 */
export function validateSlidesForPreview(slides: SlidePreviewData[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (slides.length === 0) {
    errors.push('Nenhum slide fornecido');
    return { valid: false, errors };
  }

  for (const slide of slides) {
    if (!slide.imageUrl) {
      errors.push(`Slide ${slide.index + 1}: imagem não encontrada`);
    }
    if (slide.duration <= 0) {
      errors.push(`Slide ${slide.index + 1}: duração inválida`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Export Types
// =============================================================================

export {
  DEFAULT_CONFIG as defaultPreviewConfig,
  RESOLUTION_MAP as previewResolutions,
  TRANSITION_DURATIONS as transitionDurations,
  AVATAR_SIZES as avatarSizes,
  AVATAR_POSITIONS as avatarPositions,
};
