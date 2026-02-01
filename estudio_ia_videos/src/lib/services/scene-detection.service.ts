
/**
 * Scene Detection Service
 * Handles video scene detection and analysis using FFmpeg
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@lib/logger';
import { supabase } from '@lib/supabase/client';

interface Scene {
  id: number;
  startTime: number;
  endTime: number;
  thumbnail?: string;
  description: string;
  confidence: number;
}

interface SceneDetectionResult {
  success: boolean;
  scenes?: Scene[];
  metadata?: Record<string, any>;
  error?: string;
}

export class SceneDetectionService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'tmp', 'scenes');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async uploadToStorage(filePath: string, folder: string): Promise<string> {
    const fileName = path.basename(filePath);
    const fileContent = createReadStream(filePath);
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(`${folder}/${fileName}`, fileContent as any, {
        contentType: folder === 'thumbnails' ? 'image/jpeg' : 'video/mp4',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(`${folder}/${fileName}`);

    return publicUrl;
  }

  /**
   * Detect scenes in a video using FFmpeg scene filter
   */
  async detectScenes(
    videoPath: string,
    sensitivity: number = 50
  ): Promise<SceneDetectionResult> {
    // FFmpeg scene detection: 0 to 1. 
    // sensitivity 0-100. 
    // High sensitivity = low threshold (more scenes).
    // Threshold 0.1 (very sensitive) to 0.5 (less sensitive).
    // Formula: 0.6 - (sensitivity / 200) -> 50% = 0.35. 100% = 0.1. 0% = 0.6.
    const threshold = 0.6 - (sensitivity / 200);
    
    logger.info(`Starting scene detection`, { videoPath, sensitivity, threshold });

    return new Promise((resolve) => {
      const timestamps: number[] = [0]; // Start with 0

      ffmpeg(videoPath)
        .videoFilters(`select='gt(scene,${threshold})',showinfo`)
        .outputOptions('-f', 'null')
        .on('stderr', (line: string) => {
          // Parse output like: [Parsed_showinfo_1 @ 0x...] n:   0 pts:  120120 pts_time:0.4004 ...
          if (line.includes('pts_time:')) {
            const match = line.match(/pts_time:([0-9.]+)/);
            if (match && match[1]) {
               const time = parseFloat(match[1]);
               // Avoid duplicates close to each other
               if (time - timestamps[timestamps.length - 1] > 0.5) {
                 timestamps.push(time);
               }
            }
          }
        })
        .on('end', async () => {
            // Get duration to close the last scene
            const duration = await this.getVideoDuration(videoPath);
            if (duration > timestamps[timestamps.length - 1]) {
                timestamps.push(duration);
            }

            const scenes: Scene[] = [];
            for (let i = 0; i < timestamps.length - 1; i++) {
                scenes.push({
                    id: i + 1,
                    startTime: parseFloat(timestamps[i].toFixed(2)),
                    endTime: parseFloat(timestamps[i + 1].toFixed(2)),
                    description: `Scene ${i + 1}`,
                    confidence: 1.0 // FFmpeg matched
                });
            }

            // Generate thumbnails for detected scenes
            const scenesWithThumbnails = await this.enrichScenesWithThumbnails(videoPath, scenes);

            resolve({
                success: true,
                scenes: scenesWithThumbnails,
                metadata: {
                    totalScenes: scenes.length,
                    sensitivity,
                    algorithm: 'FFmpeg-scene',
                    videoDuration: duration
                }
            });
        })
        .on('error', (err) => {
            logger.error('Scene detection error', err);
            resolve({ success: false, error: err.message });
        })
        .run();
    });
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) resolve(0);
        else resolve(metadata.format.duration || 0);
      });
    });
  }

  private async enrichScenesWithThumbnails(videoPath: string, scenes: Scene[]): Promise<Scene[]> {
     const enriched = [...scenes];
     for (const scene of enriched) {
         try {
             const thumbPath = path.join(this.tempDir, `${uuidv4()}_thumb.jpg`);
             await new Promise<void>((resolve, reject) => {
                 ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [scene.startTime],
                        filename: path.basename(thumbPath),
                        folder: this.tempDir,
                        size: '320x180'
                    })
                    .on('end', () => resolve())
                    .on('error', (e) => reject(e));
             });
             
             const url = await this.uploadToStorage(thumbPath, 'thumbnails');
             scene.thumbnail = url;
             await fs.unlink(thumbPath).catch(() => {});
         } catch (e) {
             const errorContext = e instanceof Error ? { error: e.message } : undefined;
             logger.warn(`Failed to generate thumbnail for scene ${scene.id}`, errorContext);
         }
     }
     return enriched;
  }

  /**
   * Export individual scenes from video
   */
  async exportScenes(
    videoPath: string,
    scenes: Scene[],
    selectedIds: number[]
  ): Promise<{ sceneId: number; url: string }[]> {
    const selectedScenes = scenes.filter(s => selectedIds.includes(s.id));
    const results: { sceneId: number; url: string }[] = [];

    for (const scene of selectedScenes) {
        const outputPath = path.join(this.tempDir, `${uuidv4()}_scene_${scene.id}.mp4`);
        try {
            await new Promise<void>((resolve, reject) => {
                ffmpeg(videoPath)
                    .seekInput(scene.startTime)
                    .duration(scene.endTime - scene.startTime)
                    .output(outputPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .on('end', () => resolve())
                    .on('error', (e) => reject(e))
                    .run();
            });

            const url = await this.uploadToStorage(outputPath, 'scenes');
            results.push({ sceneId: scene.id, url });
            await fs.unlink(outputPath);

        } catch (e) {
            logger.error(`Failed to export scene ${scene.id}`, e instanceof Error ? e : new Error(String(e)));
        }
    }
    return results;
  }

  /**
   * Generate thumbnails (Public method matching interface, but utilizing internal helper)
   */
  async generateThumbnails(videoPath: string, scenes: Scene[]): Promise<string[]> {
      const enriched = await this.enrichScenesWithThumbnails(videoPath, scenes);
      return enriched.map(s => s.thumbnail || '');
  }
}

export const sceneDetectionService = new SceneDetectionService();
