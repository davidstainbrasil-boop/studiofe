import { NextResponse } from 'next/server'
import { isRedisConnected, getRedisClient } from '@lib/services/redis-service'
import { detectSlowQueries } from '@lib/monitoring/slow-queries-detector'
import { prisma } from '@lib/prisma'
import { logger } from '@lib/logger'

function checkStorage() {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase()
  if (provider === 's3') {
    return Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_REGION)
  }
  if (provider === 'supabase') {
    return Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY)
  }
  return true
}

async function checkRedis() {
  try {
    const connected = await isRedisConnected()
    if (!connected) {
      return {
        status: 'unavailable',
        latency: null,
        memory: null,
        connections: null,
        error: 'Redis não está conectado'
      }
    }

    const redis = (await getRedisClient()) as any
    const start = Date.now()
    
    // Ping Redis para medir latência
    await redis.ping()
    const latency = Date.now() - start

    // Obter informações do servidor
    const info = await redis.info('server')
    const memoryInfo = await redis.info('memory')
    const clientsInfo = await redis.info('clients')
    
    // Extrair métricas
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/)
    const usedMemoryMatch = memoryInfo.match(/used_memory_human:(.+)/)
    const connectedClientsMatch = clientsInfo.match(/connected_clients:(\d+)/)
    
    const uptime = uptimeMatch ? parseInt(uptimeMatch[1], 10) : null
    const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : null
    const connectedClients = connectedClientsMatch ? parseInt(connectedClientsMatch[1], 10) : null

    return {
      status: 'healthy',
      latency,
      memory: usedMemory,
      connections: connectedClients,
      uptime,
      error: null
    }
  } catch (error) {
    return {
      status: 'error',
      latency: null,
      memory: null,
      connections: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar Redis'
    }
  }
}

async function checkDatabase() {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    // Detectar slow queries
    const slowQueries = await detectSlowQueries(1000)

    return {
      status: 'ok',
      latency,
      slowQueries,
      error: null
    }
  } catch (error) {
    return {
      status: 'error',
      latency: null,
      slowQueries: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar database'
    }
  }
}

async function getCacheStats() {
  try {
    const redis = await getRedisClient()
    if (!redis) {
      return {
        enabled: false,
        hitRate: null,
        totalKeys: 0,
        error: 'Redis não disponível'
      }
    }

    // Get cache statistics from Redis
    const info = await (redis as any).info('stats')

    // Extract hit/miss statistics
    const hitsMatch = info.match(/keyspace_hits:(\d+)/)
    const missesMatch = info.match(/keyspace_misses:(\d+)/)

    const hits = hitsMatch ? parseInt(hitsMatch[1], 10) : 0
    const misses = missesMatch ? parseInt(missesMatch[1], 10) : 0
    const total = hits + misses
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : 'N/A'

    // Get total keys count
    const dbInfo = await (redis as any).info('keyspace')
    const keysMatch = dbInfo.match(/keys=(\d+)/)
    const totalKeys = keysMatch ? parseInt(keysMatch[1], 10) : 0

    return {
      enabled: true,
      hitRate: hitRate !== 'N/A' ? `${hitRate}%` : hitRate,
      hits,
      misses,
      totalKeys,
      error: null
    }
  } catch (error) {
    logger.warn('Failed to get cache stats', { error: error instanceof Error ? error.message : String(error) })
    return {
      enabled: false,
      hitRate: null,
      hits: 0,
      misses: 0,
      totalKeys: 0,
      error: error instanceof Error ? error.message : 'Erro ao obter estatísticas de cache'
    }
  }
}

async function checkQueueHealth() {
  try {
    const redis = await getRedisClient()
    if (!redis) {
      return {
        enabled: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        error: 'Redis não disponível'
      }
    }

    // Check BullMQ queue stats
    const queueName = process.env.RENDER_QUEUE_NAME || 'render-jobs'

    const [waiting, active, completed, failed] = await Promise.all([
      (redis as any).llen(`bull:${queueName}:wait`).catch(() => 0),
      (redis as any).llen(`bull:${queueName}:active`).catch(() => 0),
      (redis as any).zcard(`bull:${queueName}:completed`).catch(() => 0),
      (redis as any).zcard(`bull:${queueName}:failed`).catch(() => 0)
    ])

    return {
      enabled: true,
      waiting,
      active,
      completed,
      failed,
      error: null
    }
  } catch (error) {
    logger.warn('Failed to check queue health', { error: error instanceof Error ? error.message : String(error) })
    return {
      enabled: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Erro ao verificar fila'
    }
  }
}

export async function GET() {
  const [storageReady, redisCheck, databaseCheck, cacheStats, queueHealth] = await Promise.all([
    Promise.resolve(checkStorage()),
    checkRedis().catch(() => ({ status: 'unavailable', latency: null, memory: null, connections: null, error: 'Redis não configurado' })),
    checkDatabase().catch(() => ({ status: 'error', latency: null, slowQueries: 0, error: 'Erro ao verificar database' })),
    getCacheStats().catch(() => ({ enabled: false, hitRate: null, hits: 0, misses: 0, totalKeys: 0, error: 'Erro ao obter cache stats' })),
    checkQueueHealth().catch(() => ({ enabled: false, waiting: 0, active: 0, completed: 0, failed: 0, error: 'Erro ao verificar fila' }))
  ])

  const status = {
    app: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    storageProvider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(),
    storageReady,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    redis: redisCheck,
    database: databaseCheck,
    cache: cacheStats,
    queue: queueHealth,
    features: {
      rateLimiting: Boolean(process.env.REDIS_URL),
      caching: Boolean(process.env.REDIS_URL),
      cacheWarming: process.env.NODE_ENV === 'production' && Boolean(process.env.REDIS_URL),
      monitoring: Boolean(process.env.SENTRY_DSN)
    }
  }

  const code = status.storageReady && databaseCheck.status === 'ok' ? 200 : 503
  return NextResponse.json(status, { status: code })
}

// Force dynamic rendering to verify health at runtime
export const dynamic = 'force-dynamic';
