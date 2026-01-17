/**
 * MetaHuman Adapter - Fase 5: Integrações Premium
 * Integration com Unreal Engine 5 MetaHuman para avatares hiper-realistas
 */

import { AvatarProvider, AvatarQuality } from '../quality-tier-system'
import type { FacialAnimation } from '../facial-animation-engine'
import type { AvatarConfig, RenderResult, JobStatus } from '../avatar-renderer-factory'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MetaHumanConfig {
  metaHumanId: string
  quality: 'HIGH' | 'HYPERREAL'
  renderSettings: {
    resolution: '1080p' | '4k' | '8k'
    fps: 30 | 60 | 120
    rayTracing: boolean
    pathTracing: boolean
    antiAliasing: 'FXAA' | 'TAA' | 'MSAA'
    shadowQuality: 'low' | 'medium' | 'high' | 'cinematic'
    lightingQuality: 'low' | 'medium' | 'high' | 'cinematic'
  }
  postProcessing: {
    colorGrading: boolean
    bloom: boolean
    depthOfField: boolean
    motionBlur: boolean
    chromaticAberration: boolean
    vignette: boolean
  }
  hair: {
    simulation: boolean
    quality: 'low' | 'medium' | 'high' | 'cinematic'
    physics: boolean
  }
  clothing: {
    simulation: boolean
    quality: 'low' | 'medium' | 'high' | 'cinematic'
    physics: boolean
  }
}

export interface UE5RenderJob {
  jobId: string
  metaHumanId: string
  animation: FacialAnimation
  config: MetaHumanConfig
  audioFile?: string
  backgroundScene?: string
  cameraPreset?: 'closeup' | 'medium' | 'wide' | 'custom'
  customCamera?: {
    position: [number, number, number]
    rotation: [number, number, number]
    fov: number
  }
}

export interface UE5RenderProgress {
  stage: 'queued' | 'loading' | 'rendering' | 'post_processing' | 'encoding' | 'completed' | 'failed'
  progress: number // 0-100
  currentFrame: number
  totalFrames: number
  estimatedTimeRemaining: number // seconds
  renderTime: number // seconds elapsed
  message: string
}

// ============================================================================
// METAHUMAN ADAPTER
// ============================================================================

export class MetaHumanAdapter implements AvatarProvider {
  quality: AvatarQuality = 'HYPERREAL'
  estimatedTime = 300 // 5 minutes average
  creditsPerSecond = 10

  private apiEndpoint: string
  private apiKey: string
  private maxRetries = 3
  private retryDelay = 5000

  constructor(config?: { apiEndpoint?: string; apiKey?: string }) {
    this.apiEndpoint = config?.apiEndpoint || process.env.UE5_API_ENDPOINT || 'http://localhost:8080/api/v1'
    this.apiKey = config?.apiKey || process.env.UE5_API_KEY || ''
  }

  // ============================================================================
  // MAIN METHODS
  // ============================================================================

  /**
   * Render MetaHuman with facial animation
   */
  async render(
    animation: FacialAnimation,
    config: AvatarConfig
  ): Promise<RenderResult> {
    const startTime = Date.now()

    try {
      // 1. Validate MetaHuman availability
      await this.validateMetaHuman(config.metaHumanId!)

      // 2. Create render job
      const job = await this.createRenderJob(animation, config)

      // 3. Wait for completion
      const result = await this.waitForCompletion(job.jobId)

      const duration = (Date.now() - startTime) / 1000

      return {
        success: true,
        videoUrl: result.outputUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: animation.duration,
        metadata: {
          provider: 'metahuman',
          quality: this.quality,
          renderTime: duration,
          resolution: config.renderSettings?.resolution || '4k',
          fps: config.renderSettings?.fps || 60,
          frames: result.frames,
          fileSize: result.fileSize,
          rayTracing: config.renderSettings?.rayTracing || false,
          pathTracing: config.renderSettings?.pathTracing || false
        }
      }
    } catch (error) {
      console.error('[MetaHumanAdapter] Render failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: this.isRetryableError(error)
      }
    }
  }

