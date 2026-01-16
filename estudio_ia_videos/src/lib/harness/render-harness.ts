
import { VideoRenderWorker, RenderJobData } from '../workers/video-render-worker';
import { MockFrameGenerator, MockFFmpegExecutor, MockVideoUploader } from './mocks';
import { FrameGenerator } from '@/lib/render/frame-generator';
import { FFmpegExecutor } from '@/lib/render/ffmpeg-executor';
import { VideoUploader } from '@/lib/storage/video-uploader';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export interface HarnessOptions {
  fastMode?: boolean;
  resumeMode?: boolean;
  failRender?: boolean;
  failUpload?: boolean;
}

export class RenderHarness {
  private worker: VideoRenderWorker;
  private options: HarnessOptions;
  
  // Public access to mocks to allow granular control if needed
  public frameGenerator: FrameGenerator | MockFrameGenerator;
  public ffmpegExecutor: FFmpegExecutor | MockFFmpegExecutor;
  public videoUploader: VideoUploader | MockVideoUploader;

  constructor(options: HarnessOptions = {}) {
    this.options = options;

    if (options.fastMode) {
      this.frameGenerator = new MockFrameGenerator();
      this.ffmpegExecutor = new MockFFmpegExecutor();
      this.videoUploader = new MockVideoUploader();
      
      // Inject fault options
      if (options.failRender) (this.ffmpegExecutor as MockFFmpegExecutor).setFailure(true);
      if (options.failUpload) (this.videoUploader as MockVideoUploader).setFailure(true);

    } else {
      // Real implementations (or partial mocks if needed)
      this.frameGenerator = new FrameGenerator();
      this.ffmpegExecutor = new FFmpegExecutor();
      this.videoUploader = new VideoUploader();
      
      // Note: Fault injection on Real implementation is harder, 
      // typically requires a wrapper or Proxy. 
      // For now we assume Fault Injection implies Fast Mode or special Mock wrapping.
      // If user wants to fail Real Upload, we might need a specific wrapper.
    }

    this.worker = new VideoRenderWorker(
        this.frameGenerator,
        this.ffmpegExecutor,
        this.videoUploader
    );
  }

  async setup(props: {
    projectId: string;
    userId: string;
    jobId: string;
  }) {
      logger.info('[Harness] Setup environment', props);
      
      // Ensure clean state if needed
      // Create Mock Project info in DB if not assumes existing? 
      // The original script created it. The Harness should likely helper create it.
  }
  
  async runJob(jobData: RenderJobData) {
      logger.info('[Harness] Running Job', { jobId: jobData.id, options: this.options });
      
      if (this.options.resumeMode) {
          // Check if we can resume - e.g. skip frame generation
          // This logic would ideally be INSIDE the worker or the worker allows
          // passing pre-existing dirs.
          // Since our worker generates a temp dir based on ID, we might need to 
          // preset that dir or ensure the ID matches a previous run.
          // For now, basic Resume concept: 
          // If frames dir exists, MockFrameGenerator returns immediately with that dir.
      }

      try {
        const result = await this.worker.processRenderJob(jobData);
        logger.info('[Harness] Job Complete', { result });
        return result;
      } catch (error) {
        logger.error('[Harness] Job Failed', error as Error);
        throw error;
      }
  }

  async teardown(jobId: string) {
      if (this.options.fastMode) {
           logger.info('[Harness] Teardown skipped in fast mode (or minimal cleanup)');
      } else {
           // Real cleanup
      }
  }
}
