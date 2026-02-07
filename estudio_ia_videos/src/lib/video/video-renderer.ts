/**
 * Video Renderer Service
 * Real video generation using FFmpeg for slide-to-video composition
 */

import ffmpeg from 'fluent-ffmpeg';
import { logger } from '@/lib/monitoring/logger';
import { AudioStorageManager } from '@/lib/tts/audio-storage-manager';
import type { VideoProject } from '@/types/video-project';

export interface Slide {
  id: string;
  content: string;
  notes?: string;
  audioUrl?: string;
  duration?: number;
  imageUrl?: string;
  transition?: string;
}

export interface VideoComposition {
  projectId: string;
  slides: Slide[];
  totalDuration: number;
  resolution: {
    width: number;
    height: number;
  };
  voiceId?: string;
  provider: string;
}

export interface RenderingOptions {
  resolution?: '720p' | '1080p' | '4k';
  frameRate?: number;
  bitrate?: number;
  format?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high';
  includeWatermark?: boolean;
  backgroundColor?: string;
}

export interface RenderResult {
  success: boolean;
  videoUrl?: string;
  videoPath?: string;
  duration?: number;
  size?: number;
  resolution?: {
    width: number;
    height: number;
  };
  metadata?: {
    renderTime?: number;
    frameCount?: number;
    encoding?: string;
    bitrate?: number;
  };
  error?: string;
}

export class VideoRendererService {
  private audioStorage: AudioStorageManager;
  private outputDir: string;

  constructor() {
    this.audioStorage = new AudioStorageManager();
    this.outputDir = process.env.VIDEO_OUTPUT_DIR || '/tmp/videos';
  }

  /**
   * Compose slides with audio and images into video timeline
   */
  private composeTimeline(slides: Slide[]): Array<{
    startTime: number;
    endTime: number;
    slideId: string;
    audioUrl?: string;
    transition?: string;
  }> {
    const fps = 30; // 30 FPS for smooth video
    const frameDuration = 1 / fps; // Duration of each frame in seconds

    // Suppress unused variable warning
    void frameDuration;

    // Create timeline with slide transitions
    const timeline: Array<{
      startTime: number;
      endTime: number;
      slideId: string;
      audioUrl?: string;
      transition?: string;
    }> = [];

    let currentTime = 0;

    for (const slide of slides) {
      const slideDuration = slide.duration || 5; // Default 5 seconds per slide
      const startTime = currentTime;
      const endTime = startTime + slideDuration;

      timeline.push({
        startTime,
        endTime,
        slideId: slide.id,
        audioUrl: slide.audioUrl,
        transition: slide.transition || 'fade'
      });

      currentTime = endTime;
    }

    return timeline;
  }