  /**
   * Get render job status
   */
  async getStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await fetch(`${this.apiEndpoint}/jobs/${jobId}/status`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        status: this.mapUE5Status(data.status),
        progress: data.progress || 0,
        estimatedTimeRemaining: data.estimatedTimeRemaining,
        currentFrame: data.currentFrame,
        totalFrames: data.totalFrames,
        message: data.message
      }
    } catch (error) {
      console.error('[MetaHumanAdapter] Status check failed:', error)

      return {
        status: 'unknown',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ============================================================================
  // METAHUMAN MANAGEMENT
  // ============================================================================

  /**
   * Validate MetaHuman exists and is available
   */
  private async validateMetaHuman(metaHumanId: string): Promise<void> {
    const response = await fetch(`${this.apiEndpoint}/metahumans/${metaHumanId}`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`MetaHuman ${metaHumanId} not found`)
      }
      throw new Error(`MetaHuman validation failed: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.available) {
      throw new Error(`MetaHuman ${metaHumanId} is not available`)
    }
  }

  /**
   * List available MetaHumans
   */
  async listMetaHumans(): Promise<Array<{
    id: string
    name: string
    gender: 'male' | 'female'
    age: number
    ethnicity: string
    hairColor: string
    eyeColor: string
    thumbnail: string
    available: boolean
  }>> {
    const response = await fetch(`${this.apiEndpoint}/metahumans`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to list MetaHumans: ${response.statusText}`)
    }

    return await response.json()
  }

  // ============================================================================
  // RENDER JOB MANAGEMENT
  // ============================================================================

  /**
   * Create UE5 render job
   */
  private async createRenderJob(
    animation: FacialAnimation,
    config: AvatarConfig
  ): Promise<{ jobId: string }> {
    const renderJob: UE5RenderJob = {
      jobId: `ue5-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      metaHumanId: config.metaHumanId!,
      animation,
      config: this.buildMetaHumanConfig(config),
      audioFile: config.audioFile,
      backgroundScene: config.backgroundScene || 'default_studio',
      cameraPreset: config.cameraPreset || 'medium'
    }

    const response = await fetch(`${this.apiEndpoint}/render`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(renderJob)
    })

    if (!response.ok) {
      throw new Error(`Failed to create render job: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Wait for render job completion
   */
  private async waitForCompletion(jobId: string): Promise<{
    outputUrl: string
    thumbnailUrl: string
    frames: number
    fileSize: number
  }> {
    let attempts = 0
    const maxAttempts = 360 // 30 minutes (5s intervals)

    while (attempts < maxAttempts) {
      const status = await this.getStatus(jobId)

      if (status.status === 'completed') {
        // Fetch final result
        const response = await fetch(`${this.apiEndpoint}/jobs/${jobId}/result`, {
          headers: this.getHeaders()
        })

        if (!response.ok) {
          throw new Error('Failed to fetch render result')
        }

        return await response.json()
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Render job failed')
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Render job timed out after 30 minutes')
  }

  /**
   * Cancel render job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      })

      return response.ok
    } catch (error) {
      console.error('[MetaHumanAdapter] Cancel job failed:', error)
      return false
    }
  }

  // ============================================================================
  // CONFIGURATION BUILDERS
  // ============================================================================

  /**
   * Build MetaHuman configuration
   */
  private buildMetaHumanConfig(config: AvatarConfig): MetaHumanConfig {
    const quality = config.quality === 'HIGH' ? 'HIGH' : 'HYPERREAL'

    return {
      metaHumanId: config.metaHumanId!,
      quality,
      renderSettings: {
        resolution: config.renderSettings?.resolution || (quality === 'HYPERREAL' ? '4k' : '1080p'),
        fps: config.renderSettings?.fps || (quality === 'HYPERREAL' ? 60 : 30),
        rayTracing: config.renderSettings?.rayTracing ?? (quality === 'HYPERREAL'),
        pathTracing: config.renderSettings?.pathTracing ?? false,
        antiAliasing: config.renderSettings?.antiAliasing || 'TAA',
        shadowQuality: quality === 'HYPERREAL' ? 'cinematic' : 'high',
        lightingQuality: quality === 'HYPERREAL' ? 'cinematic' : 'high'
      },
      postProcessing: {
        colorGrading: config.postProcessing?.colorGrading ?? true,
        bloom: config.postProcessing?.bloom ?? true,
        depthOfField: config.postProcessing?.depthOfField ?? false,
        motionBlur: config.postProcessing?.motionBlur ?? true,
        chromaticAberration: config.postProcessing?.chromaticAberration ?? false,
        vignette: config.postProcessing?.vignette ?? true
      },
      hair: {
        simulation: quality === 'HYPERREAL',
        quality: quality === 'HYPERREAL' ? 'cinematic' : 'high',
        physics: quality === 'HYPERREAL'
      },
      clothing: {
        simulation: quality === 'HYPERREAL',
        quality: quality === 'HYPERREAL' ? 'cinematic' : 'high',
        physics: quality === 'HYPERREAL'
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client-Version': '1.0.0'
    }
  }

  /**
   * Map UE5 status to standard status
   */
  private mapUE5Status(ue5Status: string): JobStatus['status'] {
    const statusMap: Record<string, JobStatus['status']> = {
      'queued': 'queued',
      'loading': 'processing',
      'rendering': 'processing',
      'post_processing': 'processing',
      'encoding': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled'
    }

    return statusMap[ue5Status] || 'unknown'
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return true

    const message = error.message.toLowerCase()

    // Network errors - retryable
    if (message.includes('timeout') || message.includes('econnrefused')) {
      return true
    }

    // Server errors - retryable
    if (message.includes('500') || message.includes('503')) {
      return true
    }

    // Resource errors - retryable
    if (message.includes('memory') || message.includes('resource')) {
      return true
    }

    // Client errors - not retryable
    if (message.includes('400') || message.includes('404') || message.includes('not found')) {
      return false
    }

    return true
  }

  // ============================================================================
  // PRESETS
  // ============================================================================

  /**
   * Get quality presets
   */
  static getQualityPresets() {
    return {
      HIGH: {
        resolution: '1080p' as const,
        fps: 30 as const,
        rayTracing: false,
        pathTracing: false,
        antiAliasing: 'TAA' as const,
        shadowQuality: 'high' as const,
        lightingQuality: 'high' as const,
        estimatedTime: 120, // 2 minutes
        credits: 3
      },
      HYPERREAL: {
        resolution: '4k' as const,
        fps: 60 as const,
        rayTracing: true,
        pathTracing: true,
        antiAliasing: 'TAA' as const,
        shadowQuality: 'cinematic' as const,
        lightingQuality: 'cinematic' as const,
        estimatedTime: 300, // 5 minutes
        credits: 10
      }
    }
  }
}

// Export singleton instances
export const metaHumanAdapterHigh = new MetaHumanAdapter()
export const metaHumanAdapterHyperreal = new MetaHumanAdapter()
