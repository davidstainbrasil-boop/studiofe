import { getSignedUrl } from '@aws-sdk/cloudfront-signer'
import { Logger } from '@lib/logger'

const logger = new Logger('CloudFrontSigner')

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN
const KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID
const PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY

/**
 * Generates a signed CloudFront URL for a given S3 key
 * @param s3Key The key of the object in S3 (e.g., 'uploads/video.mp4')
 * @param expiresInSeconds Duration in seconds until expiration (default: 1 hour)
 */
export function getCloudFrontUrl(s3Key: string, expiresInSeconds: number = 3600): string {
  // Fallback if CloudFront is not configured
  if (!CLOUDFRONT_DOMAIN || !KEY_PAIR_ID || !PRIVATE_KEY) {
    logger.warn('CloudFront not configured. Returning fallback S3/Mock URL.')
    const bucket = process.env.S3_BUCKET_NAME || 'mvp-video-storage'
    const region = process.env.AWS_REGION || 'us-east-1'
    
    // If running in storage mock mode
    if (s3Key.startsWith('mock-uploads/')) {
        return `/api/mock-storage/${s3Key}`
    }

    // Return S3 direct URL (public read assumed if no CDN) - Not ideal for prod but works for fallback
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`
  }

  try {
    const url = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`
    
    // Generate signed URL
    const signedUrl = getSignedUrl({
      url,
      keyPairId: KEY_PAIR_ID,
      privateKey: PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure newlines are parsed correctly
      dateLessThan: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    })

    return signedUrl
  } catch (error) {
    logger.error('Error signing CloudFront URL', error instanceof Error ? error : new Error(String(error)))
    return `https://${CLOUDFRONT_DOMAIN}/${s3Key}` // Return unsigned URL as fallback
  }
}
