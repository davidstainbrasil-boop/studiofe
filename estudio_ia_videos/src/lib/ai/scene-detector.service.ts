/**
 * AI Scene Detection and Analysis Service
 * Uses sharp + FFmpeg for real frame analysis and scene boundary detection
 */

import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile as fsReadFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { logger } from '@lib/logger';

const execAsync = promisify(exec);

export interface SceneAnalysis {
  id: string;
  videoPath: string;
  duration: number;
  fps: number;
  resolution: { width: number; height: number };
  scenes: Scene[];
  quality: QualityMetrics;
  recommendations: SceneRecommendation[];
  processingTime: number;
  createdAt: Date;
}

export interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  type: SceneType;
  confidence: number;
  thumbnailPath?: string;
  metadata: {
    visualFeatures: VisualFeatures;
    contentAnalysis: ContentAnalysis;
    motionAnalysis: MotionAnalysis;
  };
}

export enum SceneType {
  TITLE = 'title',
  CONTENT = 'content',
  TRANSITION = 'transition',
  INTERVIEW = 'interview',
  PRESENTATION = 'presentation',
  DEMONSTRATION = 'demonstration',
  BACKGROUND = 'background',
  END_SCREEN = 'end_screen',
  UNKNOWN = 'unknown'
}

export interface VisualFeatures {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  dominantColors: string[];
  edgeDensity: number;
  composition: CompositionMetrics;
}

export interface CompositionMetrics {
  ruleOfThirdsScore: number;
  symmetryScore: number;
  balanceScore: number;
  focusPoint: { x: number; y: number } | null;
}

export interface ContentAnalysis {
  hasText: boolean;
  textContent?: string;
  hasFaces: boolean;
  faceCount: number;
  hasObjects: boolean;
  detectedObjects: DetectedObject[];
  visualComplexity: 'low' | 'medium' | 'high';
}

export interface DetectedObject {
  class: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface MotionAnalysis {
  motionLevel: 'none' | 'low' | 'medium' | 'high';
  motionDirection: 'horizontal' | 'vertical' | 'diagonal' | 'complex';
  motionIntensity: number;
  hasTransitions: boolean;
  transitionType?: string;
}

export interface QualityMetrics {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  technical: {
    resolution: 'high' | 'medium' | 'low';
    bitrate: number;
    compression: number;
    noise: number;
    artifacts: string[];
  };
  visual: {
    clarity: number;
    colorAccuracy: number;
    dynamicRange: number;
    stability: number;
  };
}

export interface SceneRecommendation {
  type: 'enhancement' | 'transition' | 'timing' | 'content';
  priority: 'high' | 'medium' | 'low';
  description: string;
  suggestedAction: string;
  estimatedImpact: number;
  automated: boolean;
}

export interface EnhancementResult {
  enhancedPath: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  processingTime: number;
}

export class AISceneDetector {
  private static instance: AISceneDetector;

  private constructor() {}

  static getInstance(): AISceneDetector {
    if (!AISceneDetector.instance) {
      AISceneDetector.instance = new AISceneDetector();
    }
    return AISceneDetector.instance;
  }

  async analyzeVideo(videoPath: string, options: {
    generateThumbnails?: boolean;
    detectText?: boolean;
    analyzeMotion?: boolean;
    maxScenes?: number;
  } = {}): Promise<SceneAnalysis> {
    const startTime = Date.now();

    try {
      logger.info('Starting AI scene analysis', { videoPath, service: 'AISceneDetector' });

      const metadata = await this.getVideoMetadata(videoPath);
      const maxFrames = options.maxScenes || 50;
      const frames = await this.extractKeyFrames(videoPath, metadata.duration, maxFrames);
      const scenes = await this.analyzeFrames(frames, metadata);
      const quality = this.calculateQualityMetrics(scenes, metadata);
      const recommendations = this.generateRecommendations(scenes, quality);

      const analysis: SceneAnalysis = {
        id: `analysis-${Date.now()}`,
        videoPath,
        duration: metadata.duration,
        fps: metadata.fps,
        resolution: metadata.resolution,
        scenes,
        quality,
        recommendations,
        processingTime: Date.now() - startTime,
        createdAt: new Date()
      };

      logger.info('AI scene analysis completed', {
        scenesCount: scenes.length,
        quality: quality.overall,
        processingTime: analysis.processingTime,
        service: 'AISceneDetector'
      });

      return analysis;
    } catch (error) {
      logger.error('AI scene analysis failed', error instanceof Error ? error : new Error(String(error)), {
        videoPath,
        service: 'AISceneDetector'
      });
      throw new Error(`Scene analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    fps: number;
    resolution: { width: number; height: number };
    bitrate: number;
  }> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`
      );
      const metadata = JSON.parse(stdout);
      const videoStream = metadata.streams?.find((s: Record<string, string>) => s.codec_type === 'video');

      if (!videoStream) {
        return { duration: 0, fps: 30, resolution: { width: 1920, height: 1080 }, bitrate: 0 };
      }

      const fpsRaw = videoStream.r_frame_rate || '30/1';
      const [num, den] = fpsRaw.split('/').map(Number);

      return {
        duration: parseFloat(videoStream.duration || '0'),
        fps: den > 0 ? num / den : 30,
        resolution: {
          width: parseInt(videoStream.width || '1920'),
          height: parseInt(videoStream.height || '1080')
        },
        bitrate: parseInt(videoStream.bit_rate || '0')
      };
    } catch {
      return { duration: 0, fps: 30, resolution: { width: 1920, height: 1080 }, bitrate: 0 };
    }
  }

