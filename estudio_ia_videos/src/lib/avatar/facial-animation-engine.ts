/**
 * Facial Animation Engine
 * High-level engine for creating realistic facial animations
 * Combines blend shapes, emotions, and procedural animations
 */

import { logger } from '@/lib/logger';
import { BlendShapeController, type BlendShapeAnimation, type BlendShapeFrame } from './blend-shape-controller';
import type { Viseme } from '../sync/types/viseme.types';
import type { LipSyncResult } from '../sync/types/phoneme.types';
import { ARKitBlendShape } from '../sync/types/viseme.types';

export interface AnimationConfig {
  fps?: number;
  enableBlinks?: boolean;
  blinkFrequency?: number; // blinks per minute
  enableBreathing?: boolean;
  breathingRate?: number; // breaths per minute
  enableHeadMovement?: boolean;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';
  emotionIntensity?: number;
}

export interface EnhancedBlendShapeFrame extends BlendShapeFrame {
  headRotation?: { x: number; y: number; z: number };
  eyeGaze?: { x: number; y: number };
}

export interface FacialAnimation {
  frames: EnhancedBlendShapeFrame[];
  duration: number;
  fps: number;
  metadata: {
    lipSyncSource: string;
    hasEmotion: boolean;
    hasBlinks: boolean;
    hasBreathing: boolean;
    hasHeadMovement: boolean;
  };
}

export class FacialAnimationEngine {
  private blendShapeController: BlendShapeController;

  constructor() {
    this.blendShapeController = new BlendShapeController();
  }

  /**
   * Create complete facial animation from lip-sync data
   */
  async createAnimation(
    lipSyncResult: LipSyncResult,
    config: AnimationConfig = {}
  ): Promise<FacialAnimation> {
    const startTime = Date.now();

    const fps = config.fps || 30;
    const enableBlinks = config.enableBlinks !== false;
    const enableBreathing = config.enableBreathing !== false;
    const enableHeadMovement = config.enableHeadMovement !== false;

    logger.info('[FacialAnimationEngine] Creating animation', {
      phonemeCount: lipSyncResult.phonemes.length,
      duration: lipSyncResult.duration,
      fps,
      enableBlinks,
      enableBreathing,
      enableHeadMovement,
      emotion: config.emotion
    });

    // 1. Generate base lip-sync animation
    const visemes: Viseme[] = lipSyncResult.phonemes.map(p => ({
      visemeId: this.phonemeToVisemeId(p.phoneme),
      visemeName: p.phoneme,
      startTime: p.startTime,
      endTime: p.endTime,
      duration: p.duration
    }));

    const baseAnimation = this.blendShapeController.generateAnimation(
      visemes,
      fps,
      lipSyncResult.duration
    );

    // 2. Enhance frames with additional features
    const enhancedFrames: EnhancedBlendShapeFrame[] = baseAnimation.frames.map((frame, index) => {
      const time = frame.time;
      let weights = { ...frame.weights };

      // Add emotion overlay
      if (config.emotion && config.emotion !== 'neutral') {
        weights = this.blendShapeController.addEmotion(
          weights,
          config.emotion,
          config.emotionIntensity || 0.5
        );
      }

      // Add blink
      if (enableBlinks) {
        const blinkProgress = this.calculateBlinkProgress(
          time,
          config.blinkFrequency || 15 // 15 blinks per minute default
        );
        if (blinkProgress > 0) {
          weights = this.blendShapeController.addBlink(weights, blinkProgress);
        }
      }

      // Add breathing (subtle jaw movement)
      if (enableBreathing) {
        const breathingOffset = this.calculateBreathingOffset(
          time,
          config.breathingRate || 12 // 12 breaths per minute default
        );
        if (weights[ARKitBlendShape.JawOpen]) {
          weights[ARKitBlendShape.JawOpen] += breathingOffset * 0.05; // Subtle
        }
      }

      const enhancedFrame: EnhancedBlendShapeFrame = {
        time,
        weights
      };

      // Add head movement
      if (enableHeadMovement) {
        enhancedFrame.headRotation = this.calculateHeadMovement(time, lipSyncResult.duration);
      }

      // Add eye gaze
      enhancedFrame.eyeGaze = this.calculateEyeGaze(time);

      return enhancedFrame;
    });

    const processingTime = Date.now() - startTime;

    logger.info('[FacialAnimationEngine] Animation created', {
      frameCount: enhancedFrames.length,
      duration: lipSyncResult.duration,
      processingTime
    });

    return {
      frames: enhancedFrames,
      duration: lipSyncResult.duration,
      fps,
      metadata: {
        lipSyncSource: lipSyncResult.source,
        hasEmotion: !!config.emotion && config.emotion !== 'neutral',
        hasBlinks: enableBlinks,
        hasBreathing: enableBreathing,
        hasHeadMovement: enableHeadMovement
      }
    };
  }

  /**
   * Convert phoneme string to viseme ID
   */
  private phonemeToVisemeId(phoneme: string): number {
    // Map common phoneme strings to viseme IDs
    const phonemeMap: Record<string, number> = {
      'A': 1,
      'B': 21,
      'C': 19,
      'D': 16,
      'E': 4,
      'F': 18,
      'G': 20,
      'H': 2,
      'X': 0
    };

    return phonemeMap[phoneme] || 0;
  }

