// Buffer type is correct - fs.readFileSync returns Buffer which S3StorageService.uploadFile accepts

/**
 * 🎬 Video Render API v2.0 - Production Real
 * Renderização real de vídeos usando FFMPEG e pipeline de produção
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3StorageService } from '@lib/s3-storage';
import { VideoRenderPipeline } from '@lib/video/video-render-pipeline';
import crypto from 'crypto';
import fs from 'fs';
import { logger } from '@lib/logger';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

interface RenderJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  outputPath?: string;
  errorMessage?: string;
  settings: RenderSettings;
}

interface RenderSettings {
  width: number;
  height: number;
  fps: number;
  bitrate: string;
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  audioQuality: number;
  enableAudio: boolean;
}

// Mock storage para jobs (em produção seria um banco de dados)
const renderJobs = new Map<string, RenderJob>();

export async function POST(request: NextRequest) {
  const blocked = await applyRateLimit(request, 'video-prod-v2', 5);
  if (blocked) return blocked;

  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  logger.info('🎬 [Video Render v2] Iniciando renderização de produção...', { component: 'API: v1/render/video-production-v2' })
  
  try {
    const body = await request.json();
    const { slides, timeline, settings } = body;

    // Validar dados de entrada
    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json(
        { success: false, error: 'Slides são obrigatórios' },
        { status: 400 }
      );
    }

    if (!timeline || !timeline.totalDuration) {
      return NextResponse.json(
        { success: false, error: 'Timeline é obrigatório' },
        { status: 400 }
      );
    }

    // Configurações padrão
    const renderSettings: RenderSettings = {
      width: settings?.width || 1920,
      height: settings?.height || 1080,
      fps: settings?.fps || 30,
      bitrate: settings?.bitrate || '8000k',
      format: settings?.format || 'mp4',
      quality: settings?.quality || 'high',
      audioQuality: settings?.audioQuality || 192,
      enableAudio: settings?.enableAudio !== false
    };

    // Gerar job ID único
    const jobId = `render_${crypto.randomBytes(16).toString('hex')}`;
    
    // Criar job
    const job: RenderJob = {
      jobId,
      status: 'queued',
      progress: 0,
      startedAt: new Date().toISOString(),
      settings: renderSettings
    };

    renderJobs.set(jobId, job);

    logger.info('📋 [Video Render v2] Job criado', { 
      component: 'API: v1/render/video-production-v2',
      jobId,
      slides: slides.length,
      duration: timeline.totalDuration,
      settings: renderSettings
    });

    // Iniciar renderização assíncrona
    processRenderJob(jobId, slides, timeline, renderSettings).catch(error => {
      logger.error(`❌ [Video Render v2] Erro no job ${jobId}`, error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/render/video-production-v2' })
      
      const failedJob = renderJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        failedJob.completedAt = new Date().toISOString();
        renderJobs.set(jobId, failedJob);
      }
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Renderização iniciada com sucesso',
      estimatedTime: Math.ceil(timeline.totalDuration * 2), // Estimativa: 2x a duração do vídeo
      status: 'queued'
    });

  } catch (error) {
    logger.error('❌ [Video Render v2] Erro na criação do job:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/render/video-production-v2' });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno na renderização',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Job ID é obrigatório' },
      { status: 400 }
    );
  }

  const job = renderJobs.get(jobId);
  
  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job não encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    job: {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      outputPath: job.outputPath || 'Em processamento...',
      errorMessage: job.errorMessage,
      settings: job.settings
    }
  });
}

// Processo de renderização assíncrona
async function processRenderJob(
  jobId: string, 
  slides: unknown[], 
  timeline: { totalDuration: number; [key: string]: unknown }, 
  settings: RenderSettings
) {
  logger.info(`🔄 [Video Render v2] Processando job ${jobId}...`, { component: 'API: v1/render/video-production-v2' });

  const job = renderJobs.get(jobId);
  if (!job) return;

  try {
    // Atualizar status
    job.status = 'processing';
    job.progress = 10;
    renderJobs.set(jobId, job);

    // Inicializar pipeline de renderização com settings compatíveis
    const pipeline = new VideoRenderPipeline({ 
      outputDir: '/tmp',
      cleanupOnComplete: true 
    });
    
    // Fase 1: Preparar assets
    logger.info(`📦 [Video Render v2] Preparando assets para job ${jobId}...`, { component: 'API: v1/render/video-production-v2' });
    const assets = await pipeline.prepareAssets(slides as never);
    job.progress = 30;
    renderJobs.set(jobId, job);

    // Fase 2-4: Executar pipeline completo (métodos individuais foram removidos, usar execute())
    logger.info(`🎬 [Video Render v2] Executando pipeline completo para job ${jobId}...`, { component: 'API: v1/render/video-production-v2' });
    // TODO: Extrair projectId dos slides ou timeline, ou passar como parâmetro
    const projectId = (slides[0] as unknown as { projectId?: string })?.projectId || `temp-${jobId}`;
    const outputPath = await pipeline.execute({
      projectId,
      jobId,
      outputFormat: settings.format === 'webm' ? 'webm' : 'mp4',
      quality: (settings.quality === 'ultra' ? 'high' : settings.quality) || 'medium',
      resolution: settings.width >= 3840 ? '4k' : settings.width >= 1920 ? '1080p' : '720p'
    });
    job.progress = 95;
    renderJobs.set(jobId, job);

    // Fase 5: Upload para S3 (se disponível)
    let finalPath = outputPath;
    try {
      logger.info(`☁️ [Video Render v2] Fazendo upload para S3 do job ${jobId}...`, { component: 'API: v1/render/video-production-v2' });
      const s3Key = `rendered-videos/${jobId}.${settings.format}`;
      
      // Ler arquivo do disco de forma assíncrona
      const fileBuffer = await fs.promises.readFile(outputPath);
      
      const uploadUrl = await S3StorageService.uploadFile(
        s3Key,
        fileBuffer,
        `video/${settings.format}`
      );
      
      if (uploadUrl) {
        finalPath = uploadUrl;
      }
    } catch (s3Error) {
      logger.warn(`⚠️ [Video Render v2] Upload S3 falhou para job ${jobId}:`, { component: 'API: v1/render/video-production-v2' });
    }

    // Finalizar job
    job.status = 'completed';
    job.progress = 100;
    job.outputPath = finalPath;
    job.completedAt = new Date().toISOString();
    renderJobs.set(jobId, job);

    logger.info(`✅ [Video Render v2] Job ${jobId} concluído com sucesso!`, { component: 'API: v1/render/video-production-v2' });

  } catch (error) {
    logger.error(`❌ [Video Render v2] Erro no job ${jobId}:`, error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/render/video-production-v2' });
    
    job.status = 'failed';
    job.errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na renderização';
    job.completedAt = new Date().toISOString();
    renderJobs.set(jobId, job);
  }
}

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
