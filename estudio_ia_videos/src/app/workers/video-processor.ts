import { Job } from 'bullmq';
import { createRenderWorker } from '@lib/queue/render-queue';
import { videoRenderPipeline } from '@lib/video/video-render-pipeline';
import { RenderTaskPayload, RenderTaskResult } from '@lib/queue/types';
import { logger } from '@lib/logger';

export const workerHandler = async (job: Job<RenderTaskPayload, RenderTaskResult>) => {
  const startTime = Date.now();
  const { projectId } = job.data;
  const jobId = job.id!;

  logger.info(`[VideoWorker] 🚀 Starting job ${jobId} for project ${projectId}`, {
    jobId,
    projectId,
  });

  try {
    // Execute the Remotion pipeline
    const { remotionRenderer } = await import('@lib/render/remotion-renderer');
    
    const outputUrl = await remotionRenderer.renderJob(jobId, projectId);

    logger.info(`[VideoWorker] ✅ Job ${jobId} completed. Output: ${outputUrl}`, {
      jobId,
      projectId,
    });

    return {
      jobId,
      outputUrl,
      metadata: {
        completedAt: new Date().toISOString(),
        renderTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    logger.error(`[VideoWorker] ❌ Job ${jobId} failed`, error as Error, {
      jobId,
      projectId,
    });
    
    // Mark job as failed in DB
    const { jobManager } = await import('@lib/render/job-manager');
    await jobManager.failJob(jobId, error instanceof Error ? error.message : 'Unknown Worker Error');
    
    throw error;
  }
};

// Create and export the worker instance
export const videoRenderWorker = createRenderWorker(workerHandler, {
  concurrency: 1, // Process one video at a time per worker instance
  limiter: {
    max: 10,
    duration: 1000
  }
} as any);

videoRenderWorker.on('completed', (job) => {
  logger.info('[VideoWorker] Job completed successfully', { jobId: job.id });
});

videoRenderWorker.on('failed', (job, err) => {
  logger.error('[VideoWorker] Job failed', err, { jobId: job?.id });
});

logger.info('[VideoWorker] Worker initialized and listening for jobs...');

