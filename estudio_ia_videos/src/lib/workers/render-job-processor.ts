
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { videoRenderPipeline } from '@lib/video/video-render-pipeline';
import type { RenderSettings, RenderJobStatus } from '@/types/rendering';

/** Represents a render job as retrieved from the database */
interface RenderJobRecord {
  id: string;
  status: RenderJobStatus;
  renderSettings: RenderSettings | RenderJobProviderSettings | null;
  userId: string | null;
  projectId: string | null;
  progress: number;
}

/** Extended settings including external providers like HeyGen/DID */
interface RenderJobProviderSettings extends Partial<RenderSettings> {
  provider?: 'heygen' | 'did' | 'internal';
  externalId?: string;
}

export class RenderJobProcessor {
  private processing = false;
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs: number = 5000) {
    if (this.interval) return;
    
    logger.info('Starting render job processor', { intervalMs, service: 'RenderJobProcessor' });
    
    this.interval = setInterval(async () => {
      await this.processNextJob();
    }, intervalMs);
    
    // Process immediately
    void this.processNextJob();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Stopped render job processor', { service: 'RenderJobProcessor' });
    }
  }

  private async processNextJob() {
    if (this.processing) return;
    
    try {
      this.processing = true;
      
      // Get next queued job
      // We look for 'queued' jobs. 
      const job = await prisma.render_jobs.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' }
      });

      if (!job) return;

      logger.info('Processing render job', { jobId: job.id, service: 'RenderJobProcessor' });

      // Update status to processing
      await prisma.render_jobs.update({
        where: { id: job.id },
        data: { 
          status: 'processing',
          progress: 10,
          startedAt: new Date()
        }
      });

      const settings = job.renderSettings as RenderJobProviderSettings | null;
      const provider = settings?.provider;

      // Cast to our internal record type for method calls
      const jobRecord: RenderJobRecord = {
        id: job.id,
        status: job.status as RenderJobStatus,
        renderSettings: settings,
        userId: job.userId,
        projectId: job.projectId,
        progress: job.progress ?? 0,
      };

      // Real Implementation Routing
      if (provider === 'heygen') {
        // HeyGen jobs are handled via polling usually, but here we might initiate and then poll?
        // Or we might just use the generic pipeline if it supports HeyGen (it does via processHeyGenSlide)
        // Let's use VideoRenderPipeline which unifies logic.
        await this.processWithPipeline(jobRecord);
      } else if (provider === 'did') {
        // Legacy or separate DID service
        await this.processDIDJob(jobRecord);
      } else {
        // Default UE5/Internal pipeline
        // Use the REAL VideoRenderPipeline
        await this.processWithPipeline(jobRecord);
      }

    } catch (error) {
      logger.error('Error processing render job', error instanceof Error ? error : new Error(String(error)), { service: 'RenderJobProcessor' });
    } finally {
      this.processing = false;
    }
  }

  private async processWithPipeline(job: RenderJobRecord) {
    try {
      // Use the REAL Video Render Pipeline
      // This will handle:
      // 1. Asset prep
      // 2. Rendering (HeyGen or FFmpeg/Internal)
      // 3. Uploading
      // 4. Updating job status (completed/failed)
      
      const settings = job.renderSettings as RenderJobProviderSettings | null;
      
      // Map quality values from RenderSettings to RenderPipelineOptions
      const qualityMap: Record<string, 'low' | 'medium' | 'high'> = {
        'draft': 'low',
        'standard': 'medium',
        'high': 'high',
        'ultra': 'high',
      };
      
      // Map format values (only mp4/webm supported by pipeline)
      const formatMap: Record<string, 'mp4' | 'webm'> = {
        'mp4': 'mp4',
        'webm': 'webm',
        'mov': 'mp4',
        'gif': 'mp4',
      };
      
      await videoRenderPipeline.execute({
        projectId: job.projectId ?? '',
        jobId: job.id,
        // Map settings with proper type conversion
        resolution: settings?.resolution,
        quality: settings?.quality ? qualityMap[settings.quality] : undefined,
        outputFormat: settings?.format ? formatMap[settings.format] : undefined
      });
      
      // Note: execute() updates the job status to completed/failed internally via jobManager.
      // So we don't need to double update here, unless execute throws.
      logger.info('Pipeline execution finished', { jobId: job.id, service: 'RenderJobProcessor' });

    } catch (error) {
       // Pipeline.execute throws on error, so we catch here to ensure processor loop doesn't crash
       // The job status is likely already set to failed by pipeline's catch block, but safe to ensure.
       logger.error('Pipeline failed', error instanceof Error ? error : new Error(String(error)), { jobId: job.id });
    }
  }

  private async processDIDJob(job: RenderJobRecord) {
    // Keeping DID separate if not integrated into pipeline yet
    try {
      const { DIDServiceReal } = await import('@lib/services/avatar/did-service-real');
      const didService = new DIDServiceReal();
      const settings = job.renderSettings as RenderJobProviderSettings | null;
      const talkId = settings?.externalId;

      if (!talkId) {
           // Maybe initiate? For now assuming it tracks existing talks
           throw new Error('DID Talk ID missing');
      }

      const status = await didService.getTalkStatus(talkId);

      if (status.status === 'done') {
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            progress: 100,
            outputUrl: status.resultUrl,
            completedAt: new Date()
          }
        });
        logger.info('D-ID job completed', { jobId: job.id });
      } else if (status.status === 'error') {
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: status.error || 'D-ID processing failed'
          }
        });
      } else {
        // Still processing
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: { progress: 50 }
        });
      }
    } catch (error) {
      await this.markJobFailed(job.id, error);
    }
  }

  private async markJobFailed(jobId: string, error: unknown) {
    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    logger.error('Job failed', error instanceof Error ? error : new Error(String(error)), { jobId, service: 'RenderJobProcessor' });
  }
}

export const renderJobProcessor = new RenderJobProcessor();
