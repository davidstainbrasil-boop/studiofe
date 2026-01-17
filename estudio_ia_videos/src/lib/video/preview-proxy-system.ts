/**
 * Preview Proxy System
 * Sistema de preview de baixa resolução para edição fluida
 * Gera versões proxy dos vídeos para playback em tempo real
 */

import { FFmpegService } from './ffmpeg-service'

// ============================================================================
// TYPES
// ============================================================================

export type ProxyQuality = 'ultralow' | 'low' | 'medium'

export interface ProxyConfig {
  quality: ProxyQuality
  width: number
  height: number
  fps: number
  bitrate: string
  codec: string
  format: string
}

export interface ProxyJob {
  id: string
  sourceUrl: string
  proxyUrl?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  createdAt: Date
  completedAt?: Date
  config: ProxyConfig
}

// ============================================================================
// PROXY CONFIGURATIONS
// ============================================================================

export const PROXY_CONFIGS: Record<ProxyQuality, ProxyConfig> = {
  ultralow: {
    quality: 'ultralow',
    width: 480,
    height: 270,
    fps: 15,
    bitrate: '500k',
    codec: 'libx264',
    format: 'mp4'
  },
  low: {
    quality: 'low',
    width: 640,
    height: 360,
    fps: 24,
    bitrate: '1M',
    codec: 'libx264',
    format: 'mp4'
  },
  medium: {
    quality: 'medium',
    width: 960,
    height: 540,
    fps: 30,
    bitrate: '2M',
    codec: 'libx264',
    format: 'mp4'
  }
}

// ============================================================================
// PREVIEW PROXY SYSTEM
// ============================================================================

export class PreviewProxySystem {
  private jobs: Map<string, ProxyJob> = new Map()
  private ffmpeg: FFmpegService
  private cacheDir: string

  constructor(cacheDir: string = '/tmp/video-proxies') {
    this.cacheDir = cacheDir
    this.ffmpeg = new FFmpegService()
  }

