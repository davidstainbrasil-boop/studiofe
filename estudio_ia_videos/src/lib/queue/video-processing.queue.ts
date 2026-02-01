
/**
 * Job Queue Service
 * Handles background video processing jobs using BullMQ
 */

import { Queue, Worker, Job, type ConnectionOptions } from 'bullmq'
import { Redis } from 'ioredis'
import { videoEnhancementService } from '../services/video-enhancement.service'
import { subtitleService } from '../services/subtitle.service'
import { sceneDetectionService } from '../services/scene-detection.service'
import { VideoUtils } from '../utils/video.utils'
import { logger } from '../logger'

// Redis connection
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
})

// Cast para ConnectionOptions (ioredis versões são compatíveis em runtime)
const connection = redisClient as unknown as ConnectionOptions

// Job types
export type JobType = 
  | 'video-upscale'
  | 'video-denoise'
  | 'video-interpolate'
  | 'video-color-grade'
  | 'subtitle-generate'
  | 'scene-detect'
  | 'scene-export'

export interface JobData {
  type: JobType
  userId: string
  videoUrl: string
  videoKey: string
  options: Record<string, unknown>
}

export interface JobProgress {
  progress: number
  status: string
  currentStep?: string
}

// Create queue
export const videoProcessingQueue = new Queue<JobData>('video-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3600 // Keep completed jobs for 1 hour
    },
    removeOnFail: {
      age: 86400 // Keep failed jobs for 24 hours
    }
  }
})

// Job processor
const worker = new Worker<JobData, unknown, JobType>(
  'video-processing',
  async (job: Job<JobData>) => {
    const { type, videoUrl, videoKey, options, userId } = job.data

    // Update progress
    await job.updateProgress({ progress: 0, status: 'Starting...' } as JobProgress)

    try {
      // Download video from storage
      await job.updateProgress({ progress: 10, status: 'Downloading video...' } as JobProgress)
      
      let result: unknown

      switch (type) {
        case 'video-upscale':
          await job.updateProgress({ progress: 20, status: 'Upscaling video...' } as JobProgress)
          result = await processUpscale(videoUrl, options.resolution as string, job)
          break

        case 'video-denoise':
          await job.updateProgress({ progress: 20, status: 'Reducing noise...' } as JobProgress)
          result = await processDenoise(videoUrl, options.intensity as number, job)
          break

        case 'video-interpolate':
          await job.updateProgress({ progress: 20, status: 'Interpolating frames...' } as JobProgress)
          result = await processInterpolate(videoUrl, options.targetFps as number, job)
          break

        case 'video-color-grade':
          await job.updateProgress({ progress: 20, status: 'Applying color grading...' } as JobProgress)
          result = await processColorGrade(videoUrl, options.preset as string, job)
          break

        case 'subtitle-generate':
          await job.updateProgress({ progress: 20, status: 'Generating subtitles...' } as JobProgress)
          result = await processSubtitles(videoUrl, options.language as string, options.model as string, job)
          break

        case 'scene-detect':
          await job.updateProgress({ progress: 20, status: 'Detecting scenes...' } as JobProgress)
          result = await processSceneDetection(videoUrl, options.sensitivity as number, job)
          break

        case 'scene-export':
          await job.updateProgress({ progress: 20, status: 'Exporting scenes...' } as JobProgress)
          const selectedIdNumbers = (options.selectedIds as (string | number)[]).map(id => Number(id))
          result = await processSceneExport(videoUrl, options.scenes as VideoScene[], selectedIdNumbers, job)
          break

        default:
          throw new Error(`Unknown job type: ${type}`)
      }

      await job.updateProgress({ progress: 100, status: 'Completed!' } as JobProgress)
      return result

    } catch (error) {
      logger.error('Video processing job failed', error as Error)
      throw error
    }
  },
  { connection, concurrency: 2 }
)

// Job processors
async function processUpscale(videoUrl: string, resolution: string, job: Job) {
  const localPath = await VideoUtils.downloadVideo(videoUrl);
  try {
      const result = await videoEnhancementService.upscale(localPath, resolution);
      if (!result.success) throw new Error(result.error);
      return result;
  } finally {
      await VideoUtils.cleanupFile(localPath);
  }
}

