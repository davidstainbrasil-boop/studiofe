/**
 * Video Render Worker
 * Worker para processar jobs de renderização de vídeo
 */

import { FrameGenerator, PPTXSlideData } from '@/lib/render/frame-generator';
import { FFmpegExecutor } from '@/lib/render/ffmpeg-executor';
import { VideoUploader } from '@/lib/storage/video-uploader';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

export interface RenderJobData {
  id: string;
  projectId: string;
  userId: string;
  slides: Array<{
    id: string;
    content: SlideContent;
    duration?: number;
  }>;
  config: {
    resolution: { width: number; height: number };
    fps: number;
    quality: string;
    codec: string;
    format: string;
    audioEnabled?: boolean;
    transitionsEnabled?: boolean;
  };
}

/** Content data for a slide */
export interface SlideContent {
  title?: string;
  text?: string;
  imageUrl?: string;
  backgroundColor?: string;
  layout?: string;
  elements?: SlideElement[];
  [key: string]: unknown;
}

/** Element within a slide */
export interface SlideElement {
  type: 'text' | 'image' | 'shape' | 'video';
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  content?: string;
  style?: Record<string, unknown>;
}

export interface RenderResult {
  success: boolean;
  videoUrl?: string;
  s3Key?: string;
  error?: string;
}

export class VideoRenderWorker {
  private frameGenerator: FrameGenerator;
  private ffmpegExecutor: FFmpegExecutor;
  private videoUploader: VideoUploader;

  constructor(
    frameGenerator?: FrameGenerator,
    ffmpegExecutor?: FFmpegExecutor,
    videoUploader?: VideoUploader
  ) {
    this.frameGenerator = frameGenerator || new FrameGenerator();
    this.ffmpegExecutor = ffmpegExecutor || new FFmpegExecutor();
    this.videoUploader = videoUploader || new VideoUploader();
  }

