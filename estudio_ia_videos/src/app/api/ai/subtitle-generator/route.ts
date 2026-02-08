import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@lib/auth/unified-session'
import { subtitleService } from '@lib/services/subtitle.service'
import { fileUploadService } from '@lib/services/file-upload.service'
import { addVideoJob, getJobStatus } from '@lib/queue/video-processing.queue'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/subtitle-generator
 * Generate subtitles from video using Whisper AI
 */
export async function POST(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const blocked = await applyRateLimit(request, 'ai-subtitle', 10);
    if (blocked) return blocked;

    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const language = formData.get('language') as string || 'auto'
    const model = formData.get('model') as string || 'whisper-1'
    const useQueue = formData.get('useQueue') === 'true'

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: 'No video file provided' },
        { status: 400 }
      )
    }

    // For large files, use job queue for background processing
    if (useQueue || videoFile.size > 25 * 1024 * 1024) {
      // Upload video first
      const { url, key } = await fileUploadService.uploadVideo(videoFile)

      // Add to job queue
      const jobId = await addVideoJob({
        type: 'subtitle-generate',
        userId: 'default-user', // TODO: Get from auth
        videoUrl: url,
        videoKey: key,
        options: { language, model }
      })

      return NextResponse.json({
        success: true,
        jobId,
        status: 'queued',
        message: 'Subtitle generation started in background'
      })
    }

    // For small files, process immediately
    const result = await subtitleService.generateSubtitles(
      videoFile,
      language,
      model
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // Upload subtitle files if needed
    const srtContent = subtitleService.exportAsSRT(result.subtitles!)
    const vttContent = subtitleService.exportAsVTT(result.subtitles!)
    
    const [srtUpload, vttUpload] = await Promise.all([
      fileUploadService.uploadSubtitle(srtContent, 'srt'),
      fileUploadService.uploadSubtitle(vttContent, 'vtt')
    ])

    return NextResponse.json({
      success: true,
      subtitles: result.subtitles,
      metadata: result.metadata,
      downloads: {
        srt: srtUpload.url,
        vtt: vttUpload.url
      }
    })
  } catch (error) {
    logger.error('Erro ao gerar legendas', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/subtitle-generator'
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate subtitles' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/subtitle-generator
 * Get status of subtitle generation job
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID required' },
        { status: 400 }
      )
    }

    const status = await getJobStatus(jobId)

    return NextResponse.json({
      success: true,
      ...status
    })
  } catch (error) {
    logger.error('Error getting job status', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/subtitle-generator'
    });
    return NextResponse.json(
      { success: false, error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

// Note: Audio extraction & Whisper API calls are handled by
// subtitleService (see @lib/services/subtitle.service) and
// TranscriptionService (see @lib/services/transcription-service.ts).
