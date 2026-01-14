import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

/**
 * Admin API: Rate Limit Status
 * GET /api/admin/rate-limits/status
 * 
 * Returns current status of all rate-limited endpoints
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Implement actual rate limit status fetching from Redis
    // For now, return mock data structure
    
    const limits = [
      {
        endpoint: '/api/render',
        limit: 100,
        remaining: 85,
        used: 15,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'ok' as const
      },
      {
        endpoint: '/api/pptx/upload',
        limit: 50,
        remaining: 35,
        used: 15,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'ok' as const
      },
      {
        endpoint: '/api/tts/generate',
        limit: 200,
        remaining: 50,
        used: 150,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'warning' as const
      },
      {
        endpoint: '/api/projects',
        limit: 1000,
        remaining: 920,
        used: 80,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'ok' as const
      },
    ]

    return NextResponse.json({ limits })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch rate limit status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
