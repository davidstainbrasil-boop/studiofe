/**
 * FFmpeg Service - Server-Side Implementation
 * This file contains the REAL FFmpeg implementation that uses Node.js modules
 * Only import this in API routes, not in client components!
 */

import { logger } from '@lib/logger';
import { 
  renderVideo as ffmpegRenderVideo, 
  renderSimpleVideo as ffmpegRenderSimpleVideo, 
  checkFFmpeg, 
  getVideoInfo, 
  RenderConfig,
  DEFAULT_CONFIG
} from './ffmpeg-renderer';
import type { SlideData, RenderResult } from './ffmpeg-renderer';
import { promises as fs } from 'fs';
import path from 'path';

export interface ServerRenderSettings {
  resolution: '720p' | '1080p' | '1440p';
  format: 'mp4' | 'mov' | 'webm';
  quality: 'draft' | 'standard' | 'high' | 'premium';
  fps: number;
  bitrate: string;
  audioBitrate: string;
}

function getResolutionDimensions(resolution: ServerRenderSettings['resolution']): { width: number; height: number } {
  const dimensions: Record<string, { width: number; height: number }> = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '1440p': { width: 2560, height: 1440 },
  };
  return dimensions[resolution] || dimensions['1080p'];
}

/**
 * Server-side FFmpeg Service
 * Use this in API routes for real video rendering
 */
export class FFmpegServiceServer {
  private initialized = false;

  async initialize(): Promise<void> {
    const isAvailable = await checkFFmpeg();
    if (!isAvailable) {
      logger.error('FFmpeg not found on system!', new Error('FFmpeg binary not found'));
      throw new Error('FFmpeg binário não encontrado no sistema');
    }
    this.initialized = true;
    logger.info('FFmpeg Server initialized and available', { component: 'FFmpegServiceServer' });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Renderiza vídeo a partir de slides - IMPLEMENTAÇÃO REAL
   */
  async renderFromSlides(
    slides: SlideData[],
    projectId: string,
    settings?: Partial<ServerRenderSettings>
  ): Promise<RenderResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info('FFmpeg renderFromSlides: Starting REAL render', { 
      component: 'FFmpegServiceServer', 
      slidesCount: slides.length, 
      projectId 
    });

    const dims = settings?.resolution 
      ? getResolutionDimensions(settings.resolution) 
      : { width: 1920, height: 1080 };

    const config: Partial<RenderConfig> = {
      width: dims.width,
      height: dims.height,
      fps: settings?.fps || 30,
      videoBitrate: settings?.bitrate || '5000k',
      audioBitrate: settings?.audioBitrate || '192k',
      format: (settings?.format || 'mp4') as 'mp4' | 'webm',
    };

    const result = await ffmpegRenderVideo(slides, projectId, config);

    if (result.success) {
      logger.info('FFmpeg renderFromSlides: Video generated successfully', { 
        component: 'FFmpegServiceServer',
        videoUrl: result.videoUrl,
        duration: result.duration,
        fileSize: result.fileSize
      });
    } else {
      logger.error('FFmpeg renderFromSlides: Render failed', new Error(result.error || 'Unknown error'));
    }

    return result;
  }

  /**
   * Renderiza vídeo simples com texto
   */
  async renderSimpleVideo(
    text: string,
    audioUrl: string | null,
    projectId: string,
    duration: number = 10
  ): Promise<RenderResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    return ffmpegRenderSimpleVideo(text, audioUrl, projectId, duration);
  }

  /**
   * Obtém informações de um vídeo
   */
  async getVideoInfo(videoPath: string) {
    return getVideoInfo(videoPath);
  }

  /**
   * Verifica se FFmpeg está disponível
   */
  async checkFFmpegAvailable(): Promise<boolean> {
    return checkFFmpeg();
  }
}

// Singleton instance for server-side use
export const ffmpegServiceServer = new FFmpegServiceServer();

// Re-exports
export { checkFFmpeg, getVideoInfo, DEFAULT_CONFIG };
export type { SlideData, RenderResult, RenderConfig };
