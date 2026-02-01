/**
 * 📦 Storage Service REAL
 * 
 * Serviço para upload/download de arquivos usando Supabase Storage
 * Suporta: vídeos, áudios, imagens, PPTXs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Logger } from '@lib/logger'
import crypto from 'crypto'
import path from 'path'

const logger = new Logger('storage-service')

// ============================================================================
// Types
// ============================================================================

export interface UploadOptions {
  bucket?: string
  folder?: string
  fileName?: string
  contentType?: string
  upsert?: boolean
  public?: boolean
  metadata?: Record<string, string>
}

export interface UploadResult {
  success: boolean
  url: string
  publicUrl?: string
  path: string
  size: number
  contentType: string
  error?: string
}

export interface DownloadResult {
  success: boolean
  data?: Buffer
  contentType?: string
  size?: number
  error?: string
}

export interface StorageStats {
  totalFiles: number
  totalSize: number
  byBucket: Record<string, { files: number; size: number }>
}

// ============================================================================
// Bucket Configuration
// ============================================================================

export const STORAGE_BUCKETS = {
  videos: {
    name: 'videos',
    public: true,
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime']
  },
  audio: {
    name: 'tts-audio',
    public: true,
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
  },
  images: {
    name: 'images',
    public: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  pptx: {
    name: 'pptx',
    public: false,
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation']
  },
  thumbnails: {
    name: 'thumbnails',
    public: true,
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  temp: {
    name: 'temp',
    public: false,
    maxSize: 200 * 1024 * 1024, // 200MB
    allowedTypes: ['*/*']
  }
}

// ============================================================================
// Storage Service Class
// ============================================================================

export class StorageServiceReal {
  private supabase: SupabaseClient
  private initialized: boolean = false

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Supabase credentials not configured', undefined, { component: 'StorageService' })
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Inicializa buckets se não existirem
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      for (const [key, config] of Object.entries(STORAGE_BUCKETS)) {
        const { data: buckets } = await this.supabase.storage.listBuckets()
        const exists = buckets?.some(b => b.name === config.name)

        if (!exists) {
          const { error } = await this.supabase.storage.createBucket(config.name, {
            public: config.public,
            fileSizeLimit: config.maxSize,
            allowedMimeTypes: config.allowedTypes[0] === '*/*' ? undefined : config.allowedTypes
          })

          if (error && !error.message.includes('already exists')) {
            logger.warn(`Failed to create bucket ${config.name}: ${error.message}`, {
              component: 'StorageService'
            })
          } else {
            logger.info(`Bucket ${config.name} created`, { component: 'StorageService' })
          }
        }
      }

