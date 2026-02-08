/**
 * Export Queue Status API
 * GET /api/v1/export/queue/status - Status geral da fila
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExportQueue } from '@lib/export/export-queue'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-export-queue-status-get', 20);
    if (rateLimitBlocked) return rateLimitBlocked;

    const queue = getExportQueue()
    const queueStatus = queue.getQueueStatus()
    const statistics = queue.getStatistics()

    return NextResponse.json({
      success: true,
      queue: queueStatus,
      statistics: {
        totalJobs: statistics.totalJobs,
        queueSize: statistics.queueSize,
        processing: statistics.processing,
        averageDuration: Math.round(statistics.averageDuration),
        maxConcurrent: statistics.maxConcurrent,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error fetching queue status', error instanceof Error ? error : new Error(String(error))
, { component: 'API: v1/export/queue/status' })
    return NextResponse.json(
      { error: 'Failed to fetch queue status', details: String(error) },
      { status: 500 }
    )
  }
}

