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
import type { JobStatus } from '@prisma/client'

// Validation schemas
const RenderJobCreateSchema = z.object({
  project_id: z.string().min(1),
  type: z.string().optional().default('video'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  composition_id: z.string().optional().default('Main'),
  input_data: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  estimated_duration: z.number().optional(),
  webhook_url: z.string().url().optional()
})

const RenderJobQuerySchema = z.object({
  status: z.string().optional(),
  project_id: z.string().optional(),
  limit: z.string().transform(val => parseInt(val) || 50).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = RenderJobQuerySchema.parse(Object.fromEntries(searchParams))

    // Build where clause
    const whereClause: {
      project_id?: string
      status?: { in: JobStatus[] }
    } = {}
    
    if (query.project_id) {
      whereClause.project_id = query.project_id
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
          project_id: true,
          status: true,
          progress: true,
          created_at: true,
          completed_at: true,
          output_url: true,
          error_message: true,
          render_settings: true,
        },
        orderBy: { created_at: 'desc' },
        skip: query.offset || 0,
        take: query.limit || 50,
      }),
      prisma.render_jobs.count({ where: whereClause })
    ])

    // Map to frontend-friendly format
    const jobs = renderJobs.map(job => ({
      id: job.id,
      project_id: job.project_id,
      status: job.status,
      progress: job.progress,
      created_at: job.created_at,
      completedAt: job.completed_at,
      outputUrl: job.output_url,
      error: job.error_message,
      config: job.render_settings,
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
      { success: false, error: 'Failed to retrieve render jobs', jobs: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
      where: { id: jobData.project_id },
      select: { id: true, user_id: true }
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check for active renders
    const activeRender = await prisma.render_jobs.findFirst({
      where: {
        project_id: jobData.project_id,
        status: { in: ['queued', 'processing'] }
      }
    })

    if (activeRender) {
      return NextResponse.json(
        { success: false, error: 'An active render job already exists for this project' },
        { status: 409 }
      )
    }

    // Create render job data
    const renderJobData = {
      type: jobData.type,
      priority: jobData.priority,
      input_data: jobData.input_data,
      metadata: jobData.metadata,
      estimated_duration: jobData.estimated_duration
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
    const effectiveUserId = project.user_id || userId

    // Insert job using Prisma
    const createdJob = await prisma.render_jobs.create({
      data: {
        id: jobId,
        project_id: jobData.project_id,
        user_id: effectiveUserId,
        status: 'queued',
        progress: 0,
        render_settings: renderJobData as object
      }
    })

    // Add to Queue
    try {
      await addVideoJob({
        jobId: createdJob.id,
        project_id: jobData.project_id,
        user_id: effectiveUserId,
        settings: queueSettings,
        webhookUrl: jobData.webhook_url
      })
    } catch (queueError) {
      logger.error('Failed to add job to queue', queueError instanceof Error ? queueError : new Error(String(queueError)), { component: 'API: render/jobs' })
      await prisma.render_jobs.update({
        where: { id: createdJob.id },
        data: { status: 'failed', error_message: 'Failed to queue job' }
      })
      throw new Error('Failed to queue render job')
    }

    // Log analytics event
    try {
      await prisma.analytics_events.create({
        data: {
          id: randomUUID(),
          user_id: effectiveUserId,
          event_type: 'render_started',
          event_data: {
            project_id: jobData.project_id,
            job_id: createdJob.id,
            type: jobData.type,
            settings: renderJobData
          }
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
