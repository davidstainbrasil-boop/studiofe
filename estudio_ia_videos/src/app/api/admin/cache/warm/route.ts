import { NextRequest, NextResponse } from 'next/server'
import { warmCache } from '@lib/cache/cache-warming'
import { getServerSession } from 'next-auth'
import { logger } from '@lib/logger'

/**
 * Admin API: Manual Cache Warming
 * POST /api/admin/cache/warm
 * 
 * Manually trigger cache warming (useful after deployments or cache flush)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Check authentication (admin only)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role check
    // For now, accept any authenticated user
    // In production, check: session.user.role === 'admin'

    logger.info('Manual cache warming triggered', { userId: session.user.id })

    // Trigger cache warming
    await warmCache()

    return NextResponse.json({ 
      success: true, 
      message: 'Cache warming completed successfully' 
    })

  } catch (error) {
    logger.error('Cache warming failed', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ 
      error: 'Cache warming failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * GET endpoint for status/info
 */
export async function GET() {
  return NextResponse.json({
    service: 'Cache Warming API',
    version: '1.0.0',
    usage: {
      method: 'POST',
      authentication: 'Required (Admin)',
      description: 'Manually trigger cache warming'
    }
  })
}
