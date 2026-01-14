
import Redis from 'ioredis';
import { logger } from '@/lib/monitoring/logger';

// Singleton instance
let redisClient: Redis | null = null;

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    // Retry connection with exponential backoff
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

export const getRedisClient = async (): Promise<Redis | null> => {
  if (redisClient) {
    return redisClient;
  }

  try {
    logger.info('Initializing Redis connection...', { 
      host: REDIS_CONFIG.host, 
      port: REDIS_CONFIG.port 
    });

    redisClient = new Redis(REDIS_CONFIG);

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', err instanceof Error ? err : new Error(String(err)));
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

export const isRedisConnected = async (): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) return false;
  return client.status === 'ready';
};

export const RedisService = {
  get: async (key: string): Promise<string | null> => {
    const client = await getRedisClient();
    if (!client) return null;
    return client.get(key);
  },

  set: async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    const client = await getRedisClient();
    if (!client) return;
    
    if (ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
  },

  del: async (key: string): Promise<void> => {
    const client = await getRedisClient();
    if (!client) return;
    await client.del(key);
  },
  
  disconnect: async (): Promise<void> => {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
  }
};