  private async extractKeyFrames(
    videoPath: string,
    duration: number,
    maxFrames: number
  ): Promise<Array<{ timestamp: number; buffer: Buffer }>> {
    const frames: Array<{ timestamp: number; buffer: Buffer }> = [];
    const frameInterval = Math.max(1, Math.floor(duration / maxFrames));
    const tempDir = join(tmpdir(), `scene-analysis-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      await execAsync(
        `ffmpeg -y -i "${videoPath}" -vf "select='not(mod(n\\,${frameInterval * 30}))'" -frames:v ${maxFrames} -f image2 "${tempDir}/frame_%04d.jpg" 2>/dev/null`
      );

      const files = await readdir(tempDir);
      const jpgFiles = files.filter(f => f.endsWith('.jpg')).sort();

      for (const file of jpgFiles) {
        const frameNum = parseInt(file.match(/frame_(\d+)\.jpg/)?.[1] || '0');
        const buffer = await fsReadFile(join(tempDir, file));
        frames.push({ timestamp: frameNum * frameInterval, buffer });
      }
    } catch (err) {
      logger.warn('Frame extraction failed, using fallback', {
        error: err instanceof Error ? err.message : String(err),
        service: 'AISceneDetector'
      });
    }

    return frames;
  }

  private async analyzeFrames(
    frames: Array<{ timestamp: number; buffer: Buffer }>,
    metadata: { duration: number; fps: number }
  ): Promise<Scene[]> {
    const scenes: Scene[] = [];
    let previousFeatures: VisualFeatures | null = null;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const visualFeatures = await this.analyzeVisualFeatures(frame.buffer);
      const contentAnalysis = this.classifyContent(visualFeatures);
      const motionAnalysis = this.analyzeMotion(visualFeatures, previousFeatures);
      const sceneType = this.detectSceneType(visualFeatures, contentAnalysis, motionAnalysis);
      const confidence = this.calculateConfidence(visualFeatures, motionAnalysis, sceneType);

      if (this.isSceneBoundary(visualFeatures, previousFeatures)) {
        scenes.push({
          id: `scene-${scenes.length}`,
          startTime: scenes.length > 0 ? scenes[scenes.length - 1].endTime : 0,
          endTime: frame.timestamp,
          duration: scenes.length > 0 ? frame.timestamp - scenes[scenes.length - 1].endTime : frame.timestamp,
          type: sceneType,
          confidence,
          metadata: { visualFeatures, contentAnalysis, motionAnalysis }
        });
      }

      previousFeatures = visualFeatures;
    }

    if (scenes.length > 0 && scenes[scenes.length - 1].endTime < metadata.duration) {
      scenes[scenes.length - 1].endTime = metadata.duration;
      scenes[scenes.length - 1].duration = metadata.duration - scenes[scenes.length - 1].startTime;
    }

    if (scenes.length === 0) {
      scenes.push({
        id: 'scene-0',
        startTime: 0,
        endTime: metadata.duration,
        duration: metadata.duration,
        type: SceneType.CONTENT,
        confidence: 0.5,
        metadata: {
          visualFeatures: this.defaultVisualFeatures(),
          contentAnalysis: this.defaultContentAnalysis(),
          motionAnalysis: { motionLevel: 'none', motionDirection: 'horizontal', motionIntensity: 0, hasTransitions: false }
        }
      });
    }

    return scenes;
  }

  private async analyzeVisualFeatures(imageBuffer: Buffer): Promise<VisualFeatures> {
    try {
      const image = sharp(imageBuffer);
      const stats = await image.stats();
      const meta = await image.metadata();

      const rMean = stats.channels[0]?.mean ?? 128;
      const gMean = stats.channels[1]?.mean ?? 128;
      const bMean = stats.channels[2]?.mean ?? 128;
      const rStd = stats.channels[0]?.stdev ?? 50;

      const brightness = (rMean + gMean + bMean) / (3 * 255);
      const contrast = rStd / 128;
      const maxC = Math.max(rMean, gMean, bMean);
      const minC = Math.min(rMean, gMean, bMean);
      const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;

      const dominantR = Math.round(rMean).toString(16).padStart(2, '0');
      const dominantG = Math.round(gMean).toString(16).padStart(2, '0');
      const dominantB = Math.round(bMean).toString(16).padStart(2, '0');

      const width = meta.width || 1;
      const height = meta.height || 1;

      // Rough sharpness: high stdev in channels → sharper
      const avgStd = (rStd + (stats.channels[1]?.stdev ?? 50) + (stats.channels[2]?.stdev ?? 50)) / 3;
      const sharpness = Math.min(1, avgStd / 80);

      return {
        brightness,
        contrast,
        saturation,
        sharpness,
        dominantColors: [`#${dominantR}${dominantG}${dominantB}`],
        edgeDensity: sharpness * 0.5,
        composition: {
          ruleOfThirdsScore: 0.6,
          symmetryScore: width === height ? 0.8 : 0.5,
          balanceScore: 0.6,
          focusPoint: { x: 0.5, y: 0.5 }
        }
      };
    } catch {
      return this.defaultVisualFeatures();
    }
  }

