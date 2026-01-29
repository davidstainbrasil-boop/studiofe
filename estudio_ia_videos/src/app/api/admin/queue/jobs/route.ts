/**
 * Queue Jobs API - Fase 4
 * Gerenciamento de jobs (cancel, retry, etc)
 */

import { NextRequest, NextResponse } from 'next/server'
import { videoQueueManager } from '@/lib/queue/video-queue-manager'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET - List jobs
// ============================================================================

const querySchema = z.object({
  status: z.enum(['waiting', 'active', 'completed', 'failed']).optional().default('active'),
  start: z.coerce.number().optional().default(0),
  end: z.coerce.number().optional().default(100)
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const validation = querySchema.safeParse({
      status: searchParams.get('status'),
      start: searchParams.get('start'),
      end: searchParams.get('end')
    })

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { status, start, end } = validation.data

    const jobs = await videoQueueManager.getJobs(status, start, end)
    const serializedJobs = await Promise.all(jobs.map(async (job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      state: await job.getState(),
      attempts: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason
    })))

    return NextResponse.json({
      success: true,
      data: {
        jobs: serializedJobs,
        count: serializedJobs.length,
        status
      }
    })
  } catch (error) {
    console.error('Error listing jobs:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// POST - Create job
// ============================================================================

const createJobSchema = z.object({
  type: z.enum(['avatar', 'timeline', 'export', 'pptx']),
  userId: z.string(),
  input: z.object({
    text: z.string().optional(),
    avatarConfig: z.any().optional(),
    timelineState: z.any().optional(),
    pptxFile: z.string().optional(),
    exportFormat: z.enum(['mp4', 'webm', 'mov']).optional()
  }),
  options: z.object({
    quality: z.enum(['draft', 'standard', 'high', 'ultra']),
    resolution: z.enum(['720p', '1080p', '4k']),
    fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
    codec: z.enum(['h264', 'h265', 'vp9']),
    bitrate: z.string().optional()
  }),
  priority: z.number().min(1).max(10).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = createJobSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid job data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const jobData = validation.data

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Add to queue
    const job = await videoQueueManager.addJob({
      jobId,
      ...jobData
    })

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: await job.getState(),
        message: 'Job created and queued successfully'
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// DELETE - Cancel job
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'jobId parameter required'
      }, { status: 400 })
    }

    const cancelled = await videoQueueManager.cancelJob(jobId)

    if (!cancelled) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling job:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// PUT - Retry job
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'jobId parameter required'
      }, { status: 400 })
    }

    const job = await videoQueueManager.retryJob(jobId)

    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: await job.getState(),
        message: 'Job retried successfully'
      }
    })
  } catch (error) {
    console.error('Error retrying job:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
