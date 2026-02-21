/**
 * API Endpoint: Studio Export
 * POST /api/studio/export
 * Recebe snapshot do timeline-store e inicia renderização
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { prepareStudioExportPayload } from '@lib/render/studio-render-adapter';
import type { TimelineProject } from '@lib/types/timeline-types';
import { getAppOrigin } from '@/lib/config/app-url';

export async function POST(req: NextRequest) {
  try {
    const blocked = await applyRateLimit(req, 'studio-export', 5);
    if (blocked) return blocked;

    // Autenticação segura - x-user-id BLOCKED em produção
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

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
    const baseUrl = getAppOrigin();
    // Propagate cookies from original request for proper auth in internal call
    const cookieHeader = req.headers.get('cookie') || '';
    const authHeader = req.headers.get('authorization') || '';
    const renderResponse = await fetch(`${baseUrl}/api/render/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { 'cookie': cookieHeader } : {}),
        ...(authHeader ? { 'authorization': authHeader } : {}),
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
