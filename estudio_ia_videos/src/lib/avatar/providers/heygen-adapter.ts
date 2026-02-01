/**
 * HeyGen Avatar Provider
 * Integrates with HeyGen API for high-quality avatar rendering
 * Quality: STANDARD to HIGH - professional quality
 */

import { logger } from '@/lib/logger'
import { HeyGenService } from '@/lib/heygen-service'
import {
  BaseAvatarProvider,
  type RenderRequest,
  type RenderResult,
  type JobStatus,
  type ProviderCapabilities,
  type AvatarQuality
} from './base-avatar-provider'

export class HeyGenAdapter extends BaseAvatarProvider {
  readonly name = 'HeyGen'
  readonly quality: AvatarQuality = 'STANDARD'
  readonly estimatedTimePerSecond = 2.0 // ~60s for 30s video
  readonly creditsPerSecond = 0.05 // ~1.5 credits per 30s

  private heygenService: HeyGenService
  private defaultAvatarId = process.env.HEYGEN_DEFAULT_AVATAR_ID || 'default-avatar-id'

  constructor() {
    super()
    this.heygenService = HeyGenService.getInstance()
  }

  /**
   * Render avatar video using HeyGen
   */
  async render(request: RenderRequest): Promise<RenderResult> {
    this.validateRequest(request)

    const startTime = Date.now()
    const avatarId = request.avatarId || this.defaultAvatarId

    logger.info('[HeyGenAdapter] Starting HeyGen render', {
      duration: request.animation.duration,
      avatarId,
      resolution: request.resolution
    })

    try {
      // Extract text from animation
      const text = this.extractTextFromAnimation(request.animation)

      if (!text) {
        throw new Error('HeyGen requires text. Animation must include speech text.')
      }

      // Create HeyGen video request
      const videoId = await this.heygenService.generateVideo({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId,
            avatar_style: 'normal'
          },
          voice: {
            type: 'text',
            input_text: text,
            voice_id: 'pt-BR-Standard-A' // HeyGen voice ID
          },
          background: {
            type: 'color',
            value: request.backgroundColor || '#FFFFFF'
          }
        }],
        dimension: this.getResolutionDimensions(request.resolution || '1080p'),
        test: false // Production mode
      })

      const processingTime = Date.now() - startTime

      logger.info('[HeyGenAdapter] HeyGen video created', {
        videoId,
        processingTime
      })

      return {
        jobId: videoId,
        status: 'processing',
        metadata: {
          provider: this.name,
          quality: this.quality,
          processingTime,
          creditsUsed: this.calculateCredits(request.animation.duration)
        }
      }

    } catch (error) {
      logger.error('[HeyGenAdapter] Render failed', error as Error)

      return {
        jobId: `failed-${Date.now()}`,
        status: 'failed',
        error: (error as Error).message,
        metadata: {
          provider: this.name,
          quality: this.quality,
          creditsUsed: 0
        }
      }
    }
  }

  /**
   * Get rendering job status
   */
  async getStatus(jobId: string): Promise<JobStatus> {
    try {
      const status = await this.heygenService.checkStatus(jobId)

      return {
        jobId,
        status: status.status,
        videoUrl: status.video_url,
        error: status.error
      }

    } catch (error) {
      logger.error('[HeyGenAdapter] Failed to get status', error as Error)

      return {
        jobId,
        status: 'failed',
        error: (error as Error).message
      }
    }
  }

  /**
   * Cancel rendering job
   */
  async cancel(jobId: string): Promise<void> {
    try {
      // HeyGen doesn't support cancellation - just log it
      logger.warn('[HeyGenAdapter] Job cancellation not supported by HeyGen', { jobId })
    } catch (error) {
      logger.error('[HeyGenAdapter] Failed to cancel job', error as Error)
      throw error
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      quality: this.quality,
      supportsCustomAvatars: true,
      supportsRealtime: false,
      maxDuration: 600, // 10 minutes
      supportedResolutions: ['480p', '720p', '1080p', '4k'],
      supportedFormats: ['mp4']
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list avatars as a health check
      const avatars = await this.heygenService.listAvatars()
      return avatars.length > 0
    } catch (error) {
      logger.error('[HeyGenAdapter] Health check failed', error as Error)
      return false
    }
  }

  /**
   * Get resolution dimensions
   */
  private getResolutionDimensions(resolution: string): { width: number; height: number } {
    const dimensions: Record<string, { width: number; height: number }> = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4k': { width: 3840, height: 2160 }
    }

    return dimensions[resolution] || dimensions['1080p']
  }

  /**
   * Extract speech text from animation metadata
   */
  private extractTextFromAnimation(animation: any): string | null {
    if (animation.metadata?.originalText) {
      return animation.metadata.originalText
    }

    return null
  }
}
