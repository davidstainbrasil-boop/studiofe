
/**
 * Video Enhancement Service
 * Handles all video quality enhancement operations using FFmpeg and Supabase Storage
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@lib/logger';
import { supabase } from '@lib/supabase/client'; // Assuming this exists or similar

interface EnhancementResult {
  success: boolean;
  outputUrl?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export class VideoEnhancementService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'tmp', 'enhancement');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async uploadToStorage(filePath: string, fileName: string): Promise<string> {
    const fileContent = createReadStream(filePath);
    // Assuming 'videos' bucket exists
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(`enhancements/${fileName}`, fileContent as any, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(`enhancements/${fileName}`);

    return publicUrl;
  }

  /**
   * Upscale video to higher resolution using FFmpeg (Lanczos)
   */
  async upscale(inputPath: string, resolution: string): Promise<EnhancementResult> {
    const outputPath = path.join(this.tempDir, `${uuidv4()}_upscaled.mp4`);
    
    // Map resolution names to height
    const heightMap: Record<string, number> = {
      '720p': 720,
      '1080p': 1080,
      '1440p': 1440,
      '2160p': 2160,
      '4k': 2160
    };
    const height = heightMap[resolution] || 1080;

    logger.info(`Starting upscale to ${resolution}`, { inputPath });

    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .size(`?x${height}`) // Maintain aspect ratio
        .outputOptions('-preset fast')
        .on('end', async () => {
            try {
                const publicUrl = await this.uploadToStorage(outputPath, path.basename(outputPath));
                await fs.unlink(outputPath); // Cleanup
                resolve({
                    success: true,
                    outputUrl: publicUrl,
                    metadata: { resolution, method: 'ffmpeg-lanczos' }
                });
            } catch (e) {
                resolve({ success: false, error: e instanceof Error ? e.message : String(e) });
            }
        })
        .on('error', (err) => {
            logger.error('FFmpeg upscale error', err);
            resolve({ success: false, error: err.message });
        })
        .run();
    });
  }

  /**
   * Reduce video noise using FFmpeg (hqdn3d)
   */
  async denoise(inputPath: string, intensity: number): Promise<EnhancementResult> {
    const outputPath = path.join(this.tempDir, `${uuidv4()}_denoised.mp4`);
    // Map intensity (0-100) to hqdn3d parameters (luma_spatial, chroma_spatial, luma_tmp, chroma_tmp)
    // Default roughly 4.0
    const factor = (intensity / 100) * 10; // 0 to 10

    logger.info(`Starting denoise with intensity ${intensity}`, { inputPath });

    return new Promise((resolve) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .videoFilters(`hqdn3d=${factor}:${factor}:${factor}:${factor}`)
          .outputOptions('-preset fast')
          .on('end', async () => {
              try {
                  const publicUrl = await this.uploadToStorage(outputPath, path.basename(outputPath));
                  await fs.unlink(outputPath);
                  resolve({
                      success: true,
                      outputUrl: publicUrl,
                      metadata: { intensity, method: 'ffmpeg-hqdn3d' }
                  });
              } catch (e) {
                  resolve({ success: false, error: e instanceof Error ? e.message : String(e) });
              }
          })
          .on('error', (err) => {
              logger.error('FFmpeg denoise error', err);
              resolve({ success: false, error: err.message });
          })
          .run();
      });
  }

  /**
   * Interpolate frames to target FPS
   */
  async interpolate(inputPath: string, targetFps: number): Promise<EnhancementResult> {
    const outputPath = path.join(this.tempDir, `${uuidv4()}_interpolated.mp4`);

    logger.info(`Starting interpolation to ${targetFps}fps`, { inputPath });

    return new Promise((resolve) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .fps(targetFps) // Simple frame duplication/drop. For motion interpolation, use minterpolate filter (very slow)
          // .videoFilters(`minterpolate=fps=${targetFps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`) // Too slow for MVP without GPU
          .outputOptions('-preset fast')
          .on('end', async () => {
              try {
                  const publicUrl = await this.uploadToStorage(outputPath, path.basename(outputPath));
                  await fs.unlink(outputPath);
                  resolve({
                      success: true,
                      outputUrl: publicUrl,
                      metadata: { targetFps, method: 'ffmpeg-fps' }
                  });
              } catch (e) {
                  resolve({ success: false, error: e instanceof Error ? e.message : String(e) });
              }
          })
          .on('error', (err) => {
              logger.error('FFmpeg interpolation error', err);
              resolve({ success: false, error: err.message });
          })
          .run();
      });
  }

  /**
   * Apply color grading preset
   */
  async applyColorGrading(inputPath: string, preset: string): Promise<EnhancementResult> {
    const outputPath = path.join(this.tempDir, `${uuidv4()}_graded.mp4`);
    
    let filter = 'eq=saturation=1.0'; // default

    switch (preset) {
        case 'cinematic':
            filter = 'eq=contrast=1.2:saturation=1.2:brightness=-0.05';
            break;
        case 'vibrant':
            filter = 'eq=saturation=1.5:contrast=1.1';
            break;
        case 'bw':
            filter = 'hue=s=0';
            break;
        case 'warm':
            filter = 'colorbalance=rs=0.1:gs=-0.05:bs=-0.1';
            break;
        case 'cool':
             filter = 'colorbalance=rs=-0.1:gs=-0.05:bs=0.1';
            break;
    }

    logger.info(`Starting color grading with preset ${preset}`, { inputPath });

    return new Promise((resolve) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .videoFilters(filter)
          .outputOptions('-preset fast')
          .on('end', async () => {
              try {
                  const publicUrl = await this.uploadToStorage(outputPath, path.basename(outputPath));
                  await fs.unlink(outputPath);
                  resolve({
                      success: true,
                      outputUrl: publicUrl,
                      metadata: { preset, method: 'ffmpeg-eq' }
                  });
              } catch (e) {
                  resolve({ success: false, error: e instanceof Error ? e.message : String(e) });
              }
          })
          .on('error', (err) => {
              logger.error('FFmpeg color grading error', err);
              resolve({ success: false, error: err.message });
          })
          .run();
      });
  }
}

export const videoEnhancementService = new VideoEnhancementService();
