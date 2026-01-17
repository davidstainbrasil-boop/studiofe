/**
 * Placeholder Avatar Provider
 * Fast local rendering for development and previews
 * Uses simple 2D animated avatar, no external API calls
 */

import { logger } from '@/lib/logger'
import {
  BaseAvatarProvider,
  type RenderRequest,
  type RenderResult,
  type JobStatus,
  type ProviderCapabilities,
  type AvatarQuality
} from './base-avatar-provider'

export class PlaceholderAdapter extends BaseAvatarProvider {
  readonly name = 'Placeholder'
  readonly quality: AvatarQuality = 'PLACEHOLDER'
  readonly estimatedTimePerSecond = 0.1 // Very fast - 100ms per second of video
  readonly creditsPerSecond = 0 // Free

  private jobs = new Map<string, JobStatus>()

  /**
   * Render avatar video (simulated - instant)
   */
  async render(request: RenderRequest): Promise<RenderResult> {
    this.validateRequest(request)

    const jobId = `placeholder-${Date.now()}-${Math.random().toString(36).substring(7)}`

    logger.info('[PlaceholderAdapter] Starting render', {
      jobId,
      duration: request.animation.duration,
      frameCount: request.animation.frames.length
    })

    // Simulate instant processing
    const job: JobStatus = {
      jobId,
      status: 'processing',
      progress: 0
    }

    this.jobs.set(jobId, job)

    // Simulate rendering in background
    setTimeout(() => {
      const completedJob: JobStatus = {
        jobId,
        status: 'completed',
        progress: 100,
        videoUrl: `/api/placeholder/videos/${jobId}.mp4`
      }
      this.jobs.set(jobId, completedJob)

      logger.info('[PlaceholderAdapter] Render completed', { jobId })
    }, 500) // Simulate 500ms processing time

    return {
      jobId,
      status: 'processing',
      metadata: {
        provider: this.name,
        quality: this.quality,
        creditsUsed: 0
      }
    }
  }

  /**
   * Get job status
   */
  async getStatus(jobId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId)

    if (!job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    return job
  }

  /**
   * Cancel job (no-op for placeholder)
   */
  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)

    if (job) {
      job.status = 'failed'
      job.error = 'Cancelled by user'
      this.jobs.set(jobId, job)
    }
  }

  /**
   * Get capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      quality: this.quality,
      supportsCustomAvatars: false,
      supportsRealtime: true,
      maxDuration: 300, // 5 minutes max
      supportedResolutions: ['480p', '720p'],
      supportedFormats: ['mp4', 'webm']
    }
  }

  /**
   * Health check (always healthy)
   */
  async healthCheck(): Promise<boolean> {
    return true
  }

  /**
   * Clean up old jobs
   */
  cleanup(maxAgeMs: number = 3600000): void {
    const now = Date.now()

    for (const [jobId, job] of this.jobs.entries()) {
      // Extract timestamp from jobId
      const match = jobId.match(/^placeholder-(\d+)/)
      if (match) {
        const timestamp = parseInt(match[1])
        if (now - timestamp > maxAgeMs) {
          this.jobs.delete(jobId)
          logger.info('[PlaceholderAdapter] Cleaned up old job', { jobId })
        }
      }
    }
  }
}