  /**
   * Calculate blink progress (0-1) at given time
   */
  private calculateBlinkProgress(time: number, blinksPerMinute: number): number {
    const blinkDuration = 0.15; // 150ms per blink
    const blinkInterval = 60 / blinksPerMinute; // seconds between blinks

    // Determine if we're in a blink
    const timeInCycle = time % blinkInterval;

    if (timeInCycle < blinkDuration) {
      // Calculate progress within blink (0 -> 1 -> 0)
      const progress = timeInCycle / blinkDuration;
      return progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    }

    return 0;
  }

  /**
   * Calculate breathing offset (-1 to 1) at given time
   */
  private calculateBreathingOffset(time: number, breathsPerMinute: number): number {
    const breathCycle = 60 / breathsPerMinute; // seconds per breath
    const progress = (time % breathCycle) / breathCycle;

    // Smooth sine wave for natural breathing
    return Math.sin(progress * Math.PI * 2);
  }

  /**
   * Calculate subtle head movement
   */
  private calculateHeadMovement(
    time: number,
    duration: number
  ): { x: number; y: number; z: number } {
    // Very subtle head movements for realism
    const x = Math.sin(time * 0.5) * 2; // Slight nod
    const y = Math.sin(time * 0.3) * 3; // Slight turn
    const z = Math.sin(time * 0.4) * 1; // Slight tilt

    return { x, y, z }; // In degrees
  }

  /**
   * Calculate eye gaze direction
   */
  private calculateEyeGaze(time: number): { x: number; y: number } {
    // Subtle eye movements
    const x = Math.sin(time * 0.7) * 0.1;
    const y = Math.sin(time * 0.5) * 0.08;

    return { x, y }; // Normalized -1 to 1
  }

  /**
   * Export animation to JSON format
   */
  exportToJSON(animation: FacialAnimation): string {
    return JSON.stringify(animation, null, 2);
  }

  /**
   * Export animation to USD (Universal Scene Description) format
   * For use with Unreal Engine, Unity, etc.
   */
  exportToUSD(animation: FacialAnimation): string {
    // Simplified USD export
    const usdHeader = `#usda 1.0
(
    defaultPrim = "FacialAnimation"
    endTimeCode = ${animation.duration * animation.fps}
    framesPerSecond = ${animation.fps}
    startTimeCode = 0
    timeCodesPerSecond = ${animation.fps}
)

def Xform "FacialAnimation" {
`;

    const blendShapeNames = this.blendShapeController.getAllBlendShapeNames();
    let usdContent = usdHeader;

    // Add blend shape curves
    for (const shapeName of blendShapeNames) {
      usdContent += `    def BlendShape "${shapeName}" {\n`;
      usdContent += `        float weight.timeSamples = {\n`;

      // Sample every 5th frame to reduce file size
      for (let i = 0; i < animation.frames.length; i += 5) {
        const frame = animation.frames[i];
        const weight = frame.weights[shapeName as ARKitBlendShape] || 0;
        usdContent += `            ${Math.round(frame.time * animation.fps)}: ${weight.toFixed(4)},\n`;
      }

      usdContent += `        }\n`;
      usdContent += `    }\n`;
    }

    usdContent += `}\n`;

    return usdContent;
  }

  /**
   * Export animation to FBX-compatible format (JSON representation)
   */
  exportToFBXData(animation: FacialAnimation): object {
    return {
      version: '1.0',
      fps: animation.fps,
      duration: animation.duration,
      frameCount: animation.frames.length,
      blendShapes: animation.frames.map(frame => ({
        time: frame.time,
        weights: frame.weights,
        headRotation: frame.headRotation,
        eyeGaze: frame.eyeGaze
      }))
    };
  }

  /**
   * Optimize animation by removing redundant frames
   */
  optimizeAnimation(animation: FacialAnimation, threshold: number = 0.001): FacialAnimation {
    const optimizedFrames: EnhancedBlendShapeFrame[] = [];

    for (let i = 0; i < animation.frames.length; i++) {
      const frame = animation.frames[i];

      // Always keep first and last frames
      if (i === 0 || i === animation.frames.length - 1) {
        optimizedFrames.push(frame);
        continue;
      }

      const prevFrame = animation.frames[i - 1];
      const nextFrame = animation.frames[i + 1];

      // Check if frame is significantly different from neighbors
      const isDifferent = this.isFrameSignificantlyDifferent(
        frame,
        prevFrame,
        nextFrame,
        threshold
      );

      if (isDifferent) {
        optimizedFrames.push(frame);
      }
    }

    logger.info('[FacialAnimationEngine] Animation optimized', {
      originalFrames: animation.frames.length,
      optimizedFrames: optimizedFrames.length,
      reduction: `${((1 - optimizedFrames.length / animation.frames.length) * 100).toFixed(1)}%`
    });

    return {
      ...animation,
      frames: optimizedFrames
    };
  }

  /**
   * Check if frame is significantly different from neighbors
   */
  private isFrameSignificantlyDifferent(
    frame: EnhancedBlendShapeFrame,
    prevFrame: EnhancedBlendShapeFrame,
    nextFrame: EnhancedBlendShapeFrame,
    threshold: number
  ): boolean {
    const allKeys = new Set([
      ...Object.keys(frame.weights),
      ...Object.keys(prevFrame.weights),
      ...Object.keys(nextFrame.weights)
    ]);

    for (const key of allKeys) {
      const current = frame.weights[key as ARKitBlendShape] || 0;
      const prev = prevFrame.weights[key as ARKitBlendShape] || 0;
      const next = nextFrame.weights[key as ARKitBlendShape] || 0;

      // Check if current is not linearly interpolatable from prev to next
      const interpolated = (prev + next) / 2;
      const difference = Math.abs(current - interpolated);

      if (difference > threshold) {
        return true;
      }
    }

    return false;
  }
}
