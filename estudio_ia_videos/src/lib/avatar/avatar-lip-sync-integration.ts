/**
 * Avatar Lip-Sync Integration
 * Bridges Phase 1 (Lip-Sync) with Phase 2 (Avatars)
 * Orchestrates the complete pipeline: text → lip-sync → animation → avatar
 */

import { logger } from '@/lib/logger'
import { LipSyncOrchestrator } from '@/lib/sync/lip-sync-orchestrator'
import { FacialAnimationEngine, type AnimationConfig, type FacialAnimation } from './facial-animation-engine'
import type { LipSyncResult } from '@/lib/sync/types/phoneme.types'

export interface AvatarConfig {
  avatarId?: string
  quality: 'PLACEHOLDER' | 'STANDARD' | 'HIGH' | 'HYPERREAL'
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'fear' | 'disgust'
  emotionIntensity?: number
  voice?: string
  enableBlinks?: boolean
  enableBreathing?: boolean
  enableHeadMovement?: boolean
  fps?: number
}

export interface AvatarAnimation {
  frames: Array<{
    time: number
    weights: Record<string, number>
    headRotation?: { x: number; y: number; z: number }
    eyeGaze?: { x: number; y: number }
  }>
  duration: number
  fps: number
  metadata: {
    provider: string
    lipSyncSource: string
    cached: boolean
    hasEmotion: boolean
    hasBlinks: boolean
    hasBreathing: boolean
    hasHeadMovement: boolean
    phonemeCount: number
    quality: string
  }
}

export interface GenerationOptions {
  text: string
  avatarConfig: AvatarConfig
  forceProvider?: 'rhubarb' | 'azure' | 'mock'
  audioPath?: string
}

export class AvatarLipSyncIntegration {
  private lipSyncOrchestrator: LipSyncOrchestrator
  private facialAnimationEngine: FacialAnimationEngine

  constructor() {
    this.lipSyncOrchestrator = new LipSyncOrchestrator()
    this.facialAnimationEngine = new FacialAnimationEngine()
  }

  /**
   * Generate complete avatar animation from text
   * Main entry point for Phase 1 + Phase 2 integration
   */
  async generateAvatarAnimation(options: GenerationOptions): Promise<AvatarAnimation> {
    const startTime = Date.now()
    const { text, avatarConfig, forceProvider, audioPath } = options

    logger.info('[AvatarLipSyncIntegration] Starting avatar animation generation', {
      textLength: text.length,
      quality: avatarConfig.quality,
      emotion: avatarConfig.emotion,
      forceProvider
    })

    try {
      // Step 1: Generate lip-sync data (Phase 1)
      const lipSyncResult = await this.lipSyncOrchestrator.generateLipSync({
        text,
        audioPath,
        voice: avatarConfig.voice,
        forceProvider
      })

      logger.info('[AvatarLipSyncIntegration] Lip-sync generated', {
        provider: lipSyncResult.provider,
        cached: lipSyncResult.cached,
        phonemeCount: lipSyncResult.result.phonemes.length,
        duration: lipSyncResult.result.duration
      })

      // Step 2: Convert to facial animation (Phase 2)
      const animationConfig: AnimationConfig = {
        fps: avatarConfig.fps || 30,
        emotion: avatarConfig.emotion || 'neutral',
        emotionIntensity: avatarConfig.emotionIntensity || 0.5,
        enableBlinks: avatarConfig.enableBlinks !== false,
        enableBreathing: avatarConfig.enableBreathing !== false,
        enableHeadMovement: avatarConfig.enableHeadMovement !== false
      }

      const facialAnimation = await this.facialAnimationEngine.createAnimation(
        lipSyncResult.result,
        animationConfig
      )

      logger.info('[AvatarLipSyncIntegration] Facial animation created', {
        frameCount: facialAnimation.frames.length,
        duration: facialAnimation.duration
      })

      // Step 3: Package result
      const avatarAnimation: AvatarAnimation = {
        frames: facialAnimation.frames,
        duration: facialAnimation.duration,
        fps: facialAnimation.fps,
        metadata: {
          provider: lipSyncResult.provider,
          lipSyncSource: lipSyncResult.result.metadata.recognizer,
          cached: lipSyncResult.cached,
          hasEmotion: facialAnimation.metadata.hasEmotion,
          hasBlinks: facialAnimation.metadata.hasBlinks,
          hasBreathing: facialAnimation.metadata.hasBreathing,
          hasHeadMovement: facialAnimation.metadata.hasHeadMovement,
          phonemeCount: lipSyncResult.result.phonemes.length,
          quality: avatarConfig.quality
        }
      }

      const processingTime = Date.now() - startTime

      logger.info('[AvatarLipSyncIntegration] Avatar animation completed', {
        processingTime,
        frameCount: avatarAnimation.frames.length,
        quality: avatarConfig.quality
      })

      return avatarAnimation

    } catch (error) {
      logger.error('[AvatarLipSyncIntegration] Animation generation failed', error as Error)
      throw new Error(`Failed to generate avatar animation: ${(error as Error).message}`)
    }
  }

