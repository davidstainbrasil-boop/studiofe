
import { FrameGenerator, FrameGenerationResult, RenderableFrame, PPTXSlideData } from '@/lib/render/frame-generator';
import { FFmpegExecutor, FFmpegRenderOptions, RenderResult } from '@/lib/render/ffmpeg-executor';
import { VideoUploader, UploadVideoParams } from '@/lib/storage/video-uploader';
import { logger } from '@/lib/logger';
import path from 'path';

/**
 * Mock Frame Generator
 * Simulates frame generation without specialized software/heavy computation
 */
export class MockFrameGenerator extends FrameGenerator {
  async generateFrames(
    slides: RenderableFrame[], 
    outputDir: string
  ): Promise<FrameGenerationResult> {
    logger.info('[Mock] Generating dummy frames...', { count: slides.length });
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      framesDir: outputDir,
      totalFrames: slides.length * 30, // Mock 30 fps per slide
      duration: slides.reduce((acc, s) => acc + (s.duration || 5), 0)
    };
  }
}

/**
 * Mock FFmpeg Executor
 * Simulates video rendering without FFmpeg
 */
export class MockFFmpegExecutor extends FFmpegExecutor {
    private shouldFail: boolean = false;
    private failureMessage: string = 'Simulated FFmpeg Failure';

    setFailure(shouldFail: boolean, message?: string) {
        this.shouldFail = shouldFail;
        if (message) this.failureMessage = message;
    }

    async renderFromFrames(options: FFmpegRenderOptions): Promise<RenderResult> {
        logger.info('[Mock] Rendering video...', { options });

        if (this.shouldFail) {
             throw new Error(this.failureMessage);
        }

        // Simulate encoding time
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            outputPath: options.outputPath,
            duration: 10, // Mock duration
            size: 1024 * 1024, // 1MB
            format: 'mp4'
        };
    }
}

/**
 * Mock Video Uploader
 * Simulates uploading to storage
 */
export class MockVideoUploader extends VideoUploader {
     private shouldFail: boolean = false;
     private failureMessage: string = 'Simulated Upload Failure';

    setFailure(shouldFail: boolean, message?: string) {
        this.shouldFail = shouldFail;
        if (message) this.failureMessage = message;
    }

    async uploadVideo(params: UploadVideoParams): Promise<string> {
        logger.info('[Mock] Uploading video...', { params });

        if (this.shouldFail) {
            throw new Error(this.failureMessage);
        }

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 200));

        return `https://mock-storage.com/${params.jobId}.mp4`;
    }
}
