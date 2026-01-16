import { createClient } from 'redis'
import { logger } from '@/lib/logger'
import { LipSyncResult } from './types/phoneme.types'

export class VisemeCache {
  private redis: ReturnType<typeof createClient>
  private ttl = 86400 * 7 // 7 dias

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    })

    this.redis.on('error', (err) => logger.warn('Redis Client Error', err));

    this.redis.connect().catch(error => {
      logger.error('Failed to connect to Redis cache', error)
    })
  }

  async get(key: string): Promise<LipSyncResult | null> {
    try {
      if (!this.redis.isOpen) return null;
      const cached = await this.redis.get(`lipsync:${key}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.warn('Cache read failed', { error })
      return null
    }
  }

  async set(key: string, result: LipSyncResult): Promise<void> {
    try {
      if (!this.redis.isOpen) return;
      await this.redis.setEx(
        `lipsync:${key}`,
        this.ttl,
        JSON.stringify(result)
      )
    } catch (error) {
      logger.warn('Cache write failed', { error })
    }
  }

  async invalidate(key: string): Promise<void> {
    if (!this.redis.isOpen) return;
    await this.redis.del(`lipsync:${key}`)
  }

  async clear(): Promise<void> {
    if (!this.redis.isOpen) return;
    const keys = await this.redis.keys('lipsync:*')
    if (keys.length > 0) {
      await this.redis.del(keys)
    }
  }
}