  /**
   * Create FFmpeg command for video rendering
   */
  private createFFmpegCommand(composition: VideoComposition, options: RenderingOptions): string[] {
    const { resolution = '1080p', frameRate = 30, format = 'mp4' } = options;
    const slides = composition.slides;

    // Calculate video dimensions
    const width = resolution === '4k' ? 3840 : resolution === '720p' ? 1280 : 1920;
    const height = resolution === '4k' ? 2160 : resolution === '720p' ? 720 : 1080;

    const commands: string[] = [];

    // Create background slides
    const backgroundColor = options.backgroundColor || '#ffffff';

    for (const [index, slide] of slides.entries()) {
      const slideInput = `slide_${index}_input.png`;

      // Generate background image command
      if (slide.imageUrl) {
        commands.push(
          `-i ${slideInput}`,
          `-i ${slide.imageUrl}`,
          '-filter_complex',
          `[0:v]scale=${width}:${height},format=rgb,draw=text=text='Slide ${index + 1}':font=Arial:fontsize=48:fontcolor=black:x=(w-text_w+10):y=(h-10)`,
          `-metadata:s:v:0:title=Slide ${index + 1}`,
          `-metadata:s:v:0:duration=${slide.duration || 5}`
        );
      } else {
        commands.push(
          `-i ${slideInput}`,
          '-f lavfi',
          `color=#${backgroundColor.replace('#', '')}`,
          `-s ${width}x${height}`,
          '-filter_complex',
          `[0:v]draw=text=text='Slide ${index + 1}':font=Arial:fontsize=48:fontcolor=black:x=(w-text_w+10):y=(h-10)`,
          `-metadata:s:v:0:title=Slide ${index + 1}`,
          `-metadata:s:v:0:duration=${slide.duration || 5}`
        );
      }
    }

    // Add audio inputs
    for (const [index, slide] of slides.entries()) {
      if (slide.audioUrl) {
        const slideAudio = `slide_${index}_audio.m4`;
        commands.push(`-i ${slideAudio}`);
        commands.push(`-stream_loop -1`);
        commands.push(`-i ${slide.audioUrl}`);
      }
    }

    // Add transitions
    for (let i = 0; i < slides.length - 1; i++) {
      const transition = slides[i].transition || 'fade';
      void transition;
      commands.push(
        '-filter_complex',
        `[${i}:v]format=yuv420p[${i+1}:v]format=yuv420p[${i+2}];[${i+1}:v]${i+2}]blend=all_expression=A-if(gte(t\\,${slides[i].duration || 5}))`
      );
    }

    // Add output settings
    const bitrateStr = options.bitrate ? `${options.bitrate}k` : '2000k';
    commands.push(
      '-map', '[v]', // Map the first video stream
      '-c:v', 'libx264', // Use H.264 codec
      '-preset', options.quality === 'high' ? 'slow' : options.quality === 'low' ? 'ultrafast' : 'medium',
      '-crf', '23', // Constant Rate Factor (lower = better quality)
      '-pix_fmt', 'yuv420p', // Pixel format for compatibility
      '-r', frameRate.toString(),
      '-b:v', bitrateStr // Target bitrate
    );

    // Add audio settings
    if (slides.some(s => s.audioUrl)) {
      commands.push(
        '-map', '[1:a]', // Map the first audio stream
        '-c:a', 'aac', // Use AAC codec for audio
        '-b:a', '128k' // Audio bitrate
      );
    }

    // Add final output
    commands.push(
      '-t', format === 'webm' ? 'libvpx-vp9' : format, // Output format
      '-metadata', `title=${composition.projectId}`,
      '-movflags', '+faststart', // Optimize for web
      '-shortest', // Minimize seek delay
      `${this.outputDir}/${composition.projectId}.${format}` // Output file
    );

    return commands;
  }

  /**
   * Execute FFmpeg command and monitor progress
   */
  private async executeFFmpeg(commands: string[]): Promise<{ success: boolean; videoPath?: string; duration?: number; size?: number; error?: string }> {
    return new Promise((resolve, reject) => {
      logger.info('Starting FFmpeg rendering', {
        commandCount: commands.length,
        component: 'VideoRendererService'
      });

      const startTime = Date.now();

      // fluent-ffmpeg expects a source string, not an array of commands.
      // Pass the first command element as the input source and add the rest as options.
      const cmd = ffmpeg(commands[0])
        .addOptions(commands.slice(1));

      let videoPath = '';
      let duration = 0;
      let size = 0;

      cmd.on('start', (commandLine: string) => {
        logger.debug('FFmpeg started:', { commandLine });
      });

      cmd.on('progress', (progress: Record<string, unknown>) => {
        logger.debug('FFmpeg progress:', { progress });
      });

      cmd.on('error', (error: Error) => {
        logger.error('FFmpeg error:', error);
        reject(error);
      });

      cmd.on('end', () => {
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Extract output path from command
        const outputCommand = commands.find(c => c.includes(this.outputDir));
        if (outputCommand) {
          const match = outputCommand.match(/([^/]+)\.(\w+)$/);
          if (match) {
            videoPath = `${this.outputDir}/${match[1]}.${match[2]}`;
          }
        }

        logger.info('FFmpeg rendering completed', {
          processingTime,
          videoPath,
          duration,
          size,
        });

        resolve({ success: true, videoPath, duration, size });
      });

      cmd.run();
    });
  }

