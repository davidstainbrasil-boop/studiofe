/**
 * Audio2Face Engine - Fase 5: Integrações Premium
 * NVIDIA Audio2Face integration para lip-sync neural network de alta precisão
 */

import type { LipSyncEngine } from './lip-sync-orchestrator'
import { logger } from '@/lib/logger';
import type { LipSyncResult } from './types/phoneme.types'
import type { Viseme } from './utils/viseme-mapper'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Audio2FaceConfig {
  apiEndpoint: string
  apiKey: string
  model: 'standard' | 'premium' | 'ultra'
  language: string
  emotionIntensity?: number // 0-1
  headMovement?: boolean
  eyeGaze?: boolean
  blinkRate?: number // blinks per minute
}

export interface Audio2FaceBlendShape {
  name: string
  weight: number // 0-1
  timestamp: number // seconds
}

export interface Audio2FaceFrame {
  timestamp: number
  blendShapes: Audio2FaceBlendShape[]
  headRotation?: {
    pitch: number
    yaw: number
    roll: number
  }
  eyeGaze?: {
    left: { x: number; y: number }
    right: { x: number; y: number }
  }
}

export interface Audio2FaceResult {
  frames: Audio2FaceFrame[]
  duration: number
  fps: number
  blendShapeNames: string[]
  metadata: {
    model: string
    language: string
    emotionDetected?: string
    confidence: number
  }
}

// ============================================================================
// AUDIO2FACE ENGINE
// ============================================================================

export class Audio2FaceEngine implements LipSyncEngine {
  name = 'audio2face'
  private config: Audio2FaceConfig
  private cache: Map<string, Audio2FaceResult> = new Map()

  constructor(config: Audio2FaceConfig) {
    this.config = config
  }

  // ============================================================================
  // MAIN METHODS
  // ============================================================================

  /**
   * Generate lip-sync from audio using Audio2Face
   */
  async generateLipSync(audioFile: string, options?: {
    text?: string
    language?: string
    emotion?: string
  }): Promise<LipSyncResult> {
    const startTime = Date.now()

    try {
      // Check cache
    const cacheKey = this.getCacheKey(audioFile, options)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return {
        ...this.convertToLipSyncResult(cached),
        phonemes: [] // Adicionado para compatibilidade com LipSyncResult
      }
    }

      // 1. Upload audio to Audio2Face
      const audioId = await this.uploadAudio(audioFile)

      // 2. Create animation job
      const jobId = await this.createAnimationJob(audioId, options)

      // 3. Wait for completion
      const result = await this.waitForCompletion(jobId)

      // 4. Cache result
      this.cache.set(cacheKey, result)

      const processingTime = (Date.now() - startTime) / 1000

      return {
        ...this.convertToLipSyncResult(result),
        phonemes: [], // Adicionado para compatibilidade com LipSyncResult
        metadata: {
          provider: 'audio2face',
          model: this.config.model,
          language: options?.language || this.config.language,
          processingTime,
          confidence: result.metadata.confidence,
          recognizer: 'audio2face' // Required by LipSyncResult metadata
        }
      }
    } catch (error) {
      logger.error('[Audio2FaceEngine] Generation failed:', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Convert Audio2Face result to standard LipSyncResult
   */
  private convertToLipSyncResult(a2fResult: Audio2FaceResult): LipSyncResult {
    // Convert Audio2Face blend shapes to visemes
    const visemes: Viseme[] = this.convertBlendShapesToVisemes(a2fResult.frames)

    return {
      visemes,
      phonemes: [], // Adicionado para compatibilidade com LipSyncResult
      duration: a2fResult.duration,
      fps: a2fResult.fps,
      metadata: {
        provider: 'audio2face',
        model: a2fResult.metadata.model,
        blendShapeCount: a2fResult.blendShapeNames.length,
        frameCount: a2fResult.frames.length,
        recognizer: 'audio2face' // Required by LipSyncResult metadata
      }
    }
  }

  /**
   * Convert Audio2Face blend shapes to visemes
   */
  private convertBlendShapesToVisemes(frames: Audio2FaceFrame[]): Viseme[] {
    const visemes: Viseme[] = []

    for (const frame of frames) {
      // Find dominant blend shape for this frame
      const dominantBlendShape = this.getDominantBlendShape(frame.blendShapes)

      if (dominantBlendShape) {
        // Map blend shape to viseme
        const viseme = this.mapBlendShapeToViseme(dominantBlendShape.name)

        visemes.push({
          viseme,
          time: frame.timestamp,
          duration: 1 / 30, // Assuming 30 FPS
          weight: dominantBlendShape.weight
        })
      }
    }

    return visemes
  }

  /**
   * Get dominant blend shape from frame
   */
  private getDominantBlendShape(blendShapes: Audio2FaceBlendShape[]): Audio2FaceBlendShape | null {
    if (blendShapes.length === 0) return null

    return blendShapes.reduce((max, current) =>
      current.weight > max.weight ? current : max
    )
  }

  /**
   * Map Audio2Face blend shape to ARKit viseme
   */
  private mapBlendShapeToViseme(blendShapeName: string): string {
    // Audio2Face uses ARKit-compatible blend shapes
    // Map to standard viseme names
    const mapping: Record<string, string> = {
      'jawOpen': 'aa',
      'mouthClose': 'PP',
      'mouthFunnel': 'O',
      'mouthPucker': 'kk',
      'mouthSmile': 'I',
      'mouthFrown': 'U',
      'mouthRollLower': 'FF',
      'mouthRollUpper': 'FF',
      'mouthShrugLower': 'nn',
      'mouthShrugUpper': 'nn',
      'tongueOut': 'TH',
      'cheekPuff': 'PP',
      'cheekSquintLeft': 'I',
      'cheekSquintRight': 'I'
    }

    return mapping[blendShapeName] || 'sil'
  }

  // ============================================================================
  // API METHODS
  // ============================================================================

  /**
   * Upload audio file to Audio2Face
   */
  private async uploadAudio(audioFile: string): Promise<string> {
    const formData = new FormData()

    // Read audio file
    const audioBlob = await this.readAudioFile(audioFile)
    formData.append('audio', audioBlob, 'audio.wav')

    const response = await fetch(`${this.config.apiEndpoint}/api/v1/audio/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Audio upload failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.audioId
  }

  /**
   * Create animation job
   */
  private async createAnimationJob(audioId: string, options?: {
    text?: string
    language?: string
    emotion?: string
  }): Promise<string> {
    const response = await fetch(`${this.config.apiEndpoint}/api/v1/animation/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        audioId,
        model: this.config.model,
        language: options?.language || this.config.language,
        emotion: options?.emotion,
        emotionIntensity: this.config.emotionIntensity || 0.5,
        headMovement: this.config.headMovement ?? true,
        eyeGaze: this.config.eyeGaze ?? true,
        blinkRate: this.config.blinkRate || 15,
        text: options?.text
      })
    })

