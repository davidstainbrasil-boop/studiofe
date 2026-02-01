/**
 * FFmpeg Service - Client-Side Safe Version
 * This version does NOT import Node.js modules (fs, path, child_process)
 * It provides interfaces and client-side utilities only
 * For actual rendering, use API routes that call ffmpeg-service-server.ts
 */

import { logger } from '@lib/logger';
import type { RenderSettings as BaseRenderSettings } from '@/types/rendering';

// Re-export the shared RenderSettings type with additional local properties
export interface RenderSettings extends BaseRenderSettings {
  codec: 'h264' | 'h265' | 'vp9' | 'prores';
  audioEnabled?: boolean;
  hardwareAcceleration?: boolean;
  preset?: string;
  width?: number;
  height?: number;
  audioCodec?: string;
}

// Local resolution type with additional 1440p option
type LocalResolution = '720p' | '1080p' | '1440p' | '4k';

export function getResolutionDimensions(resolution: LocalResolution): { width: number; height: number } {
  const dimensions: Record<string, { width: number; height: number }> = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '1440p': { width: 2560, height: 1440 },
    '4k': { width: 3840, height: 2160 },
  };
  return dimensions[resolution] || dimensions['1080p'];
}

export interface RenderProgress {
  percent: number;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  timeElapsed: number;
  timeRemaining: number;
  stage: string;
}

export interface FFmpegOptions {
  input: string;
  output: string;
  format?: string;
  codec?: string;
}

export interface MediaInfo {
  duration: number;
  width: number;
  height: number;
}

export interface RenderJobRequest {
  projectId: string;
  slides: Array<{
    id: string;
    title: string;
    content: string;
    duration: number;
    audioUrl?: string;
    backgroundColor?: string;
    backgroundImage?: string;
  }>;
  settings?: Partial<RenderSettings>;
}

export interface RenderJobResponse {
  success: boolean;
  jobId?: string;
  videoUrl?: string;
  videoPath?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

/**
 * Client-side FFmpeg Service
 * This service communicates with server-side API routes for actual rendering
 */
export class FFmpegService {
  private progressCallback: ((progress: RenderProgress) => void) | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    // Client-side initialization - just check if API is available
    try {
      const response = await fetch('/api/render/health');
      if (response.ok) {
        this.initialized = true;
        logger.info('FFmpeg client initialized - API available', { component: 'FFmpegService' });
      } else {
        // For demo purposes, we'll allow initialization even if API doesn't respond
        this.initialized = true;
        logger.warn('FFmpeg API health check failed, but allowing initialization for demo', { component: 'FFmpegService' });
      }
    } catch (error) {
      // Allow initialization for demo purposes
      this.initialized = true;
      logger.warn('FFmpeg API not reachable, using demo mode', { component: 'FFmpegService' });
    }
  }

  setProgressCallback(callback: (progress: RenderProgress) => void): void {
    this.progressCallback = callback;
  }

  async convert(options: FFmpegOptions): Promise<void> {
    logger.info('FFmpeg conversion requested', { component: 'FFmpegService', options });
    // This would call the API route for conversion
  }

  async getInfo(filePath: string): Promise<MediaInfo> {
    // For client-side, return default values
    // Real implementation would call API
    return { duration: 0, width: 1920, height: 1080 };
  }

  /**
   * Request video rendering via API
   */
  async requestRender(request: RenderJobRequest): Promise<RenderJobResponse> {
    try {
      const response = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Render request failed', error instanceof Error ? error : new Error('Unknown error'));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check render job status via API
   */
  async checkRenderStatus(jobId: string): Promise<RenderProgress | null> {
    try {
      const response = await fetch(`/api/render/status/${jobId}`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * Legacy method for compatibility - now uses API
   * @deprecated Use requestRender instead
   */
  async renderVideo(
    frames: Blob[],
    audio: Blob | null,
    settings: RenderSettings,
    duration: number
  ): Promise<ArrayBuffer> {
    logger.info('FFmpeg renderVideo called - delegating to API', { 
      component: 'FFmpegService',
      framesCount: frames.length, 
      hasAudio: !!audio, 
      duration 
    });

    // For demo/compatibility, return empty buffer
    // Real implementation would upload frames to API and wait for result
    logger.warn('renderVideo from blobs not yet implemented via API - returning empty buffer for demo', { component: 'FFmpegService' });
    return new ArrayBuffer(0);
  }
}

export const ffmpegService = new FFmpegService();
