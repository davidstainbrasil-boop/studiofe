import Redis from 'ioredis'
import { logger } from '@/lib/logger'
import { LipSyncResult } from './types/phoneme.types'
import crypto from 'crypto'

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  errors: number
  totalRequests: number
  hitRate: number
}

export class VisemeCache {
  private redis: Redis
  private ttl = 86400 * 7 // 7 dias
  private stats: Omit<CacheStats, 'hitRate' | 'totalRequests'> = {
    hits: 0,
    misses: 0,
    sets: 0,
    errors: 0
  }

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    })

    this.redis.on('error', (err: Error) => {
      this.stats.errors++
      logger.warn('Redis Client Error', { error: err.message })
    })

    this.redis.connect().catch((error: unknown) => {
      this.stats.errors++
      logger.error('Failed to connect to Redis cache', { error: error instanceof Error ? error.message : String(error) })
    })
  }

  private generateKey(input: string | object): string {
    if (typeof input === 'string') return input
    
    // Handle buffers specially to ensure consistent hashing
    const safeInput = JSON.stringify(input, (key, value) => {
      if (value && value.type === 'Buffer') {
        return Buffer.from(value.data).toString('base64')
      }
      return value
    })
    
    return crypto.createHash('md5').update(safeInput).digest('hex')
  }

  async get<T = LipSyncResult>(keyInput: string | object): Promise<T | null> {
    try {
      if (this.redis.status !== 'ready') {
        this.stats.misses++
        return null
      }

      const key = this.generateKey(keyInput)
      const cached = await this.redis.get(`lipsync:${key}`)
      
      if (cached) {
        this.stats.hits++
        return JSON.parse(cached)
      }
      
      this.stats.misses++
      return null
    } catch (error) {
      this.stats.errors++
      logger.warn('Cache read failed', { error })
      return null
    }
  }

  async set(keyInput: string | object, result: LipSyncResult): Promise<void> {
    try {
      if (this.redis.status !== 'ready') return

      const key = this.generateKey(keyInput)
      await this.redis.setex(
        `lipsync:${key}`,
        this.ttl,
        JSON.stringify(result)
      )
      this.stats.sets++
    } catch (error) {
      this.stats.errors++
      logger.warn('Cache write failed', { error })
    }
  }

  async invalidate(keyInput: string | object): Promise<void> {
    if (this.redis.status !== 'ready') return
    const key = this.generateKey(keyInput)
    await this.redis.del(`lipsync:${key}`)
  }

  async clear(): Promise<void> {
    if (this.redis.status !== 'ready') return
    const keys = await this.redis.keys('lipsync:*')
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0
    
    return {
      ...this.stats,
      totalRequests,
      hitRate
    }
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0
    }
  }

  getHitRate(): number {
    return this.getStats().hitRate
  }

  async disconnect(): Promise<void> {
    await this.redis.quit()
  }
}
