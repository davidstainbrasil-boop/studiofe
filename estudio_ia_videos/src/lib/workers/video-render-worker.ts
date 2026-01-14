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
    content: any;
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
      // Convert raw content to PPTXSlideData if structure matches, otherwise mock/default
      const pptxSlides: PPTXSlideData[] = slides.map(s => {
          // If content is already compliant or close to it
          return s.content as PPTXSlideData; 
      });
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
      await prisma.video_exports.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          videoUrl: videoResultUrl,
          progress: 100,
          updatedAt: new Date()
        }
      });

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
      await prisma.video_exports.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
          updatedAt: new Date()
        }
      }).catch(dbError => {
        logger.error('Failed to update job status after error', 
          dbError instanceof Error ? dbError : new Error(String(dbError)),
          { component: 'VideoRenderWorker', jobId }
        );
      });

      throw error;
    }
  }

  private async checkCancellation(jobId: string): Promise<void> {
    const job = await prisma.video_exports.findUnique({
      where: { id: jobId },
      select: { status: true }
    });

    if (job?.status === 'cancelled') {
       throw new Error('JOB_CANCELLED');
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    logger.info('Cancelling render job', {
      component: 'VideoRenderWorker',
      jobId
    });

    await prisma.video_exports.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    });
  }
}
