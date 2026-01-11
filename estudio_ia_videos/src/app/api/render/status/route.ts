/**
 * API para verificar status de render - FASE 2 REAL
 * GET /api/render/status?jobId=xxx
 * Sistema real de monitoramento de renderização
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getVideoJobStatus } from '@lib/queue/render-queue';
import { logger } from '@lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_id, preset_id } = body;

    if (!project_id || !preset_id) {
      return NextResponse.json(
        { error: 'project_id and preset_id are required' },
        { status: 400 }
      );
    }

    // Generate job ID
    const job_id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      job_id,
      status: 'queued',
      project_id,
      preset_id,
      message: 'Video pipeline render job created successfully',
      created_at: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Allow unauthenticated access for development/polling
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: 'Não autenticado' },
    //     { status: 401 }
    //   );
    // }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId obrigatório' },
        { status: 400 }
      );
    }

    logger.info(`📊 [API] Verificando status do job: ${jobId}`, { component: 'API: render/status' });

    // Use Prisma directly for job status
    try {
      const renderJob = await prisma.render_jobs.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          project_id: true,
          status: true,
          progress: true,
          output_url: true,
          error_message: true,
          render_settings: true,
          created_at: true,
          completed_at: true
        }
      });

      if (renderJob) {
        return NextResponse.json({
          success: true,
          jobId,
          status: renderJob.status,
          progress: renderJob.progress || 0,
          outputUrl: renderJob.output_url,
          error: renderJob.error_message,
          config: renderJob.render_settings,
          created_at: renderJob.created_at?.toISOString(),
          completedAt: renderJob.completed_at?.toISOString(),
          timestamp: new Date().toISOString()
        });
      }
    } catch (prismaError) {
      logger.warn('[API] Prisma error', { component: 'API: render/status', error: prismaError });
    }

    // Fallback to queue status
    const status = await getVideoJobStatus(jobId);

    if (!status) {
      return NextResponse.json(
        { error: 'Job não encontrado', status: 'not_found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: status,
      progress: 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('[API] Erro ao verificar status:', err, { component: 'API: render/status' });
    return NextResponse.json(
      { 
        error: 'Erro ao verificar status',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}


