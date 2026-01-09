import { NextRequest, NextResponse } from 'next/server'
import { subtitleService } from '@lib/services/subtitle.service'
import { fileUploadService } from '@lib/services/file-upload.service'
import { addVideoJob, getJobStatus } from '@lib/queue/video-processing.queue'

/**
 * POST /api/ai/subtitle-generator
 * Generate subtitles from video using Whisper AI
 */
export async function POST(request: NextRequest) {
  try {
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
    console.error('Error generating subtitles:', error)
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
    console.error('Error getting job status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to extract audio from video
 * TODO: Implement using FFmpeg or similar
 */
async function extractAudio(videoFile: File): Promise<Buffer> {
  // Implementation needed
  throw new Error('Not implemented')
}

/**
 * Helper function to call Whisper API
 * TODO:Integrate with OpenAI Whisper API
 */
async function callWhisperAPI(
  audioBuffer: Buffer,
  language: string,
  model: string
): Promise<any> {
  // Implementation needed  
  // Example:
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // const transcription = await openai.audio.transcriptions.create({
  //   file: audioBuffer,
  //   model,
  //   language: language === 'auto' ? undefined : language,
  //   response_format: 'verbose_json',
  //   timestamp_granularities: ['word', 'segment']
  // })
  // return transcription
  
  throw new Error('Not implemented')
}

/**
 * Helper function to parse transcription into subtitles
 */
function parseTranscription(transcription: any): Array<{
  id: number
  startTime: number
  endTime: number
  text: string
}> {
  //Implementation needed
  // Parse the transcription response and create subtitle objects
  // with proper timestamps and text
  
  throw new Error('Not implemented')
}
