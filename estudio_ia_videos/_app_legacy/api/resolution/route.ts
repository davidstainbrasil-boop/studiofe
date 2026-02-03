/**
 * API Route: Resolution
 * Gerenciamento de resoluções e configurações de vídeo
 * 
 * @route GET /api/resolution - Lista resoluções e plataformas
 * @route POST /api/resolution - Gera configuração FFmpeg
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getResolutionService,
  AspectRatio,
  QualityPreset,
  PlatformPreset,
} from '@/src/lib/render/resolution-service';

// ============================================================================
// SCHEMAS
// ============================================================================

const getConfigSchema = z.object({
  action: z.literal('get-config'),
  quality: z.enum(['720p', '1080p', '1440p', '4k']),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '21:9']).optional(),
});

const platformConfigSchema = z.object({
  action: z.literal('platform-config'),
  platform: z.enum([
    'youtube', 'youtube_shorts', 'instagram_feed', 'instagram_stories',
    'instagram_reels', 'tiktok', 'linkedin', 'twitter', 'facebook',
    'whatsapp_status', 'custom'
  ]),
});

const ffmpegConfigSchema = z.object({
  action: z.literal('ffmpeg-config'),
  quality: z.enum(['720p', '1080p', '1440p', '4k']),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '21:9']).optional(),
  platform: z.enum([
    'youtube', 'youtube_shorts', 'instagram_feed', 'instagram_stories',
    'instagram_reels', 'tiktok', 'linkedin', 'twitter', 'facebook',
    'whatsapp_status', 'custom'
  ]).optional(),
  customWidth: z.number().positive().optional(),
  customHeight: z.number().positive().optional(),
  customFps: z.number().min(15).max(120).optional(),
  customBitrate: z.string().optional(),
  twoPass: z.boolean().optional(),
  hardwareAcceleration: z.enum(['none', 'nvidia', 'vaapi', 'videotoolbox']).optional(),
});

const validateSchema = z.object({
  action: z.literal('validate'),
  platform: z.enum([
    'youtube', 'youtube_shorts', 'instagram_feed', 'instagram_stories',
    'instagram_reels', 'tiktok', 'linkedin', 'twitter', 'facebook',
    'whatsapp_status'
  ]),
  durationSeconds: z.number().positive(),
  quality: z.enum(['720p', '1080p', '1440p', '4k']),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '21:9']).optional(),
});

const findBestSchema = z.object({
  action: z.literal('find-best'),
  durationSeconds: z.number().positive(),
  maxSizeMB: z.number().positive(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '21:9']).optional(),
});

const generateCommandSchema = z.object({
  action: z.literal('generate-command'),
  inputPath: z.string().min(1),
  outputPath: z.string().min(1),
  quality: z.enum(['720p', '1080p', '1440p', '4k']),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '21:9']).optional(),
  customWidth: z.number().positive().optional(),
  customHeight: z.number().positive().optional(),
  customFps: z.number().min(15).max(120).optional(),
  customBitrate: z.string().optional(),
  twoPass: z.boolean().optional(),
  hardwareAcceleration: z.enum(['none', 'nvidia', 'vaapi', 'videotoolbox']).optional(),
});

// ============================================================================
// GET - Listar resoluções e plataformas
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const aspectRatio = searchParams.get('aspectRatio') as AspectRatio | null;
    const service = getResolutionService();

    if (type === 'platforms') {
      // Lista plataformas suportadas
      const platforms = service.listPlatforms();
      return NextResponse.json({
        success: true,
        platforms,
      });
    }

    if (type === 'resolutions') {
      // Lista resoluções disponíveis
      const resolutions = aspectRatio
        ? service.listResolutionsByAspectRatio(aspectRatio)
        : service.listResolutions();
      
      return NextResponse.json({
        success: true,
        resolutions,
      });
    }

    // Retorna documentação
    return NextResponse.json({
      success: true,
      endpoints: {
        'GET /api/resolution?type=platforms': 'Lista plataformas suportadas',
        'GET /api/resolution?type=resolutions': 'Lista todas as resoluções',
        'GET /api/resolution?type=resolutions&aspectRatio=16:9': 'Lista resoluções por aspect ratio',
        'POST /api/resolution (action=get-config)': 'Obtém configuração de qualidade',
        'POST /api/resolution (action=platform-config)': 'Obtém configuração de plataforma',
        'POST /api/resolution (action=ffmpeg-config)': 'Gera configuração FFmpeg',
        'POST /api/resolution (action=validate)': 'Valida configuração para plataforma',
        'POST /api/resolution (action=find-best)': 'Encontra melhor qualidade para tamanho',
        'POST /api/resolution (action=generate-command)': 'Gera comando FFmpeg completo',
      },
      aspectRatios: ['16:9', '9:16', '1:1', '4:3', '21:9'],
      qualityPresets: ['720p', '1080p', '1440p', '4k'],
    });
  } catch (error) {
    console.error('[API Resolution GET] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Gerar configurações
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service = getResolutionService();

    // Get quality config
    if (body.action === 'get-config') {
      const parsed = getConfigSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { quality, aspectRatio } = parsed.data;
      const config = service.getQualityConfig(
        quality as QualityPreset,
        (aspectRatio || '16:9') as AspectRatio
      );

      return NextResponse.json({
        success: true,
        config,
      });
    }

    // Get platform config
    if (body.action === 'platform-config') {
      const parsed = platformConfigSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const settings = service.getSettingsForPlatform(
        parsed.data.platform as PlatformPreset
      );

      return NextResponse.json({
        success: true,
        settings,
      });
    }

    // Generate FFmpeg config
    if (body.action === 'ffmpeg-config') {
      const parsed = ffmpegConfigSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { quality, aspectRatio, platform, ...rest } = parsed.data;

      let settings;
      if (platform && platform !== 'custom') {
        settings = service.getSettingsForPlatform(platform as PlatformPreset);
      } else {
        settings = {
          quality: service.getQualityConfig(
            quality as QualityPreset,
            (aspectRatio || '16:9') as AspectRatio
          ),
        };
      }

      // Apply custom settings
      Object.assign(settings, rest);

      const ffmpegConfig = service.generateFFmpegConfig(settings);

      return NextResponse.json({
        success: true,
        ffmpegConfig,
        resolution: settings.quality.resolution,
      });
    }

    // Validate for platform
    if (body.action === 'validate') {
      const parsed = validateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { platform, durationSeconds, quality, aspectRatio } = parsed.data;
      const qualityConfig = service.getQualityConfig(
        quality as QualityPreset,
        (aspectRatio || '16:9') as AspectRatio
      );

      const validation = service.validateForPlatform(
        durationSeconds,
        qualityConfig,
        platform as PlatformPreset
      );

      const estimatedSize = service.estimateFileSize(
        durationSeconds,
        qualityConfig.videoBitrate,
        qualityConfig.audioBitrate
      );

      return NextResponse.json({
        success: true,
        validation,
        estimatedSizeMB: Math.round(estimatedSize * 100) / 100,
        quality: qualityConfig,
      });
    }

    // Find best quality for size
    if (body.action === 'find-best') {
      const parsed = findBestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { durationSeconds, maxSizeMB, aspectRatio } = parsed.data;
      const bestQuality = service.findBestQualityForSize(
        durationSeconds,
        maxSizeMB,
        (aspectRatio || '16:9') as AspectRatio
      );

      if (!bestQuality) {
        return NextResponse.json(
          { error: 'Não foi possível encontrar uma configuração válida para os limites especificados' },
          { status: 400 }
        );
      }

      const estimatedSize = service.estimateFileSize(
        durationSeconds,
        bestQuality.videoBitrate,
        bestQuality.audioBitrate
      );

      return NextResponse.json({
        success: true,
        quality: bestQuality,
        estimatedSizeMB: Math.round(estimatedSize * 100) / 100,
      });
    }

    // Generate complete FFmpeg command
    if (body.action === 'generate-command') {
      const parsed = generateCommandSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { inputPath, outputPath, quality, aspectRatio, ...rest } = parsed.data;

      const settings = {
        quality: service.getQualityConfig(
          quality as QualityPreset,
          (aspectRatio || '16:9') as AspectRatio
        ),
        ...rest,
      };

      const command = service.generateFFmpegCommand(inputPath, outputPath, settings);

      return NextResponse.json({
        success: true,
        command,
        settings,
      });
    }

    return NextResponse.json(
      { error: 'Ação não especificada ou inválida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API Resolution POST] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
