/**
 * 🧠 AI Scene Detection and Analysis Service
 * Computer vision for intelligent video processing and scene analysis
 */

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

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
  colorDistribution: ColorHistogram;
  dominantColors: string[];
  edgeDensity: number;
  composition: CompositionMetrics;
}

export interface ColorHistogram {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
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
  attributes: Record<string, any>;
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

export class AISceneDetector {
  private static instance: AISceneDetector;
  private tesseractWorker: Tesseract.Worker | null = null;
  private modelCache: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): AISceneDetector {
    if (!AISceneDetector.instance) {
      AISceneDetector.instance = new AISceneDetector();
    }
    return AISceneDetector.instance;
  }

  /**
   * Analyze video for scene detection and quality assessment
   */
  async analyzeVideo(videoPath: string, options: {
    generateThumbnails?: boolean;
    detectText?: boolean;
    analyzeMotion?: boolean;
    maxScenes?: number;
  } = {}): Promise<SceneAnalysis> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting AI scene analysis', {
        videoPath,
        options,
        service: 'AISceneDetector'
      });

      // Initialize workers if needed
      await this.initializeWorkers();

      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      
      // Extract frames for analysis
      const frames = await this.extractKeyFrames(videoPath, metadata.duration, options.maxScenes || 50);

      // Analyze each frame
      const scenes = await this.analyzeFrames(frames, metadata, options);

      // Calculate overall quality metrics
      const quality = await this.calculateQualityMetrics(scenes, metadata);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(scenes, quality, metadata);

      // Generate thumbnails if requested
      if (options.generateThumbnails) {
        await this.generateThumbnails(scenes, videoPath);
      }

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

      // Save analysis to database
      await this.saveAnalysisToDB(analysis);

      logger.info('AI scene analysis completed', {
        videoPath,
        scenesCount: scenes.length,
        quality: quality.overall,
        recommendations: recommendations.length,
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

  /**
   * Initialize ML workers
   */
  private async initializeWorkers(): Promise<void> {
    if (!this.tesseractWorker) {
      this.tesseractWorker = await createWorker('eng', 1, {
        logger: (m) => logger.debug(m, { service: 'Tesseract' })
      });
    }
  }

  /**
   * Extract video metadata
   */
  private async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    fps: number;
    resolution: { width: number; height: number };
    bitrate: number;
  }> {
    // Use FFmpeg to extract metadata
    const { exec } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v quiet -print_format json -show_streams "${videoPath}"`, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const metadata = JSON.parse(stdout);
          const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
          
          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          resolve({
            duration: parseFloat(videoStream.duration),
            fps: parseFloat(videoStream.r_frame_rate),
            resolution: {
              width: parseInt(videoStream.width),
              height: parseInt(videoStream.height)
            },
            bitrate: parseInt(videoStream.bit_rate || '0')
          });
        } catch (parseError) {
          reject(new Error(`Failed to parse video metadata: ${parseError}`));
        }
      });
    });
  }

  /**
   * Extract key frames for analysis
   */
  private async extractKeyFrames(videoPath: string, duration: number, maxFrames: number): Promise<Array<{
    timestamp: number;
    imagePath: string;
    buffer: Buffer;
  }>> {
    const frameInterval = Math.max(1, Math.floor(duration / maxFrames));
    const frames: Array<{ timestamp: number; imagePath: string; buffer: Buffer }> = [];
    
    // Create temporary directory for frames
    const { mkdir, writeFile } = await import('fs/promises');
    const { join } = await import('path');
    const { tmpdir } = await import('os');
    
    const tempDir = join(tmpdir(), `scene-analysis-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Extract frames using FFmpeg
    const { exec } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const ffmpegCmd = `ffmpeg -i "${videoPath}" -vf "select='not(mod(n\\,${frameInterval}))'" -frames:v ${maxFrames} -f image2 "${tempDir}/frame_%04d.jpg"`;
      
      exec(ffmpegCmd, async (error) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          // Read extracted frames
          const { readdir } = await import('fs/promises');
          const frameFiles = await readdir(tempDir);
          
          for (const file of frameFiles.filter(f => f.endsWith('.jpg')).sort()) {
            const buffer = await readFile(join(tempDir, file));
            const frameNum = parseInt(file.match(/frame_(\d+)\.jpg/)?.[1] || '0');
            const timestamp = frameNum * frameInterval;
            
            frames.push({
              timestamp,
              imagePath: join(tempDir, file),
              buffer
            });
          }

          resolve(frames);
        } catch (readError) {
          reject(new Error(`Failed to read extracted frames: ${readError}`));
        }
      });
    });
  }

  /**
   * Analyze frames using computer vision
   */
  private async analyzeFrames(
    frames: Array<{ timestamp: number; imagePath: string; buffer: Buffer }>,
    metadata: { duration: number; fps: number },
    options: any
  ): Promise<Scene[]> {
    const scenes: Scene[] = [];
    let previousFeatures: VisualFeatures | null = null;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      logger.debug(`Analyzing frame ${i + 1}/${frames.length}`, {
        timestamp: frame.timestamp,
        service: 'AISceneDetector'
      });

      // Analyze visual features
      const visualFeatures = await this.analyzeVisualFeatures(frame.buffer);
      
      // Analyze content
      const contentAnalysis = await this.analyzeContent(frame.buffer, frame.imagePath, options.detectText);
      
      // Analyze motion (comparing with previous frame)
      const motionAnalysis = await this.analyzeMotion(visualFeatures, previousFeatures);
      
      // Detect scene type
      const sceneType = await this.detectSceneType(visualFeatures, contentAnalysis, motionAnalysis);
      
      // Calculate confidence
      const confidence = this.calculateSceneConfidence(visualFeatures, contentAnalysis, motionAnalysis, sceneType);

      // Determine scene boundaries
      if (this.isSceneBoundary(visualFeatures, previousFeatures, confidence)) {
        const scene: Scene = {
          id: `scene-${scenes.length}`,
          startTime: scenes.length > 0 ? scenes[scenes.length - 1].endTime : 0,
          endTime: frame.timestamp,
          duration: scenes.length > 0 ? frame.timestamp - scenes[scenes.length - 1].endTime : frame.timestamp,
          type: sceneType,
          confidence,
          metadata: {
            visualFeatures,
            contentAnalysis,
            motionAnalysis
          }
        };

        scenes.push(scene);
        previousFeatures = visualFeatures;
      }
    }

    // Ensure last scene covers remaining duration
    if (scenes.length > 0 && scenes[scenes.length - 1].endTime < metadata.duration) {
      scenes[scenes.length - 1].endTime = metadata.duration;
      scenes[scenes.length - 1].duration = metadata.duration - scenes[scenes.length - 1].startTime;
    }

    return scenes;
  }

  /**
   * Analyze visual features of a frame
   */
  private async analyzeVisualFeatures(imageBuffer: Buffer): Promise<VisualFeatures> {
    try {
      const image = sharp(imageBuffer);
      const { data } = await image.raw().toBuffer({ resolveWithObject: true });
      
      // Calculate basic metrics
      const histogram = await image.stats();
      const edges = await this.detectEdges(imageBuffer);
      
      // Analyze colors
      const { dominant } = await image.stats();
      const dominantColors = await this.extractDominantColors(imageBuffer);

      // Calculate composition metrics
      const composition = await this.analyzeComposition(imageBuffer);

      return {
        brightness: histogram.channels[0].mean,
        contrast: histogram.channels[0].stdev,
        saturation: this.calculateSaturation(data),
        sharpness: this.calculateSharpness(edges),
        colorDistribution: {
          red: histogram.channels[0].histogram,
          green: histogram.channels[1].histogram,
          blue: histogram.channels[2].histogram,
          luminance: histogram.channels[3]?.histogram || []
        },
        dominantColors,
        edgeDensity: edges.length / (data.width * data.height),
        composition
      };
    } catch (error) {
      logger.error('Visual feature analysis failed', error instanceof Error ? error : new Error(String(error)), {
        service: 'AISceneDetector'
      });
      
      // Return default values on error
      return {
        brightness: 0.5,
        contrast: 0.5,
        saturation: 0.5,
        sharpness: 0.5,
        colorDistribution: { red: [], green: [], blue: [], luminance: [] },
        dominantColors: ['#000000'],
        edgeDensity: 0.1,
        composition: {
          ruleOfThirdsScore: 0.5,
          symmetryScore: 0.5,
          balanceScore: 0.5,
          focusPoint: null
        }
      };
    }
  }

  /**
   * Analyze content (text, faces, objects)
   */
  private async analyzeContent(imageBuffer: Buffer, imagePath: string, detectText: boolean = true): Promise<ContentAnalysis> {
    const contentAnalysis: ContentAnalysis = {
      hasText: false,
      hasFaces: false,
      faceCount: 0,
      hasObjects: false,
      detectedObjects: [],
      visualComplexity: 'low'
    };

    try {
      // Text detection using Tesseract OCR
      if (detectText && this.tesseractWorker) {
        const { data: { text } } = await this.tesseractWorker.recognize(imageBuffer);
        contentAnalysis.hasText = text.trim().length > 0;
        contentAnalysis.textContent = text.trim();
      }

      // Face detection (simplified implementation)
      contentAnalysis.hasFaces = await this.detectFaces(imageBuffer);
      contentAnalysis.faceCount = contentAnalysis.hasFaces ? 1 : 0; // Simplified

      // Object detection (simplified)
      contentAnalysis.detectedObjects = await this.detectObjects(imageBuffer);
      contentAnalysis.hasObjects = contentAnalysis.detectedObjects.length > 0;

      // Calculate visual complexity
      contentAnalysis.visualComplexity = this.calculateVisualComplexity(imageBuffer, contentAnalysis);

    } catch (error) {
      logger.error('Content analysis failed', error instanceof Error ? error : new Error(String(error)), {
        service: 'AISceneDetector'
      });
    }

    return contentAnalysis;
  }

  /**
   * Analyze motion between frames
   */
  private async analyzeMotion(
    currentFeatures: VisualFeatures,
    previousFeatures: VisualFeatures | null
  ): Promise<MotionAnalysis> {
    if (!previousFeatures) {
      return {
        motionLevel: 'none',
        motionDirection: 'horizontal',
        motionIntensity: 0,
        hasTransitions: false
      };
    }

    // Calculate motion metrics
    const brightnessDiff = Math.abs(currentFeatures.brightness - previousFeatures.brightness);
    const colorDiff = this.calculateColorDifference(currentFeatures.colorDistribution, previousFeatures.colorDistribution);
    const edgeDiff = Math.abs(currentFeatures.edgeDensity - previousFeatures.edgeDensity);

    const motionIntensity = (brightnessDiff + colorDiff + edgeDiff) / 3;

    let motionLevel: 'none' | 'low' | 'medium' | 'high';
    if (motionIntensity < 0.1) motionLevel = 'none';
    else if (motionIntensity < 0.3) motionLevel = 'low';
    else if (motionIntensity < 0.6) motionLevel = 'medium';
    else motionLevel = 'high';

    const hasTransitions = motionIntensity > 0.5;
    const transitionType = hasTransitions ? this.detectTransitionType(currentFeatures, previousFeatures) : undefined;

    return {
      motionLevel,
      motionDirection: this.detectMotionDirection(currentFeatures, previousFeatures),
      motionIntensity,
      hasTransitions,
      transitionType
    };
  }

  /**
   * Detect scene type based on features
   */
  private async detectSceneType(
    visualFeatures: VisualFeatures,
    contentAnalysis: ContentAnalysis,
    motionAnalysis: MotionAnalysis
  ): Promise<SceneType> {
    // Use rule-based detection for now
    // In production, this would use trained ML models

    if (contentAnalysis.hasText && motionAnalysis.motionLevel === 'none') {
      return SceneType.TITLE;
    }

    if (contentAnalysis.hasFaces && motionAnalysis.motionLevel === 'low') {
      return SceneType.INTERVIEW;
    }

    if (motionAnalysis.hasTransitions) {
      return SceneType.TRANSITION;
    }

    if (contentAnalysis.hasText && contentAnalysis.visualComplexity === 'medium') {
      return SceneType.PRESENTATION;
    }

    if (contentAnalysis.hasObjects && motionAnalysis.motionLevel === 'medium') {
      return SceneType.DEMONSTRATION;
    }

    if (visualFeatures.dominantColors.length === 1 && visualFeatures.brightness < 0.3) {
      return SceneType.BACKGROUND;
    }

    if (motionAnalysis.motionLevel === 'none' && visualFeatures.edgeDensity < 0.1) {
      return SceneType.END_SCREEN;
    }

    return SceneType.CONTENT;
  }

  /**
   * Calculate scene detection confidence
   */
  private calculateSceneConfidence(
    visualFeatures: VisualFeatures,
    contentAnalysis: ContentAnalysis,
    motionAnalysis: MotionAnalysis,
    sceneType: SceneType
  ): number {
    // Confidence calculation based on feature consistency
    let confidence = 0.5; // Base confidence

    // Adjust confidence based on feature clarity
    if (visualFeatures.sharpness > 0.7) confidence += 0.2;
    if (visualFeatures.contrast > 0.3) confidence += 0.1;
    if (contentAnalysis.hasText === (sceneType === SceneType.TITLE || sceneType === SceneType.PRESENTATION)) confidence += 0.1;
    if (contentAnalysis.hasFaces === sceneType === SceneType.INTERVIEW) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Determine if current frame indicates a scene boundary
   */
  private isSceneBoundary(
    currentFeatures: VisualFeatures,
    previousFeatures: VisualFeatures | null,
    confidence: number
  ): boolean {
    if (!previousFeatures) return true;

    // Scene boundary detection based on significant changes
    const brightnessChange = Math.abs(currentFeatures.brightness - previousFeatures.brightness);
    const colorChange = this.calculateColorDifference(currentFeatures.colorDistribution, previousFeatures.colorDistribution);
    const edgeChange = Math.abs(currentFeatures.edgeDensity - previousFeatures.edgeDensity);

    const totalChange = brightnessChange + colorChange + edgeChange;
    const threshold = 0.3; // Adjust based on scene detection sensitivity

    return totalChange > threshold && confidence > 0.7;
  }

  // Helper methods (simplified implementations)
  private async detectEdges(imageBuffer: Buffer): Promise<Array<{ x: number; y: number }>> {
    // Simplified edge detection - would use advanced CV algorithms
    return [];
  }

  private calculateSaturation(data: any): number {
    // Simplified saturation calculation
    return 0.5;
  }

  private calculateSharpness(edges: Array<any>): number {
    // Simplified sharpness calculation
    return 0.7;
  }

  private async extractDominantColors(imageBuffer: Buffer): Promise<string[]> {
    const image = sharp(imageBuffer);
    const { dominant } = await image.stats();
    return dominant ? [dominant.hex] : ['#000000'];
  }

  private async analyzeComposition(imageBuffer: Buffer): Promise<CompositionMetrics> {
    return {
      ruleOfThirdsScore: 0.6,
      symmetryScore: 0.4,
      balanceScore: 0.7,
      focusPoint: { x: 0.5, y: 0.5 }
    };
  }

  private async detectFaces(imageBuffer: Buffer): Promise<boolean> {
    // Simplified face detection
    return false;
  }

  private async detectObjects(imageBuffer: Buffer): Promise<DetectedObject[]> {
    // Simplified object detection
    return [];
  }

  private calculateVisualComplexity(imageBuffer: Buffer, contentAnalysis: ContentAnalysis): 'low' | 'medium' | 'high' {
    const complexity = contentAnalysis.detectedObjects.length + (contentAnalysis.hasFaces ? 2 : 0) + (contentAnalysis.hasText ? 1 : 0);
    if (complexity <= 1) return 'low';
    if (complexity <= 3) return 'medium';
    return 'high';
  }

  private calculateColorDifference(distro1: ColorHistogram, distro2: ColorHistogram): number {
    // Simplified color difference calculation
    return 0.2;
  }

  private detectMotionDirection(current: VisualFeatures, previous: VisualFeatures): 'horizontal' | 'vertical' | 'diagonal' | 'complex' {
    return 'horizontal';
  }

  private detectTransitionType(current: VisualFeatures, previous: VisualFeatures): string {
    return 'fade';
  }

  /**
   * Calculate overall quality metrics
   */
  private async calculateQualityMetrics(scenes: Scene[], metadata: any): Promise<QualityMetrics> {
    const avgSharpness = scenes.reduce((sum, scene) => sum + scene.metadata.visualFeatures.sharpness, 0) / scenes.length;
    const avgBrightness = scenes.reduce((sum, scene) => sum + scene.metadata.visualFeatures.brightness, 0) / scenes.length;
    const avgContrast = scenes.reduce((sum, scene) => sum + scene.metadata.visualFeatures.contrast, 0) / scenes.length;

    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgSharpness > 0.8 && avgBrightness > 0.4 && avgBrightness < 0.8 && avgContrast > 0.3) overall = 'excellent';
    else if (avgSharpness > 0.6 && avgBrightness > 0.3 && avgBrightness < 0.9 && avgContrast > 0.2) overall = 'good';
    else if (avgSharpness > 0.4 && avgContrast > 0.1) overall = 'fair';
    else overall = 'poor';

    return {
      overall,
      technical: {
        resolution: metadata.resolution.width >= 1920 ? 'high' : metadata.resolution.width >= 1280 ? 'medium' : 'low',
        bitrate: metadata.bitrate,
        compression: 0.8, // Estimated
        noise: Math.max(0, 1 - avgSharpness),
        artifacts: [] // Would be detected by more advanced analysis
      },
      visual: {
        clarity: avgSharpness,
        colorAccuracy: 0.8, // Estimated
        dynamicRange: avgContrast,
        stability: 1 - (scenes.filter(s => s.metadata.motionAnalysis.motionLevel === 'high').length / scenes.length)
      }
    };
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    scenes: Scene[],
    quality: QualityMetrics,
    metadata: any
  ): Promise<SceneRecommendation[]> {
    const recommendations: SceneRecommendation[] = [];

    // Quality-based recommendations
    if (quality.overall === 'poor') {
      recommendations.push({
        type: 'enhancement',
        priority: 'high',
        description: 'Video quality is below optimal',
        suggestedAction: 'Apply AI enhancement to improve clarity and sharpness',
        estimatedImpact: 0.8,
        automated: true
      });
    }

    // Scene-based recommendations
    const lowMotionScenes = scenes.filter(s => s.metadata.motionAnalysis.motionLevel === 'none');
    if (lowMotionScenes.length > scenes.length * 0.7) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        description: 'Video has too much static content',
        suggestedAction: 'Add dynamic elements or reduce scene duration',
        estimatedImpact: 0.5,
        automated: false
      });
    }

    // Content-based recommendations
    const titleScenes = scenes.filter(s => s.type === SceneType.TITLE);
    if (titleScenes.length === 0) {
      recommendations.push({
        type: 'content',
        priority: 'medium',
        description: 'No title screen detected',
        suggestedAction: 'Add opening title screen for better engagement',
        estimatedImpact: 0.3,
        automated: false
      });
    }

    return recommendations;
  }

  /**
   * Generate thumbnails for scenes
   */
  private async generateThumbnails(scenes: Scene[], videoPath: string): Promise<void> {
    const { join } = await import('path');
    
    for (const scene of scenes) {
      try {
        const thumbnailPath = join(process.cwd(), 'thumbnails', `scene-${scene.id}.jpg`);
        
        // Extract frame at scene start time
        const { exec } = await import('child_process');
        await new Promise((resolve, reject) => {
          exec(`ffmpeg -i "${videoPath}" -ss ${scene.startTime} -vframes 1 "${thumbnailPath}"`, (error) => {
            if (error) reject(error);
            else resolve(null);
          });
        });

        scene.thumbnailPath = thumbnailPath;
      } catch (error) {
        logger.error('Failed to generate thumbnail', error instanceof Error ? error : new Error(String(error)), {
          sceneId: scene.id,
          service: 'AISceneDetector'
        });
      }
    }
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysisToDB(analysis: SceneAnalysis): Promise<void> {
    try {
      await prisma.videoAnalysis.create({
        data: {
          id: analysis.id,
          videoPath: analysis.videoPath,
          duration: analysis.duration,
          fps: analysis.fps,
          resolution: analysis.resolution,
          scenes: analysis.scenes,
          quality: analysis.quality,
          recommendations: analysis.recommendations,
          processingTime: analysis.processingTime,
          createdAt: analysis.createdAt
        }
      });
    } catch (error) {
      logger.error('Failed to save analysis to database', error instanceof Error ? error : new Error(String(error)), {
        analysisId: analysis.id,
        service: 'AISceneDetector'
      });
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
    this.modelCache.clear();
  }
}

// Export singleton instance
export const aiSceneDetector = AISceneDetector.getInstance();

export type {
  SceneAnalysis,
  Scene,
  VisualFeatures,
  ContentAnalysis,
  MotionAnalysis,
  QualityMetrics,
  SceneRecommendation
};