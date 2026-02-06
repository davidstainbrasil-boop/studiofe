/**
 * FFmpeg Service Module - REAL Implementation
 * Handles FFmpeg operations for video/audio processing
 * 
 * Uses fluent-ffmpeg for actual video processing
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';

export interface FFmpegOptions {
  inputPath: string;
  outputPath: string;
  codec?: string;
  bitrate?: string;
  fps?: number;
  resolution?: string;
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  crf?: number;
  audioCodec?: string;
  audioBitrate?: string;
  customArgs?: string[];
}

export interface FFmpegProgress {
  frames: number;
  fps: number;
  time: string;
  bitrate: string;
  size: string;
  percentage: number;
}

export interface FFmpegResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
  fileSize?: number;
}

export type ProgressCallback = (progress: FFmpegProgress) => void;

class FFmpegService {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor() {
    // Try to use system ffmpeg or ffmpeg-static
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  }

  async checkAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn(this.ffmpegPath, ['-version']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  async getVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const process = spawn(this.ffmpegPath, ['-version']);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/ffmpeg version ([^\s]+)/);
          resolve(match ? match[1] : output.split('\n')[0]);
        } else {
          resolve(null);
        }
      });
      
      process.on('error', () => {
        resolve(null);
      });
    });
  }

  async transcode(
    options: FFmpegOptions, 
    onProgress?: ProgressCallback
  ): Promise<FFmpegResult> {
    const startTime = Date.now();
    
    try {
      // Get input duration for progress calculation
      const duration = await this.getMediaDuration(options.inputPath);
      
      const args = this.buildCommand(options);
      
      logger.info('Starting FFmpeg transcode', { 
        input: options.inputPath, 
        output: options.outputPath,
        args: args.join(' ')
      });

      await this.executeFFmpeg(args, duration, onProgress);
      
      // Get output file stats
      const stats = await fs.stat(options.outputPath);
      
      return {
        success: true,
        outputPath: options.outputPath,
        duration: (Date.now() - startTime) / 1000,
        fileSize: stats.size
      };

    } catch (error) {
      logger.error('FFmpeg transcode failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FFmpeg transcode failed'
      };
    }
  }

  async extractFrames(
    inputPath: string, 
    outputPattern: string, 
    fps: number = 1
  ): Promise<FFmpegResult> {
    const startTime = Date.now();
    
    try {
      const outputDir = path.dirname(outputPattern);
      await fs.mkdir(outputDir, { recursive: true });

      const args = [
        '-i', inputPath,
        '-vf', `fps=${fps}`,
        '-q:v', '2',
        outputPattern
      ];

      await this.executeFFmpeg(args);

      return {
        success: true,
        outputPath: outputPattern,
        duration: (Date.now() - startTime) / 1000
      };

    } catch (error) {
      logger.error('FFmpeg extractFrames failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FFmpeg extractFrames failed'
      };
    }
  }

  async createThumbnail(
    inputPath: string, 
    outputPath: string, 
    timestamp: string = '00:00:01'
  ): Promise<FFmpegResult> {
    const startTime = Date.now();
    
    try {
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      const args = [
        '-i', inputPath,
        '-ss', timestamp,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outputPath
      ];

      await this.executeFFmpeg(args);

      return {
        success: true,
        outputPath,
        duration: (Date.now() - startTime) / 1000
      };

    } catch (error) {
      logger.error('FFmpeg createThumbnail failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FFmpeg createThumbnail failed'
      };
    }
  }

  async concatenateVideos(
    inputPaths: string[], 
    outputPath: string
  ): Promise<FFmpegResult> {
    const startTime = Date.now();
    
    try {
      // Create concat file
      const concatFile = path.join(path.dirname(outputPath), 'concat_list.txt');
      const concatContent = inputPaths.map(p => `file '${p}'`).join('\n');
      await fs.writeFile(concatFile, concatContent);

      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFile,
        '-c', 'copy',
        '-y',
        outputPath
      ];

      await this.executeFFmpeg(args);
      
      // Cleanup concat file
      await fs.unlink(concatFile).catch(() => {});

      return {
        success: true,
        outputPath,
        duration: (Date.now() - startTime) / 1000
      };

    } catch (error) {
      logger.error('FFmpeg concatenateVideos failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FFmpeg concatenateVideos failed'
      };
    }
  }

  async addWatermark(
    inputPath: string, 
    watermarkPath: string, 
    outputPath: string,
    position: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'bottomright'
  ): Promise<FFmpegResult> {
    const startTime = Date.now();
    
    try {
      const positionMap = {
        topleft: '10:10',
        topright: 'W-w-10:10',
        bottomleft: '10:H-h-10',
        bottomright: 'W-w-10:H-h-10'
      };

      const args = [
        '-i', inputPath,
        '-i', watermarkPath,
        '-filter_complex', `overlay=${positionMap[position]}`,
        '-codec:a', 'copy',
        '-y',
        outputPath
      ];

      await this.executeFFmpeg(args);

      return {
        success: true,
        outputPath,
        duration: (Date.now() - startTime) / 1000
      };

    } catch (error) {
      logger.error('FFmpeg addWatermark failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FFmpeg addWatermark failed'
      };
    }
  }

  async addSubtitles(
    inputPath: string, 
    subtitlesPath: string, 
    outputPath: string
  ): Promise<FFmpegResult> {
    const startTime = Date.now();
    
    try {
      const args = [
        '-i', inputPath,
        '-vf', `subtitles=${subtitlesPath}`,
        '-c:a', 'copy',
        '-y',
        outputPath
      ];

      await this.executeFFmpeg(args);

      return {
        success: true,
        outputPath,
        duration: (Date.now() - startTime) / 1000
      };

    } catch (error) {
      logger.error('FFmpeg addSubtitles failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FFmpeg addSubtitles failed'
      };
    }
  }

  buildCommand(options: FFmpegOptions): string[] {
    const args: string[] = ['-i', options.inputPath];
    
    if (options.codec) args.push('-c:v', options.codec);
    if (options.bitrate) args.push('-b:v', options.bitrate);
    if (options.fps) args.push('-r', String(options.fps));
    if (options.resolution) args.push('-s', options.resolution);
    if (options.preset) args.push('-preset', options.preset);
    if (options.crf !== undefined) args.push('-crf', String(options.crf));
    if (options.audioCodec) args.push('-c:a', options.audioCodec);
    if (options.audioBitrate) args.push('-b:a', options.audioBitrate);
    if (options.customArgs) args.push(...options.customArgs);
    
    args.push('-y'); // Overwrite output
    args.push(options.outputPath);
    
    return args;
  }

  private async executeFFmpeg(
    args: string[], 
    totalDuration?: number,
    onProgress?: ProgressCallback
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        
        if (onProgress && totalDuration) {
          const progress = this.parseProgress(data.toString(), totalDuration);
          if (progress) {
            onProgress(progress);
          }
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseProgress(output: string, totalDuration: number): FFmpegProgress | null {
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const frameMatch = output.match(/frame=\s*(\d+)/);
    const fpsMatch = output.match(/fps=\s*([\d.]+)/);
    const bitrateMatch = output.match(/bitrate=\s*([\d.]+\s*\w+\/s)/);
    const sizeMatch = output.match(/size=\s*([\d.]+\s*\w+)/);

    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseFloat(timeMatch[3]);
      const currentTime = hours * 3600 + minutes * 60 + seconds;
      
      return {
        frames: frameMatch ? parseInt(frameMatch[1]) : 0,
        fps: fpsMatch ? parseFloat(fpsMatch[1]) : 0,
        time: `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`,
        bitrate: bitrateMatch ? bitrateMatch[1] : '0kbits/s',
        size: sizeMatch ? sizeMatch[1] : '0KB',
        percentage: Math.min(100, (currentTime / totalDuration) * 100)
      };
    }

    return null;
  }

  private async getMediaDuration(inputPath: string): Promise<number> {
    return new Promise((resolve) => {
      const process = spawn(this.ffprobePath, [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath
      ]);

      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', () => {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      });

      process.on('error', () => {
        resolve(0);
      });
    });
  }
}

export const ffmpegService = new FFmpegService();

export default ffmpegService;
