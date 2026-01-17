/**
 * Base Avatar Provider Interface
 * Defines the contract for all avatar rendering providers
 */

import type { AvatarAnimation } from '../avatar-lip-sync-integration'

export type AvatarQuality = 'PLACEHOLDER' | 'STANDARD' | 'HIGH' | 'HYPERREAL'

export interface RenderRequest {
  animation: AvatarAnimation
  avatarId?: string
  outputFormat?: 'mp4' | 'webm' | 'mov'
  resolution?: '480p' | '720p' | '1080p' | '4k'
  backgroundColor?: string
}

export interface RenderResult {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  error?: string
  metadata?: {
    provider: string
    quality: AvatarQuality
    processingTime?: number
    creditsUsed: number
  }
}

export interface JobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number // 0-100
  estimatedTimeRemaining?: number // seconds
  videoUrl?: string
  error?: string
}

export interface ProviderCapabilities {
  quality: AvatarQuality
  supportsCustomAvatars: boolean
  supportsRealtime: boolean
  maxDuration: number // seconds
  supportedResolutions: string[]
  supportedFormats: string[]
}

export abstract class BaseAvatarProvider {
  abstract readonly name: string
  abstract readonly quality: AvatarQuality
  abstract readonly estimatedTimePerSecond: number // seconds of processing per second of video
  abstract readonly creditsPerSecond: number

  /**
   * Render avatar video from animation data
   */
  abstract render(request: RenderRequest): Promise<RenderResult>

  /**
   * Get status of a rendering job
   */
  abstract getStatus(jobId: string): Promise<JobStatus>

  /**
   * Cancel a rendering job
   */
  abstract cancel(jobId: string): Promise<void>

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): ProviderCapabilities

  /**
   * Health check for provider
   */
  abstract healthCheck(): Promise<boolean>

  /**
   * Calculate estimated rendering time
   */
  calculateEstimatedTime(durationSeconds: number): number {
    return durationSeconds * this.estimatedTimePerSecond
  }

  /**
   * Calculate credits required
   */
  calculateCredits(durationSeconds: number): number {
    return Math.ceil(durationSeconds * this.creditsPerSecond)
  }

  /**
   * Validate render request
   */
  protected validateRequest(request: RenderRequest): void {
    if (!request.animation) {
      throw new Error('Animation is required')
    }

    if (!request.animation.frames || request.animation.frames.length === 0) {
      throw new Error('Animation must have frames')
    }

    if (request.animation.duration <= 0) {
      throw new Error('Animation duration must be positive')
    }

    const capabilities = this.getCapabilities()

    if (request.animation.duration > capabilities.maxDuration) {
      throw new Error(
        `Animation duration (${request.animation.duration}s) exceeds maximum (${capabilities.maxDuration}s)`
      )
    }

    if (request.resolution && !capabilities.supportedResolutions.includes(request.resolution)) {
      throw new Error(
        `Resolution ${request.resolution} not supported by ${this.name}`
      )
    }

    if (request.outputFormat && !capabilities.supportedFormats.includes(request.outputFormat)) {
      throw new Error(
        `Format ${request.outputFormat} not supported by ${this.name}`
      )
    }
  }
}
