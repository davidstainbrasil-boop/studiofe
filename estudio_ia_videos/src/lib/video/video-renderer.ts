/**
 * Video Renderer Service
 * Real video generation using FFmpeg for slide-to-video composition
 */

import ffmpeg from 'fluent-ffmpeg';
import { logger } from '@/lib/monitoring/logger';
import { AudioStorageManager } from '@/lib/tts/audio-storage-manager';
import { TTSRequest, TTSResponse } from '@/lib/tts/tts-provider-abstraction';

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
  private composeTimeline(slides: Slide[]): {
    const fps = 30; // 30 FPS for smooth video
    const frameDuration = 1 / fps; // Duration of each frame in seconds
    
    // Create timeline with slide transitions
    const timeline: Array<{
      startTime: number;
      endTime: number;
      slideId: string;
      audioUrl: string;
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
    const { slides, resolution = '1080p', frameRate = 30, format = 'mp4' } = options;
    
    // Calculate video dimensions
    const width = resolution === '4k' ? 3840 : resolution === '720p' ? 1280 : 1920;
    const height = resolution === '4k' ? 2160 : resolution === '720p' ? 720 : 1080;
    
    const commands: string[] = [];
    
    // Create background slides
    const backgroundColor = options.backgroundColor || '#ffffff';
    
    for (const [index, slide] of slides.entries()) {
      const slideInput = `slide_${index}_input.png`;
      const slideOutput = `slide_${index}.png`;
      
      // Generate background image command
      if (slide.imageUrl) {
        commands.push(
          `-i ${slideInput}`,
          `-i ${slide.imageUrl}`,
          '-filter_complex',
          `[0:v]scale=${width}:${height},format=rgb,draw=text=text='Slide ${index + 1}':font=Arial:fontsize=48:fontcolor=black:x=(w-text_w+10):y=(h-10)`,
          `-metadata:s:v:0:title=Slide ${index + 1}`,
          `-metadata:s:v:0:duration=${slide.duration || 5}`,
        ]
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
          `-metadata:s:v:0:duration=${slide.duration || 5}`,
        ]
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
      commands.push(
        '-filter_complex',
        `[${i}:v]format=yuv420p[${i+1}:v]format=yuv420p[${i+2}];[${i+1}:v]${i+2}]blend=all_expression=A-if(gte(t\\,${slides[i].duration || 5});`
      );
    }

    // Add output settings
    commands.push(
      '-map', '[v]', // Map the first video stream
      '-c:v', 'libx264', // Use H.264 codec
      '-preset', options.quality === 'high' ? 'slow' : options.quality === 'low' ? 'ultrafast' : 'medium',
      '-crf', '23', // Constant Rate Factor (lower = better quality)
      '-pix_fmt', 'yuv420p', // Pixel format for compatibility
      '-r', frameRate.toString(),
      '-b:v', options.bitrate || '2000k', // Target bitrate
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
  private async executeFFmpeg(commands: string[]): Promise<{ success: boolean; videoPath?: string; duration?: number; size?: number }> {
    return new Promise((resolve, reject) => {
      logger.info('Starting FFmpeg rendering', { 
        commandCount: commands.length,
        component: 'VideoRendererService'
      });

      const startTime = Date.now();
      
      const process = ffmpeg(commands);
      
      let videoPath = '';
      let duration = 0;
      let size = 0;

      process.on('start', (commandLine) => {
        logger.debug('FFmpeg started:', { commandLine });
      });

      process.on('progress', (progress) => {
        logger.debug('FFmpeg progress:', { progress });
      });

      process.on('end', () => {
        logger.info('FFmpeg completed', { 
          duration: process.duration || 0,
          size: process.size || 0
        });
      });

      process.on('error', (error) => {
        logger.error('FFmpeg error:', error instanceof Error ? error : new Error(String(error)));
        reject(error instanceof Error ? error : new Error('FFmpeg rendering failed'));
      });

      process.on('end', () => {
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        // Extract output path from command
        const outputCommand = commands.find(cmd => cmd.includes(this.outputDir));
        if (outputCommand) {
          const match = outputCommand.match(/([^\/]+)\.(\w+)$/);
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
            bitrate: options.bitrate || '2000k',
          }
        };

      } else {
        const errorProcessingTime = Date.now() - startTime;
        
        logger.error('Video rendering failed', {
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
      const fs = await import('node:fs/promises');
      
      if (!fs.existsSync(this.outputDir)) {
        return 0;
      }

      const entries = await fs.readdir(this.outputDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;

      for (const entry of entries) {
        if (entry.isFile && (entry.endsWith('.mp4') || entry.endsWith('.webm'))) {
          const fullPath = `${this.outputDir}/${entry}`;
          const stats = await fs.stat(fullPath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(fullPath);
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
      const fs = await import('node:fs/promises');
      
      if (!fs.existsSync(this.outputDir)) {
        return {
          totalVideos: 0,
          totalSize: 0,
        };
      }

      const entries = await fs.readdir(this.outputDir);
      const videoEntries = entries.filter(entry => 
        entry.isFile && (entry.endsWith('.mp4') || entry.endsWith('.webm'))
      );

      let totalSize = 0;
      let oldestDate: Date;
      let newestDate: Date;

      for (const entry of videoEntries) {
        const fullPath = `${this.outputDir}/${entry}`;
        const stats = await fs.stat(fullPath);
        
        totalSize += stats.size;
        
        const fileDate = stats.mtime;
        if (!oldestDate || fileDate < oldestDate)oldestDate = fileDate;
        if (!newestDate || fileDate > newestDate)newestDate = fileDate;
      }

      return {
        totalVideos: videoEntries.length,
        totalSize,
        oldestVideo: oldestDate,
        newestVideo,
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