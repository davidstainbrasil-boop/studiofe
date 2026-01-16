/**
 * API Route: /api/lip-sync/status/[jobId]
 * Check status of async lip-sync generation job
 */

import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const lipSyncQueue = new Queue('lip-sync', { connection: redis });

export interface LipSyncStatusResponse {
  success: boolean;
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'unknown';
  progress?: number;
  result?: any;
  error?: string;
  createdAt?: number;
  processedOn?: number;
  finishedOn?: number;
}

/**
 * GET /api/lip-sync/status/[jobId]
 * Get job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    logger.info('[API] Checking lip-sync job status', { jobId });

    // Get job from queue
    const job = await lipSyncQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json<LipSyncStatusResponse>(
        {
          success: false,
          jobId,
          status: 'unknown',
          error: 'Job not found'
        },
        { status: 404 }
      );
    }

    // Determine job status
    const state = await job.getState();
    let status: LipSyncStatusResponse['status'] = 'unknown';

    switch (state) {
      case 'waiting':
      case 'delayed':
        status = 'waiting';
        break;
      case 'active':
        status = 'active';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
    }

    // Get job data
    const progress = job.progress;
    const result = status === 'completed' ? job.returnvalue : undefined;
    const error = status === 'failed' ? job.failedReason : undefined;

    logger.info('[API] Job status retrieved', {
      jobId,
      status,
      progress
    });

    return NextResponse.json<LipSyncStatusResponse>({
      success: true,
      jobId,
      status,
      progress: typeof progress === 'number' ? progress : undefined,
      result,
      error,
      createdAt: job.timestamp,
      processedOn: job.processedOn || undefined,
      finishedOn: job.finishedOn || undefined
    });

  } catch (error) {
    logger.error('[API] Failed to get job status', error as Error);

    return NextResponse.json<LipSyncStatusResponse>(
      {
        success: false,
        jobId: params.jobId,
        status: 'unknown',
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lip-sync/status/[jobId]
 * Cancel/remove job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    logger.info('[API] Canceling lip-sync job', { jobId });

    const job = await lipSyncQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found'
        },
        { status: 404 }
      );
    }

    // Try to cancel the job
    await job.remove();

    logger.info('[API] Job canceled', { jobId });

    return NextResponse.json({
      success: true,
      message: 'Job canceled successfully'
    });

  } catch (error) {
    logger.error('[API] Failed to cancel job', error as Error);

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
