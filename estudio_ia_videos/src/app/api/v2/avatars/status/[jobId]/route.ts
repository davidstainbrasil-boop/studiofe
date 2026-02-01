/**
 * API v2: Avatar Job Status
 * Get status of avatar rendering jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { AvatarRenderOrchestrator } from '@/lib/avatar/avatar-render-orchestrator'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Authenticate user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = params

    logger.info('[API: v2/avatars/status] Getting job status', {
      userId: user.id,
      jobId
    })

    // 2. Get job from database
    const { data: job, error: jobError } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found', jobId },
        { status: 404 }
      )
    }

    // 3. Check job ownership via project
    const { data: projectOwner } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', job.projectId)
      .single() as { data: { user_id: string } | null; error: unknown }

    if (!projectOwner || projectOwner.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not own this job' },
        { status: 403 }
      )
    }

    // 4. Get detailed status from orchestrator
    const orchestrator = new AvatarRenderOrchestrator()

    let detailedStatus
    try {
      detailedStatus = await orchestrator.getJobStatus(jobId)
    } catch (error) {
      // If orchestrator can't find it, use DB status
      logger.warn('[API: v2/avatars/status] Orchestrator status unavailable, using DB', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      })

      detailedStatus = {
        jobId,
        status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
        progress: job.progress,
        videoUrl: job.output_url,
        error: job.error_message
      }
    }

    // 5. Calculate duration
    const startTime = new Date(job.createdAt).getTime()
    const endTime = job.completed_at ? new Date(job.completed_at).getTime() : Date.now()
    const duration = endTime - startTime

    // 6. Parse render settings
    const renderSettings = typeof job.render_settings === 'string'
      ? JSON.parse(job.render_settings)
      : job.render_settings

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: detailedStatus.status,
        progress: detailedStatus.progress || job.progress || 0,
        createdAt: job.createdAt,
        completedAt: job.completed_at,
        duration,
        output: {
          videoUrl: detailedStatus.videoUrl || job.output_url,
          thumbnailUrl: null // Not available in current schema
        },
        error: detailedStatus.error || job.error_message,
        metadata: {
          provider: renderSettings?.provider,
          quality: renderSettings?.options?.quality,
          resolution: renderSettings?.options?.resolution,
          estimatedTimeRemaining: detailedStatus.estimatedTimeRemaining
        }
      }
    })

  } catch (error) {
    logger.error('[API: v2/avatars/status] Status check failed', 
      error instanceof Error ? error : new Error(String(error))
    )

    return NextResponse.json(
      {
        error: 'Failed to get job status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE: Cancel job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Authenticate user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = params

    logger.info('[API: v2/avatars/status] Cancelling job', {
      userId: user.id,
      jobId
    })

    // 2. Get job from database
    const { data: job, error: jobError } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found', jobId },
        { status: 404 }
      )
    }

    // 3. Check job ownership via project
    const { data: projectData } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', job.projectId)
      .single() as { data: { user_id: string } | null; error: unknown }

    if (!projectData || projectData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not own this job' },
        { status: 403 }
      )
    }

    // 4. Check if job can be cancelled
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json(
        {
          error: 'Cannot cancel job',
          message: `Job is already ${job.status}`,
          status: job.status
        },
        { status: 400 }
      )
    }

    // 5. Cancel via orchestrator
    const orchestrator = new AvatarRenderOrchestrator()

    try {
      await orchestrator.cancelJob(jobId)
    } catch (error) {
      logger.warn('[API: v2/avatars/status] Orchestrator cancel failed, updating DB directly', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 6. Update database
    const { error: updateError } = await supabase
      .from('render_jobs')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      throw updateError
    }

    // 7. Log cancellation (credits system not yet implemented)
    const renderSettings = typeof job.render_settings === 'string'
      ? JSON.parse(job.render_settings as string)
      : job.render_settings

    const creditsUsed = renderSettings?.creditsUsed || 0

    logger.info('[API: v2/avatars/status] Job cancelled', {
      userId: user.id,
      jobId,
      creditsUsed // Future: implement credit refund
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Job cancelled successfully',
        jobId,
        creditsRefunded: 0, // Credits system not yet implemented
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('[API: v2/avatars/status] Cancel failed', 
      error instanceof Error ? error : new Error(String(error))
    )

    return NextResponse.json(
      {
        error: 'Failed to cancel job',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
