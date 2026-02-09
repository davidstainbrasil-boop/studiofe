/**
 * Distributed Video Worker - Fase 4
 * Worker distribuído para processar rendering de vídeos em paralelo
 */

import { Job } from 'bullmq'
import { logger } from '@/lib/logger';
import { isProduction } from '@lib/utils/mock-guard';
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import os from 'os'
import {
  VideoRenderJobData,
  VideoRenderJobProgress,
  VideoRenderJobResult,
  AvatarAnimationData,
  TimelineTrack
} from '../queue/video-queue-manager'
import { AvatarLipSyncIntegration } from '../avatar/avatar-lip-sync-integration'
import { ColorGradingEngine } from '../video/color-grading-engine'
import { storageSystem } from '@lib/storage-system-real'

const execAsync = promisify(exec)

// ============================================================================
// DISTRIBUTED VIDEO WORKER
// ============================================================================

export class DistributedVideoWorker {
  private workerId: string
  private tempDir: string
  private integration: AvatarLipSyncIntegration

  constructor(workerId?: string) {
    this.workerId = workerId || `worker-${os.hostname()}-${process.pid}`
    this.tempDir = join(os.tmpdir(), 'video-render', this.workerId)
    this.integration = new AvatarLipSyncIntegration()

    this.ensureTempDir()
  }

  private async ensureTempDir(): Promise<void> {
    if (!existsSync(this.tempDir)) {
      await mkdir(this.tempDir, { recursive: true })
    }
  }

  // ============================================================================
  // MAIN PROCESSOR
  // ============================================================================

