import { logger } from '@lib/logger';
import { Queue, ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';

export interface LipSyncValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LipSyncVideoResult {
  url: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  jobId?: string;
  error?: string;
}

let redis: Redis | null = null;
let lipSyncQueue: Queue | null = null;

function getQueue(): Queue {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  if (!lipSyncQueue) {
    lipSyncQueue = new Queue('lip-sync', { connection: redis as unknown as ConnectionOptions });
  }

  return lipSyncQueue;
}

export const validateLipSyncResources = async (): Promise<LipSyncValidationResult> => {
  try {
    const queue = getQueue();
    await queue.waitUntilReady();
    return { valid: true, errors: [] };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Lip-sync queue validation failed', err, { component: 'lib/services/lip-sync-integration' });
    return {
      valid: false,
      errors: ['Fila de lip-sync indisponível (Redis/BullMQ)']
    };
  }
};

export const generateLipSyncVideo = async (params: Record<string, unknown>): Promise<LipSyncVideoResult> => {
  const text = typeof params.text === 'string' ? params.text.trim() : '';
  const avatarImageUrl = typeof params.avatarImageUrl === 'string' ? params.avatarImageUrl.trim() : '';

  if (!text || !avatarImageUrl) {
    return {
      url: '',
      status: 'failed',
      error: 'Campos obrigatórios: text, avatarImageUrl'
    };
  }

  try {
    const queue = getQueue();
    await queue.waitUntilReady();

    const job = await queue.add(
      'generate',
      {
        text,
        avatarImageUrl,
        voiceId: params.voiceId || null,
        modelId: params.modelId || null,
        videoQuality: params.videoQuality || null,
        outputFileName: params.outputFileName || null,
        createdAt: new Date().toISOString()
      },
      {
        removeOnComplete: 100,
        removeOnFail: 1000
      }
    );

    return {
      url: `/api/lip-sync/status/${job.id}`,
      status: 'queued',
      jobId: String(job.id)
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to enqueue lip-sync generation', err, { component: 'lib/services/lip-sync-integration' });
    return {
      url: '',
      status: 'failed',
      error: err.message
    };
  }
};

export const LipSyncIntegration = {
  validateResources: validateLipSyncResources,
  generateVideo: generateLipSyncVideo
};

