/**
 * Queue Metrics API - Fase 4
 * Retorna métricas em tempo real da fila de rendering
 */

import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { videoQueueManager } from '@/lib/queue/video-queue-manager'
import { requireAdmin } from '@/lib/auth/admin-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { isAdmin, response: authResponse } = await requireAdmin(request)
  if (!isAdmin) return authResponse!

  try {
    // Get queue metrics
    const metrics = await videoQueueManager.getMetrics()

    // Get worker metrics
    const workers = await videoQueueManager.getWorkerMetrics()

    // Get recent jobs
    const recentCompleted = await videoQueueManager.getJobs('completed', 0, 10)
    const recentFailed = await videoQueueManager.getJobs('failed', 0, 10)
    const activeJobs = await videoQueueManager.getJobs('active', 0, 10)

    return NextResponse.json({
      success: true,
      data: {
        queue: metrics,
        workers,
        recentJobs: {
          completed: recentCompleted.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress,
            returnvalue: job.returnvalue,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn
          })),
          failed: recentFailed.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            failedReason: job.failedReason,
            stacktrace: job.stacktrace,
            finishedOn: job.finishedOn
          })),
          active: activeJobs.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress,
            processedOn: job.processedOn
          }))
        },
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Error fetching queue metrics:', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
