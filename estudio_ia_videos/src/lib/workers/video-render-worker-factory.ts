/**
 * Video Render Worker Factory
 * Creates VideoRenderWorker with real or mock dependencies based on RENDER_HARNESS env
 */

import { VideoRenderWorker } from './video-render-worker';
import { FrameGenerator } from '@/lib/render/frame-generator';
import { FFmpegExecutor } from '@/lib/render/ffmpeg-executor';
import { VideoUploader } from '@/lib/storage/video-uploader';
import { MockFrameGenerator, MockFFmpegExecutor, MockVideoUploader } from '@/lib/harness/mocks';
import { logger } from '@/lib/logger';

export interface WorkerFactoryOptions {
  failRender?: boolean;
  failUpload?: boolean;
}

/**
 * Creates a VideoRenderWorker with real or mock implementations based on RENDER_HARNESS env.
 * 
 * When RENDER_HARNESS=true:
 *   - Uses MockFrameGenerator (no real frame generation)
 *   - Uses MockFFmpegExecutor (no real FFmpeg)
 *   - Uses MockVideoUploader (no real storage upload)
 *   - Fast, deterministic, no external dependencies
 * 
 * When RENDER_HARNESS=false (default):
 *   - Uses real FrameGenerator, FFmpegExecutor, VideoUploader
 */
export function createVideoRenderWorker(options: WorkerFactoryOptions = {}): VideoRenderWorker {
  const isHarnessMode = process.env.RENDER_HARNESS === 'true';

  if (isHarnessMode) {
    logger.info('[WorkerFactory] Creating worker in HARNESS mode (mocked dependencies)', {
      component: 'WorkerFactory',
      mode: 'harness'
    });

    const mockFrameGenerator = new MockFrameGenerator();
    const mockFFmpegExecutor = new MockFFmpegExecutor();
    const mockVideoUploader = new MockVideoUploader();

    // Apply fault injection if specified
    if (options.failRender) {
      mockFFmpegExecutor.setFailure(true, 'Simulated render failure for testing');
    }
    if (options.failUpload) {
      mockVideoUploader.setFailure(true, 'Simulated upload failure for testing');
    }

    return new VideoRenderWorker(
      mockFrameGenerator,
      mockFFmpegExecutor,
      mockVideoUploader
    );
  }

  logger.info('[WorkerFactory] Creating worker in REAL mode', {
    component: 'WorkerFactory',
    mode: 'real'
  });

  return new VideoRenderWorker(
    new FrameGenerator(),
    new FFmpegExecutor(),
    new VideoUploader()
  );
}

/**
 * Check if harness mode is enabled
 */
export function isHarnessMode(): boolean {
  return process.env.RENDER_HARNESS === 'true';
}
