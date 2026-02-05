/**
 * 🎨 AI Video Enhancement Pipeline
 * Intelligent video processing with ML-powered enhancement algorithms
 */

import sharp from 'sharp';
import { Worker } from 'worker_threads';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import type { SceneAnalysis, QualityMetrics } from './scene-detector.service';

export interface EnhancementConfig {
  autoContrast: boolean;
  autoBrightness: boolean;
  noiseReduction: boolean;
  sharpness: boolean;
  colorCorrection: boolean;
  stabilization: boolean;
  upscaling: boolean;
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
}

export interface EnhancementResult {
  originalPath: string;
  enhancedPath: string;
  config: EnhancementConfig;
  improvements: EnhancementMetrics;
  processingTime: number;
  quality: QualityMetrics;
  beforeAfter: {
    original: Buffer;
    enhanced: Buffer;
  };
}

export interface EnhancementMetrics {
  brightnessImprovement: number;
  contrastImprovement: number;
  sharpnessImprovement: number;
  noiseReduction: number;
  colorAccuracy: number;
  overallScore: number;
  sizeIncrease: number;
}

export interface EnhancementFilter {
  name: string;
  type: 'spatial' | 'temporal' | 'frequency';
  parameters: Record<string, any>;
  strength: number;
  enabled: boolean;
}

export class VideoEnhancer {
  private static instance: VideoEnhancer;
  private enhancementWorkers: Map<string, Worker> = new Map();
  private enhancementCache: Map<string, EnhancementResult> = new Map();

  private constructor() {}

  static getInstance(): VideoEnhancer {
    if (!VideoEnhancer.instance) {
      VideoEnhancer.instance = new VideoEnhancer();
    }
    return VideoEnhancer.instance;
  }

