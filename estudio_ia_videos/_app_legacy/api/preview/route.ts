/**
 * 🎬 Video Preview API
 * 
 * Endpoints:
 * - POST /api/preview - Gera preview rápido de vídeo
 * - GET /api/preview?previewId=xxx - Busca preview existente
 * - DELETE /api/preview?previewId=xxx - Remove preview do cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Logger } from '@lib/logger';

const logger = new Logger('preview-api');

// =============================================================================
// Types (inline para evitar problemas de importação)
// =============================================================================

interface SlidePreviewData {
  id: string;
  index: number;
  imageUrl: string;
  duration: number;
  notes?: string;
  audioUrl?: string;
  transition?: {
    type: 'none' | 'fade' | 'slide' | 'dissolve' | 'wipe' | 'zoom';
    duration: number;
    direction?: 'left' | 'right' | 'up' | 'down';
  };
}

interface AvatarConfig {
  enabled: boolean;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'custom';
  size: 'small' | 'medium' | 'large';
  customX?: number;
  customY?: number;
  avatarUrl?: string;
}

interface PreviewConfig {
  maxDuration: number;
  resolution: 'draft' | 'preview' | 'standard';
  includeAudio: boolean;
  includeTransitions: boolean;
  includeAvatar: boolean;
  startSlide?: number;
  endSlide?: number;
}

interface PreviewFrame {
  slideIndex: number;
  timestamp: number;
  imageUrl: string;
  avatarOverlay?: string;
  transition?: {
    type: string;
    progress: number;
  };
}

interface PreviewResult {
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

// =============================================================================
// In-Memory Cache (será migrado para Redis em produção)
// =============================================================================

const previewCache = new Map<string, { result: PreviewResult; createdAt: Date }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

function getCachedPreview(previewId: string): PreviewResult | null {
  const entry = previewCache.get(previewId);
  if (!entry) return null;

  if (Date.now() - entry.createdAt.getTime() > CACHE_TTL_MS) {
    previewCache.delete(previewId);
    return null;
  }

  return entry.result;
}

function setCachedPreview(previewId: string, result: PreviewResult): void {
  // Limite de 100 previews no cache
  if (previewCache.size >= 100) {
    const oldestKey = previewCache.keys().next().value;
    if (oldestKey) {
      previewCache.delete(oldestKey);
    }
  }
  previewCache.set(previewId, { result, createdAt: new Date() });
}

function deleteCachedPreview(previewId: string): boolean {
  return previewCache.delete(previewId);
}

// =============================================================================
// Preview Generation Logic
// =============================================================================

function generatePreviewId(): string {
  return `preview_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function calculateSlidesToInclude(
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
      const remaining = config.maxDuration - totalDuration;
      if (remaining > 1) {
        slidesToInclude.push({ ...slide, duration: remaining });
        totalDuration += remaining;
      }
      break;
    }

    slidesToInclude.push(slide);
    totalDuration += slide.duration;
  }

  return { slidesToInclude, totalDuration };
}

function getResizedImageUrl(originalUrl: string, resolution: PreviewConfig['resolution']): string {
  const { width, height } = RESOLUTION_MAP[resolution];
  
  if (originalUrl.includes('supabase.co')) {
    return `${originalUrl}?width=${width}&height=${height}&resize=contain`;
  }
  
  return originalUrl;
}

function generateFrames(
  slides: SlidePreviewData[],
  avatar: AvatarConfig | undefined,
  config: PreviewConfig
): PreviewFrame[] {
  const frames: PreviewFrame[] = [];
  let currentTime = 0;

  for (const slide of slides) {
    const frameCount = Math.ceil(slide.duration * 10); // 10 fps para preview
    
    for (let f = 0; f < frameCount; f++) {
      const frame: PreviewFrame = {
        slideIndex: slide.index,
        timestamp: currentTime + (f / 10),
        imageUrl: getResizedImageUrl(slide.imageUrl, config.resolution),
      };

      if (config.includeAvatar && avatar?.enabled && avatar.avatarUrl) {
        frame.avatarOverlay = JSON.stringify({
          avatarUrl: avatar.avatarUrl,
          position: avatar.position,
          size: avatar.size,
        });
      }

      // Adicionar transição se estiver no início do slide (exceto primeiro)
      if (f < 5 && slide.index > 0 && config.includeTransitions && slide.transition) {
        frame.transition = {
          type: slide.transition.type,
          progress: f / 5,
        };
      }

      frames.push(frame);
    }

    currentTime += slide.duration;
  }

  return frames;
}

async function generatePreview(
  projectId: string,
  slides: SlidePreviewData[],
  avatar?: AvatarConfig,
  configOverride?: Partial<PreviewConfig>
): Promise<PreviewResult> {
  const previewId = generatePreviewId();
  const config = { ...DEFAULT_CONFIG, ...configOverride };

  logger.info('Starting preview generation', {
    previewId,
    projectId,
    slideCount: slides.length,
    resolution: config.resolution,
    maxDuration: config.maxDuration,
  });

  try {
    // Validar slides
    if (slides.length === 0) {
      throw new Error('Nenhum slide fornecido');
    }

    for (const slide of slides) {
      if (!slide.imageUrl) {
        throw new Error(`Slide ${slide.index + 1}: imagem não encontrada`);
      }
      if (slide.duration <= 0) {
        throw new Error(`Slide ${slide.index + 1}: duração inválida`);
      }
    }

    // Calcular slides que cabem no tempo máximo
    const { slidesToInclude, totalDuration } = calculateSlidesToInclude(slides, config);

    if (slidesToInclude.length === 0) {
      throw new Error('Nenhum slide cabe no tempo máximo configurado');
    }

    // Gerar frames
    const frames = generateFrames(slidesToInclude, avatar, config);

    // Calcular expiração
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    const result: PreviewResult = {
      previewId,
      projectId,
      frames,
      duration: totalDuration,
      slidesIncluded: slidesToInclude.length,
      resolution: RESOLUTION_MAP[config.resolution],
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'ready',
    };

    // Salvar no cache
    setCachedPreview(previewId, result);

    logger.info('Preview generation complete', {
      previewId,
      duration: totalDuration,
      slidesIncluded: slidesToInclude.length,
      frameCount: frames.length,
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    logger.error('Preview generation failed', error instanceof Error ? error : undefined);

    return {
      previewId,
      projectId,
      frames: [],
      duration: 0,
      slidesIncluded: 0,
      resolution: RESOLUTION_MAP[config.resolution],
      generatedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      status: 'error',
      errorMessage,
    };
  }
}

// =============================================================================
// Schemas
// =============================================================================

const slideSchema = z.object({
  id: z.string(),
  index: z.number().int().min(0),
  imageUrl: z.string().url(),
  duration: z.number().positive().max(300),
  notes: z.string().optional(),
  audioUrl: z.string().url().optional(),
  transition: z.object({
    type: z.enum(['none', 'fade', 'slide', 'dissolve', 'wipe', 'zoom']),
    duration: z.number().positive().max(5),
    direction: z.enum(['left', 'right', 'up', 'down']).optional(),
  }).optional(),
});

const avatarSchema = z.object({
  enabled: z.boolean(),
  position: z.enum(['bottom-left', 'bottom-right', 'top-left', 'top-right', 'custom']),
  size: z.enum(['small', 'medium', 'large']),
  customX: z.number().optional(),
  customY: z.number().optional(),
  avatarUrl: z.string().url().optional(),
});

const configSchema = z.object({
  maxDuration: z.number().positive().max(120).optional(),
  resolution: z.enum(['draft', 'preview', 'standard']).optional(),
  includeAudio: z.boolean().optional(),
  includeTransitions: z.boolean().optional(),
  includeAvatar: z.boolean().optional(),
  startSlide: z.number().int().min(0).optional(),
  endSlide: z.number().int().min(0).optional(),
});

const generatePreviewSchema = z.object({
  projectId: z.string().uuid(),
  slides: z.array(slideSchema).min(1).max(100),
  avatar: avatarSchema.optional(),
  config: configSchema.optional(),
  backgroundMusic: z.object({
    url: z.string().url(),
    volume: z.number().min(0).max(1),
  }).optional(),
});

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Buscar preview específico
  const previewId = searchParams.get('previewId');
  if (previewId) {
    const preview = getCachedPreview(previewId);
    
    if (!preview) {
      return NextResponse.json(
        { error: 'Preview não encontrado ou expirado' },
        { status: 404 }
      );
    }

    return NextResponse.json(preview);
  }

  // Documentação da API
  return NextResponse.json({
    name: 'Video Preview API',
    version: '1.0.0',
    description: 'Gera previews rápidos de vídeo sem renderização completa',
    endpoints: {
      'POST /api/preview': {
        description: 'Gera um novo preview',
        body: {
          projectId: 'UUID do projeto',
          slides: 'Array de slides com id, index, imageUrl, duration',
          avatar: 'Configuração opcional do avatar',
          config: 'Configuração opcional (maxDuration, resolution, etc)',
        },
      },
      'GET /api/preview?previewId=xxx': {
        description: 'Busca um preview existente',
      },
      'DELETE /api/preview?previewId=xxx': {
        description: 'Remove preview do cache',
      },
    },
    resolutions: RESOLUTION_MAP,
    defaultConfig: DEFAULT_CONFIG,
    limits: {
      maxDuration: '120 segundos',
      maxSlides: 100,
      cacheExpiration: '30 minutos',
    },
  });
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generatePreviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, slides, avatar, config } = parsed.data;

    // Gerar preview
    const result = await generatePreview(projectId, slides, avatar, config);

    if (result.status === 'error') {
      return NextResponse.json(
        { error: result.errorMessage, preview: result },
        { status: 422 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Erro ao processar requisição de preview', error instanceof Error ? error : undefined);
    
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE Handler
// =============================================================================

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const previewId = searchParams.get('previewId');

  if (!previewId) {
    return NextResponse.json(
      { error: 'previewId é obrigatório' },
      { status: 400 }
    );
  }

  const deleted = deleteCachedPreview(previewId);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Preview não encontrado' },
      { status: 404 }
    );
  }

  logger.info('Preview deleted', { previewId });

  return NextResponse.json({
    success: true,
    message: 'Preview removido com sucesso',
    previewId,
  });
}
