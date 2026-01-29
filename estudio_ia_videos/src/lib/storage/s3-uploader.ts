import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { Logger } from '@lib/logger'

const logger = new Logger('S3Uploader')

// Interface for S3 upload result
export interface S3UploadResult {
  key: string
  url: string
  bucket: string
  region: string
}

// Initialize S3 Client
// If credentials are not present, this will essentially fail or fallback depending on SDK version/machine roles
// For now, we will add a check to warn if credentials are missing
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'mvp-video-storage'

/**
 * Uploads a file buffer to S3
 * @param fileBuffer The file content as a Buffer
 * @param fileName Original filename (used to extract extension)
 * @param contentType Mime type of the file
 * @param folder Optional folder path within the bucket
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'uploads'
): Promise<S3UploadResult> {
  // Check for credentials
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('AWS credentials not found. Using Mock S3 Uploader.')
      return mockUploadToS3(fileName)
    }
    throw new Error('AWS credentials are required for S3 uploads')
  }

  try {
    const fileExtension = fileName.split('.').pop()
    const uniqueKey = `${folder}/${uuidv4()}.${fileExtension}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueKey,
      Body: fileBuffer,
      ContentType: contentType
    })

    await s3Client.send(command)

    // Construct the S3 URL (Note: Consumer should prefer CloudFront URL if available)
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${uniqueKey}`

    logger.info(`Successfully uploaded file to S3: ${uniqueKey}`)

    return {
      key: uniqueKey,
      url,
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION || 'us-east-1'
    }
  } catch (error) {
    logger.error('Error uploading to S3', error instanceof Error ? error : new Error(String(error)))
    throw new Error('Failed to upload file to storage')
  }
}

// Mock implementation for development/testing without credentials
async function mockUploadToS3(fileName: string): Promise<S3UploadResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  const uniqueKey = `mock-uploads/${uuidv4()}-${fileName}`
  
  return {
    key: uniqueKey,
    url: `/api/mock-storage/${uniqueKey}`, // Local mock URL
    bucket: 'mock-bucket',
    region: 'local'
  }
}