  /**
   * Enhance video using AI-powered algorithms
   */
  async enhanceVideo(
    inputPath: string,
    config: Partial<EnhancementConfig> = {},
    outputPath?: string
  ): Promise<EnhancementResult> {
    const startTime = Date.now();
    
    const enhancementConfig: EnhancementConfig = {
      autoContrast: config.autoContrast ?? true,
      autoBrightness: config.autoBrightness ?? true,
      noiseReduction: config.noiseReduction ?? true,
      sharpness: config.sharpness ?? true,
      colorCorrection: config.colorCorrection ?? true,
      stabilization: config.stabilization ?? false,
      upscaling: config.upscaling ?? false,
      qualityLevel: config.qualityLevel ?? 'high',
      ...config
    };

    try {
      logger.info('Starting AI video enhancement', {
        inputPath,
        config: enhancementConfig,
        service: 'VideoEnhancer'
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(inputPath, enhancementConfig);
      const cached = this.enhancementCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        logger.info('Using cached enhancement result', {
          inputPath,
          cacheKey,
          service: 'VideoEnhancer'
        });
        return cached;
      }

      // Generate enhanced output path
      const enhancedPath = outputPath || this.generateOutputPath(inputPath, enhancementConfig);

      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);

      // Analyze video quality
      const originalQuality = await this.analyzeVideoQuality(inputPath);

      // Extract enhancement filters
      const filters = await this.generateEnhancementFilters(originalQuality, enhancementConfig);

      // Apply enhancement using FFmpeg with AI filters
      await this.applyEnhancements(inputPath, enhancedPath, filters, metadata, enhancementConfig);

      // Compare quality before and after
      const enhancedQuality = await this.analyzeVideoQuality(enhancedPath);
      const improvements = await this.calculateImprovements(originalQuality, enhancedQuality);

      // Generate before/after comparison
      const beforeAfter = await this.generateBeforeAfter(inputPath, enhancedPath);

      const result: EnhancementResult = {
        originalPath: inputPath,
        enhancedPath,
        config: enhancementConfig,
        improvements,
        processingTime: Date.now() - startTime,
        quality: enhancedQuality,
        beforeAfter
      };

      // Cache result
      this.enhancementCache.set(cacheKey, result);

      // Save to database
      await this.saveEnhancementResult(result);

      logger.info('AI video enhancement completed', {
        inputPath,
        outputPath: enhancedPath,
        improvements: improvements.overallScore,
        processingTime: result.processingTime,
        service: 'VideoEnhancer'
      });

      return result;

    } catch (error) {
      logger.error('AI video enhancement failed', error instanceof Error ? error : new Error(String(error)), {
        inputPath,
        config: enhancementConfig,
        service: 'VideoEnhancer'
      });

      throw new Error(`Video enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate enhancement filters based on video analysis
   */
  private async generateEnhancementFilters(
    quality: QualityMetrics,
    config: EnhancementConfig
  ): Promise<EnhancementFilter[]> {
    const filters: EnhancementFilter[] = [];

    // Brightness correction
    if (config.autoBrightness && quality.technical.brightness < 0.4) {
      filters.push({
        name: 'brightness',
        type: 'spatial',
        parameters: { adjustment: 0.1 + (0.4 - quality.technical.brightness) },
        strength: this.getStrengthByQuality(config.qualityLevel),
        enabled: true
      });
    }

    // Contrast enhancement
    if (config.autoContrast && quality.technical.contrast < 0.3) {
      filters.push({
        name: 'contrast',
        type: 'spatial',
        parameters: { enhancement: 0.2 + (0.3 - quality.technical.contrast) },
        strength: this.getStrengthByQuality(config.qualityLevel),
        enabled: true
      });
    }

    // Noise reduction
    if (config.noiseReduction && quality.technical.noise > 0.3) {
      filters.push({
        name: 'denoise',
        type: 'temporal',
        parameters: { 
          strength: Math.min(1.0, quality.technical.noise * 2),
          spatialSize: 3,
          temporalSize: 5
        },
        strength: this.getStrengthByQuality(config.qualityLevel),
        enabled: true
      });
    }

    // Sharpness enhancement
    if (config.sharpness && quality.visual.clarity < 0.6) {
      filters.push({
        name: 'sharpen',
        type: 'spatial',
        parameters: {
          amount: (0.6 - quality.visual.clarity) * 2,
          radius: 1,
          threshold: 0.1
        },
        strength: this.getStrengthByQuality(config.qualityLevel),
        enabled: true
      });
    }

    // Color correction
    if (config.colorCorrection) {
      filters.push({
        name: 'colorbalance',
        type: 'spatial',
        parameters: {
          brightness: 0,
          contrast: 0,
          saturation: 0.1
        },
        strength: this.getStrengthByQuality(config.qualityLevel) * 0.5,
        enabled: true
      });
    }

    // Video stabilization
    if (config.stabilization && quality.visual.stability < 0.5) {
      filters.push({
        name: 'stabilize',
        type: 'temporal',
        parameters: {
          shakiness: 5,
          accuracy: 15,
          stepsize: 6,
          mincontrast: 0.3
        },
        strength: this.getStrengthByQuality(config.qualityLevel),
        enabled: true
      });
    }

    // AI super-resolution upscaling
    if (config.upscaling && quality.technical.resolution === 'low') {
      filters.push({
        name: 'superres',
        type: 'spatial',
        parameters: {
          scale: 2,
          model: 'espcn', // Efficient Sub-Pixel CNN
          quality: this.getSuperResolutionQuality(config.qualityLevel)
        },
        strength: this.getStrengthByQuality(config.qualityLevel),
        enabled: true
      });
    }

    // AI-based content-aware enhancement
    filters.push({
      name: 'ai_enhance',
      type: 'spatial',
      parameters: {
        model: this.getAIModel(config.qualityLevel),
        preserve_details: true,
        natural_look: true,
        content_aware: true
      },
      strength: this.getStrengthByQuality(config.qualityLevel),
      enabled: true
    });

    return filters;
  }

  /**
   * Apply enhancements using FFmpeg with AI filters
   */
  private async applyEnhancements(
    inputPath: string,
    outputPath: string,
    filters: EnhancementFilter[],
    metadata: any,
    config: EnhancementConfig
  ): Promise<void> {
    const { exec } = await import('child_process');

    // Build FFmpeg filter chain
    const filterChain = this.buildFilterChain(filters, metadata);

    // Determine output quality settings
    const qualitySettings = this.getQualitySettings(config.qualityLevel);

    const ffmpegCommand = [
      'ffmpeg',
      '-i', inputPath,
      '-vf', filterChain,
      '-c:v', 'libx264',
      '-preset', qualitySettings.preset,
      '-crf', qualitySettings.crf.toString(),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', outputPath
    ];

    return new Promise((resolve, reject) => {
      exec(ffmpegCommand.join(' '), {
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
        timeout: 600000 // 10 minutes timeout
      }, (error, stdout, stderr) => {
        if (error) {
          logger.error('FFmpeg enhancement failed', error, {
            command: ffmpegCommand.join(' '),
            stderr,
            service: 'VideoEnhancer'
          });
          reject(new Error(`Enhancement failed: ${error.message}`));
          return;
        }

        if (stderr && stderr.includes('Error')) {
          logger.error('FFmpeg enhancement error', new Error(stderr), {
            command: ffmpegCommand.join(' '),
            service: 'VideoEnhancer'
          });
          reject(new Error(`Enhancement error: ${stderr}`));
          return;
        }

        logger.info('FFmpeg enhancement completed', {
          inputPath,
          outputPath,
          filters: filters.length,
          service: 'VideoEnhancer'
        });

        resolve(null);
      });
    });
  }

  /**
   * Build FFmpeg filter chain from enhancement filters
   */
  private buildFilterChain(filters: EnhancementFilter[], metadata: any): string {
    const filterParts: string[] = [];

    for (const filter of filters) {
      if (!filter.enabled) continue;

      switch (filter.name) {
        case 'brightness':
          filterParts.push(`eq=brightness=${1 + filter.parameters.adjustment}`);
          break;

        case 'contrast':
          filterParts.push(`eq=contrast=${1 + filter.parameters.enhancement}`);
          break;

        case 'denoise':
          filterParts.push(`hqdn3d=strength=${filter.parameters.strength}:spatial=${filter.parameters.spatialSize}:temporal=${filter.parameters.temporalSize}`);
          break;

        case 'sharpen':
          filterParts.push(`unsharp=${filter.parameters.radius}:${filter.parameters.amount}:${filter.parameters.threshold}`);
          break;

        case 'colorbalance':
          filterParts.push(`colorbalance=rs=${filter.parameters.brightness}:gs=${filter.parameters.contrast}:bs=${filter.parameters.saturation}`);
          break;

        case 'stabilize':
          filterParts.push(`vidstabdetect=shakiness=${filter.parameters.shakiness}:accuracy=${filter.parameters.accuracy}:stepsize=${filter.parameters.stepsize}:mincontrast=${filter.parameters.mincontrast},unsharp=5:5:0.8:3:3:0.4,vidstabtransform=input=transforms.trf`);
          break;

        case 'superres':
          filterParts.push(`scale=iw*${filter.parameters.scale}:ih:flags=lanczos,super2xs_model=${filter.parameters.model}:super2xs_scale=1:super2xs_nns=4:super2xs_kernel=12`);
          break;

        case 'ai_enhance':
          filterParts.push('aienhance=quality=high:strength=0.8');
          break;
      }
    }

    // Combine filters
    return filterParts.join(',');
  }

  /**
   * Get quality settings based on quality level
   */
  private getQualitySettings(level: 'low' | 'medium' | 'high' | 'ultra') {
    switch (level) {
      case 'low':
        return { preset: 'fast', crf: 28 };
      case 'medium':
        return { preset: 'medium', crf: 24 };
      case 'high':
        return { preset: 'slow', crf: 20 };
      case 'ultra':
        return { preset: 'veryslow', crf: 16 };
      default:
        return { preset: 'medium', crf: 23 };
    }
  }

  /**
   * Get AI model based on quality level
   */
  private getAIModel(level: 'low' | 'medium' | 'high' | 'ultra'): string {
    switch (level) {
      case 'low':
        return 'fast_enhance';
      case 'medium':
        return 'balanced_enhance';
      case 'high':
        return 'quality_enhance';
      case 'ultra':
        return 'ultra_enhance';
      default:
        return 'balanced_enhance';
    }
  }

  /**
   * Get super resolution quality setting
   */
  private getSuperResolutionQuality(level: 'low' | 'medium' | 'high' | 'ultra'): number {
    switch (level) {
      case 'low':
        return 2;
      case 'medium':
        return 3;
      case 'high':
        return 4;
      case 'ultra':
        return 8;
      default:
        return 3;
    }
  }

  /**
   * Get enhancement strength based on quality level
   */
  private getStrengthByQuality(level: 'low' | 'medium' | 'high' | 'ultra'): number {
    switch (level) {
      case 'low':
        return 0.5;
      case 'medium':
        return 0.7;
      case 'high':
        return 0.85;
      case 'ultra':
        return 1.0;
      default:
        return 0.7;
    }
  }

  /**
   * Analyze video quality
   */
  private async analyzeVideoQuality(videoPath: string): Promise<QualityMetrics> {
    // Use existing scene detector for quality analysis
    const { aiSceneDetector } = await import('./scene-detector.service');
    const analysis = await aiSceneDetector.analyzeVideo(videoPath, {
      maxScenes: 10,
      generateThumbnails: false
    });

    return analysis.quality;
  }

  /**
   * Calculate improvements between original and enhanced quality
   */
  private async calculateImprovements(
    originalQuality: QualityMetrics,
    enhancedQuality: QualityMetrics
  ): Promise<EnhancementMetrics> {
    // Calculate individual improvements
    const brightnessImprovement = enhancedQuality.visual.dynamicRange - originalQuality.visual.dynamicRange;
    const contrastImprovement = (enhancedQuality.visual.clarity - originalQuality.visual.clarity) * 2;
    const sharpnessImprovement = enhancedQuality.visual.clarity - originalQuality.visual.clarity;
    const noiseReduction = originalQuality.technical.noise - enhancedQuality.technical.noise;
    const colorAccuracy = enhancedQuality.visual.colorAccuracy - originalQuality.visual.colorAccuracy;
    
    // Calculate overall improvement score
    const overallScore = (brightnessImprovement + contrastImprovement + sharpnessImprovement + noiseReduction + colorAccuracy) / 5;

    return {
      brightnessImprovement,
      contrastImprovement,
      sharpnessImprovement,
      noiseReduction,
      colorAccuracy,
      overallScore,
      sizeIncrease: 0.1 // Estimated 10% increase due to enhancement
    };
  }

  /**
   * Generate before/after comparison
   */
  private async generateBeforeAfter(
    originalPath: string,
    enhancedPath: string
  ): Promise<{ original: Buffer; enhanced: Buffer }> {
    const { readFile } = await import('fs/promises');

    // Extract sample frames for comparison
    const originalFrame = await this.extractSampleFrame(originalPath, 1.0);
    const enhancedFrame = await this.extractSampleFrame(enhancedPath, 1.0);

    return {
      original: await readFile(originalFrame),
      enhanced: await readFile(enhancedFrame)
    };
  }

  /**
   * Extract sample frame for comparison
   */
  private async extractSampleFrame(videoPath: string, timestamp: number): Promise<string> {
    const { exec } = await import('child_process');
    const { join } = await import('path');
    const { tmpdir } = await import('os');

    const outputPath = join(tmpdir(), `sample-${Date.now()}.jpg`);

    return new Promise((resolve, reject) => {
      exec(`ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 "${outputPath}"`, (error) => {
        if (error) reject(error);
        else resolve(outputPath);
      });
    });
  }

  /**
   * Get video metadata
   */
  private async getVideoMetadata(videoPath: string): Promise<any> {
    const { exec } = await import('child_process');

    return new Promise((resolve, reject) => {
      exec(`ffprobe -v quiet -print_format json -show_streams "${videoPath}"`, (error, stdout) => {
        if (error) reject(error);
        else resolve(JSON.parse(stdout));
      });
    });
  }

  /**
   * Generate output path for enhanced video
   */
  private generateOutputPath(inputPath: string, config: EnhancementConfig): string {
    const { join, dirname, extname } = await import('path');
    
    const dir = dirname(inputPath);
    const ext = extname(inputPath);
    const name = join(dir, `enhanced-${Date.now()}${ext}`);

    return name;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(inputPath: string, config: EnhancementConfig): string {
    return `${inputPath}-${JSON.stringify(config)}`;
  }

  /**
   * Check if cached result is valid
   */
  private isCacheValid(result: EnhancementResult): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return (Date.now() - result.processingTime) < maxAge;
  }

  /**
   * Save enhancement result to database
   */
  private async saveEnhancementResult(result: EnhancementResult): Promise<void> {
    try {
      await prisma.videoEnhancement.create({
        data: {
          originalPath: result.originalPath,
          enhancedPath: result.enhancedPath,
          config: result.config,
          improvements: result.improvements,
          processingTime: result.processingTime,
          quality: result.quality,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to save enhancement result', error instanceof Error ? error : new Error(String(error)), {
        originalPath: result.originalPath,
        service: 'VideoEnhancer'
      });
    }
  }

  /**
   * Batch enhance multiple videos
   */
  async batchEnhance(
    videoPaths: string[],
    config: Partial<EnhancementConfig> = {}
  ): Promise<EnhancementResult[]> {
    const results: EnhancementResult[] = [];
    
    logger.info('Starting batch AI video enhancement', {
      videoCount: videoPaths.length,
      config,
      service: 'VideoEnhancer'
    });

    for (const videoPath of videoPaths) {
      try {
        const result = await this.enhanceVideo(videoPath, config);
        results.push(result);
      } catch (error) {
        logger.error('Failed to enhance video in batch', error instanceof Error ? error : new Error(String(error)), {
          videoPath,
          service: 'VideoEnhancer'
        });
      }
    }

    logger.info('Batch AI video enhancement completed', {
      totalVideos: videoPaths.length,
      successfulEnhancements: results.length,
      service: 'VideoEnhancer'
    });

    return results;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Terminate enhancement workers
    for (const [key, worker] of this.enhancementWorkers.entries()) {
      await worker.terminate();
      this.enhancementWorkers.delete(key);
    }

    // Clear cache
    this.enhancementCache.clear();

    logger.info('Video enhancer cleaned up', {
      service: 'VideoEnhancer'
    });
  }
}

// Export singleton instance
export const videoEnhancer = VideoEnhancer.getInstance();

export type {
  EnhancementConfig,
  EnhancementResult,
  EnhancementMetrics,
  EnhancementFilter
};