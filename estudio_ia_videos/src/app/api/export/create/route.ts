/**
 * API de Exportação Avançada
 * 
 * Endpoints para exportação multi-formato com otimização
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportSystem } from '@lib/export-advanced-system';
import type { ExportOptions, TargetPlatform } from '@lib/export-advanced-system';
import { logger } from '@lib/logger';
import { getServerSession } from 'next-auth';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/export/create
 * Cria job de exportação customizado
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'export-create', 5);
    if (blocked) return blocked;

    // Auth guard
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, options } = body as {
      projectId: string;
      options: ExportOptions;
    };

    // Use server-side userId instead of client-supplied
    const userId = session.user.id;

    if (!projectId || !options) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, options', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const job = await exportSystem.createExportJob(projectId, userId, options);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentPhase: job.currentPhase,
        options: job.options,
      },
    });
  } catch (error) {
    logger.error('Export creation error', error instanceof Error ? error : new Error(String(error)), { component: 'API: export/create' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export creation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/create?jobId=xxx
 * Obtém status do job
 */
export async function GET(request: NextRequest) {
  try {
    // Auth guard
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const job = exportSystem.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentPhase: job.currentPhase,
        outputPath: job.outputPath,
        thumbnailPath: job.thumbnailPath,
        metadata: job.metadata,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
    });
  } catch (error) {
    logger.error('Job status error', error instanceof Error ? error : new Error(String(error)), { component: 'API: export/create' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get job status' },
      { status: 500 }
    );
  }
}

