/**
 * API: Stuck Jobs Monitor & Recovery
 * GET /api/render/stuck-jobs - Lista jobs travados
 * POST /api/render/stuck-jobs - Força recuperação de jobs
 * 
 * F2.4 Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobManager, RenderJob } from '@lib/render/job-manager';
import { stuckJobMonitor } from '@lib/render/stuck-job-monitor';
import { logger } from '@lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

/**
 * GET - Lista jobs stuck sem modificá-los
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const thresholdMin = parseInt(searchParams.get('threshold') || '30');

    logger.info('Checking stuck jobs', {
      component: 'StuckJobsAPI',
      threshold: `${thresholdMin}min`
    });

    const stuckJobs = await jobManager.findStuckJobs(thresholdMin);

    return NextResponse.json({
      success: true,
      count: stuckJobs.length,
      threshold: `${thresholdMin} minutes`,
      jobs: stuckJobs.map((job: RenderJob) => ({
        id: job.id,
        projectId: job.projectId,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        lastUpdate: job.completedAt || job.startedAt || job.createdAt,
        stuckDuration: job.startedAt
          ? Math.floor((Date.now() - job.startedAt.getTime()) / 60000)
          : 0
      })),
      monitorStatus: stuckJobMonitor.getStatus()
    });
  } catch (error) {
    logger.error('Error listing stuck jobs', error instanceof Error ? error : new Error(String(error)), {
      component: 'StuckJobsAPI'
    });

    return NextResponse.json(
      {
        error: 'Failed to list stuck jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Força recuperação (fail) de jobs stuck
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const thresholdMin = body.threshold || 30;
    const action = body.action || 'fail'; // 'fail' ou 'check'

    logger.info('Stuck jobs recovery triggered', {
      component: 'StuckJobsAPI',
      threshold: `${thresholdMin}min`,
      action
    });

    if (action === 'check') {
      // Apenas verifica sem modificar
      const stuckJobs = await jobManager.findStuckJobs(thresholdMin);
      return NextResponse.json({
        success: true,
        action: 'check',
        count: stuckJobs.length,
        jobs: stuckJobs.map((j: RenderJob) => j.id)
      });
    }

    if (action === 'fail') {
      // Marca jobs como failed
      const failedCount = await jobManager.failStuckJobs(thresholdMin);

      logger.info(`Failed ${failedCount} stuck jobs`, {
        component: 'StuckJobsAPI',
        failedCount
      });

      return NextResponse.json({
        success: true,
        action: 'fail',
        failedCount,
        message: `${failedCount} stuck jobs marked as failed`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check" or "fail"' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error recovering stuck jobs', error instanceof Error ? error : new Error(String(error)), {
      component: 'StuckJobsAPI'
    });

    return NextResponse.json(
      {
        error: 'Failed to recover stuck jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
