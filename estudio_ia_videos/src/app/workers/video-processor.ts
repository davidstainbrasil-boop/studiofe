import { Job } from 'bullmq';
import { createRenderWorker } from '@lib/queue/render-queue';
import { RenderTaskPayload, RenderTaskResult } from '@lib/queue/types';
import { logger } from '@lib/logger';
import { RenderingPipeline } from '@lib/export/rendering-pipeline';
import { VideoUploader } from '@lib/storage/video-uploader';
import { jobManager } from '@lib/render/job-manager';
import { prisma } from '@lib/prisma';
import os from 'os';
import path from 'path';
import { promises as fs, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { ExportSettings } from '@/types/export.types';
import { RESOLUTION_CONFIGS } from '@/types/export.types';

interface ExportJobPayload extends RenderTaskPayload {
  type: 'export';
  userId: string;
  sourceUrl: string;
  exportSettings: ExportSettings;
  subtitleUrl?: string | null;
}

export const workerHandler = async (job: Job<RenderTaskPayload, RenderTaskResult>) => {
  const startTime = Date.now();
  const { projectId } = job.data;
  const jobId = job.id!;

  logger.info(`[VideoWorker] 🚀 Starting job ${jobId} for project ${projectId}`, {
    jobId,
    projectId,
  });

  try {
    if ((job.data as ExportJobPayload).type === 'export') {
      const result = await handleExportJob(
        job as Job<ExportJobPayload, RenderTaskResult>,
        startTime,
      );
      return result;
    }

    await jobManager.startJob(jobId);

    // Execute the Remotion pipeline
    const { remotionRenderer } = await import('@lib/render/remotion-renderer');
    const outputUrl = await remotionRenderer.renderJob(jobId, projectId);

    await jobManager.completeJob(jobId, outputUrl);

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

    await jobManager.failJob(
      jobId,
      error instanceof Error ? error.message : 'Unknown Worker Error',
    );
    throw error;
  }
};

const downloadToFile = async (url: string, filePath: string) => {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Falha ao baixar arquivo: ${response.status} ${response.statusText}`);
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await pipeline(response.body, createWriteStream(filePath));
};

const handleExportJob = async (job: Job<ExportJobPayload, RenderTaskResult>, startTime: number) => {
  const jobId = job.id?.toString();
  if (!jobId) {
    throw new Error('Job ID ausente');
  }

  const { projectId, userId, sourceUrl, exportSettings, subtitleUrl } = job.data;
  if (!projectId || !userId || !sourceUrl || !exportSettings) {
    throw new Error('Dados de exportação incompletos');
  }

  await jobManager.startJob(jobId);
  await job.updateProgress(5);

  const tempDir = path.join(os.tmpdir(), 'export-jobs', jobId);
  const inputPath = path.join(tempDir, 'input.mp4');
  const outputExt = typeof exportSettings.format === 'string' ? exportSettings.format : 'mp4';
  const outputPath = path.join(tempDir, `output.${outputExt}`);

  await downloadToFile(sourceUrl, inputPath);

  let subtitlePath: string | undefined;
  if (subtitleUrl) {
    subtitlePath = path.join(tempDir, `subtitle.${subtitleUrl.endsWith('.vtt') ? 'vtt' : 'srt'}`);
    await downloadToFile(subtitleUrl, subtitlePath);
  }

  const pipelineRunner = new RenderingPipeline(tempDir);
  const settingsWithSubtitles: ExportSettings = {
    ...exportSettings,
    subtitle: subtitleUrl
      ? {
          enabled: true,
          burnIn: true,
          source: subtitlePath,
          format: subtitlePath?.endsWith('.vtt') ? 'vtt' : 'srt',
        }
      : exportSettings.subtitle,
  };

  const result = await pipelineRunner.execute(
    inputPath,
    outputPath,
    settingsWithSubtitles,
    (progress) => {
      const percent = Math.min(95, Math.max(5, Math.round(progress.overallProgress)));
      job.updateProgress(percent).catch(() => null);
      jobManager.updateProgress(jobId, percent).catch(() => null);
    },
  );

  if (!result.success) {
    throw new Error(result.validationWarnings?.join('; ') || 'Exportação falhou');
  }

  const uploader = new VideoUploader();
  const resolutionKey =
    typeof exportSettings.resolution === 'string' ? exportSettings.resolution : '1080p';
  const resolution =
    RESOLUTION_CONFIGS[resolutionKey as keyof typeof RESOLUTION_CONFIGS] ||
    RESOLUTION_CONFIGS['1080p'];
  const outputUrl = await uploader.uploadVideo({
    videoPath: outputPath,
    projectId,
    userId,
    jobId,
    metadata: {
      resolution: { width: resolution.width, height: resolution.height },
      fps: typeof exportSettings.fps === 'number' ? exportSettings.fps : 30,
      codec: typeof exportSettings.codec === 'string' ? exportSettings.codec : 'h264',
      format: outputExt,
    },
  });

  const currentJob = await prisma.render_jobs.findUnique({
    where: { id: jobId },
    select: { settings: true },
  });

  const currentSettings = (currentJob?.settings as Record<string, unknown>) || {};

  await prisma.render_jobs.update({
    where: { id: jobId },
    data: {
      settings: {
        ...currentSettings,
        type: 'export',
        sourceUrl,
        outputUrl,
        subtitleUrl,
      },
      updatedAt: new Date(),
    },
  });

  await jobManager.completeJob(jobId, outputUrl);

  logger.info(`[VideoWorker] ✅ Export job ${jobId} completed. Output: ${outputUrl}`, {
    jobId,
    projectId,
  });

  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => null);

  return {
    jobId,
    outputUrl,
    metadata: {
      completedAt: new Date().toISOString(),
      renderTime: Date.now() - startTime,
    },
  };
};

// Create and export the worker instance
export const videoRenderWorker = createRenderWorker(workerHandler, {
  concurrency: 1, // Process one video at a time per worker instance
  limiter: {
    max: 10,
    duration: 1000,
  },
});

videoRenderWorker.on('completed', (job) => {
  logger.info('[VideoWorker] Job completed successfully', { jobId: job.id });
});

videoRenderWorker.on('failed', (job, err) => {
  logger.error('[VideoWorker] Job failed', err, { jobId: job?.id });
});

logger.info('[VideoWorker] Worker initialized and listening for jobs...');