async function processDenoise(videoUrl: string, intensity: number, job: Job) {
  const localPath = await VideoUtils.downloadVideo(videoUrl);
  try {
      const result = await videoEnhancementService.denoise(localPath, intensity);
      if (!result.success) throw new Error(result.error);
      return result;
  } finally {
      await VideoUtils.cleanupFile(localPath);
  }
}

async function processInterpolate(videoUrl: string, targetFps: number, job: Job) {
  const localPath = await VideoUtils.downloadVideo(videoUrl);
  try {
      const result = await videoEnhancementService.interpolate(localPath, targetFps);
      if (!result.success) throw new Error(result.error);
      return result;
  } finally {
      await VideoUtils.cleanupFile(localPath);
  }
}

async function processColorGrade(videoUrl: string, preset: string, job: Job) {
  const localPath = await VideoUtils.downloadVideo(videoUrl);
  try {
      const result = await videoEnhancementService.applyColorGrading(localPath, preset);
      if (!result.success) throw new Error(result.error);
      return result;
  } finally {
      await VideoUtils.cleanupFile(localPath);
  }
}

async function processSubtitles(videoUrl: string, language: string, model: string, job: Job) {
  const localPath = await VideoUtils.downloadVideo(videoUrl);
  try {
      const result = await subtitleService.generateSubtitles(localPath, language, model);
      if (!result.success) throw new Error(result.error);
      
      // Generate format strings
      const srt = subtitleService.exportAsSRT(result.subtitles || []);
      const vtt = subtitleService.exportAsVTT(result.subtitles || []);
      
      return { 
        subtitles: result.subtitles,
        formats: {
          srt,
          vtt
        },
        metadata: result.metadata
      }
  } finally {
      await VideoUtils.cleanupFile(localPath);
  }
}

async function processSceneDetection(videoUrl: string, sensitivity: number, job: Job) {
  const localPath = await VideoUtils.downloadVideo(videoUrl);
  try {
      const result = await sceneDetectionService.detectScenes(localPath, sensitivity);
      if (!result.success) throw new Error(result.error);
      return result;
  } finally {
      await VideoUtils.cleanupFile(localPath);
  }
}

/** Scene data for video export - compatible with scene-detection.service.ts Scene type */
interface VideoScene {
  id: number;
  startTime: number;
  endTime: number;
  thumbnail?: string;
  description: string;
  confidence: number;
}

async function processSceneExport(videoUrl: string, scenes: VideoScene[], selectedIds: number[], job: Job) {
  const localPath = await VideoUtils.downloadVideo(videoUrl);
  try {
      const results = await sceneDetectionService.exportScenes(localPath, scenes, selectedIds);
      return { exportedScenes: results.length, urls: results.map(r => r.url) };
  } finally {
      await VideoUtils.cleanupFile(localPath);
  }
}

// Worker event handlers
worker.on('completed', (job) => {
  logger.info('Video processing job completed', { jobId: job.id })
})

worker.on('failed', (job, err) => {
  logger.error('Video processing job failed', err, { jobId: job?.id })
})

worker.on('progress', (job, progress) => {
  logger.info('Video processing job progress', { jobId: job.id, progress })
})

// Queue helpers
export async function addVideoJob(data: JobData): Promise<string> {
  const job = await videoProcessingQueue.add(data.type, data)
  return job.id!
}

export async function getJobStatus(jobId: string) {
  const job = await videoProcessingQueue.getJob(jobId)
  
  if (!job) {
    return { status: 'not-found' }
  }

  const state = await job.getState()
  const progress = job.progress as JobProgress | number

  return {
    id: jobId,
    status: state,
    progress: typeof progress === 'number' ? progress : progress.progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason
  }
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await videoProcessingQueue.getJob(jobId)
  if (job) {
    await job.remove()
    return true
  }
  return false
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close()
  await redisClient.quit()
})
