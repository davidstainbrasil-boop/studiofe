/**
 * Video Queue Manager - Fase 4: Rendering Distribuído
 * Sistema completo de filas com BullMQ para processamento paralelo
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface VideoRenderJobData {
  jobId: string
  userId: string
  type: 'avatar' | 'timeline' | 'export' | 'pptx'

  // Input data
  input: {
    text?: string
    avatarConfig?: any
    timelineState?: any
    pptxFile?: string
    exportFormat?: 'mp4' | 'webm' | 'mov'
  }

  // Rendering options
  options: {
    quality: 'draft' | 'standard' | 'high' | 'ultra'
    resolution: '720p' | '1080p' | '4k'
    fps: 24 | 30 | 60
    codec: 'h264' | 'h265' | 'vp9'
    bitrate?: string
  }

  // Priority
  priority?: number // 1-10 (10 = highest)

  // Metadata
  metadata?: {
    projectId?: string
    projectName?: string
    estimatedDuration?: number
  }
}

export interface VideoRenderJobProgress {
  stage: 'queued' | 'processing' | 'rendering' | 'encoding' | 'uploading' | 'completed' | 'failed'
  progress: number // 0-100
  currentTask?: string
  eta?: number // seconds
  processedFrames?: number
  totalFrames?: number
  speed?: string // e.g., "2.5x"
  error?: string
}

export interface VideoRenderJobResult {
  success: boolean
  outputUrl?: string
  duration?: number
  fileSize?: number
  metadata?: {
    codec: string
    resolution: string
    fps: number
    bitrate: string
  }
  error?: string
  logs?: string[]
}

export interface QueueMetrics {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

export interface WorkerMetrics {
  id: string
  name: string
  status: 'active' | 'idle' | 'stopped'
  currentJob?: string
  processedJobs: number
  failedJobs: number
  avgProcessingTime: number
  lastActive: Date
  memory: {
    used: number
    total: number
  }
  cpu: number
}

// ============================================================================
// VIDEO QUEUE MANAGER
// ============================================================================

export class VideoQueueManager {
  private queue: Queue<VideoRenderJobData, VideoRenderJobResult>
  private queueEvents: QueueEvents
  private redis: Redis

  private static instance: VideoQueueManager
  private workers: Map<string, Worker> = new Map()

  constructor() {
    // Redis connection
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    })

    // Create queue
    this.queue = new Queue<VideoRenderJobData, VideoRenderJobResult>('video-render', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: {
          age: 3600, // Keep for 1 hour
          count: 100
        },
        removeOnFail: {
          age: 86400 // Keep for 24 hours
        }
      }
    })

    // Queue events for monitoring
    this.queueEvents = new QueueEvents('video-render', {
      connection: this.redis
    })

    this.setupEventListeners()
  }

  // Singleton pattern
  static getInstance(): VideoQueueManager {
    if (!VideoQueueManager.instance) {
      VideoQueueManager.instance = new VideoQueueManager()
    }
    return VideoQueueManager.instance
  }

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  /**
   * Add job to queue
   */
  async addJob(
    data: VideoRenderJobData,
    options?: {
      priority?: number
      delay?: number
      attempts?: number
    }
  ): Promise<Job<VideoRenderJobData, VideoRenderJobResult>> {
    // Validate user credits (if applicable)
    if (data.type === 'avatar' || data.type === 'export') {
      await this.validateUserCredits(data.userId, data.options.quality)
    }

    // Add to queue
    const job = await this.queue.add(
      `${data.type}-${data.jobId}`,
      data,
      {
        jobId: data.jobId,
        priority: options?.priority || data.priority || 5,
        delay: options?.delay,
        attempts: options?.attempts || 3
      }
    )

    // Create database record
    await prisma.renderJob.create({
      data: {
        id: data.jobId,
        userId: data.userId,
        type: data.type,
        status: 'queued',
        input: data.input as any,
        options: data.options as any,
        metadata: data.metadata as any,
        createdAt: new Date()
      }
    })

    return job
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<VideoRenderJobData, VideoRenderJobResult> | undefined> {
    return await this.queue.getJob(jobId)
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string
    progress: VideoRenderJobProgress
    result?: VideoRenderJobResult
  }> {
    const job = await this.queue.getJob(jobId)

    if (!job) {
      return {
        status: 'not_found',
        progress: {
          stage: 'queued',
          progress: 0
        }
      }
    }

    const state = await job.getState()
    const progress = job.progress as VideoRenderJobProgress || {
      stage: 'queued',
      progress: 0
    }

    return {
      status: state,
      progress,
      result: job.returnvalue
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId)

    if (!job) {
      return false
    }

    // Refund credits if applicable
    const jobData = job.data
    if (jobData.type === 'avatar' || jobData.type === 'export') {
      await this.refundUserCredits(jobData.userId, jobData.options.quality)
    }

    // Remove job
    await job.remove()

    // Update database
    await prisma.renderJob.update({
      where: { id: jobId },
      data: { status: 'cancelled' }
    })

    return true
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<Job<VideoRenderJobData, VideoRenderJobResult> | null> {
    const job = await this.queue.getJob(jobId)

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    const state = await job.getState()
    if (state !== 'failed') {
      throw new Error(`Job ${jobId} is not in failed state (current: ${state})`)
    }

    // Check retry attempts
    const maxAttempts = job.opts.attempts || 3
    if (job.attemptsMade >= maxAttempts) {
      throw new Error(`Job ${jobId} has exceeded maximum retry attempts (${maxAttempts})`)
    }

    // Retry the job
    await job.retry()

    // Update database
    await prisma.renderJob.update({
      where: { id: jobId },
      data: {
        status: 'waiting',
        error: null,
        failedAt: null
      }
    })

    return job
  }

  /**
   * Get failed jobs with errors
   */
  async getFailedJobsWithErrors(limit = 50): Promise<Array<{
    jobId: string
    error: string
    attempts: number
    failedAt: Date
    data: VideoRenderJobData
  }>> {
    const failedJobs = await this.queue.getJobs('failed', 0, limit)

    return failedJobs.map(job => ({
      jobId: job.id as string,
      error: job.failedReason || 'Unknown error',
      attempts: job.attemptsMade,
      failedAt: new Date(job.processedOn || job.timestamp),
      data: job.data
    }))
  }

  /**
   * Retry all failed jobs
   */
  async retryAllFailed(): Promise<{ retried: number; failed: number }> {
    const failedJobs = await this.queue.getJobs('failed', 0, 100)
    let retried = 0
    let failed = 0

    for (const job of failedJobs) {
      try {
        await this.retryJob(job.id as string)
        retried++
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error)
        failed++
      }
    }

    return { retried, failed }
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const counts = await this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    )

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0
    }
  }

  /**
   * Get all jobs
   */
  async getJobs(
    status: 'waiting' | 'active' | 'completed' | 'failed',
    start = 0,
    end = 100
  ): Promise<Job<VideoRenderJobData, VideoRenderJobResult>[]> {
    return await this.queue.getJobs(status, start, end)
  }

  /**
   * Clean old jobs
   */
  async clean(
    grace: number = 3600000, // 1 hour in ms
    limit: number = 1000,
    status: 'completed' | 'failed' = 'completed'
  ): Promise<string[]> {
    return await this.queue.clean(grace, limit, status)
  }

  /**
   * Pause queue
   */
  async pause(): Promise<void> {
    await this.queue.pause()
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    await this.queue.resume()
  }

  /**
   * Drain queue (remove all waiting jobs)
   */
  async drain(): Promise<void> {
    await this.queue.drain()
  }

  // ============================================================================
  // WORKER MANAGEMENT
  // ============================================================================

  /**
   * Register worker
   */
  registerWorker(
    name: string,
    concurrency: number = 1,
    processor: (job: Job<VideoRenderJobData, VideoRenderJobResult>) => Promise<VideoRenderJobResult>
  ): Worker<VideoRenderJobData, VideoRenderJobResult> {
    const worker = new Worker<VideoRenderJobData, VideoRenderJobResult>(
      'video-render',
      processor,
      {
        connection: this.redis,
        concurrency,
        limiter: {
          max: 10,
          duration: 1000 // Max 10 jobs per second
        }
      }
    )

    // Worker event listeners
    worker.on('completed', async (job) => {
      console.log(`[Worker ${name}] Job ${job.id} completed`)

      await prisma.renderJob.update({
        where: { id: job.id as string },
        data: {
          status: 'completed',
          result: job.returnvalue as any,
          completedAt: new Date()
        }
      })
    })

    worker.on('failed', async (job, err) => {
      console.error(`[Worker ${name}] Job ${job?.id} failed:`, err)

      if (job) {
        await prisma.renderJob.update({
          where: { id: job.id as string },
          data: {
            status: 'failed',
            error: err.message,
            failedAt: new Date()
          }
        })
      }
    })

    worker.on('progress', async (job, progress) => {
      // Update progress in database
      await prisma.renderJob.update({
        where: { id: job.id as string },
        data: {
          progress: progress as any
        }
      })
    })

    this.workers.set(name, worker)
    return worker
  }

  /**
   * Get worker metrics
   */
  async getWorkerMetrics(): Promise<WorkerMetrics[]> {
    const metrics: WorkerMetrics[] = []

    for (const [name, worker] of this.workers.entries()) {
      const isRunning = await worker.isRunning()

      metrics.push({
        id: name,
        name,
        status: isRunning ? 'active' : 'stopped',
        currentJob: undefined, // Would need to track this separately
        processedJobs: 0, // Would need to track this
        failedJobs: 0,
        avgProcessingTime: 0,
        lastActive: new Date(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal
        },
        cpu: 0 // Would need to calculate this
      })
    }

    return metrics
  }

  /**
   * Stop all workers
   */
  async stopWorkers(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close()
    }
    this.workers.clear()
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      console.log(`Job ${jobId} completed`)
    })

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`Job ${jobId} failed:`, failedReason)
    })

    this.queueEvents.on('progress', ({ jobId, data }) => {
      console.log(`Job ${jobId} progress:`, data)
    })

    this.queueEvents.on('stalled', ({ jobId }) => {
      console.warn(`Job ${jobId} stalled`)
    })
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async validateUserCredits(userId: string, quality: string): Promise<void> {
    // Placeholder - implement actual credit validation
    const user = await prisma.profile.findUnique({
      where: { id: userId },
      select: { credits: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const requiredCredits = this.calculateRequiredCredits(quality)

    if (user.credits < requiredCredits) {
      throw new Error('Insufficient credits')
    }

    // Deduct credits
    await prisma.profile.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: requiredCredits
        }
      }
    })
  }

  private async refundUserCredits(userId: string, quality: string): Promise<void> {
    const requiredCredits = this.calculateRequiredCredits(quality)

    await prisma.profile.update({
      where: { id: userId },
      data: {
        credits: {
          increment: requiredCredits
        }
      }
    })
  }

  private calculateRequiredCredits(quality: string): number {
    const creditMap: Record<string, number> = {
      draft: 0,
      standard: 1,
      high: 3,
      ultra: 10
    }

    return creditMap[quality] !== undefined ? creditMap[quality] : 1
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async close(): Promise<void> {
    await this.stopWorkers()
    await this.queue.close()
    await this.queueEvents.close()
    await this.redis.quit()
  }
}

// Export singleton instance
export const videoQueueManager = VideoQueueManager.getInstance()
