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
  status: 'pending' | 'processing' | 'completed' | 'failed';
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
          projects: {
            select: { userId: true }
          }
        }
      });

      if (!job || !job.projectId) return null;

      return {
        projectId: job.projectId,
        userId: job.projects?.userId || ''
      };
    } catch (error) {
      logger.error('Error fetching job context:', error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
      return null;
    }
  }
  
  async createJob(userId: string, projectId: string, idempotencyKey?: string): Promise<string> {
    // Idempotency Strategy 1: If idempotency key provided, check for existing job
    if (idempotencyKey) {
      const existingByKey = await prisma.render_jobs.findUnique({
        where: { idempotencyKey: idempotencyKey },
        select: { id: true, status: true }
      });

      if (existingByKey) {
        logger.info('Idempotent job creation - returning existing job', {
          component: 'JobManager',
          jobId: existingByKey.id,
          status: existingByKey.status,
          idempotencyKey
        });
        return existingByKey.id;
      }
    }

    // Idempotency Strategy 2: Fallback to time-based check (legacy behavior)
    // Check for recent pending jobs (last 1 min) to prevent duplicates
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const existingByTime = await prisma.render_jobs.findFirst({
      where: {
        projectId: projectId,
        status: 'pending',
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

    // Create new job with idempotency key if provided
    const job = await prisma.render_jobs.create({
      data: {
        id: randomUUID(),
        projectId: projectId,
        userId: userId,
        status: 'pending',
        progress: 0,
        render_settings: {},
        attempts: 0,
        idempotencyKey: idempotencyKey || null
      },
      select: { id: true }
    });

    logger.info('Created new render job', {
      component: 'JobManager',
      jobId: job.id,
      projectId,
      hasIdempotencyKey: !!idempotencyKey
    });

    return job.id;
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
      startedAt: data.started_at || undefined,
      completedAt: data.completed_at || undefined,
      outputUrl: data.output_url || undefined,
      error: data.error_message || undefined
    };
  }
  
  async updateProgress(jobId: string, progress: number): Promise<void> {
    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        updatedAt: new Date()
      }
    });
  }

  async startJob(jobId: string): Promise<void> {
    try {
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          started_at: new Date(),
          progress: 0
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
      logger.error(`Failed to start job ${jobId}:`, error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
    }
  }
  
  async completeJob(jobId: string, outputUrl: string): Promise<void> {
    try {
      await prisma.render_jobs.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          completed_at: new Date(),
          output_url: outputUrl
        }
      });

      // Trigger Webhook
      const context = await this.getJobContext(jobId);
      if (context) {
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
          completed_at: new Date(),
          error_message: errorMessage
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
    try {
      const jobs = await prisma.render_jobs.findMany({
        where: projectId ? { projectId: projectId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return jobs.map((row) => ({
        id: row.id,
        userId: row.userId || '',
        projectId: row.projectId || '',
        status: row.status as RenderJob['status'],
        progress: row.progress || 0,
        createdAt: row.createdAt || new Date(),
        startedAt: row.started_at || undefined,
        completedAt: row.completed_at || undefined,
        outputUrl: row.output_url || undefined,
        error: row.error_message || undefined
      }));
    } catch (error) {
      logger.error('Failed to list jobs:', error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
      return [];
    }
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
}

export const jobManager = new JobManager();