    if (!response.ok) {
      throw new Error(`Animation job creation failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.jobId
  }

  /**
   * Wait for animation job completion
   */
  private async waitForCompletion(jobId: string): Promise<Audio2FaceResult> {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes (5s intervals)

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.config.apiEndpoint}/api/v1/animation/${jobId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to check job status')
      }

      const data = await response.json()

      if (data.status === 'completed') {
        return await this.fetchResult(jobId)
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Animation job failed')
      }

      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Animation job timed out')
  }

  /**
   * Fetch animation result
   */
  private async fetchResult(jobId: string): Promise<Audio2FaceResult> {
    const response = await fetch(`${this.config.apiEndpoint}/api/v1/animation/${jobId}/result`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch animation result')
    }

    return await response.json()
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Read audio file
   */
  private async readAudioFile(audioFile: string): Promise<Blob> {
    // In browser environment
    if (typeof window !== 'undefined') {
      const response = await fetch(audioFile)
      return await response.blob()
    }

    // In Node.js environment
    const fs = await import('fs/promises')
    const buffer = await fs.readFile(audioFile)
    return new Blob([buffer])
  }

  /**
   * Get cache key
   */
  private getCacheKey(audioFile: string, options?: any): string {
    return `${audioFile}-${JSON.stringify(options)}`
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================

  /**
   * Generate with emotion analysis
   */
  async generateWithEmotionAnalysis(audioFile: string, text: string): Promise<LipSyncResult & {
    emotions: Array<{
      timestamp: number
      emotion: string
      intensity: number
    }>
  }> {
    const result = await this.generateLipSync(audioFile, { text })

    // Analyze emotions from text and audio
    const emotions = await this.analyzeEmotions(audioFile, text)

    return {
      ...result,
      phonemes: [], // Adicionado para compatibilidade com LipSyncResult
      emotions
    }
  }

  /**
   * Analyze emotions from audio and text
   */
  private async analyzeEmotions(audioFile: string, text: string): Promise<Array<{
    timestamp: number
    emotion: string
    intensity: number
  }>> {
    const response = await fetch(`${this.config.apiEndpoint}/api/v1/emotion/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        audioFile,
        text
      })
    })

    if (!response.ok) {
      logger.warn('Emotion analysis failed, returning empty')
      return []
    }

    const data = await response.json()
    return data.emotions
  }

  /**
   * Get available models
   */
  static getAvailableModels() {
    return {
      standard: {
        name: 'Standard',
        description: 'Good quality, fast processing',
        processingTime: '~30s',
        credits: 1,
        features: ['Basic lip-sync', 'Eye blinks']
      },
      premium: {
        name: 'Premium',
        description: 'High quality with emotion',
        processingTime: '~60s',
        credits: 3,
        features: ['High-quality lip-sync', 'Emotion detection', 'Head movement', 'Eye gaze']
      },
      ultra: {
        name: 'Ultra',
        description: 'Highest quality with full facial animation',
        processingTime: '~120s',
        credits: 5,
        features: ['Ultra-quality lip-sync', 'Advanced emotion', 'Natural head movement', 'Dynamic eye gaze', 'Micro-expressions']
      }
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createAudio2FaceEngine(config?: Partial<Audio2FaceConfig>): Audio2FaceEngine {
  const defaultConfig: Audio2FaceConfig = {
    apiEndpoint: process.env.AUDIO2FACE_API_ENDPOINT || 'https://api.audio2face.nvidia.com',
    apiKey: process.env.AUDIO2FACE_API_KEY || '',
    model: 'premium',
    language: 'en-US',
    emotionIntensity: 0.5,
    headMovement: true,
    eyeGaze: true,
    blinkRate: 15
  }

  return new Audio2FaceEngine({ ...defaultConfig, ...config })
}
