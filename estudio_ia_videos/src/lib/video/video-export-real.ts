import { randomUUID } from 'crypto'
import type { Prisma, render_jobs as RenderJobRecord, PriorityLevel } from '@prisma/client'

import { logger } from '@lib/logger'
import { prisma } from '@lib/prisma'

export type VideoExportFormat = 'mp4' | 'webm' | 'mov'
export type VideoExportQuality = 'sd' | 'hd' | 'fhd' | '4k'
export type VideoExportCodec = 'h264' | 'h265' | 'vp9' | 'av1'
export type VideoExportPreset =
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
  | 'slower'
  | 'veryslow'
  | 'good'
  | 'best'

export type VideoExportOptions = {
  format: VideoExportFormat
  quality: VideoExportQuality
  fps: 24 | 30 | 60
  codec: VideoExportCodec
  includeAudio: boolean
  bitrate?: string
  preset?: VideoExportPreset
}

export type ExportPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface ExportContext {
  userId?: string
  requestId?: string
  priority?: ExportPriority
  trigger?: 'manual' | 'automation' | 'retry'
}

export type VideoExportStatus = 'queued' | 'processing' | 'completed' | 'error' | 'cancelled'

export interface VideoExportJob {
  id: string
  projectId: string | null
  status: VideoExportStatus
  progress: number
  outputUrl: string | null
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
  metadata: Record<string, unknown>
}

export interface ExportProjectVideoResult {
  success: boolean
  jobId?: string
  error?: string
  queuedAt?: Date
  estimatedCompletionMinutes?: number
  queuePriority?: number
}

const QUALITY_TO_RESOLUTION: Record<VideoExportQuality, string> = {
  sd: '1280x720',
  hd: '1920x1080',
  fhd: '1920x1080',
  '4k': '3840x2160'
}

const PRIORITY_SCORE: Record<ExportPriority, number> = {
  low: 3,
  normal: 5,
  high: 8,
  urgent: 10
}

const QUALITY_FACTOR: Record<VideoExportQuality, number> = {
  sd: 0.8,
  hd: 1,
  fhd: 1.2,
  '4k': 1.6
}

const CODEC_FACTOR: Record<VideoExportCodec, number> = {
  h264: 1,
  h265: 1.1,
  vp9: 1.25,
  av1: 1.4
}

const TERMINAL_STATUSES = new Set<VideoExportStatus>(['completed', 'error', 'cancelled'])

export async function exportProjectVideo(
  projectId: string,
  options: VideoExportOptions,
  context?: ExportContext
): Promise<ExportProjectVideoResult> {
  try {
    // 1. Buscar projeto
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true, status: true, slides: { select: { duration: true } } }
    })

    if (!project) {
      logger.warn('video-export: project not found', { projectId })
      return { success: false, error: 'Projeto não encontrado' }
    }

    // Calcular duração total (já que não tem no modelo projects)
    const totalDuration = project.slides.reduce((acc, slide) => acc + (slide.duration || 5), 0)
    const totalSlides = project.slides.length

    const now = new Date()
    const jobId = randomUUID()
    const queuePriority = resolvePriority(context?.priority, project.status)
    const resolution = QUALITY_TO_RESOLUTION[options.quality] ?? QUALITY_TO_RESOLUTION.hd
    const serializableOptions = serializeOptions(options)

    // Estrutura de settings para render_jobs
    const renderSettings: Prisma.JsonObject = {
        ...serializableOptions,
        resolution,
        trigger: context?.trigger ?? 'manual',
    }

    // Mapeamento de prioridade manual
    let dbPriority: PriorityLevel = 'medium';
    if (context?.priority === 'low') dbPriority = 'low';
    if (context?.priority === 'high') dbPriority = 'high';
    if (context?.priority === 'urgent') dbPriority = 'urgent';
    // 'normal' maps to 'medium'

    // 2. Criar Job na tabela render_jobs
    await prisma.render_jobs.create({
        data: {
            id: jobId,
            projectId,
            userId: context?.userId ?? project.userId,
            status: 'queued', 
            progress: 0,
            renderSettings,
            settings: renderSettings,
            priority: dbPriority,
            createdAt: now,
            updatedAt: now,
            estimatedDuration: estimateExportDurationMinutes(totalSlides, totalDuration, options) * 60
        }
    })

    const estimatedCompletionMinutes = estimateExportDurationMinutes(
      totalSlides,
      totalDuration,
      options
    )

    logger.info('video-export: job enqueued', { jobId, projectId, queuePriority })

    return {
      success: true,
      jobId,
      queuedAt: now,
      estimatedCompletionMinutes,
      queuePriority
    }
  } catch (error) {
    logger.error('video-export: failed to enqueue job', error instanceof Error ? error : new Error(String(error)), {
      projectId
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao iniciar exportação'
    }
  }
}

