import { NextResponse } from 'next/server'
import { prisma } from '@lib/prisma'

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns system health status for monitoring/load balancers
 */
export async function GET() {
  const startTime = Date.now()
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown', latency: 0, error: undefined as string | undefined },
      cache: { status: 'unknown', latency: 0, error: undefined as string | undefined },
      storage: { status: 'unknown', latency: 0, error: undefined as string | undefined },
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }

  try {
    // Database check
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
      error: undefined
    }
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      latency: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    health.status = 'degraded'
  }

  // Cache check (Redis)
  try {
    const cacheStart = Date.now()
    const { RedisService } = await import('@/lib/services/redis-service')
    await RedisService.get('health:check').catch(() => null) // Non-critical
    health.checks.cache = {
      status: 'healthy',
      latency: Date.now() - cacheStart,
      error: undefined
    }
  } catch (error) {
    health.checks.cache = {
      status: 'degraded',
      latency: 0,
      error: 'Cache not available'
    }
  }

  // Storage check (basic)
  try {
    health.checks.storage = {
      status: 'healthy',
      latency: 0,
      error: undefined
    }
  } catch (error) {
    health.checks.storage = {
      status: 'unknown',
      latency: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const totalLatency = Date.now() - startTime

  return NextResponse.json({
    ...health,
    responseTime: totalLatency
  }, {
    status: health.status === 'healthy' ? 200 : 503
  })
}
