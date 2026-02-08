/**
 * API Video Generate - Gera vídeo completo com TTS e Renderização
 * POST /api/video/generate
 * 
 * Pipeline completo:
 * 1. Recebe slides com texto
 * 2. Gera áudio TTS para cada slide
 * 3. Renderiza vídeo com FFmpeg
 * 4. Retorna vídeo final
 */

import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTSService } from '@lib/tts/edge-tts-service';
import { FFmpegRenderer, SlideData } from '@lib/video/ffmpeg-renderer';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logger } from '@lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

const slideInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  narration: z.string().optional(), // Texto para TTS
  duration: z.number().min(1).max(120).optional(),
  backgroundColor: z.string().optional(),
});

const generateSchema = z.object({
  slides: z.array(slideInputSchema).min(1).max(50),
  projectName: z.string().optional(),
  voice: z.string().optional().default('pt-BR-FranciscaNeural'),
  generateAudio: z.boolean().optional().default(true),
  config: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    format: z.enum(['mp4', 'webm']).optional(),
  }).optional(),
});

// Jobs em memória (em produção, usar Redis)
const videoJobs = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  step: string;
  progress: number;
  videoUrl?: string;
  error?: string;
  createdAt: number;
}>();

export async function POST(request: NextRequest) {
  const blocked = await applyRateLimit(request, 'video-generate', 5);
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { slides, projectName, voice, generateAudio, config } = validation.data;
    const jobId = randomUUID();
    const projectId = randomUUID();

    logger.info('Iniciando geração de vídeo', {
      component: 'API: video/generate',
      jobId,
      slideCount: slides.length,
      projectName
    });

    // Registrar job
    videoJobs.set(jobId, {
      status: 'processing',
      step: 'Iniciando...',
      progress: 0,
      createdAt: Date.now(),
    });

    // Processar em background
    processVideoGeneration(jobId, projectId, slides, voice, generateAudio, config || {});

    return NextResponse.json({
      success: true,
      jobId,
      projectId,
      projectName: projectName || 'Vídeo Gerado',
      slideCount: slides.length,
      status: 'processing',
      checkStatusUrl: `/api/video/generate/status?jobId=${jobId}`,
      message: 'Geração de vídeo iniciada',
    }, { status: 202 });

  } catch (error) {
    logger.error('[Video Generate] Erro', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: video/generate'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

async function processVideoGeneration(
  jobId: string,
  projectId: string,
  inputSlides: z.infer<typeof slideInputSchema>[],
  voice: string,
  generateAudio: boolean,
  config: Record<string, unknown>
) {
  try {
    const slides: SlideData[] = [];
    const totalSteps = inputSlides.length * (generateAudio ? 2 : 1) + 1;
    let currentStep = 0;

    // 1. Gerar áudio TTS para cada slide (se habilitado)
    for (let i = 0; i < inputSlides.length; i++) {
      const input = inputSlides[i];
      const slideId = `slide-${i + 1}`;
      
      let audioUrl: string | undefined;
      
      if (generateAudio) {
        const narrationText = input.narration || input.content || input.title;
        
        if (narrationText && narrationText.trim().length > 0) {
          currentStep++;
          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            step: `Gerando áudio do slide ${i + 1}/${inputSlides.length}`,
            progress: Math.round((currentStep / totalSteps) * 100),
          });

          const ttsResult = await EdgeTTSService.synthesize({
            text: narrationText,
            voice,
          });

          if (ttsResult.success && ttsResult.fileUrl) {
            audioUrl = ttsResult.fileUrl;
          }
        }
      }

      // Calcular duração baseado no texto ou áudio
      let duration = input.duration || 5;
      if (!input.duration && input.narration) {
        duration = EdgeTTSService.estimateDuration(input.narration);
      }

      slides.push({
        id: slideId,
        title: input.title,
        content: input.content,
        duration,
        audioUrl,
        backgroundColor: input.backgroundColor || '#1a1a2e',
      });

      currentStep++;
      videoJobs.set(jobId, {
        ...videoJobs.get(jobId)!,
        step: `Preparando slide ${i + 1}/${inputSlides.length}`,
        progress: Math.round((currentStep / totalSteps) * 100),
      });
    }

    // 2. Renderizar vídeo
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId)!,
      step: 'Renderizando vídeo...',
      progress: 80,
    });

    const renderResult = await FFmpegRenderer.renderVideo(slides, projectId, config);

    if (renderResult.success && renderResult.videoUrl) {
      videoJobs.set(jobId, {
        ...videoJobs.get(jobId)!,
        status: 'completed',
        step: 'Concluído!',
        progress: 100,
        videoUrl: renderResult.videoUrl,
      });
      
      logger.info('Job de vídeo concluído', {
        component: 'API: video/generate',
        jobId,
        videoUrl: renderResult.videoUrl
      });
    } else {
      throw new Error(renderResult.error || 'Falha na renderização');
    }

  } catch (error) {
    logger.error('Job de vídeo falhou', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: video/generate',
      jobId
    });
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId)!,
      status: 'failed',
      step: 'Erro',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (jobId) {
    const job = videoJobs.get(jobId);
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

  // Verificar disponibilidade dos serviços
  const ffmpegOk = await FFmpegRenderer.checkFFmpeg();
  const voices = EdgeTTSService.getBrazilianVoices();

  return NextResponse.json({
    service: 'Video Generation API',
    version: '1.0.0',
    capabilities: {
      tts: true,
      render: ffmpegOk,
      voices: voices.length,
    },
    voices: voices.map(v => ({ id: v.id, name: v.name, gender: v.gender })),
    usage: {
      method: 'POST',
      body: {
        slides: [
          {
            title: 'Título do Slide',
            content: 'Conteúdo exibido',
            narration: 'Texto para narração TTS (opcional)',
            duration: 10,
            backgroundColor: '#1a1a2e',
          },
        ],
        projectName: 'Meu Vídeo',
        voice: 'pt-BR-FranciscaNeural',
        generateAudio: true,
        config: {
          width: 1920,
          height: 1080,
          format: 'mp4',
        },
      },
    },
    example: {
      curl: `curl -X POST http://localhost:3000/api/video/generate -H "Content-Type: application/json" -d '{"slides":[{"title":"Introdução","content":"Bem-vindos","narration":"Olá, bem-vindos ao curso."}]}'`,
    },
  });
}