  /**
   * Process video render job
   */
  async process(
    job: Job<VideoRenderJobData, VideoRenderJobResult>
  ): Promise<VideoRenderJobResult> {
    const startTime = Date.now()
    const logs: string[] = []

    try {
      logger.info(`[${this.workerId}] Processing job ${job.id}`)
      logs.push(`Started processing at ${new Date().toISOString()}`)

      // Validate job data
      this.validateJobData(job.data)
      logs.push('Job data validated')

      // Update progress: queued → processing
      await this.updateProgress(job, {
        stage: 'processing',
        progress: 0,
        currentTask: 'Initializing'
      })

      // Route to appropriate processor with timeout
      const processingTimeout = this.getProcessingTimeout(job.data.type)
      logs.push(`Processing timeout set to ${processingTimeout}ms`)

      const result = await this.withTimeout(
        async () => {
          switch (job.data.type) {
            case 'avatar':
              return await this.processAvatar(job)

            case 'timeline':
              return await this.processTimeline(job)

            case 'export':
              return await this.processExport(job)

            case 'pptx':
              return await this.processPPTX(job)

            default:
              throw new Error(`Unknown job type: ${job.data.type}`)
          }
        },
        processingTimeout
      )

      const duration = (Date.now() - startTime) / 1000
      logs.push(`Completed successfully in ${duration.toFixed(2)}s`)

      return {
        ...result,
        duration,
        logs
      }
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000
      const errorCategory = this.categorizeError(error)

      logger.error(`[${this.workerId}] Job ${job.id} failed (${errorCategory}) after ${duration.toFixed(2)}s:`, error instanceof Error ? error : new Error(String(error)))
      logs.push(`Failed (${errorCategory}) after ${duration.toFixed(2)}s: ${this.formatError(error)}`)

      await this.updateProgress(job, {
        stage: 'failed',
        progress: 0,
        error: this.formatError(error),
        currentTask: `Failed: ${errorCategory}`
      })

      // Re-throw with enhanced error
      throw this.enhanceError(error, job, errorCategory)
    } finally {
      // Cleanup temp files
      try {
        await this.cleanup()
        logs.push('Cleanup completed')
      } catch (cleanupError) {
        logger.error(`[${this.workerId}] Cleanup failed:`, cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)))
        logs.push(`Cleanup failed: ${cleanupError}`)
      }
    }
  }

  /**
   * Validate job data
   */
  private validateJobData(data: VideoRenderJobData): void {
    if (!data.jobId) throw new Error('Missing jobId')
    if (!data.userId) throw new Error('Missing userId')
    if (!data.type) throw new Error('Missing type')
    if (!data.input) throw new Error('Missing input')
    if (!data.options) throw new Error('Missing options')

    // Type-specific validation
    switch (data.type) {
      case 'avatar':
        if (!data.input.text) throw new Error('Avatar job requires text input')
        if (!data.input.avatarConfig) throw new Error('Avatar job requires avatarConfig')
        break

      case 'timeline':
        if (!data.input.timelineState) throw new Error('Timeline job requires timelineState')
        break

      case 'pptx':
        if (!data.input.pptxFile) throw new Error('PPTX job requires pptxFile')
        break
    }

    // Validate options
    const validQualities = ['draft', 'standard', 'high', 'ultra']
    if (!validQualities.includes(data.options.quality)) {
      throw new Error(`Invalid quality: ${data.options.quality}`)
    }

    const validResolutions = ['720p', '1080p', '4k']
    if (!validResolutions.includes(data.options.resolution)) {
      throw new Error(`Invalid resolution: ${data.options.resolution}`)
    }
  }

  /**
   * Execute with timeout
   */
  private async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs / 1000}s`)),
          timeoutMs
        )
      )
    ])
  }

  /**
   * Get processing timeout based on job type
   */
  private getProcessingTimeout(type: VideoRenderJobData['type']): number {
    const timeouts: Record<VideoRenderJobData['type'], number> = {
      avatar: 5 * 60 * 1000,     // 5 minutes
      timeline: 15 * 60 * 1000,  // 15 minutes
      export: 10 * 60 * 1000,    // 10 minutes
      pptx: 10 * 60 * 1000       // 10 minutes
    }
    return timeouts[type]
  }

  /**
   * Categorize error for retry logic
   */
  private categorizeError(error: unknown): string {
    if (!error) return 'unknown'

    const message = error instanceof Error ? error.message : String(error)

    // Network errors - should retry
    if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT') || message.includes('ENOTFOUND')) {
      return 'network'
    }

    // Resource errors - should retry
    if (message.includes('ENOMEM') || message.includes('out of memory') || message.includes('heap')) {
      return 'resource'
    }

    // Timeout errors - should retry with different settings
    if (message.includes('timed out') || message.includes('timeout')) {
      return 'timeout'
    }

    // Validation errors - should NOT retry
    if (message.includes('Missing') || message.includes('Invalid') || message.includes('requires')) {
      return 'validation'
    }

    // File not found - should NOT retry
    if (message.includes('ENOENT') || message.includes('not found')) {
      return 'not_found'
    }

    // Permission errors - should NOT retry
    if (message.includes('EACCES') || message.includes('permission denied')) {
      return 'permission'
    }

    // External API errors - may retry
    if (message.includes('API') || message.includes('rate limit')) {
      return 'api_error'
    }

    return 'unknown'
  }

  /**
   * Format error for user display
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      // Remove sensitive information
      return error.message
        .replace(/\/root\/.*?\//g, '/')
        .replace(/Bearer [A-Za-z0-9-._~+\/]+=*/g, 'Bearer ***')
        .replace(/password[=:]\s*\S+/gi, 'password=***')
        .substring(0, 500) // Limit length
    }
    return String(error).substring(0, 500)
  }

  /**
   * Enhance error with context
   */
  private enhanceError(
    error: unknown,
    job: Job<VideoRenderJobData, VideoRenderJobResult>,
    category: string
  ): Error {
    const baseError = error instanceof Error ? error : new Error(String(error))

    // Determine if error should be retried
    const shouldRetry = ['network', 'resource', 'timeout', 'api_error', 'unknown'].includes(category)

    // Add context to error
    const enhancedError = new Error(
      `[${category.toUpperCase()}${shouldRetry ? ' - RETRYABLE' : ' - FATAL'}] Job ${job.id} (${job.data.type}): ${baseError.message}`
    )

    // Preserve stack trace
    enhancedError.stack = baseError.stack

    // Add custom property for retry logic
    ;(enhancedError as any).shouldRetry = shouldRetry
    ;(enhancedError as any).category = category

    return enhancedError
  }

  // ============================================================================
  // AVATAR PROCESSING
  // ============================================================================

  private async processAvatar(
    job: Job<VideoRenderJobData, VideoRenderJobResult>
  ): Promise<VideoRenderJobResult> {
    const { input, options } = job.data

    // Step 1: Generate avatar animation (Phase 1 + 2)
    await this.updateProgress(job, {
      stage: 'processing',
      progress: 10,
      currentTask: 'Generating lip-sync animation'
    })

    const animation = await this.integration.generateAvatarAnimation({
      text: input.text!,
      avatarConfig: {
        ...input.avatarConfig,
        quality: this.mapQualityToAvatarQuality(options.quality),
        fps: options.fps
      }
    })

    // Step 2: Render video
    await this.updateProgress(job, {
      stage: 'rendering',
      progress: 40,
      currentTask: 'Rendering avatar video',
      totalFrames: animation.frames.length
    })

    const videoPath = await this.renderAvatarToVideo(
      animation,
      options,
      (progress) => {
        this.updateProgress(job, {
          stage: 'rendering',
          progress: 40 + (progress * 0.4),
          currentTask: 'Rendering frames',
          processedFrames: Math.floor(animation.frames.length * progress),
          totalFrames: animation.frames.length
        })
      }
    )

    // Step 3: Encode video
    await this.updateProgress(job, {
      stage: 'encoding',
      progress: 80,
      currentTask: 'Encoding video'
    })

    const outputPath = await this.encodeVideo(videoPath, options)

    // Step 4: Upload to storage
    await this.updateProgress(job, {
      stage: 'uploading',
      progress: 90,
      currentTask: 'Uploading to storage'
    })

    const outputUrl = await this.uploadToStorage(outputPath, job.data.jobId)

    // Step 5: Complete
    await this.updateProgress(job, {
      stage: 'completed',
      progress: 100,
      currentTask: 'Done'
    })

    return {
      success: true,
      outputUrl,
      duration: animation.duration,
      fileSize: await this.getFileSize(outputPath),
      metadata: {
        codec: options.codec,
        resolution: options.resolution,
        fps: options.fps,
        bitrate: options.bitrate || 'auto'
      }
    }
  }

  // ============================================================================
  // TIMELINE PROCESSING
  // ============================================================================

  private async processTimeline(
    job: Job<VideoRenderJobData, VideoRenderJobResult>
  ): Promise<VideoRenderJobResult> {
    const { input, options } = job.data

    await this.updateProgress(job, {
      stage: 'processing',
      progress: 10,
      currentTask: 'Processing timeline'
    })

    // Timeline processing would integrate with Phase 3
    const timelineState = input.timelineState
    
    if (!timelineState) {
      throw new Error('Timeline state is required for timeline processing')
    }

    // Calculate total frames needed
    const totalFrames = Math.ceil(timelineState.duration * options.fps)

    await this.updateProgress(job, {
      stage: 'rendering',
      progress: 20,
      currentTask: 'Rendering timeline',
      totalFrames
    })

    // Render each track
    const renderedTracks: string[] = []

    for (let i = 0; i < timelineState.tracks.length; i++) {
      const track = timelineState.tracks[i]

      await this.updateProgress(job, {
        stage: 'rendering',
        progress: 20 + ((i / timelineState.tracks.length) * 60),
        currentTask: `Rendering track ${i + 1}/${timelineState.tracks.length}`
      })

      const trackVideo = await this.renderTrack(track, options)
      renderedTracks.push(trackVideo)
    }

    // Composite tracks
    await this.updateProgress(job, {
      stage: 'encoding',
      progress: 80,
      currentTask: 'Compositing tracks'
    })

    const compositedVideo = await this.compositeTracks(renderedTracks, options)

    // Upload
    await this.updateProgress(job, {
      stage: 'uploading',
      progress: 90,
      currentTask: 'Uploading'
    })

    const outputUrl = await this.uploadToStorage(compositedVideo, job.data.jobId)

    await this.updateProgress(job, {
      stage: 'completed',
      progress: 100
    })

    return {
      success: true,
      outputUrl,
      fileSize: await this.getFileSize(compositedVideo),
      metadata: {
        codec: options.codec,
        resolution: options.resolution,
        fps: options.fps,
        bitrate: options.bitrate || 'auto'
      }
    }
  }

  // ============================================================================
  // EXPORT PROCESSING
  // ============================================================================

  private async processExport(
    job: Job<VideoRenderJobData, VideoRenderJobResult>
  ): Promise<VideoRenderJobResult> {
    // Simple export processing
    return {
      success: true,
      outputUrl: 'https://example.com/exported-video.mp4'
    }
  }

  // ============================================================================
  // PPTX PROCESSING
  // ============================================================================

  private async processPPTX(
    job: Job<VideoRenderJobData, VideoRenderJobResult>
  ): Promise<VideoRenderJobResult> {
    // PPTX to video processing
    return {
      success: true,
      outputUrl: 'https://example.com/pptx-video.mp4'
    }
  }

  // ============================================================================
  // RENDERING HELPERS
  // ============================================================================

  private async renderAvatarToVideo(
    animation: AvatarAnimationData,
    options: VideoRenderJobData['options'],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (isProduction()) {
      throw new Error('Avatar video rendering is not yet implemented for production. Requires Remotion/FFmpeg integration.');
    }

    // This would integrate with Remotion or FFmpeg
    // For now, return a placeholder path
    const outputPath = join(this.tempDir, `avatar-${Date.now()}.mp4`)

    // Simulate rendering progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      onProgress?.(i / 100)
    }

    // In production, this would actually render the video
    // using Remotion, FFmpeg, or similar

    return outputPath
  }

  private async renderTrack(track: TimelineTrack, options: VideoRenderJobData['options']): Promise<string> {
    const outputPath = join(this.tempDir, `track-${track.id}.mp4`)
    // Actual rendering logic here
    return outputPath
  }

  private async compositeTracks(tracks: string[], options: VideoRenderJobData['options']): Promise<string> {
    const outputPath = join(this.tempDir, `composited-${Date.now()}.mp4`)

    // Use FFmpeg to composite tracks
    const filterComplex = tracks.map((_, i) => `[${i}:v]`).join('') + `overlay=enable='between(t,0,999)'`

    const command = `ffmpeg ${tracks.map((t, i) => `-i ${t}`).join(' ')} \
      -filter_complex "${filterComplex}" \
      -c:v ${options.codec} \
      -preset ${this.getPreset(options.quality)} \
      ${outputPath}`

    // await execAsync(command)

    return outputPath
  }

  private async encodeVideo(inputPath: string, options: VideoRenderJobData['options']): Promise<string> {
    const outputPath = inputPath.replace('.mp4', `-encoded.${options.exportFormat || 'mp4'}`)

    const resolution = this.getResolution(options.resolution)
    const preset = this.getPreset(options.quality)

    const command = `ffmpeg -i ${inputPath} \
      -c:v ${options.codec} \
      -preset ${preset} \
      -s ${resolution} \
      -r ${options.fps} \
      ${options.bitrate ? `-b:v ${options.bitrate}` : ''} \
      ${outputPath}`

    // await execAsync(command)

    return outputPath
  }

  // ============================================================================
  // UPLOAD & STORAGE
  // ============================================================================

  private async uploadToStorage(filePath: string, jobId: string): Promise<string> {
    const fileBuffer = await readFile(filePath)
    const storagePath = `renders/${jobId}.mp4`
    return storageSystem.upload({
      bucket: 'videos',
      path: storagePath,
      file: fileBuffer,
      contentType: 'video/mp4'
    })
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async updateProgress(
    job: Job<VideoRenderJobData, VideoRenderJobResult>,
    progress: VideoRenderJobProgress
  ): Promise<void> {
    await job.updateProgress(progress)
  }

  private mapQualityToAvatarQuality(quality: string): 'PLACEHOLDER' | 'STANDARD' | 'HIGH' | 'HYPERREAL' {
    const map: Record<string, 'PLACEHOLDER' | 'STANDARD' | 'HIGH' | 'HYPERREAL'> = {
      draft: 'PLACEHOLDER',
      standard: 'STANDARD',
      high: 'HIGH',
      ultra: 'HYPERREAL'
    }
    return map[quality] || 'STANDARD'
  }

  private getPreset(quality: string): string {
    const presets: Record<string, string> = {
      draft: 'ultrafast',
      standard: 'medium',
      high: 'slow',
      ultra: 'veryslow'
    }
    return presets[quality] || 'medium'
  }

  private getResolution(resolution: string): string {
    const resolutions: Record<string, string> = {
      '720p': '1280x720',
      '1080p': '1920x1080',
      '4k': '3840x2160'
    }
    return resolutions[resolution] || '1920x1080'
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`stat -f%z "${filePath}" 2>/dev/null || stat -c%s "${filePath}"`)
      return parseInt(stdout.trim())
    } catch {
      return 0
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Remove temp files
      const { stdout } = await execAsync(`ls -1 ${this.tempDir}`)
      const files = stdout.split('\n').filter(Boolean)

      for (const file of files) {
        await unlink(join(this.tempDir, file)).catch(() => {})
      }
    } catch (error) {
      logger.error('Cleanup error:', error instanceof Error ? error : new Error(String(error)))
    }
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  getMetrics() {
    return {
      workerId: this.workerId,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpu: process.cpuUsage()
    }
  }
}

// Export factory function
export function createVideoWorker(workerId?: string): DistributedVideoWorker {
  return new DistributedVideoWorker(workerId)
}
