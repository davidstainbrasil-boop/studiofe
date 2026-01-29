
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { videoRenderPipeline } from '@lib/video/video-render-pipeline';

interface RenderJob {
  id: string;
  status: string;
  renderSettings: any;
  userId: string;
  progress: number;
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

      const settings = job.renderSettings as any;
      const provider = settings?.provider;

      // Real Implementation Routing
      if (provider === 'heygen') {
        // HeyGen jobs are handled via polling usually, but here we might initiate and then poll?
        // Or we might just use the generic pipeline if it supports HeyGen (it does via processHeyGenSlide)
        // Let's use VideoRenderPipeline which unifies logic.
        await this.processWithPipeline(job);
      } else if (provider === 'did') {
        // Legacy or separate DID service
        await this.processDIDJob(job);
      } else {
        // Default UE5/Internal pipeline
        // Use the REAL VideoRenderPipeline
        await this.processWithPipeline(job);
      }

    } catch (error) {
      logger.error('Error processing render job', error instanceof Error ? error : new Error(String(error)), { service: 'RenderJobProcessor' });
    } finally {
      this.processing = false;
    }
  }

  private async processWithPipeline(job: any) {
    try {
      // Use the REAL Video Render Pipeline
      // This will handle:
      // 1. Asset prep
      // 2. Rendering (HeyGen or FFmpeg/Internal)
      // 3. Uploading
      // 4. Updating job status (completed/failed)
      
      await videoRenderPipeline.execute({
        projectId: job.projectId,
        jobId: job.id,
        // Map settings
        resolution: job.renderSettings?.resolution,
        quality: job.renderSettings?.quality,
        outputFormat: job.renderSettings?.format
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

  private async processDIDJob(job: any) {
    // Keeping DID separate if not integrated into pipeline yet
    try {
      const { DIDServiceReal } = await import('@lib/services/avatar/did-service-real');
      const didService = new DIDServiceReal();
      const settings = job.renderSettings as any;
      const talkId = settings.externalId;

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

  private async markJobFailed(jobId: string, error: any) {
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
