/**
 * Render Job Manager
 * Gerenciador de jobs de renderização (usando Prisma)
 */

import { prisma } from '@lib/prisma';
import { triggerWebhook } from '@lib/webhooks-system-real';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';

export interface RenderJob {
  id: string;
  userId: string;
  projectId: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  outputUrl?: string;
  error?: string;
}

export class JobManager {
  constructor() {
    // Prisma client is imported directly, no initialization needed
  }

  private async getJobContext(jobId: string): Promise<{ projectId: string, userId: string } | null> {
    try {
      const job = await prisma.render_jobs.findUnique({
        where: { id: jobId },
        select: {
          projectId: true,
          userId: true
        }
      });

      if (!job || !job.projectId) return null;

      return {
        projectId: job.projectId,
        userId: job.userId || ''
      };
    } catch (error) {
      logger.error('Error fetching job context:', error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
      return null;
    }
  }
  
  async createJob(userId: string, projectId: string, idempotencyKey?: string): Promise<string> {
    // Check for idempotency key first (if provided)
    if (idempotencyKey) {
      const existingByKey = await prisma.render_jobs.findUnique({
        where: { idempotencyKey: idempotencyKey },
        select: { id: true }
      });

      if (existingByKey) {
        logger.info(`Idempotency: Returning existing job ${existingByKey.id} for key ${idempotencyKey}`, {
          component: 'JobManager'
        });
        return existingByKey.id;
      }
    }

    // Fallback to time-based check
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const existingByTime = await prisma.render_jobs.findFirst({
      where: {
        projectId: projectId,
        status: 'queued',
        createdAt: { gt: oneMinuteAgo }
      },
      select: { id: true }
    });

    if (existingByTime) {
      logger.info(`Time-based idempotency: Returning existing pending job ${existingByTime.id} for project ${projectId}`, {
        component: 'JobManager'
      });
      return existingByTime.id;
    }

    // Create new job
    const job = await prisma.render_jobs.create({
      data: {
        id: randomUUID(),
        projectId: projectId,
        userId: userId,
        status: 'queued',
        progress: 0,
        renderSettings: {},
        idempotencyKey: idempotencyKey || null
      },
      select: { id: true }
    });

    logger.info('Created new render job in DB', {
      component: 'JobManager',
      jobId: job.id,
      projectId
    });

    // Add to BullMQ
    try {
      const { addVideoJob } = await import('@lib/queue/render-queue');
      await addVideoJob({
        jobId: job.id,
        projectId,
        userId
      });
      logger.info('Pushed job to BullMQ', { jobId: job.id });
    } catch (queueError) {
      logger.error('Failed to push job to BullMQ', queueError as Error, { jobId: job.id });
      // We should probably mark the DB job as failed_enqueue here
      await this.markAsFailedEnqueue(job.id, queueError instanceof Error ? queueError.message : 'Queue error');
      throw queueError;
    }

    return job.id;
  }

  async markAsFailedEnqueue(jobId: string, error: string): Promise<void> {
    try {
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: `Failed to enqueue: ${error}`,
          updatedAt: new Date()
        }
      });