  /**
   * Gera um proxy de baixa resolução para preview
   */
  async generateProxy(
    sourceUrl: string,
    quality: ProxyQuality = 'low',
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const jobId = this.generateJobId(sourceUrl, quality)

    // Check if proxy already exists
    const existingJob = this.jobs.get(jobId)
    if (existingJob?.status === 'completed' && existingJob.proxyUrl) {
      return existingJob.proxyUrl
    }

    // Create new job
    const job: ProxyJob = {
      id: jobId,
      sourceUrl,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      config: PROXY_CONFIGS[quality]
    }

    this.jobs.set(jobId, job)

    try {
      // Update status
      job.status = 'processing'

      // Generate proxy filename
      const proxyFilename = `${jobId}.${job.config.format}`
      const proxyPath = `${this.cacheDir}/${proxyFilename}`

      // FFmpeg command for proxy generation
      const ffmpegCommand = this.buildFFmpegCommand(sourceUrl, proxyPath, job.config)

      // Execute FFmpeg
      await this.executeFFmpeg(ffmpegCommand, (progress) => {
        job.progress = progress
        onProgress?.(progress)
      })

      // Update job
      job.status = 'completed'
      job.progress = 100
      job.proxyUrl = proxyPath
      job.completedAt = new Date()

      return proxyPath
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
  }

  /**
   * Gera múltiplos proxies em batch
   */
  async generateProxiesBatch(
    sources: Array<{ url: string; quality?: ProxyQuality }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    let completed = 0

    for (const source of sources) {
      try {
        const proxyUrl = await this.generateProxy(source.url, source.quality)
        results.set(source.url, proxyUrl)
        completed++
        onProgress?.(completed, sources.length)
      } catch (error) {
        console.error(`Failed to generate proxy for ${source.url}:`, error)
      }
    }

    return results
  }

  /**
   * Gera thumbnail a partir do vídeo
   */
  async generateThumbnail(
    videoUrl: string,
    timestamp: number = 1
  ): Promise<string> {
    const thumbnailId = `thumb-${this.generateJobId(videoUrl, 'low')}-${timestamp}`
    const thumbnailPath = `${this.cacheDir}/${thumbnailId}.jpg`

    const command = [
      'ffmpeg',
      '-ss', timestamp.toString(),
      '-i', videoUrl,
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-q:v', '2',
      thumbnailPath
    ]

    await this.executeFFmpeg(command.join(' '))

    return thumbnailPath
  }

  /**
   * Gera sprite sheet para scrubbing
   */
  async generateSpriteSheet(
    videoUrl: string,
    options: {
      interval?: number // segundos entre thumbnails
      columns?: number
      rows?: number
      thumbWidth?: number
    } = {}
  ): Promise<{
    spriteUrl: string
    metadata: {
      interval: number
      columns: number
      rows: number
      thumbWidth: number
      thumbHeight: number
      totalFrames: number
    }
  }> {
    const {
      interval = 2,
      columns = 10,
      rows = 10,
      thumbWidth = 160
    } = options

    const spriteId = `sprite-${this.generateJobId(videoUrl, 'low')}`
    const spritePath = `${this.cacheDir}/${spriteId}.jpg`

    // Get video duration
    const duration = await this.getVideoDuration(videoUrl)
    const totalFrames = Math.floor(duration / interval)

    // FFmpeg command for sprite sheet
    const command = [
      'ffmpeg',
      '-i', videoUrl,
      '-vf', `fps=1/${interval},scale=${thumbWidth}:-1,tile=${columns}x${rows}`,
      '-frames:v', '1',
      spritePath
    ]

    await this.executeFFmpeg(command.join(' '))

    return {
      spriteUrl: spritePath,
      metadata: {
        interval,
        columns,
        rows,
        thumbWidth,
        thumbHeight: Math.floor(thumbWidth * 9 / 16), // Assuming 16:9
        totalFrames
      }
    }
  }

  /**
   * Obtém informações do vídeo
   */
  async getVideoInfo(videoUrl: string): Promise<{
    duration: number
    width: number
    height: number
    fps: number
    bitrate: number
    codec: string
    size: number
  }> {
    const command = [
      'ffprobe',
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoUrl
    ]

    const output = await this.executeFFmpeg(command.join(' '))
    const info = JSON.parse(output)

    const videoStream = info.streams.find((s: any) => s.codec_type === 'video')

    return {
      duration: parseFloat(info.format.duration),
      width: videoStream.width,
      height: videoStream.height,
      fps: eval(videoStream.r_frame_rate), // "30/1" -> 30
      bitrate: parseInt(info.format.bit_rate),
      codec: videoStream.codec_name,
      size: parseInt(info.format.size)
    }
  }

  /**
   * Limpa cache de proxies
   */
  async clearCache(olderThan?: Date): Promise<number> {
    let cleared = 0

    for (const [jobId, job] of this.jobs.entries()) {
      if (olderThan && job.createdAt > olderThan) {
        continue
      }

      if (job.proxyUrl) {
        try {
          // Delete file
          await this.deleteFile(job.proxyUrl)
          this.jobs.delete(jobId)
          cleared++
        } catch (error) {
          console.error(`Failed to delete proxy ${job.proxyUrl}:`, error)
        }
      }
    }

    return cleared
  }

  /**
   * Obtém status de um job
   */
  getJobStatus(jobId: string): ProxyJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Lista todos os jobs
   */
  getAllJobs(): ProxyJob[] {
    return Array.from(this.jobs.values())
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateJobId(sourceUrl: string, quality: ProxyQuality): string {
    const hash = this.simpleHash(sourceUrl)
    return `proxy-${quality}-${hash}`
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private buildFFmpegCommand(
    sourceUrl: string,
    outputPath: string,
    config: ProxyConfig
  ): string {
    return [
      'ffmpeg',
      '-i', sourceUrl,
      '-vf', `scale=${config.width}:${config.height},fps=${config.fps}`,
      '-c:v', config.codec,
      '-b:v', config.bitrate,
      '-preset', 'ultrafast',
      '-movflags', '+faststart',
      '-y',
      outputPath
    ].join(' ')
  }

  private async executeFFmpeg(
    command: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // In a real implementation, this would execute FFmpeg
    // For now, we'll simulate it
    return new Promise((resolve, reject) => {
      console.log('FFmpeg command:', command)

      // Simulate progress
      if (onProgress) {
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          onProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
          }
        }, 500)
      }

      // Simulate execution
      setTimeout(() => {
        resolve('')
      }, 3000)
    })
  }

  private async getVideoDuration(videoUrl: string): Promise<number> {
    const info = await this.getVideoInfo(videoUrl)
    return info.duration
  }

  private async deleteFile(filePath: string): Promise<void> {
    // In a real implementation, this would delete the file
    console.log('Deleting file:', filePath)
  }
}

// ============================================================================
// REACT HOOK FOR PREVIEW SYSTEM
// ============================================================================

export interface UsePreviewProxyOptions {
  quality?: ProxyQuality
  autoGenerate?: boolean
}

export interface UsePreviewProxyReturn {
  proxyUrl: string | null
  isGenerating: boolean
  progress: number
  error: string | null
  generateProxy: () => Promise<void>
  clearProxy: () => void
}

/**
 * React Hook para usar o sistema de preview
 * Exemplo:
 * ```tsx
 * const { proxyUrl, isGenerating, progress } = usePreviewProxy(videoUrl, {
 *   quality: 'low',
 *   autoGenerate: true
 * })
 * ```
 */
export function usePreviewProxy(
  sourceUrl: string | null,
  options: UsePreviewProxyOptions = {}
): UsePreviewProxyReturn {
  const { quality = 'low', autoGenerate = false } = options

  // Implementation would use React hooks
  // For now, returning a placeholder
  return {
    proxyUrl: null,
    isGenerating: false,
    progress: 0,
    error: null,
    generateProxy: async () => {},
    clearProxy: () => {}
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let previewSystemInstance: PreviewProxySystem | null = null

export function getPreviewSystem(): PreviewProxySystem {
  if (!previewSystemInstance) {
    previewSystemInstance = new PreviewProxySystem()
  }
  return previewSystemInstance
}

export default PreviewProxySystem
