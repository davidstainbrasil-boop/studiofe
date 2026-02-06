/**
 * Queue Setup Module - REAL BullMQ Implementation
 * Initializes and configures the job queue using BullMQ + Redis
 */

import { Queue, Worker, type Job, type WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@lib/logger';

export interface QueueConfig {
  redisUrl?: string;
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
  queueName?: string;
}

export interface QueueJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedReason?: string;
}

export type JobProcessor<T = unknown, R = unknown> = (job: Job<T, R>) => Promise<R>;

class QueueManager {
  private config: Required<Omit<QueueConfig, 'queueName'>> & { queueName: string };
  private isInitialized = false;
  private queue: Queue | null = null;
  private workers: Map<string, Worker> = new Map();
  private redis: Redis | null = null;

  constructor(config: QueueConfig = {}) {
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      concurrency: config.concurrency ?? 3,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 5000,
      queueName: config.queueName ?? 'jobs-queue'
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Queue already initialized', { queueName: this.config.queueName });
      return;
    }

    try {
      // Create Redis connection
      this.redis = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 10000);

        this.redis!.on('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.redis!.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Create BullMQ Queue
      this.queue = new Queue(this.config.queueName, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: this.config.maxRetries,
          backoff: {
            type: 'exponential',
            delay: this.config.retryDelay
          },
          removeOnComplete: { count: 100, age: 24 * 3600 },
          removeOnFail: { count: 500 }
        }
      });

      this.isInitialized = true;
      logger.info('Queue initialized successfully', { 
        queueName: this.config.queueName,
        redisUrl: this.config.redisUrl.replace(/\/\/.*@/, '//***@') 
      });

    } catch (error) {
      logger.error('Failed to initialize queue', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager');
    
    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info('Worker closed', { name });
    }
    this.workers.clear();

    // Close queue
    if (this.queue) {
      await this.queue.close();
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
    }

    this.isInitialized = false;
    logger.info('Queue manager shutdown complete');
  }

  registerProcessor<T = unknown, R = unknown>(
    name: string, 
    processor: JobProcessor<T, R>,
    options: Partial<WorkerOptions> = {}
  ): void {
    if (!this.isInitialized || !this.redis) {
      throw new Error('Queue not initialized. Call initialize() first.');
    }

    const worker = new Worker<T, R>(
      this.config.queueName,
      async (job) => {
        if (job.name === name) {
          return processor(job);
        }
        throw new Error(`Unknown job name: ${job.name}`);
      },
      {
        connection: this.redis,
        concurrency: this.config.concurrency,
        ...options
      }
    );

    worker.on('completed', (job) => {
      logger.info('Job completed', { jobId: job.id, name: job.name });
    });

    worker.on('failed', (job, error) => {
      logger.error('Job failed', error, { jobId: job?.id, name: job?.name });
    });

    this.workers.set(name, worker);
    logger.info('Processor registered', { name, concurrency: this.config.concurrency });
  }

  async addJob<T = unknown>(
    name: string, 
    data: T, 
    options?: { priority?: number; delay?: number; jobId?: string }
  ): Promise<string> {
    if (!this.isInitialized || !this.queue) {
      throw new Error('Queue not initialized. Call initialize() first.');
    }

    const job = await this.queue.add(name, data, {
      priority: options?.priority,
      delay: options?.delay,
      jobId: options?.jobId
    });

    logger.info('Job added to queue', { jobId: job.id, name });
    return job.id?.toString() || '';
  }

  async getJob<T = unknown>(jobId: string): Promise<QueueJob<T> | null> {
    if (!this.queue) return null;

    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    
    return {
      id: job.id?.toString() || '',
      name: job.name,
      data: job.data as T,
      status: this.mapState(state),
      progress: typeof job.progress === 'number' ? job.progress : 0,
      createdAt: new Date(job.timestamp),
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason
    };
  }

  async getJobsByStatus(status: QueueJob['status']): Promise<QueueJob[]> {
    if (!this.queue) return [];

    const bullStatus = this.mapStatusToBull(status);
    const jobs = await this.queue.getJobs([bullStatus]);

    return Promise.all(jobs.map(async (job) => {
      const state = await job.getState();
      return {
        id: job.id?.toString() || '',
        name: job.name,
        data: job.data,
        status: this.mapState(state),
        progress: typeof job.progress === 'number' ? job.progress : 0,
        createdAt: new Date(job.timestamp),
        startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        failedReason: job.failedReason
      };
    }));
  }

  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.queue) return false;

    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === 'active') {
      // Can't cancel active jobs directly, but we can mark for cancellation
      await job.updateProgress({ cancelled: true });
      logger.info('Job marked for cancellation', { jobId });
      return true;
    }

    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      logger.info('Job cancelled and removed', { jobId });
      return true;
    }

    return false;
  }

  async getQueueStats() {
    if (!this.queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);

    return { waiting, active, completed, failed };
  }

  isReady(): boolean {
    return this.isInitialized && this.redis?.status === 'ready';
  }

  private mapState(state: string): QueueJob['status'] {
    switch (state) {
      case 'active': return 'active';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'waiting';
    }
  }

  private mapStatusToBull(status: QueueJob['status']): string {
    switch (status) {
      case 'active': return 'active';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'waiting';
    }
  }
}

export const queueManager = new QueueManager();

export async function setupQueue(config?: QueueConfig): Promise<QueueManager> {
  const manager = new QueueManager(config);
  await manager.initialize();
  return manager;
}

export default queueManager;
