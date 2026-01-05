/**
 * Render Job Manager
 * Gerenciador de jobs de renderização (usando Prisma)
 */

import { prisma } from '@/lib/prisma';
import { triggerWebhook } from '@/lib/webhooks-system-real';
import { logger } from '@/lib/logger';
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
          project_id: true,
          projects: {
            select: { user_id: true }
          }
        }
      });

      if (!job || !job.project_id) return null;

      return {
        projectId: job.project_id,
        userId: job.projects?.user_id || ''
      };
    } catch (error) {
      logger.error('Error fetching job context:', error instanceof Error ? error : new Error(String(error)), { component: 'JobManager' });
      return null;
    }
  }
  
  async createJob(userId: string, projectId: string): Promise<string> {
    // Idempotency: Check for recent pending jobs (last 1 min) to prevent duplicates
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const existing = await prisma.render_jobs.findFirst({
      where: {
        project_id: projectId,
        status: 'pending',
        created_at: { gt: oneMinuteAgo }
      },
      select: { id: true }
    });

    if (existing) {
      logger.info(`[JobManager] Idempotency: Returning existing pending job ${existing.id} for project ${projectId}`, { component: 'JobManager' });
      return existing.id;
    }

    const job = await prisma.render_jobs.create({
      data: {
        id: randomUUID(),
        project_id: projectId,
        user_id: userId,
        status: 'pending',
        progress: 0,
        render_settings: {},
        attempts: 0
      },
      select: { id: true }
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
      userId: data.user_id || '',
      projectId: data.project_id || '',
      status: data.status as RenderJob['status'],
      progress: data.progress || 0,
      createdAt: data.created_at || new Date(),
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
        updated_at: new Date()
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
        where: projectId ? { project_id: projectId } : undefined,
        orderBy: { created_at: 'desc' },
        take: limit
      });

      return jobs.map((row) => ({
        id: row.id,
        userId: row.user_id || '',
        projectId: row.project_id || '',
        status: row.status as RenderJob['status'],
        progress: row.progress || 0,
        createdAt: row.created_at || new Date(),
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