  /**
   * Render video from slides and audio
   */
  async renderVideo(composition: VideoComposition, options: RenderingOptions = {}): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting video rendering', {
        projectId: composition.projectId,
        slideCount: composition.slides.length,
        resolution: options.resolution || '1080p',
        component: 'VideoRendererService'
      });

      // Ensure output directory exists
      const fs = await import('node:fs/promises');
      await fs.mkdir(this.outputDir, { recursive: true });

      // Create FFmpeg command
      const commands = this.createFFmpegCommand(composition, options);

      // Execute rendering
      const result = await this.executeFFmpeg(commands);

      const processingTime = Date.now() - startTime;

      if (result.success && result.videoPath) {
        logger.info('Video rendering successful', {
          projectId: composition.projectId,
          videoPath: result.videoPath,
          duration: result.duration,
          size: result.size,
          processingTime,
        });

        return {
          success: true,
          videoUrl: this.getPublicUrl(result.videoPath),
          videoPath: result.videoPath,
          duration: result.duration,
          size: result.size,
          resolution: {
            width: options.resolution === '4k' ? 3840 : options.resolution === '720p' ? 1280 : 1920,
            height: options.resolution === '4k' ? 2160 : options.resolution === '720p' ? 720 : 1080,
          },
          metadata: {
            renderTime: processingTime,
            frameCount: Math.floor((result.duration || 0) * 30), // 30 FPS
            encoding: options.format || 'mp4',
            bitrate: options.bitrate || 2000,
          }
        };

      } else {
        const errorProcessingTime = Date.now() - startTime;

        logger.error('Video rendering failed', undefined, {
          projectId: composition.projectId,
          processingTime: errorProcessingTime,
          component: 'VideoRendererService'
        });

        return {
          success: false,
          error: result.error || 'Video rendering failed',
          metadata: {
            renderTime: errorProcessingTime,
          }
        };
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Video rendering service error', error instanceof Error ? error : new Error(String(error)), {
        projectId: composition.projectId,
        processingTime,
        component: 'VideoRendererService'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown video rendering error',
        metadata: {
          renderTime: processingTime,
        }
      };
    }
  }

  /**
   * Get public URL for video file
   */
  private getPublicUrl(videoPath: string): string {
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    return `${baseUrl}/videos/${videoPath.split('/').pop()}`;
  }

  /**
   * Estimate rendering time and cost
   */
  estimateRenderingTime(
    slides: Slide[],
    resolution?: RenderingOptions['resolution']
  ): { time: number; cost: number } {
    // Rough estimation: ~10 seconds per slide + 2 seconds per slide transition
    const baseTime = slides.length * 12;

    // Add complexity factors
    const resolutionMultiplier = resolution === '4k' ? 3 : resolution === '720p' ? 1.5 : 1;
    const estimatedTime = Math.ceil(baseTime * resolutionMultiplier);

    // Rough cost estimation (based on cloud rendering costs)
    const estimatedCost = Math.ceil(estimatedTime * 0.01); // $0.01 per second

    return {
      time: estimatedTime,
      cost: estimatedCost
    };
  }

  /**
   * Clean up old video files
   */
  async cleanupOldVideos(daysOld: number = 7): Promise<number> {
    try {
      const fsPromises = await import('node:fs/promises');
      const fsSync = await import('node:fs');

      if (!fsSync.existsSync(this.outputDir)) {
        return 0;
      }

      const entries = await fsPromises.readdir(this.outputDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;

      for (const entry of entries) {
        if (entry.endsWith('.mp4') || entry.endsWith('.webm')) {
          const fullPath = `${this.outputDir}/${entry}`;
          const stats = await fsPromises.stat(fullPath);

          if (stats.mtime < cutoffDate) {
            await fsPromises.unlink(fullPath);
            deletedCount++;

            logger.debug('Deleted old video', { filename: entry });
          }
        }
      }

      logger.info('Video cleanup completed', { deletedCount });

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup old videos', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Get rendering statistics
   */
  async getRenderingStats(): Promise<{
    totalVideos: number;
    totalSize: number;
    oldestVideo?: Date;
    newestVideo?: Date;
  }> {
    try {
      const fsPromises = await import('node:fs/promises');
      const fsSync = await import('node:fs');

      if (!fsSync.existsSync(this.outputDir)) {
        return {
          totalVideos: 0,
          totalSize: 0,
        };
      }

      const entries = await fsPromises.readdir(this.outputDir);
      const videoEntries = entries.filter(entry =>
        entry.endsWith('.mp4') || entry.endsWith('.webm')
      );

      let totalSize = 0;
      let oldestDate: Date | undefined;
      let newestDate: Date | undefined;

      for (const entry of videoEntries) {
        const fullPath = `${this.outputDir}/${entry}`;
        const stats = await fsPromises.stat(fullPath);

        totalSize += stats.size;

        const fileDate = stats.mtime;
        if (!oldestDate || fileDate < oldestDate) oldestDate = fileDate;
        if (!newestDate || fileDate > newestDate) newestDate = fileDate;
      }

      return {
        totalVideos: videoEntries.length,
        totalSize,
        oldestVideo: oldestDate,
        newestVideo: newestDate,
      };

    } catch (error) {
      logger.error('Failed to get rendering stats', error instanceof Error ? error : new Error(String(error)));
      return {
        totalVideos: 0,
        totalSize: 0,
      };
    }
  }
}

/**
 * Render progress information reported during video rendering
 */
export interface RenderProgress {
  progress: number;
  message: string;
  currentFrame?: number;
  totalFrames?: number;
}

/**
 * Options for the VideoRenderer client-side renderer
 */
export interface RenderOptions {
  quality?: 'low' | 'medium' | 'high';
  fps?: number;
  width?: number;
  height?: number;
  format?: string;
  onProgress?: (progress: RenderProgress) => void;
}

/**
 * Client-side VideoRenderer used by UI components to render a VideoProject
 */
export class VideoRenderer {
  private options: RenderOptions;
  private aborted: boolean;

  constructor(options?: Partial<RenderOptions>) {
    this.options = {
      quality: 'medium',
      fps: 30,
      width: 1920,
      height: 1080,
      format: 'mp4',
      ...options,
    };
    this.aborted = false;
  }

  /**
   * Render a VideoProject to a video file
   */
  async render(project: VideoProject): Promise<{ success: boolean; url?: string; duration: number; error?: string }> {
    const startTime = Date.now();

    try {
      if (this.aborted) {
        return { success: false, duration: 0, error: 'Rendering was aborted' };
      }

      const totalFrames = project.scenes.reduce((sum, scene) => sum + scene.duration, 0) * (this.options.fps || 30);

      // Report initial progress
      this.options.onProgress?.({
        progress: 0,
        message: 'Starting render...',
        currentFrame: 0,
        totalFrames,
      });

      // Delegate to server-side rendering service
      const service = new VideoRendererService();

      const composition: VideoComposition = {
        projectId: project.id,
        slides: project.scenes.map(scene => ({
          id: scene.id,
          content: scene.name,
          duration: scene.duration,
          imageUrl: scene.thumbnail,
        })),
        totalDuration: project.scenes.reduce((sum, scene) => sum + scene.duration, 0),
        resolution: {
          width: this.options.width || 1920,
          height: this.options.height || 1080,
        },
        provider: 'ffmpeg',
      };

      const renderingOptions: RenderingOptions = {
        quality: this.options.quality,
        frameRate: this.options.fps,
        format: (this.options.format === 'mp4' || this.options.format === 'webm') ? this.options.format : 'mp4',
      };

      const result = await service.renderVideo(composition, renderingOptions);

      const duration = (Date.now() - startTime) / 1000;

      if (result.success) {
        this.options.onProgress?.({
          progress: 100,
          message: 'Render complete',
          currentFrame: totalFrames,
          totalFrames,
        });

        return { success: true, url: result.videoUrl, duration };
      }

      return { success: false, duration, error: result.error || 'Rendering failed' };

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown rendering error',
      };
    }
  }

  /**
   * Abort the current rendering process
   */
  abort(): void {
    this.aborted = true;
  }
}
