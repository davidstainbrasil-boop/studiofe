/**
 * File Upload Service
 * Handles file uploads to cloud storage (S3 or Cloudflare R2)
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

export class FileUploadService {
  private s3Client: S3Client
  private bucket: string

  constructor() {
    // Support both AWS S3 and Cloudflare R2
    const isR2 = !!process.env.R2_ACCOUNT_ID

    if (isR2) {
      // Cloudflare R2 configuration
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
        }
      })
      this.bucket = process.env.R2_BUCKET_NAME || 'mvp-video-storage'
    } else {
      // AWS S3 configuration
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
      })
      this.bucket = process.env.AWS_S3_BUCKET || 'mvp-video-storage'
    }
  }

  /**
   * Upload file to cloud storage
   */
  async uploadFile(
    file: Buffer | File,
    folder: string,
    filename?: string
  ): Promise<{ url: string; key: string }> {
    try {
      const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
      const originalName = file instanceof File ? file.name : filename || 'file'
      
      // Generate unique filename
      const hash = crypto.randomBytes(8).toString('hex')
      const ext = originalName.split('.').pop()
      const key = `${folder}/${hash}.${ext}`

      // Upload to S3/R2
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: this.getContentType(ext || '')
      }))

      // Generate public URL
      const url = this.getPublicUrl(key)

      return { url, key }
    } catch (error) {
      console.error('File upload error:', error)
      throw new Error('Failed to upload file')
    }
  }

  /**
   * Upload video file
   */
  async uploadVideo(file: File): Promise<{ url: string; key: string }> {
    return this.uploadFile(file, 'videos')
  }

  /**
   * Upload audio file
   */
  async uploadAudio(file: Buffer | File): Promise<{ url: string; key: string }> {
    return this.uploadFile(file, 'audio')
  }

  /**
   * Upload subtitle file
   */
  async uploadSubtitle(content: string, format: string): Promise<{ url: string; key: string }> {
    const buffer = Buffer.from(content)
    const filename = `subtitle_${Date.now()}.${format}`
    return this.uploadFile(buffer, 'subtitles', filename)
  }

  /**
   * Upload thumbnail
   */
  async uploadThumbnail(file: Buffer): Promise<{ url: string; key: string }> {
    const filename = `thumb_${Date.now()}.jpg`
    return this.uploadFile(file, 'thumbnails', filename)
  }

  /**
   * Generate signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    })

    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  /**
   * Get public URL for file
   */
  private getPublicUrl(key: string): string {
    const isR2 = !!process.env.R2_ACCOUNT_ID

    if (isR2) {
      // Cloudflare R2 public URL
      const publicDomain = process.env.R2_PUBLIC_DOMAIN
      if (publicDomain) {
        return `https://${publicDomain}/${key}`
      }
      return `https://${this.bucket}.r2.dev/${key}`
    } else {
      // AWS S3 public URL
      const region = process.env.AWS_REGION || 'us-east-1'
      return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'srt': 'text/plain',
      'vtt': 'text/vtt',
      'ass': 'text/plain'
    }

    return types[ext.toLowerCase()] || 'application/octet-stream'
  }
}

export const fileUploadService = new FileUploadService()
