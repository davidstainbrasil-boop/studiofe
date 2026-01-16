import { prisma } from '@lib/prisma'
import { logger } from '@lib/logger'
import { supabaseClient } from '@lib/supabase'

interface RenderJob {
  id: string
  status: string
  renderSettings: any
  userId: string
  progress: number
}

export class RenderJobProcessor {
  private processing = false
  private interval: NodeJS.Timeout | null = null

  start(intervalMs: number = 5000) {
    if (this.interval) return
    
    logger.info('Starting render job processor', { intervalMs })
    
    this.interval = setInterval(async () => {
      await this.processNextJob()
    }, intervalMs)
    
    // Process immediately
    void this.processNextJob()
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      logger.info('Stopped render job processor')
    }
  }

  private async processNextJob() {
    if (this.processing) return
    
    try {
      this.processing = true
      
      // Get next queued job
      const job = await prisma.render_jobs.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' }
      })

      if (!job) return

      logger.info('Processing render job', { jobId: job.id })

      // Update status to processing
      await prisma.render_jobs.update({
        where: { id: job.id },
        data: { 
          status: 'processing',
          progress: 10
        }
      })

      const settings = job.renderSettings as any
      const provider = settings?.provider

      // Route to correct provider
      if (provider === 'heygen') {
        await this.processHeyGenJob(job)
      } else if (provider === 'did') {
        await this.processDIDJob(job)
      } else {
        // Default UE5/internal pipeline
        await this.processInternalJob(job)
      }

    } catch (error) {
      logger.error('Error processing render job', error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.processing = false
    }
  }

  private async processHeyGenJob(job: any) {
    try {
      const { heyGenService } = await import('@lib/heygen-service')
      const settings = job.renderSettings as any
      const externalId = settings.externalId

      // Poll HeyGen status
      const status = await heyGenService.getVideoStatus(externalId)

      if (status.status === 'completed') {
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            progress: 100,
            outputUrl: status.video_url,
            completedAt: new Date()
          }
        })
        logger.info('HeyGen job completed', { jobId: job.id })
      } else if (status.status === 'failed') {
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: status.error || 'HeyGen processing failed'
          }
        })
      } else {
        // Still processing
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: { progress: 50 }
        })
      }
    } catch (error) {
      await this.markJobFailed(job.id, error)
    }
  }

  private async processDIDJob(job: any) {
    try {
      const { DIDServiceReal } = await import('@lib/services/avatar/did-service-real')
      const didService = new DIDServiceReal()
      const settings = job.renderSettings as any
      const talkId = settings.externalId

      const status = await didService.getTalkStatus(talkId)

      if (status.status === 'done') {
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            progress: 100,
            outputUrl: status.resultUrl,
            completedAt: new Date()
          }
        })
        logger.info('D-ID job completed', { jobId: job.id })
      } else if (status.status === 'error') {
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: status.error || 'D-ID processing failed'
          }
        })
      } else {
        await prisma.render_jobs.update({
          where: { id: job.id },
          data: { progress: 50 }
        })
      }
    } catch (error) {
      await this.markJobFailed(job.id, error)
    }
  }

  private async processInternalJob(job: any) {
    try {
      // Simulate internal processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      await prisma.render_jobs.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          progress: 100,
          outputUrl: `https://placeholder.com/videos/${job.id}.mp4`,
          completedAt: new Date()
        }
      })
      
      logger.info('Internal job completed', { jobId: job.id })
    } catch (error) {
      await this.markJobFailed(job.id, error)
    }
  }

  private async markJobFailed(jobId: string, error: any) {
    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Job failed', error instanceof Error ? error : new Error(String(error)), { jobId })
  }
}

export const renderJobProcessor = new RenderJobProcessor()
