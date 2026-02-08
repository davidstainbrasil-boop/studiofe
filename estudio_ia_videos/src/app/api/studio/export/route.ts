/**
 * API Endpoint: Studio Export
 * POST /api/studio/export
 * Recebe snapshot do timeline-store e inicia renderização
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { prepareStudioExportPayload } from '@lib/render/studio-render-adapter';
import type { TimelineProject } from '@lib/types/timeline-types';

export async function POST(req: NextRequest) {
  try {
    const blocked = await applyRateLimit(req, 'studio-export', 5);
    if (blocked) return blocked;

    // Autenticação
    let userId = req.headers.get('x-user-id');
    
    if (!userId) {
      const supabase = getSupabaseForRequest(req);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    const body = await req.json();
    const { project, config } = body as {
      project: TimelineProject;
      config?: {
        quality?: 'low' | 'medium' | 'high' | 'ultra';
        width?: number;
        height?: number;
        fps?: number;
      };
    };

    if (!project || !project.id) {
      return NextResponse.json(
        { error: 'Projeto inválido ou ausente' },
        { status: 400 }
      );
    }

    logger.info('Studio export requested', {
      userId,
      projectId: project.id,
      duration: project.duration,
      layers: project.layers?.length || 0
    });

    // Converte timeline-store para formato de render
    const renderPayload = prepareStudioExportPayload(
      project.id,
      project,
      config
    );

    // Chama endpoint de render existente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://cursostecno.com.br' : 'http://localhost:3000');
    const renderResponse = await fetch(`${baseUrl}/api/render/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(renderPayload)
    });

    if (!renderResponse.ok) {
      const errorData = await renderResponse.json();
      logger.error('Render start failed', new Error(errorData.error || 'Unknown error'), {
        projectId: project.id,
        userId
      });

      return NextResponse.json(
        { error: errorData.error || 'Falha ao iniciar renderização' },
        { status: renderResponse.status }
      );
    }

    const renderResult = await renderResponse.json();

    logger.info('Studio export started successfully', {
      userId,
      projectId: project.id,
      jobId: renderResult.jobId
    });

    return NextResponse.json({
      success: true,
      jobId: renderResult.jobId,
      projectId: project.id,
      statusUrl: `/api/render/${renderResult.jobId}/progress`,
      message: 'Exportação iniciada com sucesso'
    });

  } catch (error) {
    logger.error('Studio export error', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar exportação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