      this.initialized = true
      logger.info('Storage service initialized', { component: 'StorageService' })
    } catch (error) {
      logger.error('Failed to initialize storage', error instanceof Error ? error : new Error(String(error)), {
        component: 'StorageService'
      })
    }
  }

  /**
   * Upload de arquivo
   */
  async upload(
    fileData: Buffer | Blob | File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    await this.initialize()

    const bucket = options.bucket || 'temp'
    const bucketConfig = STORAGE_BUCKETS[bucket as keyof typeof STORAGE_BUCKETS]

    if (!bucketConfig) {
      return {
        success: false,
        url: '',
        path: '',
        size: 0,
        contentType: '',
        error: `Bucket inválido: ${bucket}`
      }
    }

    try {
      // Determinar nome do arquivo
      const ext = options.contentType 
        ? this.getExtensionFromMimeType(options.contentType)
        : 'bin'
      
      const fileName = options.fileName || `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${ext}`
      const filePath = options.folder ? `${options.folder}/${fileName}` : fileName

      // Obter tamanho
      let size: number
      if (Buffer.isBuffer(fileData)) {
        size = fileData.length
      } else if (fileData instanceof Blob) {
        size = fileData.size
      } else {
        size = (fileData as File).size
      }

      // Validar tamanho
      if (size > bucketConfig.maxSize) {
        return {
          success: false,
          url: '',
          path: '',
          size,
          contentType: options.contentType || '',
          error: `Arquivo muito grande. Máximo: ${bucketConfig.maxSize / 1024 / 1024}MB`
        }
      }

      // Upload
      const { error } = await this.supabase.storage
        .from(bucketConfig.name)
        .upload(filePath, fileData, {
          contentType: options.contentType,
          upsert: options.upsert ?? true,
          duplex: 'half'
        })

      if (error) {
        throw error
      }

      // Gerar URLs
      let publicUrl = ''
      let signedUrl = ''

      if (bucketConfig.public) {
        const { data } = this.supabase.storage
          .from(bucketConfig.name)
          .getPublicUrl(filePath)
        publicUrl = data.publicUrl
        signedUrl = publicUrl
      } else {
        const { data } = await this.supabase.storage
          .from(bucketConfig.name)
          .createSignedUrl(filePath, 3600 * 24 * 7) // 7 dias

        if (data?.signedUrl) {
          signedUrl = data.signedUrl
        }
      }

      logger.info(`File uploaded: ${filePath}`, {
        bucket: bucketConfig.name,
        size,
        component: 'StorageService'
      })

      return {
        success: true,
        url: signedUrl,
        publicUrl: publicUrl || undefined,
        path: filePath,
        size,
        contentType: options.contentType || 'application/octet-stream'
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Upload failed: ${message}`, error instanceof Error ? error : new Error(message), {
        component: 'StorageService'
      })

      return {
        success: false,
        url: '',
        path: '',
        size: 0,
        contentType: '',
        error: message
      }
    }
  }

  /**
   * Upload de vídeo renderizado
   */
  async uploadVideo(
    videoBuffer: Buffer,
    projectId: string,
    options: { fileName?: string; userId?: string } = {}
  ): Promise<UploadResult> {
    const fileName = options.fileName || `${projectId}_${Date.now()}.mp4`
    const folder = options.userId || 'public'

    return this.upload(videoBuffer, {
      bucket: 'videos',
      folder: `renders/${folder}`,
      fileName,
      contentType: 'video/mp4',
      upsert: true
    })
  }

  /**
   * Upload de áudio TTS
   */
  async uploadAudio(
    audioBuffer: Buffer,
    slideId: string,
    format: 'mp3' | 'wav' = 'mp3'
  ): Promise<UploadResult> {
    return this.upload(audioBuffer, {
      bucket: 'audio',
      folder: 'tts',
      fileName: `${slideId}_${Date.now()}.${format}`,
      contentType: `audio/${format}`,
      upsert: true
    })
  }

  /**
   * Upload de thumbnail
   */
  async uploadThumbnail(
    imageBuffer: Buffer,
    projectId: string
  ): Promise<UploadResult> {
    return this.upload(imageBuffer, {
      bucket: 'thumbnails',
      folder: 'projects',
      fileName: `${projectId}_thumb.jpg`,
      contentType: 'image/jpeg',
      upsert: true
    })
  }

  /**
   * Download de arquivo
   */
  async download(bucketName: string, filePath: string): Promise<DownloadResult> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .download(filePath)

      if (error) {
        throw error
      }

      const buffer = Buffer.from(await data.arrayBuffer())

      return {
        success: true,
        data: buffer,
        contentType: data.type,
        size: buffer.length
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Gerar URL pública ou assinada
   */
  async getUrl(
    bucketName: string,
    filePath: string,
    options: { expiresIn?: number; download?: boolean } = {}
  ): Promise<string | null> {
    try {
      const bucket = Object.values(STORAGE_BUCKETS).find(b => b.name === bucketName)

      if (bucket?.public) {
        const { data } = this.supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath, {
            download: options.download
          })
        return data.publicUrl
      }

      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, options.expiresIn || 3600)

      if (error) throw error
      return data.signedUrl
    } catch (error) {
      logger.error('Failed to get URL', error instanceof Error ? error : new Error(String(error)), {
        component: 'StorageService'
      })
      return null
    }
  }

  /**
   * Deletar arquivo
   */
  async delete(bucketName: string, filePaths: string | string[]): Promise<boolean> {
    try {
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths]
      const { error } = await this.supabase.storage
        .from(bucketName)
        .remove(paths)

      if (error) throw error

      logger.info(`Files deleted from ${bucketName}`, { 
        count: paths.length,
        component: 'StorageService'
      })

      return true
    } catch (error) {
      logger.error('Delete failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'StorageService'
      })
      return false
    }
  }

  /**
   * Listar arquivos em um bucket/pasta
   */
  async list(
    bucketName: string,
    folder?: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ files: Array<{ name: string; size: number; updatedAt: string }>; error?: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .list(folder || '', {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: { column: 'updated_at', order: 'desc' }
        })

      if (error) throw error

      return {
        files: (data || []).map(f => ({
          name: f.name,
          size: f.metadata?.size || 0,
          updatedAt: f.updated_at || ''
        }))
      }
    } catch (error) {
      return {
        files: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    }
    return map[mimeType] || 'bin'
  }
}

// Singleton
let storageInstance: StorageServiceReal | null = null

export function getStorageService(): StorageServiceReal {
  if (!storageInstance) {
    storageInstance = new StorageServiceReal()
  }
  return storageInstance
}

export default StorageServiceReal
