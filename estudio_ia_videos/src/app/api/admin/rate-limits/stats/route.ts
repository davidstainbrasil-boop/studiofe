import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@lib/db'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * Admin API: Rate Limit Statistics
 * GET /api/admin/rate-limits/stats
 * 
 * Returns aggregated statistics about rate limit usage from analytics_events
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'admin-rate-limits-stats-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Get total requests from analytics_events
    const totalRequests = await prisma.analytics_events.count({
      where: {
        createdAt: { gte: last24h }
      }
    })

    // Get blocked requests (events with rate_limited action or error status)
    const blockedRequests = await prisma.analytics_events.count({
      where: {
        createdAt: { gte: last24h },
        OR: [
          { eventData: { path: ['action'], equals: 'rate_limited' } },
          { eventData: { path: ['status'], equals: 'rate_limited' } }
        ]
      }
    })

    // Get top endpoints from analytics
    const topEndpointsRaw = await prisma.$queryRaw<Array<{ endpoint: string; count: bigint }>>`
      SELECT 
        COALESCE(event_data->>'endpoint', event_data->'metadata'->>'endpoint', 'unknown') as endpoint,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ${last24h}
      GROUP BY COALESCE(event_data->>'endpoint', event_data->'metadata'->>'endpoint', 'unknown')
      ORDER BY count DESC
      LIMIT 10
    `

    const topEndpoints = topEndpointsRaw.map(row => ({
      endpoint: row.endpoint || '/api/unknown',
      requests: Number(row.count)
    }))

    // Get recent rate limit blocks
    const recentBlocksRaw = await prisma.analytics_events.findMany({
      where: {
        createdAt: { gte: last24h },
        OR: [
          { eventData: { path: ['action'], equals: 'rate_limited' } },
          { eventData: { path: ['status'], equals: 'rate_limited' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        userId: true,
        createdAt: true,
        eventData: true
      }
    })

    const recentBlocks = recentBlocksRaw.map(event => {
      const data = event.eventData as Record<string, unknown> | null
      return {
        endpoint: (data?.endpoint as string) || (data?.metadata as Record<string, unknown>)?.endpoint as string || '/api/unknown',
        userId: event.userId || 'anonymous',
        timestamp: event.createdAt?.toISOString() || new Date().toISOString()
      }
    })

    const stats = {
      totalRequests,
      blockedRequests,
      topEndpoints,
      recentBlocks
    }

    return NextResponse.json({ stats })

  } catch (error) {
    logger.error('Failed to fetch rate limit stats', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ 
      error: 'Failed to fetch rate limit stats',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