      logger.error('Job marked as failed_enqueue (rollback)', new Error(error), {
        component: 'JobManager',
        jobId,
        reason: 'enqueue_failure'
      });
    } catch (err) {
      logger.error('Failed to mark job as failed_enqueue', err instanceof Error ? err : new Error(String(err)), {
        component: 'JobManager',
        jobId
      });
    }
  }
  
  async getJob(jobId: string): Promise<RenderJob | null> {
    const data = await prisma.render_jobs.findUnique({
      where: { id: jobId }
    });

    if (!data) return null;

    return {
      id: data.id,
      userId: data.userId || '',
      projectId: data.projectId || '',
      status: data.status as RenderJob['status'],
      progress: data.progress || 0,
      createdAt: data.createdAt || new Date(),
      startedAt: data.startedAt || undefined,
      completedAt: data.completedAt || undefined, 
      outputUrl: data.outputUrl || undefined,
      error: data.errorMessage || undefined
    };
  }
  
  async updateProgress(jobId: string, progress: number): Promise<void> {
    // Check if cancelled before updating
    const current = await prisma.render_jobs.findUnique({ 
        where: { id: jobId },
        select: { status: true }
    });
    
    if (current?.status === 'cancelled') {
        throw new Error('JOB_CANCELLED');
    }

    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        updatedAt: new Date(),
        status: 'processing' // Ensure marked as processing if it was queued
      }
    });
  }

  async startJob(jobId: string): Promise<void> {
    try {
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          progress: 0,
          startedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Trigger Webhook
      const context = await this.getJobContext(jobId);
      if (context) {
        triggerWebhook.renderStarted({
          jobId,
          projectId: context.projectId,
          userId: context.userId
        }).catch(err => logger.error('Webhook trigger failed:', err instanceof Error ? err : new Error(String(err)), { component: 'JobManager' }));
      }
    } catch (error) {
       // If job doesnt exist or other error
       logger.error(`Failed to start job ${jobId}:`, error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
       throw error;
    }
  }
  
  async markAsFailedUpload(jobId: string, error: string): Promise<void> {
    try {
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: `Upload failed: ${error}`,
          progress: 95,
          updatedAt: new Date()
        }
      });
    } catch (err) {
      logger.error('Failed to mark job as failed_upload', err instanceof Error ? err : new Error(String(err)), { component: 'JobManager' });
    }
  }

  async completeJob(jobId: string, outputUrl: string): Promise<void> {
    try {
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          updatedAt: new Date(),
          outputUrl: outputUrl
        }
      });

      // Trigger Webhook
      const context = await this.getJobContext(jobId);
      if (context) {
        // Increment global usage stats
        const { incrementUsage } = await import('@/lib/billing/usage');
        await incrementUsage(context.userId, 'renders', 1);

        triggerWebhook.renderCompleted({
          jobId,
          projectId: context.projectId,
          videoUrl: outputUrl,
          duration: 0
        }).catch(err => logger.error('Webhook trigger failed:', err instanceof Error ? err : new Error(String(err)), { component: 'JobManager' }));
      }
    } catch (error) {
      logger.error(`Failed to complete job ${jobId}:`, error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
    }
  }
  
  async failJob(jobId: string, errorMessage: string): Promise<void> {
    try {
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          updatedAt: new Date(),
          errorMessage: errorMessage
        }
      });

      // Trigger Webhook
      const context = await this.getJobContext(jobId);
      if (context) {
        triggerWebhook.renderFailed({
          jobId,
          projectId: context.projectId,
          error: errorMessage
        }).catch(err => logger.error('Webhook trigger failed:', err instanceof Error ? err : new Error(String(err)), { component: 'JobManager' }));
      }
    } catch (error) {
      logger.error(`Failed to fail job ${jobId}:`, error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
    }
  }
  
  async listJobs(projectId?: string, limit: number = 100): Promise<RenderJob[]> {
      // Not implemented for now, mostly used for internal management
      return [];
  }

  async removeJob(jobId: string): Promise<void> {
    try {
      await prisma.render_jobs.delete({
        where: { id: jobId }
      });
    } catch (error) {
      logger.error(`Failed to remove job ${jobId}:`, error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
    }
  }

  /**
   * Find stuck jobs (jobs in processing status for longer than threshold)
   */
  async findStuckJobs(thresholdMinutes: number): Promise<RenderJob[]> {
    try {
      const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);
      
      const stuckJobs = await prisma.render_jobs.findMany({
        where: {
          status: 'processing',
          OR: [
            { startedAt: { lt: thresholdDate } },
            { startedAt: null, createdAt: { lt: thresholdDate } }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });

      return stuckJobs.map(job => ({
        id: job.id,
        userId: job.userId || '',
        projectId: job.projectId || '',
        status: job.status as RenderJob['status'],
        progress: job.progress || 0,
        createdAt: job.createdAt || new Date(),
        startedAt: job.startedAt || undefined,
        completedAt: job.completedAt || undefined,
        outputUrl: job.outputUrl || undefined,
        error: job.errorMessage || undefined
      }));
    } catch (error) {
      logger.error('Error finding stuck jobs', error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
      return [];
    }
  }

  /**
   * Fail stuck jobs (mark as failed)
   */
  async failStuckJobs(thresholdMinutes: number): Promise<number> {
    try {
      const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);
      
      const result = await prisma.render_jobs.updateMany({
        where: {
          status: 'processing',
          OR: [
            { startedAt: { lt: thresholdDate } },
            { startedAt: null, createdAt: { lt: thresholdDate } }
          ]
        },
        data: {
          status: 'failed',
          errorMessage: `Job stuck for more than ${thresholdMinutes} minutes`,
          completedAt: new Date()
        }
      });

      return result.count;
    } catch (error) {
      logger.error('Error failing stuck jobs', error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
      return 0;
    }
  }
}

export const jobManager = new JobManager();
