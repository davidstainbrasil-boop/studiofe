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

    // 3. Check job ownership
    if (job.userId !== user.id) {
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
        videoUrl: job.output_video_url,
        error: job.errorMessage
      }
    }

    // 5. Calculate duration
    const startTime = new Date(job.createdAt).getTime()
    const endTime = job.completedAt ? new Date(job.completedAt).getTime() : Date.now()
    const duration = endTime - startTime

    // 6. Parse render settings
    const renderSettings = typeof job.renderSettings === 'string'
      ? JSON.parse(job.renderSettings)
      : job.renderSettings

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: detailedStatus.status,
        progress: detailedStatus.progress || job.progress || 0,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        duration,
        output: {
          videoUrl: detailedStatus.videoUrl || job.output_video_url,
          thumbnailUrl: job.output_thumbnail_url
        },
        error: detailedStatus.error || job.errorMessage,
        metadata: {
          provider: renderSettings?.provider,
          quality: renderSettings?.options?.quality,
          resolution: renderSettings?.options?.resolution,
          estimatedTimeRemaining: detailedStatus.estimatedTimeRemaining,
          lipSyncAccuracy: job.lipsyncAccuracy,
          audio2FaceEnabled: job.audio2face_enabled
        }
      }
    })

  } catch (error) {
    logger.error('[API: v2/avatars/status] Status check failed', {
      error: error instanceof Error ? error.message : String(error)
    })

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

    // 3. Check job ownership
    if (job.userId !== user.id) {
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
        errorMessage: 'Cancelled by user',
        completedAt: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      throw updateError
    }

    // 7. Refund credits if applicable
    const renderSettings = typeof job.renderSettings === 'string'
      ? JSON.parse(job.renderSettings)
      : job.renderSettings

    const creditsUsed = renderSettings?.creditsUsed || 0

    if (creditsUsed > 0) {
      // Get current credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_available, credits_used')
        .eq('id', user.id)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            credits_available: (profile.credits_available || 0) + creditsUsed,
            credits_used: Math.max(0, (profile.credits_used || 0) - creditsUsed)
          })
          .eq('id', user.id)

        logger.info('[API: v2/avatars/status] Credits refunded', {
          userId: user.id,
          jobId,
          creditsRefunded: creditsUsed
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Job cancelled successfully',
        jobId,
        creditsRefunded: creditsUsed,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('[API: v2/avatars/status] Cancel failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      {
        error: 'Failed to cancel job',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
