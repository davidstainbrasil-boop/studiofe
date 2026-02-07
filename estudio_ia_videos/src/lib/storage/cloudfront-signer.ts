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
  // Fallback if CloudFront is not configured — use Supabase Storage public URL
  if (!CLOUDFRONT_DOMAIN || !KEY_PAIR_ID || !PRIVATE_KEY) {
    logger.warn('CloudFront not configured. Using Supabase Storage URL.')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const bucket = 'videos'
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${s3Key}`
    }
    // Absolute fallback — return path-relative URL for local dev
    return `/api/storage/files/${encodeURIComponent(s3Key)}`
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