  private classifyContent(features: VisualFeatures): ContentAnalysis {
    const hasText = features.contrast > 0.4 && features.brightness > 0.3;
    const complexity: 'low' | 'medium' | 'high' =
      features.edgeDensity > 0.3 ? 'high' :
      features.edgeDensity > 0.15 ? 'medium' : 'low';

    return {
      hasText,
      hasFaces: false,
      faceCount: 0,
      hasObjects: features.edgeDensity > 0.2,
      detectedObjects: [],
      visualComplexity: complexity
    };
  }

  private analyzeMotion(
    current: VisualFeatures,
    previous: VisualFeatures | null
  ): MotionAnalysis {
    if (!previous) {
      return { motionLevel: 'none', motionDirection: 'horizontal', motionIntensity: 0, hasTransitions: false };
    }

    const brightnessDiff = Math.abs(current.brightness - previous.brightness);
    const contrastDiff = Math.abs(current.contrast - previous.contrast);
    const satDiff = Math.abs(current.saturation - previous.saturation);
    const intensity = (brightnessDiff + contrastDiff + satDiff) / 3;

    const motionLevel: MotionAnalysis['motionLevel'] =
      intensity < 0.05 ? 'none' :
      intensity < 0.15 ? 'low' :
      intensity < 0.3 ? 'medium' : 'high';

    return {
      motionLevel,
      motionDirection: brightnessDiff > contrastDiff ? 'vertical' : 'horizontal',
      motionIntensity: intensity,
      hasTransitions: intensity > 0.4,
      transitionType: intensity > 0.4 ? 'cut' : undefined
    };
  }

  private detectSceneType(
    features: VisualFeatures,
    content: ContentAnalysis,
    motion: MotionAnalysis
  ): SceneType {
    if (content.hasText && motion.motionLevel === 'none') return SceneType.TITLE;
    if (content.hasFaces && motion.motionLevel === 'low') return SceneType.INTERVIEW;
    if (motion.hasTransitions) return SceneType.TRANSITION;
    if (content.hasText && content.visualComplexity === 'medium') return SceneType.PRESENTATION;
    if (content.hasObjects && motion.motionLevel === 'medium') return SceneType.DEMONSTRATION;
    if (features.brightness < 0.15 && features.edgeDensity < 0.05) return SceneType.BACKGROUND;
    if (motion.motionLevel === 'none' && features.edgeDensity < 0.1) return SceneType.END_SCREEN;
    return SceneType.CONTENT;
  }

