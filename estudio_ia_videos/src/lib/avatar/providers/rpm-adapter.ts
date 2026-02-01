/**
 * Ready Player Me Avatar Provider
 * High-quality 3D avatar rendering with custom blend shapes
 * Quality: HIGH - photorealistic 3D avatars
 */

import { logger } from '@/lib/logger'
import { ReadyPlayerMeService } from '@/lib/services/avatar/ready-player-me-service'
import {
  BaseAvatarProvider,
  type RenderRequest,
  type RenderResult,
  type JobStatus,
  type ProviderCapabilities,
  type AvatarQuality
} from './base-avatar-provider'

// Default RPM avatar URL for demo purposes
const DEFAULT_RPM_AVATAR = 'https://models.readyplayer.me/64f3e9d8e7d83b7e14a7e1c5.glb'

export class RPMAdapter extends BaseAvatarProvider {
  readonly name = 'ReadyPlayerMe'
  readonly quality: AvatarQuality = 'HIGH'
  readonly estimatedTimePerSecond = 6.0 // ~3min for 30s video
  readonly creditsPerSecond = 0.1 // ~3 credits per 30s

  private rpmService: ReadyPlayerMeService
  private jobs = new Map<string, JobStatus>()

  constructor() {
    super()
    this.rpmService = new ReadyPlayerMeService()
  }

  /**
   * Render high-quality 3D avatar video
   */
  async render(request: RenderRequest): Promise<RenderResult> {
    this.validateRequest(request)

    const startTime = Date.now()
    const jobId = `rpm-${Date.now()}-${Math.random().toString(36).substring(7)}`

    logger.info('[RPMAdapter] Starting Ready Player Me render', {
      jobId,
      duration: request.animation.duration,
      frameCount: request.animation.frames.length,
      resolution: request.resolution
    })

    try {
      // Initialize job status
      const job: JobStatus = {
        jobId,
        status: 'processing',
        progress: 0
      }
      this.jobs.set(jobId, job)

      // Start async rendering using the real service
      this.renderAsync(jobId, request).catch(error => {
        logger.error('[RPMAdapter] Async render failed', error as Error)
        const failedJob: JobStatus = {
          jobId,
          status: 'failed',
          error: (error as Error).message
        }
        this.jobs.set(jobId, failedJob)
      })

      const processingTime = Date.now() - startTime

      return {
        jobId,
        status: 'processing',
        metadata: {
          provider: this.name,
          quality: this.quality,
          processingTime,
          creditsUsed: this.calculateCredits(request.animation.duration)
        }
      }

    } catch (error) {
      logger.error('[RPMAdapter] Render failed', error as Error)

      return {
        jobId,
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
   * Async rendering process using real RPM service
   */
  private async renderAsync(jobId: string, request: RenderRequest): Promise<void> {
    try {
      // Step 1: Use provided avatarId or default
      const avatarUrl = request.avatarId || DEFAULT_RPM_AVATAR

      this.updateJobProgress(jobId, 10)

      // Step 2: Create video job via RPM service
      logger.info('[RPMAdapter] Creating video job', { jobId, avatarUrl })
      
      // Import AvatarQuality enum from quality-tier-system for the service call
      const { AvatarQuality } = await import('../quality-tier-system')
      
      const rpmJobId = await this.rpmService.createVideo({
        userId: 'rpm-adapter',
        sourceImageUrl: avatarUrl,
        quality: AvatarQuality.HIGH,
        metadata: {
          blendShapeFrames: request.animation.frames,
          outputFormat: request.outputFormat || 'mp4',
          resolution: request.resolution || '1080p',
          fps: request.animation.fps
        }
      })

      this.updateJobProgress(jobId, 30)

      // Step 3: Poll for completion
      let attempts = 0
      const maxAttempts = 120 // 2 minutes max polling
      
      while (attempts < maxAttempts) {
        const status = await this.rpmService.getStatus(rpmJobId)
        
        if (status.status === 'completed' && status.videoUrl) {
          this.updateJobProgress(jobId, 100)

          // Complete job
          const completedJob: JobStatus = {
            jobId,
            status: 'completed',
            progress: 100,
            videoUrl: status.videoUrl
          }
          this.jobs.set(jobId, completedJob)

          logger.info('[RPMAdapter] Render completed', { jobId, videoUrl: status.videoUrl })
          return
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'RPM video generation failed')
        }

        // Update progress (estimate since AvatarGenerationResult doesn't have progress)
        const estimatedProgress = Math.min(30 + (attempts / maxAttempts) * 65, 95)
        this.updateJobProgress(jobId, Math.round(estimatedProgress))

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }

      throw new Error('RPM rendering timeout exceeded')

    } catch (error) {
      logger.error('[RPMAdapter] Render async failed', error as Error)
      throw error
    }
  }

  /**
   * Update job progress
   */
  private updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.progress = progress
      this.jobs.set(jobId, job)
    }
  }

  /**
   * Get rendering job status
   */
  async getStatus(jobId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId)

    if (!job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    // Calculate estimated time remaining
    if (job.status === 'processing' && job.progress !== undefined) {
      const estimatedTotal = this.calculateEstimatedTime(30) // Assume 30s average
      const estimatedRemaining = estimatedTotal * (1 - job.progress / 100)
      job.estimatedTimeRemaining = Math.round(estimatedRemaining)
    }

    return job
  }

  /**
   * Cancel rendering job
   */
  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)

    if (job && job.status === 'processing') {
      job.status = 'failed'
      job.error = 'Cancelled by user'
      this.jobs.set(jobId, job)

      logger.info('[RPMAdapter] Job cancelled', { jobId })
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
      maxDuration: 180, // 3 minutes (processing intensive)
      supportedResolutions: ['720p', '1080p', '4k'],
      supportedFormats: ['mp4', 'webm']
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - verify service is instantiated
      return !!this.rpmService
    } catch (error) {
      logger.error('[RPMAdapter] Health check failed', error as Error)
      return false
    }
  }

  /**
   * Clean up old jobs
   */
  cleanup(maxAgeMs: number = 7200000): void {
    const now = Date.now()

    for (const [jobId] of this.jobs.entries()) {
      const match = jobId.match(/^rpm-(\d+)/)
      if (match) {
        const timestamp = parseInt(match[1])
        if (now - timestamp > maxAgeMs) {
          this.jobs.delete(jobId)
          logger.info('[RPMAdapter] Cleaned up old job', { jobId })
        }
      }
    }
  }
}