  /**
   * Generate animation from existing audio file
   */
  async generateFromAudio(
    audioPath: string,
    avatarConfig: AvatarConfig
  ): Promise<AvatarAnimation> {
    return this.generateAvatarAnimation({
      text: '', // Text is optional when using audio
      avatarConfig,
      audioPath
    })
  }

  /**
   * Generate animation with text and synthesize audio
   */
  async generateWithTTS(
    text: string,
    avatarConfig: AvatarConfig
  ): Promise<AvatarAnimation> {
    return this.generateAvatarAnimation({
      text,
      avatarConfig,
      forceProvider: 'azure' // Azure provides TTS + visemes
    })
  }

  /**
   * Generate quick preview animation (lower quality, faster)
   */
  async generatePreview(
    text: string,
    avatarConfig: Omit<AvatarConfig, 'quality'>
  ): Promise<AvatarAnimation> {
    return this.generateAvatarAnimation({
      text,
      avatarConfig: {
        ...avatarConfig,
        quality: 'PLACEHOLDER',
        fps: 15, // Lower FPS for faster generation
        enableHeadMovement: false // Skip for preview
      },
      forceProvider: 'rhubarb' // Fast offline processing
    })
  }

  /**
   * Export animation to different formats
   */
  exportAnimation(animation: AvatarAnimation, format: 'json' | 'usd' | 'fbx'): string | object {
    const facialAnimation: FacialAnimation = {
      frames: animation.frames,
      duration: animation.duration,
      fps: animation.fps,
      metadata: {
        lipSyncSource: animation.metadata.lipSyncSource,
        hasEmotion: animation.metadata.hasEmotion,
        hasBlinks: animation.metadata.hasBlinks,
        hasBreathing: animation.metadata.hasBreathing,
        hasHeadMovement: animation.metadata.hasHeadMovement
      }
    }

    switch (format) {
      case 'json':
        return this.facialAnimationEngine.exportToJSON(facialAnimation)
      case 'usd':
        return this.facialAnimationEngine.exportToUSD(facialAnimation)
      case 'fbx':
        return this.facialAnimationEngine.exportToFBXData(facialAnimation)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Optimize animation (remove redundant frames)
   */
  async optimizeAnimation(
    animation: AvatarAnimation,
    threshold: number = 0.001
  ): Promise<AvatarAnimation> {
    const facialAnimation: FacialAnimation = {
      frames: animation.frames,
      duration: animation.duration,
      fps: animation.fps,
      metadata: {
        lipSyncSource: animation.metadata.lipSyncSource,
        hasEmotion: animation.metadata.hasEmotion,
        hasBlinks: animation.metadata.hasBlinks,
        hasBreathing: animation.metadata.hasBreathing,
        hasHeadMovement: animation.metadata.hasHeadMovement
      }
    }

    const optimized = this.facialAnimationEngine.optimizeAnimation(facialAnimation, threshold)

    return {
      ...animation,
      frames: optimized.frames,
      metadata: {
        ...animation.metadata,
        // Could add optimization stats here
      }
    }
  }

  /**
   * Validate animation quality
   */
  validateAnimation(animation: AvatarAnimation): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check basic structure
    if (!animation.frames || animation.frames.length === 0) {
      errors.push('Animation has no frames')
    }

    if (animation.duration <= 0) {
      errors.push('Animation duration must be positive')
    }

    if (animation.fps <= 0) {
      errors.push('FPS must be positive')
    }

    // Check frame consistency
    if (animation.frames.length > 0) {
      const expectedFrames = Math.ceil(animation.duration * animation.fps)
      const actualFrames = animation.frames.length

      if (Math.abs(expectedFrames - actualFrames) > 2) {
        warnings.push(`Frame count mismatch: expected ~${expectedFrames}, got ${actualFrames}`)
      }

      // Check for timing gaps
      for (let i = 1; i < animation.frames.length; i++) {
        const timeDiff = animation.frames[i].time - animation.frames[i - 1].time
        const expectedDiff = 1 / animation.fps

        if (Math.abs(timeDiff - expectedDiff) > 0.01) {
          warnings.push(`Frame ${i} has irregular timing: ${timeDiff.toFixed(3)}s`)
        }
      }
    }

    // Check metadata
    if (!animation.metadata.provider) {
      warnings.push('Missing provider in metadata')
    }

    if (animation.metadata.phonemeCount === 0) {
      warnings.push('No phonemes detected - animation may be silent')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get animation statistics
   */
  getAnimationStats(animation: AvatarAnimation): {
    frameCount: number
    duration: number
    fps: number
    avgFrameSize: number
    totalBlendShapeChanges: number
    quality: string
    provider: string
  } {
    const totalBlendShapeChanges = animation.frames.reduce((sum, frame) => {
      return sum + Object.keys(frame.weights).length
    }, 0)

    const estimatedSize = JSON.stringify(animation).length

    return {
      frameCount: animation.frames.length,
      duration: animation.duration,
      fps: animation.fps,
      avgFrameSize: Math.round(estimatedSize / animation.frames.length),
      totalBlendShapeChanges,
      quality: animation.metadata.quality,
      provider: animation.metadata.provider
    }
  }
}