  private calculateConfidence(
    features: VisualFeatures,
    motion: MotionAnalysis,
    _type: SceneType
  ): number {
    let conf = 0.5;
    if (features.sharpness > 0.5) conf += 0.15;
    if (features.contrast > 0.3) conf += 0.1;
    if (motion.motionIntensity > 0.3) conf += 0.1;
    return Math.min(1.0, conf);
  }

  private isSceneBoundary(
    current: VisualFeatures,
    previous: VisualFeatures | null
  ): boolean {
    if (!previous) return true;
    const totalChange =
      Math.abs(current.brightness - previous.brightness) +
      Math.abs(current.contrast - previous.contrast) +
      Math.abs(current.edgeDensity - previous.edgeDensity);
    return totalChange > 0.3;
  }

  private calculateQualityMetrics(
    scenes: Scene[],
    metadata: { resolution: { width: number; height: number }; bitrate: number }
  ): QualityMetrics {
    const avgSharpness = scenes.length > 0
      ? scenes.reduce((s, sc) => s + sc.metadata.visualFeatures.sharpness, 0) / scenes.length
      : 0.5;
    const avgBrightness = scenes.length > 0
      ? scenes.reduce((s, sc) => s + sc.metadata.visualFeatures.brightness, 0) / scenes.length
      : 0.5;
    const avgContrast = scenes.length > 0
      ? scenes.reduce((s, sc) => s + sc.metadata.visualFeatures.contrast, 0) / scenes.length
      : 0.5;

    let overall: QualityMetrics['overall'];
    if (avgSharpness > 0.7 && avgBrightness > 0.3 && avgContrast > 0.3) overall = 'excellent';
    else if (avgSharpness > 0.5 && avgBrightness > 0.2) overall = 'good';
    else if (avgSharpness > 0.3) overall = 'fair';
    else overall = 'poor';

    return {
      overall,
      technical: {
        resolution: metadata.resolution.width >= 1920 ? 'high' : metadata.resolution.width >= 1280 ? 'medium' : 'low',
        bitrate: metadata.bitrate,
        compression: 0.8,
        noise: Math.max(0, 1 - avgSharpness),
        artifacts: []
      },
      visual: {
        clarity: avgSharpness,
        colorAccuracy: 0.8,
        dynamicRange: avgContrast,
        stability: scenes.length > 0
          ? 1 - scenes.filter(s => s.metadata.motionAnalysis.motionLevel === 'high').length / scenes.length
          : 0.8
      }
    };
  }

  private generateRecommendations(scenes: Scene[], quality: QualityMetrics): SceneRecommendation[] {
    const recs: SceneRecommendation[] = [];

    if (quality.overall === 'poor' || quality.overall === 'fair') {
      recs.push({
        type: 'enhancement',
        priority: 'high',
        description: 'Video quality is below optimal',
        suggestedAction: 'Apply AI enhancement to improve clarity and sharpness',
        estimatedImpact: 0.8,
        automated: true
      });
    }

    const staticScenes = scenes.filter(s => s.metadata.motionAnalysis.motionLevel === 'none');
    if (scenes.length > 0 && staticScenes.length > scenes.length * 0.7) {
      recs.push({
        type: 'timing',
        priority: 'medium',
        description: 'Video has too much static content',
        suggestedAction: 'Add dynamic elements or reduce scene duration',
        estimatedImpact: 0.5,
        automated: false
      });
    }

    if (!scenes.some(s => s.type === SceneType.TITLE)) {
      recs.push({
        type: 'content',
        priority: 'medium',
        description: 'No title screen detected',
        suggestedAction: 'Add opening title screen for better engagement',
        estimatedImpact: 0.3,
        automated: false
      });
    }

    return recs;
  }

  private defaultVisualFeatures(): VisualFeatures {
    return {
      brightness: 0.5,
      contrast: 0.5,
      saturation: 0.5,
      sharpness: 0.5,
      dominantColors: ['#808080'],
      edgeDensity: 0.1,
      composition: { ruleOfThirdsScore: 0.5, symmetryScore: 0.5, balanceScore: 0.5, focusPoint: null }
    };
  }

  private defaultContentAnalysis(): ContentAnalysis {
    return {
      hasText: false,
      hasFaces: false,
      faceCount: 0,
      hasObjects: false,
      detectedObjects: [],
      visualComplexity: 'low'
    };
  }

  async cleanup(): Promise<void> {
    logger.info('AISceneDetector cleaned up', { service: 'AISceneDetector' });
  }
}

export const aiSceneDetector = AISceneDetector.getInstance();
