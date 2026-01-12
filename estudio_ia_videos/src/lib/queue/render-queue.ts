/**
 * Render Queue - BullMQ Implementation (PRODUCTION)
 * Implementação real usando BullMQ + Redis para fila de renderização
 */

import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@lib/logger';

// Configuração Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = process.env.RENDER_QUEUE_NAME || 'render-jobs';

// Criar conexão Redis
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Log de conexão
connection.on('connect', () => {
  logger.info('Redis connected for render queue', { service: 'RenderQueue', url: REDIS_URL });
});

connection.on('error', (error) => {
  logger.error('Redis connection error', error instanceof Error ? error : new Error(String(error)), {
    service: 'RenderQueue'
  });
});

// Criar Queue BullMQ
export const videoQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      count: 100, // Manter últimos 100 jobs completos
      age: 24 * 3600 // Remover após 24 horas
    },
    removeOnFail: {
      count: 500 // Manter últimos 500 jobs falhados para debugging
    }
  }
});

// QueueEvents para monitoramento
const queueEvents = new QueueEvents(QUEUE_NAME, { connection: connection.duplicate() });

// Interface para compatibilidade com código anterior
export interface RenderQueueEvents {
  on(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  removeListener(event: string, handler: Function): void;
  close(): Promise<void>;
}

/**
 * Cria interface de eventos para a fila (compatibilidade retroativa)
 */
export function createRenderQueueEvents(queueName: string = 'default'): RenderQueueEvents {
  return {
    on: (event, handler) => queueEvents.on(event as any, handler as any),
    emit: (event, data) => {
      // QueueEvents é read-only, emit não faz sentido aqui
      logger.warn('emit() called on QueueEvents (read-only)', { event, service: 'RenderQueue' });
    },
    removeListener: (event, handler) => queueEvents.off(event as any, handler as any),
    close: async () => {
      await queueEvents.close();
      await videoQueue.close();
      await connection.quit();
    },
  };
}

/**
 * Adiciona job de renderização de vídeo à fila
 *
 * @param jobData - Dados do job (projectId, userId, slides, config)
 * @returns Job ID do BullMQ
 */
export async function addVideoJob(jobData: any): Promise<string> {
  try {
    logger.info('Adding video render job to queue', {
      service: 'RenderQueue',
      projectId: jobData.projectId,
      userId: jobData.userId,
      jobId: jobData.jobId
    });

    const job = await videoQueue.add('render-video', jobData, {
      // Job-specific options podem sobrescrever defaults
      jobId: jobData.jobId, // Usar jobId do banco como ID do BullMQ
      priority: jobData.priority || 10
    });

    const jobId = job.id?.toString() || '';

    logger.info('Video render job added successfully', {
      service: 'RenderQueue',
      bullmqJobId: jobId,
      dbJobId: jobData.jobId,
      projectId: jobData.projectId
    });

    return jobId;
  } catch (error) {
    logger.error('Failed to add video job to queue', error instanceof Error ? error : new Error(String(error)), {
      service: 'RenderQueue',
      projectId: jobData.projectId
    });

    throw new Error(`Failed to enqueue video job: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Consulta status de um job na fila
 *
 * @param jobId - ID do job no BullMQ
 * @returns Status do job
 */
export async function getVideoJobStatus(jobId: string) {
  try {
    const job = await videoQueue.getJob(jobId);

    if (!job) {
      logger.warn('Job not found in queue', {
        service: 'RenderQueue',
        jobId
      });

      return {
        id: jobId,
        status: 'not_found',
        progress: 0,
        data: {},
        result: null,
        error: null
      };
    }

    const state = await job.getState();
    const progress = job.progress || 0;
    const failedReason = job.failedReason;

    logger.debug('Job status retrieved', {
      service: 'RenderQueue',
      jobId,
      state,
      progress
    });

    return {
      id: jobId,
      status: state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
      progress: typeof progress === 'number' ? progress : 0,
      data: job.data,
      result: job.returnvalue,
      error: failedReason || null,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
  } catch (error) {
    logger.error('Failed to get job status', error instanceof Error ? error : new Error(String(error)), {
      service: 'RenderQueue',
      jobId
    });

    return {
      id: jobId,
      status: 'error',
      progress: 0,
      data: {},
      result: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Remove job da fila (cleanup)
 */
export async function removeVideoJob(jobId: string): Promise<boolean> {
  try {
    const job = await videoQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Job removed from queue', { service: 'RenderQueue', jobId });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to remove job', error instanceof Error ? error : new Error(String(error)), {
      service: 'RenderQueue',
      jobId
    });
    return false;
  }
}

/**
 * Constantes de status (compatibilidade)
 */
export const VideoJobStatus = {
  WAITING: 'waiting',
  PENDING: 'pending',
  ACTIVE: 'active',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELAYED: 'delayed'
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queue connections', { service: 'RenderQueue' });
  await queueEvents.close();
  await videoQueue.close();
  await connection.quit();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing queue connections', { service: 'RenderQueue' });
  await queueEvents.close();
  await videoQueue.close();
  await connection.quit();
});
