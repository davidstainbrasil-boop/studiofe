/**
 * API Render - Renderização de vídeos com FFmpeg
 * POST /api/render
 */

import { NextRequest, NextResponse } from 'next/server';
import { FFmpegRenderer, SlideData } from '@/lib/video/ffmpeg-renderer';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const slideSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  content: z.string(),
  duration: z.number().min(1).max(60).default(5),
  audioUrl: z.string().optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
});

const renderSchema = z.object({
  slides: z.array(slideSchema).min(1).max(100),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  config: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    fps: z.number().optional(),
    videoBitrate: z.string().optional(),
    audioBitrate: z.string().optional(),
    format: z.enum(['mp4', 'webm']).optional(),
  }).optional(),
});

// Armazenar jobs em andamento (em produção, usar Redis/DB)
const renderJobs = new Map<string, {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
  createdAt: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = renderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { slides, projectId, projectName, config } = validation.data;
    const finalProjectId = projectId || randomUUID();
    const jobId = randomUUID();

    console.log(`[Render API] Iniciando job ${jobId} com ${slides.length} slides`);

    // Registrar job
    renderJobs.set(jobId, {
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    });

    // Processar assincronamente
    processRenderJob(jobId, slides as SlideData[], finalProjectId, config || {});

    return NextResponse.json({
      success: true,
      jobId,
      projectId: finalProjectId,
      projectName: projectName || 'Video Project',
      slideCount: slides.length,
      status: 'queued',
      message: 'Renderização iniciada. Use /api/render/status/{jobId} para verificar o progresso.',
      estimatedDuration: slides.reduce((acc, s) => acc + (s.duration || 5), 0),
    }, { status: 202 });

  } catch (error) {
    console.error('[Render API] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function processRenderJob(
  jobId: string,
  slides: SlideData[],
  projectId: string,
  config: Record<string, unknown>
) {
  try {
    // Atualizar status
    renderJobs.set(jobId, {
      ...renderJobs.get(jobId)!,
      status: 'processing',
      progress: 10,
    });

    // Renderizar vídeo
    const result = await FFmpegRenderer.renderVideo(slides, projectId, config);

    if (result.success) {
      renderJobs.set(jobId, {
        ...renderJobs.get(jobId)!,
        status: 'completed',
        progress: 100,
        videoUrl: result.videoUrl,
      });
    } else {
      renderJobs.set(jobId, {
        ...renderJobs.get(jobId)!,
        status: 'failed',
        error: result.error,
      });
    }

  } catch (error) {
    renderJobs.set(jobId, {
      ...renderJobs.get(jobId)!,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (jobId) {
    const job = renderJobs.get(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      ...job,
    });
  }

  // Verificar FFmpeg
  const ffmpegAvailable = await FFmpegRenderer.checkFFmpeg();

  return NextResponse.json({
    service: 'Video Render API',
    version: '1.0.0',
    engine: 'FFmpeg',
    ffmpegAvailable,
    defaultConfig: FFmpegRenderer.DEFAULT_CONFIG,
    usage: {
      method: 'POST',
      body: {
        slides: [
          {
            title: 'Título do Slide',
            content: 'Conteúdo do slide',
            duration: 5,
            audioUrl: '/audio/slide1.mp3 (opcional)',
            backgroundColor: '#1a1a2e (opcional)',
          },
        ],
        projectId: 'UUID (opcional)',
        projectName: 'Nome do Projeto (opcional)',
        config: {
          width: 1920,
          height: 1080,
          fps: 30,
          format: 'mp4',
        },
      },
    },
    activeJobs: Array.from(renderJobs.entries()).filter(([_, j]) => 
      j.status === 'queued' || j.status === 'processing'
    ).length,
  });
}