export async function getExportJobStatus(
  jobId: string
): Promise<{ job?: VideoExportJob; error?: string }> {
  try {
    const jobRecord = await prisma.render_jobs.findUnique({ where: { id: jobId } })

    if (!jobRecord) {
      return { error: 'Job não encontrado' }
    }

    const job = mapRecordToJob(jobRecord)
    return { job }
  } catch (error) {
    logger.error('video-export: failed to load status', error instanceof Error ? error : new Error(String(error)), {
      jobId
    })
    return { error: 'Erro ao consultar job' }
  }
}

function resolvePriority(priority: ExportPriority | undefined, projectStatus?: string | null): number {
  if (priority) return PRIORITY_SCORE[priority]
  if (projectStatus && projectStatus.toUpperCase() === 'APPROVED') {
    return PRIORITY_SCORE.high
  }
  return PRIORITY_SCORE.normal
}

function serializeOptions(options: VideoExportOptions): Prisma.JsonObject {
  const payload: Prisma.JsonObject = {
    format: options.format,
    quality: options.quality,
    fps: options.fps,
    codec: options.codec,
    includeAudio: options.includeAudio
  }

  if (options.bitrate) {
    payload.bitrate = options.bitrate
  }

  if (options.preset) {
    payload.preset = options.preset
  }

  return payload
}

function estimateExportDurationMinutes(
  totalSlides: number,
  projectDurationSeconds: number,
  options: VideoExportOptions
): number {
  const baseSeconds = projectDurationSeconds > 0 ? projectDurationSeconds : Math.max(totalSlides * 8, 60)
  const fpsFactor = options.fps === 60 ? 1.2 : options.fps === 24 ? 0.9 : 1
  const audioFactor = options.includeAudio ? 1.05 : 0.9
  const estimated = baseSeconds * QUALITY_FACTOR[options.quality] * CODEC_FACTOR[options.codec] * fpsFactor * audioFactor
  return Math.max(2, Math.round(estimated / 60))
}

function mapRecordToJob(record: RenderJobRecord): VideoExportJob {
  const settings = asJsonObject(record.renderSettings || record.settings)
  
  return {
    id: record.id,
    projectId: record.projectId,
    status: normalizeStatus(record.status || 'pending'),
    progress: record.progress ?? 0,
    outputUrl: record.outputUrl,
    error: record.errorMessage,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    metadata: {
        settings,
        durationMs: record.durationMs,
        attempts: record.attempts,
        priority: record.priority
    }
  }
}

function normalizeStatus(status: string): VideoExportStatus {
  const normalized = status.toLowerCase()

  if (['pending', 'queued', 'waiting'].includes(normalized)) return 'queued'
  if (['processing', 'running', 'rendering'].includes(normalized)) return 'processing'
  if (['completed', 'done', 'finished', 'success'].includes(normalized)) return 'completed'
  if (['failed', 'error'].includes(normalized)) return 'error'
  if (['cancelled', 'canceled', 'aborted'].includes(normalized)) return 'cancelled'
  return 'processing'
}

function asJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject | null {
  if (!value) return null
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Prisma.JsonObject
  }
  return null
}
