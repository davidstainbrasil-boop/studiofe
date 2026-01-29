/**
 * 📤 Video Uploader - IMPLEMENTAÇÃO REAL
 * Upload de vídeos renderizados para Supabase Storage
 */

import { logger } from '@lib/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lib/supabase/database.types';
import { getRequiredEnv } from '@lib/env';

export interface VideoUploadOptions {
  videoPath: string;
  projectId: string;
  userId: string;
  jobId: string;
  metadata: {
    resolution: { width: number; height: number };
    fps: number;
    codec: string;
    format: string;
    duration?: number;
    fileSize?: number;
  };
}

export interface UploadResult {
  videoUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  duration: number;
  uploadTime: number;
}

export class VideoUploader {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient ?? this.createDefaultSupabaseClient();
  }

  private createDefaultSupabaseClient(): SupabaseClient<Database> {
    const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    return createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Upload de vídeo para Supabase Storage with timeout, idempotency, and concurrency control
   */
  async uploadVideo(options: VideoUploadOptions): Promise<string> {
    // In a strict real environment, we don't mock storage.
    // If MOCK_STORAGE is set, we throw an error if STRICT_REAL_MODE is on.
    if (process.env.MOCK_STORAGE === 'true' && process.env.STRICT_REAL_MODE === 'true') {
        throw new Error('Mock storage is not allowed in strict real mode.');
    }

    const { withTimeout, PIPELINE_TIMEOUTS } = await import('../config/timeout-config');
    const { withStorageConcurrency } = await import('../queue/concurrency-limiter');
    const { withIdempotency, generateStorageIdempotencyKey } = await import('../middleware/idempotency-middleware');
    
    // Generate idempotency key for storage upload
    const fileStats = await fs.stat(options.videoPath).catch(() => ({ size: 0 }));
    const idempotencyKey = generateStorageIdempotencyKey(
      options.jobId,
      path.basename(options.videoPath),
      fileStats.size
    );
    
    logger.info('Uploading video with hardening', { 
      videoPath: options.videoPath, 
      projectId: options.projectId, 
      idempotencyKey,
      service: 'VideoUploader' 
    });

    // Apply concurrency control
    return withStorageConcurrency(async () => {
      // Apply idempotency
      return withIdempotency(
        idempotencyKey,
        async () => {
          // Apply timeout enforcement
          return withTimeout(
            this.uploadVideoInternal(options),
            PIPELINE_TIMEOUTS.storageUpload,
            `Video Upload for job ${options.jobId}`
          );
        }
      );
    });
  }

  /**
   * Internal upload logic (extracted for wrapping)
   */
  private async uploadVideoInternal(options: VideoUploadOptions): Promise<string> {
    try {
      // 1. Lê o arquivo de vídeo
      const videoBuffer = await fs.readFile(options.videoPath);
      const fileSize = videoBuffer.length;

      // 2. Gera nome único para o arquivo
      const timestamp = Date.now();
      const extension = path.extname(options.videoPath);
      const fileName = `${options.projectId}_${options.jobId}_${timestamp}${extension}`;
      const storagePath = `videos/${options.userId}/${fileName}`;

      logger.debug('Storage path', { storagePath, service: 'VideoUploader' });

      // 3. Upload para bucket 'videos'
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('videos')
        .upload(storagePath, videoBuffer, {
          contentType: this.getContentType(extension),
          metadata: {
            projectId: options.projectId,
            jobId: options.jobId,
            userId: options.userId,
            ...options.metadata
          },
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      logger.info('Video uploaded successfully', { path: uploadData.path, service: 'VideoUploader' });

      // 4. Obtém URL pública
      const { data: urlData } = this.supabase.storage
        .from('videos')
        .getPublicUrl(storagePath);

      const videoUrl = urlData.publicUrl;

      // 5. Gera thumbnail
      const thumbnailUrl = await this.generateAndUploadThumbnail(
        options.videoPath,
        options.userId,
        options.jobId
      );

      // 6. Atualiza tabela render_jobs
      await this.updateRenderJobRecord(options.jobId, {
        videoUrl,
        thumbnailUrl,
        fileSize,
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      logger.info('Video upload completed', { videoUrl, service: 'VideoUploader' });
      return videoUrl;

    } catch (error) {
      logger.error('Video upload failed', error instanceof Error ? error : new Error(String(error)), { jobId: options.jobId, service: 'VideoUploader' });
      
      // Atualiza status como erro
      await this.updateRenderJobRecord(options.jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
        completedAt: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Gera thumbnail do vídeo e faz upload
   */
  private async generateAndUploadThumbnail(
    videoPath: string,
    userId: string,
    jobId: string
  ): Promise<string> {
    try {
      logger.info('Generating video thumbnail', { videoPath, service: 'VideoUploader' });

      // Extrai primeiro frame do vídeo com FFmpeg
      const thumbnailPath = videoPath.replace(path.extname(videoPath), '_thumb.png');
      
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', videoPath,
          '-ss', '00:00:01', // 1 segundo
          '-vframes', '1',
          '-s', '320x240', // Tamanho do thumbnail
          '-f', 'image2',
          '-y',
          thumbnailPath
        ]);

        ffmpeg.on('close', async (code) => {
          if (code === 0) {
            try {
              // Upload do thumbnail
              const thumbnailBuffer = await fs.readFile(thumbnailPath);
              const thumbnailFileName = `thumb_${jobId}_${Date.now()}.png`;
              const thumbnailStoragePath = `thumbnails/${userId}/${thumbnailFileName}`;

              const { data, error } = await this.supabase.storage
                .from('thumbnails')
                .upload(thumbnailStoragePath, thumbnailBuffer, {
                  contentType: 'image/png',
                  upsert: true
                });

              if (error) {
                logger.warn('Thumbnail upload failed', { error: error.message, service: 'VideoUploader' });
                resolve(''); 
                return;
              }

              const { data: urlData } = this.supabase.storage
                .from('thumbnails')
                .getPublicUrl(thumbnailStoragePath);

              // Limpa arquivo temporário
              await fs.unlink(thumbnailPath).catch((error) => {
                logger.debug('Temp thumbnail file already deleted', {
                  component: 'VideoUploader',
                  thumbnailPath,
                  error: error instanceof Error ? error.message : String(error)
                });
              });

              logger.info('Thumbnail generated and uploaded', { service: 'VideoUploader' });
              resolve(urlData.publicUrl);

            } catch (error) {
              logger.warn('Thumbnail processing failed', { error: error instanceof Error ? error.message : String(error), service: 'VideoUploader' });
              resolve(''); 
            }
          } else {
            logger.warn('FFmpeg thumbnail generation failed', { code, service: 'VideoUploader' });
            resolve(''); 
          }
        });

        ffmpeg.on('error', (error) => {
          logger.warn('FFmpeg spawn error', { error: error.message, service: 'VideoUploader' });
          resolve(''); 
        });
      });

    } catch (error) {
      logger.warn('Thumbnail generation failed', { error: error instanceof Error ? error.message : String(error), service: 'VideoUploader' });
      return ''; 
    }
  }

  /**
   * Atualiza registro na tabela render_jobs
   */
  private async updateRenderJobRecord(
    jobId: string,
    updates: {
      videoUrl?: string;
      thumbnailUrl?: string;
      fileSize?: number;
      status?: string;
      error?: string;
      completedAt?: string;
    }
  ): Promise<void> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.videoUrl) dbUpdates.output_url = updates.videoUrl;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.error) dbUpdates.error_message = updates.error;
      if (updates.completedAt) dbUpdates.completed_at = updates.completedAt;

      const { error } = await this.supabase
        .from('render_jobs')
        .update(dbUpdates)
        .eq('id', jobId);

      if (error) {
        logger.error('Failed to update render_jobs', new Error(error.message), { jobId, service: 'VideoUploader' });
      } else {
        logger.debug('Updated render_jobs record', { jobId, service: 'VideoUploader' });
      }
    } catch (error) {
      logger.error('Error updating render_jobs', error instanceof Error ? error : new Error(String(error)), { jobId, service: 'VideoUploader' });
    }
  }

  /**
   * Determina Content-Type baseado na extensão
   */
  private getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska'
    };

    return contentTypes[extension.toLowerCase()] || 'video/mp4';
  }
}
