/**
 * 🎬 Render Jobs API
 * Manages individual render job operations
 * 
 * UPDATED: Now uses Prisma for database access (local PostgreSQL)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@lib/prisma'
import { z } from 'zod'
import { addVideoJob } from '@lib/queue/render-queue'
import { randomUUID } from 'crypto'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'
import type { JobStatus } from '@prisma/client'
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

// Validation schemas
const RenderJobCreateSchema = z.object({
  projectId: z.string().min(1),
  type: z.string().optional().default('video'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  composition_id: z.string().optional().default('Main'),
  input_data: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  estimatedDuration: z.number().optional(),
  webhook_url: z.string().url().optional()
})

const RenderJobQuerySchema = z.object({
  status: z.string().optional(),
  projectId: z.string().optional(),
  limit: z.string().transform(val => parseInt(val) || 50).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional()
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = RenderJobQuerySchema.parse(Object.fromEntries(searchParams))

    // Build where clause
    const whereClause: {
      projectId?: string
      status?: { in: JobStatus[] }
    } = {}
    
    if (query.projectId) {
      whereClause.projectId = query.projectId
    }

    if (query.status) {
      const statuses = query.status.split(',') as JobStatus[]
      whereClause.status = { in: statuses }
    }

    // Get jobs using Prisma
    const [renderJobs, total] = await Promise.all([
      prisma.render_jobs.findMany({
        where: whereClause,
        select: {
          id: true,
          projectId: true,
          status: true,
          progress: true,
          createdAt: true,
          completedAt: true,
          outputUrl: true,
          errorMessage: true,
          renderSettings: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: query.offset || 0,
        take: query.limit || 50,
      }),
      prisma.render_jobs.count({ where: whereClause })
    ])

    // Map to frontend-friendly format
    const jobs = renderJobs.map(job => ({
      id: job.id,
      projectId: job.projectId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      outputUrl: job.outputUrl,
      error: job.errorMessage,
      config: job.renderSettings,
    }))

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        total,
        limit: query.limit || 50,
        offset: query.offset || 0
      },
      message: 'Render jobs retrieved successfully'
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Get render jobs API error', err, { component: 'API: render/jobs' })
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve render jobs', code: 'FETCH_JOBS_FAILED', jobs: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const blocked = await applyRateLimit(request, 'render-jobs', 20);
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    // For local dev, use a demo user or require proper auth header
    const authHeader = request.headers.get('authorization')
    let userId = 'demo-user-id' // Default for development
    
    if (authHeader) {
      // Extract user from JWT if provided (simplified for local)
      // In production, this would validate the token
      const token = authHeader.replace('Bearer ', '')
      if (token) {
        // For now, use the token as user_id for local development
        userId = token.length > 36 ? 'auth-user' : token
      }
    }

    const body = await request.json()
    const jobData = RenderJobCreateSchema.parse(body)

    // Verify project exists using Prisma
    const project = await prisma.projects.findUnique({
      where: { id: jobData.projectId },
      select: { id: true, userId: true }
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check for active renders
    const activeRender = await prisma.render_jobs.findFirst({
      where: {
        projectId: jobData.projectId,
        status: { in: ['queued', 'processing'] as JobStatus[] }
      }
    })

    if (activeRender) {
      return NextResponse.json(
        { success: false, error: 'An active render job already exists for this project', code: 'ACTIVE_RENDER_EXISTS' },
        { status: 409 }
      )
    }

    // Create render job data
    const renderJobData = {
      type: jobData.type,
      priority: jobData.priority,
      input_data: jobData.input_data,
      metadata: jobData.metadata,
      estimatedDuration: jobData.estimatedDuration
    }

    // Settings for queue
    const queueSettings = {
      resolution: '1080p' as const,
      fps: 30,
      quality: 'high' as const,
      format: 'mp4' as const,
      includeAudio: true,
      includeSubtitles: false
    }

    const jobId = randomUUID()
    const effectiveUserId = project.userId || userId

    // Insert job using Prisma
    const createdJob = await prisma.render_jobs.create({
      data: {
        id: jobId,
        projectId: jobData.projectId,
        userId: effectiveUserId,
        status: 'queued' as JobStatus,
        progress: 0,
        renderSettings: renderJobData as object
      }
    })

    // Add to Queue
    try {
      await addVideoJob({
        jobId: createdJob.id,
        projectId: jobData.projectId,
        userId: effectiveUserId,
        settings: queueSettings,
        webhookUrl: jobData.webhook_url
      })
    } catch (queueError) {
      logger.error('Failed to add job to queue', queueError instanceof Error ? queueError : new Error(String(queueError)), { component: 'API: render/jobs' })
      await prisma.render_jobs.update({
        where: { id: createdJob.id },
        data: { status: 'failed', errorMessage: 'Failed to queue job' }
      })
      throw new Error('Failed to queue render job')
    }

    // Log analytics event
    try {
      await prisma.analytics_events.create({
        data: {
          id: randomUUID(),
          userId: effectiveUserId,
          eventType: 'render_started',
          eventData: {
            projectId: jobData.projectId,
            job_id: createdJob.id,
            type: jobData.type,
            settings: renderJobData
          } as Record<string, unknown>
        }
      })
    } catch (historyError) {
      logger.warn('Failed to log analytics event', { component: 'API: render/jobs' })
    }

    return NextResponse.json({
      success: true,
      data: createdJob,
      message: 'Render job created and queued successfully'
    }, { status: 201 })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Create render job API error', err, { component: 'API: render/jobs' })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid job data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create render job' },
      { status: 500 }
    )
  }
}
