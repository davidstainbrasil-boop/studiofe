/**
 * D-ID Avatar Provider
 * Integrates with D-ID API for realistic avatar rendering
 * Quality: STANDARD - balanced quality and speed
 */

import { logger } from '@/lib/logger'
import { DIDServiceReal } from '@/lib/services/avatar/did-service-real'
import {
  BaseAvatarProvider,
  type RenderRequest,
  type RenderResult,
  type JobStatus,
  type ProviderCapabilities,
  type AvatarQuality
} from './base-avatar-provider'

export class DIDAdapter extends BaseAvatarProvider {
  readonly name = 'D-ID'
  readonly quality: AvatarQuality = 'STANDARD'
  readonly estimatedTimePerSecond = 1.5 // ~45s for 30s video
  readonly creditsPerSecond = 0.033 // ~1 credit per 30s

  private didService: DIDServiceReal
  private defaultAvatar = process.env.DID_DEFAULT_AVATAR_IMAGE || 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/image.jpeg'

  constructor() {
    super()
    this.didService = new DIDServiceReal()
  }

  /**
   * Render avatar video using D-ID
   */
  async render(request: RenderRequest): Promise<RenderResult> {
    this.validateRequest(request)

    const startTime = Date.now()
    const avatarImage = request.avatarId || this.defaultAvatar

    logger.info('[DIDAdapter] Starting D-ID render', {
      duration: request.animation.duration,
      avatarImage,
      resolution: request.resolution
    })

    try {
      // D-ID requires audio file - we'll need to generate it from animation
      // For now, use text-to-speech via D-ID's built-in TTS

      // Extract text from animation metadata if available
      const text = this.extractTextFromAnimation(request.animation)

      if (!text) {
        throw new Error('D-ID requires text or audio. Animation must include speech text.')
      }

      // Create D-ID talk
      const talkId = await this.didService.createTalk({
        sourceImage: avatarImage,
        text,
        voice: 'pt-BR-FranciscaNeural',
        settings: {
          fluent: true,
          padAudio: 0.5,
          stitch: true
        }
      })

      const processingTime = Date.now() - startTime

      logger.info('[DIDAdapter] D-ID talk created', {
        talkId,
        processingTime
      })

      return {
        jobId: talkId,
        status: 'processing',
        metadata: {
          provider: this.name,
          quality: this.quality,
          processingTime,
          creditsUsed: this.calculateCredits(request.animation.duration)
        }
      }

    } catch (error) {
      logger.error('[DIDAdapter] Render failed', error as Error)

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
      const status = await this.didService.getTalkStatus(jobId)

      return {
        jobId,
        status: this.mapDIDStatus(status.status),
        videoUrl: status.resultUrl,
        error: status.error
      }

    } catch (error) {
      logger.error('[DIDAdapter] Failed to get status', error as Error)

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
      await this.didService.deleteTalk(jobId)
      logger.info('[DIDAdapter] Job cancelled', { jobId })
    } catch (error) {
      logger.error('[DIDAdapter] Failed to cancel job', error as Error)
      throw error
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      quality: this.quality,
      supportsCustomAvatars: true, // Can upload custom images
      supportsRealtime: false,
      maxDuration: 300, // 5 minutes (D-ID limit)
      supportedResolutions: ['480p', '720p', '1080p'],
      supportedFormats: ['mp4']
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get available voices as a health check
      const voices = await this.didService.listVoices()
      return voices.length > 0
    } catch (error) {
      logger.error('[DIDAdapter] Health check failed', error as Error)
      return false
    }
  }

  /**
   * Map D-ID status to our status
   */
  private mapDIDStatus(didStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (didStatus) {
      case 'created':
        return 'pending'
      case 'processing':
        return 'processing'
      case 'done':
        return 'completed'
      case 'error':
        return 'failed'
      default:
        return 'processing'
    }
  }

  /**
   * Extract speech text from animation metadata
   * This is a temporary solution - ideally we'd use the audio from Phase 1
   */
  private extractTextFromAnimation(animation: any): string | null {
    // Check metadata for original text
    if (animation.metadata?.originalText) {
      return animation.metadata.originalText
    }

    // Try to reconstruct from phonemes (not ideal but works)
    if (animation.metadata?.lipSyncSource === 'rhubarb') {
      // Rhubarb doesn't store original text
      return null
    }

    return null
  }
}
