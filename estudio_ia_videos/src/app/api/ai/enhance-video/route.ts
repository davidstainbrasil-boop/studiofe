import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@lib/auth/unified-session'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'
import { addVideoJob, cancelJob, getJobStatus } from '@lib/queue/video-processing.queue'
import { fileUploadService } from '@lib/services/file-upload.service'

type EnhancementType = 'upscale' | 'denoise' | 'interpolate' | 'color-grade'

function mapEnhancementType(type: string) {
  const normalized = (type || 'upscale').toLowerCase() as EnhancementType

  if (normalized === 'upscale') {
    return { jobType: 'video-upscale' as const, optionsFromForm: 'resolution' as const }
  }
  if (normalized === 'denoise') {
    return { jobType: 'video-denoise' as const, optionsFromForm: 'intensity' as const }
  }
  if (normalized === 'interpolate') {
    return { jobType: 'video-interpolate' as const, optionsFromForm: 'targetFps' as const }
  }
  if (normalized === 'color-grade') {
    return { jobType: 'video-color-grade' as const, optionsFromForm: 'preset' as const }
  }

  return null
}

/**
 * POST /api/ai/enhance-video
 * Real async enhancement pipeline:
 * 1) upload original video
 * 2) enqueue BullMQ job
 * 3) return jobId for status polling
 */
export async function POST(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const blocked = await applyRateLimit(request, 'ai-enhance', 5)
    if (blocked) return blocked

    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null
    const enhancementType = String(formData.get('type') || 'upscale')
    const mapped = mapEnhancementType(enhancementType)

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: 'No video file provided' },
        { status: 400 }
      )
    }

    if (!mapped) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid enhancement type',
          supportedTypes: ['upscale', 'denoise', 'interpolate', 'color-grade']
        },
        { status: 400 }
      )
    }

    const { url, key } = await fileUploadService.uploadVideo(videoFile)

    const options: Record<string, unknown> = {}
    if (mapped.optionsFromForm === 'resolution') {
      options.resolution = String(formData.get('resolution') || '1080p')
    } else if (mapped.optionsFromForm === 'intensity') {
      const intensity = Number(formData.get('intensity') || 50)
      options.intensity = Number.isFinite(intensity) ? Math.max(0, Math.min(100, intensity)) : 50
    } else if (mapped.optionsFromForm === 'targetFps') {
      const targetFps = Number(formData.get('targetFps') || 30)
      options.targetFps = Number.isFinite(targetFps) ? Math.max(1, Math.min(120, targetFps)) : 30
    } else if (mapped.optionsFromForm === 'preset') {
      options.preset = String(formData.get('preset') || 'cinematic')
    }

    const jobId = await addVideoJob({
      type: mapped.jobType,
      userId: session.user.id,
      videoUrl: url,
      videoKey: key,
      options
    })

    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      enhancementType,
      submittedAt: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Erro ao iniciar aprimoramento de vídeo', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/enhance-video'
    })

    const message = error instanceof Error ? error.message : String(error)
    const isInfrastructureError =
      message.includes('REDIS') ||
      message.includes('Redis') ||
      message.includes('AWS_') ||
      message.includes('R2_') ||
      message.includes('upload')

    return NextResponse.json(
      { success: false, error: message || 'Failed to start enhancement job' },
      { status: isInfrastructureError ? 503 : 500 }
    )
  }
}

/**
 * GET /api/ai/enhance-video?jobId=...
 * Query real queue job status.
 */
export async function GET(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const blocked = await applyRateLimit(request, 'ai-enhance-status', 60)
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({
        success: true,
        service: 'ai-enhance-video',
        supportedTypes: ['upscale', 'denoise', 'interpolate', 'color-grade'],
        statusEndpoint: '/api/ai/enhance-video?jobId={jobId}'
      })
    }

    const status = await getJobStatus(jobId)
    if (status.status === 'not-found') {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      ...status
    })
  } catch (error) {
    logger.error('Erro ao consultar status de aprimoramento', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/enhance-video'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to get enhancement status' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const cancelled = await cancelJob(jobId)
    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, jobId, cancelled: true })
  } catch (error) {
    logger.error('Erro ao cancelar job de aprimoramento', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/enhance-video'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to cancel enhancement job' },
      { status: 500 }
    )
  }
}