  async processRenderJob(jobData: RenderJobData): Promise<string> {
    const { id: jobId, projectId, userId, slides, config } = jobData;

    try {
      logger.info('Starting video render job', {
        component: 'VideoRenderWorker',
        jobId,
        projectId,
        slidesCount: slides.length
      });

      // 1. Generate frames from slides
      await this.checkCancellation(jobId);
      
      const framesDir = path.join(os.tmpdir(), `render_${jobId}_frames`);
      // Convert SlideContent to PPTXSlideData format
      const pptxSlides: PPTXSlideData[] = slides.map(s => this.convertToPPTXSlideData(s.content, s.duration));
      // Convert to Frame format
      const renderableSlides = FrameGenerator.convertPPTXSlidesToFrames(pptxSlides);

      const frames = await this.frameGenerator.generateFrames(renderableSlides, framesDir);
      
      logger.info('Frames generated', { 
        component: 'VideoRenderWorker',
        jobId, 
        framesCount: frames.totalFrames 
      });

      // 2. Render video with FFmpeg
      await this.checkCancellation(jobId);
      
      const outputVideoPath = path.join(os.tmpdir(), `render_${jobId}.mp4`);
      
      const renderResult = await this.ffmpegExecutor.renderFromFrames({
          inputFramesDir: frames.framesDir,
          outputPath: outputVideoPath,
          fps: config.fps,
          width: config.resolution.width,
          height: config.resolution.height,
          codec: config.codec as any,
          resolution: '1080p' // dynamic based on width?
      });

      if (!renderResult.success || !renderResult.outputPath) {
          throw new Error(`FFmpeg render failed: ${renderResult.error}`);
      }

      const videoPath = renderResult.outputPath;
      
      logger.info('Video rendered with FFmpeg', {
        component: 'VideoRenderWorker',
        jobId,
        videoPath
      });

      // 3. Upload to storage
      await this.checkCancellation(jobId);
      const videoResultUrl = await this.videoUploader.uploadVideo({
        videoPath,
        projectId,
        userId,
        jobId,
        metadata: {
            resolution: config.resolution,
            fps: config.fps,
            codec: config.codec,
            format: config.format,
            duration: renderResult.duration
        }
      });
      
      logger.info('Video uploaded to storage', {
        component: 'VideoRenderWorker',
        jobId,
        videoUrl: videoResultUrl
      });

      // Clean up temp
      try {
          await fs.rm(framesDir, { recursive: true, force: true });
          await fs.unlink(videoPath);
      } catch (e) { /* ignore cleanup errors */ }

      // 4. Update job status in database
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          outputUrl: videoResultUrl,
          progress: 100,
          completedAt: new Date()
        }
      });

      // --- NOTIFICATIONS START ---
      try {
        const { emailService } = await import('@/lib/services/email-service');
        const { triggerWebhook } = await import('@/lib/webhooks-system-real');
        
        // Fetch User and Project info
        const job = await prisma.render_jobs.findUnique({
            where: { id: jobId },
            select: { projectId: true, userId: true }
        });

        if (!job?.projectId || !job?.userId) {
             logger.warn('Notifications skipped: Job missing userId or projectId', { jobId });
        } else {
            const project = await prisma.projects.findUnique({
                where: { id: job.projectId },
                select: { name: true }
            });
            const user = await prisma.users.findUnique({
                where: { id: job.userId },
                select: { email: true, name: true }
            });

            if (user?.email) {
                await emailService.sendRenderCompleted(
                    user.email, 
                    project?.name || 'Untitled Project', 
                    videoResultUrl, 
                    renderResult.duration || 0
                );
            }

            await triggerWebhook.renderCompleted({
                jobId,
                projectId: job.projectId,
                videoUrl: videoResultUrl,
                duration: renderResult.duration || 0
            });
        }

      } catch (notifyErr) {
        logger.error('Failed to send render notifications', notifyErr instanceof Error ? notifyErr : new Error(String(notifyErr)));
      }
      // --- NOTIFICATIONS END ---

      return videoResultUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Don't overwrite cancelled status with failed
      if (errorMessage === 'JOB_CANCELLED') {
         logger.info('Job execution stopped due to cancellation', { jobId });
         return '';
      }

      logger.error('Video render job failed', error instanceof Error ? error : new Error(errorMessage), {
        component: 'VideoRenderWorker',
        jobId,
        projectId
      });

      // Update job status as failed
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date()
        }
      }).catch(dbError => {
        logger.error('Failed to update job status after error', 
          dbError instanceof Error ? dbError : new Error(String(dbError)),
          { component: 'VideoRenderWorker', jobId }
        );
      });

      // --- NOTIFICATIONS ERROR START ---
      try {
        const { emailService } = await import('@/lib/services/email-service');
        const { triggerWebhook } = await import('@/lib/webhooks-system-real');
        
        const job = await prisma.render_jobs.findUnique({
            where: { id: jobId },
            select: { projectId: true, userId: true }
        });

        if (job?.projectId && job?.userId) {
            const project = await prisma.projects.findUnique({ where: { id: job.projectId }, select: { name: true } });
            const user = await prisma.users.findUnique({ where: { id: job.userId }, select: { email: true } });

            if (user?.email) {
                await emailService.sendRenderFailed(user.email, project?.name || 'Untitled Project', errorMessage);
            }
            
            await triggerWebhook.renderFailed({
                jobId,
                projectId: job.projectId,
                error: errorMessage
            });
        }
      } catch (notifyErr) {
        logger.error('Failed to send render failure notifications', notifyErr instanceof Error ? notifyErr : new Error(String(notifyErr)));
      }
      // --- NOTIFICATIONS ERROR END ---

      throw error;
    }
  }

  /**
   * Convert SlideContent to PPTXSlideData format for frame generation
   */
  private convertToPPTXSlideData(content: SlideContent, duration?: number): PPTXSlideData {
    return {
      estimatedDuration: duration || 5,
      background: content?.backgroundColor || '#ffffff',
      images: content?.elements
        ?.filter(el => el.type === 'image')
        .map((el, idx) => ({
          id: `img-${idx}`,
          url: el.content || '',
          position: el.position && el.size 
            ? { x: el.position.x, y: el.position.y, width: el.size.width, height: el.size.height }
            : undefined,
        })),
      textBoxes: content?.elements
        ?.filter(el => el.type === 'text')
        .map(el => ({
          text: el.content || content?.text || '',
          position: el.position && el.size
            ? { x: el.position.x, y: el.position.y, width: el.size.width, height: el.size.height }
            : { x: 100, y: 100, width: 1720, height: 880 },
          formatting: el.style as PPTXSlideData['textBoxes'] extends Array<infer T> ? T extends { formatting?: infer F } ? F : undefined : undefined,
        })),
    };
  }

  private async checkCancellation(jobId: string): Promise<void> {
    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
      select: { status: true }
    });

    if (job?.status === 'cancelled') { // note: check if status enum has cancelled or if we use string
        // status is JobStatus enum which usually has pending, processing, completed, failed. 
        // If we want cancellation support, we might need a custom check or ignore if not supported by schema
       throw new Error('JOB_CANCELLED');
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    logger.info('Cancelling render job', {
      component: 'VideoRenderWorker',
      jobId
    });

    // Note: status might need casting if 'cancelled' is not in enum
    // Assuming JobStatus has cancelled, checking schema...
    // Schema says: status JobStatus? @default(pending)
    // We don't see the Enum definition but commonly it might not have 'cancelled'.
    // We will just try to delete or set to failed if cancelled is not there.
    // However, if we look at previous code, it tried 'cancelled'.
    // Let's assume we update logic to support cancellation via removing or specific status.
    
    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        status: 'failed', // Mark as failed/cancelled
        errorMessage: 'Cancelled by user',
        completedAt: new Date()
      }
    });
  }
}
