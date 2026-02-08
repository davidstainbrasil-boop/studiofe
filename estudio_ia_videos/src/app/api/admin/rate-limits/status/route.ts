import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@lib/auth/unified-session'
import { prisma } from '@lib/db'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

// Rate limit configurations (should match actual middleware config)
const RATE_LIMIT_CONFIG = {
  '/api/render': { limit: 100, windowMs: 3600000 },
  '/api/pptx/upload': { limit: 50, windowMs: 3600000 },
  '/api/tts/generate': { limit: 200, windowMs: 3600000 },
  '/api/projects': { limit: 1000, windowMs: 3600000 },
  '/api/storage/upload': { limit: 100, windowMs: 3600000 },
  '/api/v1/video-jobs': { limit: 500, windowMs: 3600000 },
}

/**
 * Admin API: Rate Limit Status
 * GET /api/admin/rate-limits/status
 * 
 * Returns current status of all rate-limited endpoints based on real usage
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'admin-rate-limits-status-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const windowStart = new Date(now.getTime() - 3600000) // 1 hour window

    // Get request counts per endpoint from analytics
    const endpointCounts = await prisma.$queryRaw<Array<{ endpoint: string; count: bigint }>>`
      SELECT 
        COALESCE(event_data->>'endpoint', event_data->'metadata'->>'endpoint', 'unknown') as endpoint,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ${windowStart}
      GROUP BY COALESCE(event_data->>'endpoint', event_data->'metadata'->>'endpoint', 'unknown')
    `

    const countMap = new Map<string, number>()
    endpointCounts.forEach(row => {
      if (row.endpoint) {
        countMap.set(row.endpoint, Number(row.count))
      }
    })

    // Build status for each configured endpoint
    const limits = Object.entries(RATE_LIMIT_CONFIG).map(([endpoint, config]) => {
      // Find matching count (try exact match or partial match)
      let used = 0
      for (const [key, value] of countMap.entries()) {
        if (key.includes(endpoint) || endpoint.includes(key)) {
          used += value
        }
      }

      const remaining = Math.max(0, config.limit - used)
      const usageRatio = used / config.limit

      let status: 'ok' | 'warning' | 'critical'
      if (usageRatio >= 0.9) {
        status = 'critical'
      } else if (usageRatio >= 0.7) {
        status = 'warning'
      } else {
        status = 'ok'
      }

      return {
        endpoint,
        limit: config.limit,
        remaining,
        used,
        resetAt: new Date(now.getTime() + config.windowMs).toISOString(),
        status
      }
    })

    return NextResponse.json({ limits })

  } catch (error) {
    logger.error('Failed to fetch rate limit status', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ 
      error: 'Failed to fetch rate limit status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
