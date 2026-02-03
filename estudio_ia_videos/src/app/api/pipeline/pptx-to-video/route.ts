/**
 * 🚀 API: Pipeline PPTX → Vídeo E2E
 * POST /api/pipeline/pptx-to-video
 *
 * Endpoint unificado para o fluxo completo do diferencial do produto
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { getSupabaseForRequest } from '@/lib/supabase/server';
import { PptxToVideoService } from '@/lib/services/pptx-to-video.service';
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  logger.info('🚀 Pipeline PPTX → Vídeo iniciado', { component: 'API: pipeline/pptx-to-video' });

  try {
    // Autenticação
    let user;
    const bypassEnabled = process.env.NODE_ENV !== 'production';
    const bypassId = process.env.DEV_BYPASS_USER_ID || '00000000-0000-0000-0000-000000000000';
    const devBypassCookie = bypassEnabled && req.cookies.get('dev_bypass')?.value === 'true';
    const headerUserId = req.headers.get('x-user-id');
    
    if (bypassEnabled && (devBypassCookie || headerUserId === bypassId || headerUserId)) {
      user = { id: headerUserId || bypassId, email: 'admin@estudio.ai' };
    } else {
      const supabase = getSupabaseForRequest(req);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      user = authUser;
    }

    // Rate limiting (opcional para desenvolvimento)
    try {
      const tier = await getUserTier(user.id);
      const rateLimitResponse = await rateLimit(req, user.id, tier);
      if (!rateLimitResponse.success) {
        return NextResponse.json({ 
          error: 'Rate limit excedido',
          retryAfter: rateLimitResponse.retryAfter 
        }, { status: 429 });
      }
    } catch (rateLimitError) {
      // Em desenvolvimento, continuar sem rate limit se houver erro
      logger.info('Rate limit falhou, continuando sem limitação em dev', {
        error: rateLimitError instanceof Error ? rateLimitError.message : 'Rate limit error'
      });
    }

    // Parsing dos dados
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectName = formData.get('projectName') as string || 'Projeto PPTX';
    const voiceId = formData.get('voiceId') as string;
    const ttsProvider = (formData.get('ttsProvider') as string || 'mock') as 'elevenlabs' | 'azure' | 'google' | 'mock';
    const avatarId = formData.get('avatarId') as string;
    const resolution = (formData.get('resolution') as string || '1080p') as '720p' | '1080p' | '4k';
    const generateSubtitles = formData.get('generateSubtitles') === 'true';

    // Validações
    if (!file) {
      return NextResponse.json({ error: 'Arquivo PPTX é obrigatório' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pptx')) {
      return NextResponse.json({ error: 'Apenas arquivos PPTX são aceitos' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 50MB' }, { status: 400 });
    }

    logger.info('📋 Configurações do pipeline:', {
      component: 'API: pipeline/pptx-to-video',
      fileName: file.name,
      fileSize: file.size,
      projectName,
      ttsProvider,
      resolution,
      userId: user.id
    });

    // Executar pipeline
    const pipelineService = new PptxToVideoService();
    const result = await pipelineService.processPptxToVideo({
      userId: user.id,
      file,
      projectName,
      voiceId,
      ttsProvider,
      avatarId,
      resolution,
      generateSubtitles
    });

    if (result.status === 'failed') {
      return NextResponse.json({ 
        error: 'Falha no processamento do pipeline' 
      }, { status: 500 });
    }

    logger.info('✅ Pipeline PPTX → Vídeo concluído', {
      component: 'API: pipeline/pptx-to-video',
      projectId: result.projectId,
      slidesCount: result.slides.length,
      status: result.status
    });

    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      jobId: result.jobId,
      slides: result.slides,
      status: result.status,
      estimatedTime: result.estimatedTime,
      summary: {
        slidesProcessed: result.slides.length,
        totalDuration: result.slides.reduce((acc, slide) => acc + (slide.duration || 0), 0),
        hasAudio: result.slides.some(slide => slide.audioUrl),
        nextStep: result.jobId ? 'Renderização iniciada' : 'TTS gerado, iniciar renderização'
      }
    });

  } catch (error) {
    logger.error('❌ Erro no pipeline PPTX → Vídeo', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: pipeline/pptx-to-video'
    });

    return NextResponse.json({
      error: 'Erro interno no pipeline',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Pipeline PPTX → Vídeo E2E',
    method: 'POST',
    description: 'Converte PPTX completo em projeto de vídeo com TTS',
    parameters: {
      file: 'File (PPTX, max 50MB)',
      projectName: 'string (opcional)',
      voiceId: 'string (opcional)',
      ttsProvider: 'elevenlabs | azure | google | mock (padrão: mock)',
      avatarId: 'string (opcional)',
      resolution: '720p | 1080p | 4k (padrão: 1080p)',
      generateSubtitles: 'boolean (padrão: false)'
    },
    response: {
      projectId: 'string',
      jobId: 'string (se render iniciado)',
      slides: 'Array<Slide>',
      status: 'slides_extracted | tts_generated | render_started',
      estimatedTime: 'number (segundos)'
    },
    example: `
      curl -X POST http://localhost:3003/api/pipeline/pptx-to-video \\
        -F "file=@presentation.pptx" \\
        -F "projectName=Treinamento NR-10" \\
        -F "ttsProvider=mock" \\
        -F "resolution=1080p" \\
        -H "x-user-id: \${DEV_BYPASS_USER_ID}"
    `
  });
}