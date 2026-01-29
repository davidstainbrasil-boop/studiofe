/**
 * 🔄 Advanced Queue Strategies
 * Enhanced backoff and retry strategies for BullMQ
 */

import { Job } from 'bullmq'
import { logger } from '@/lib/logger'

/**
 * Error types for specific handling
 */
export enum ErrorType {
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  FFMPEG = 'ffmpeg',
  STORAGE = 'storage',
  AUTH = 'auth',
  FATAL = 'fatal',
  UNKNOWN = 'unknown',
}

/**
 * Classify error by type
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase()
  
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
    return ErrorType.RATE_LIMIT
  }
  if (message.includes('timeout') || message.includes('timed out') || message.includes('etimedout')) {
    return ErrorType.TIMEOUT
  }
  if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
    return ErrorType.NETWORK
  }
  if (message.includes('ffmpeg') || message.includes('encoding') || message.includes('codec')) {
    return ErrorType.FFMPEG
  }
  if (message.includes('storage') || message.includes('upload') || message.includes('s3') || message.includes('bucket')) {
    return ErrorType.STORAGE
  }
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden') || message.includes('401') || message.includes('403')) {
    return ErrorType.AUTH
  }
  if (message.includes('fatal') || message.includes('critical') || message.includes('unrecoverable')) {
    return ErrorType.FATAL
  }
  
  return ErrorType.UNKNOWN
}

/**
 * Advanced backoff strategy based on error type
 */
export function advancedBackoffStrategy(
  attemptsMade: number,
  type: string,
  err: Error | undefined,
  job: Job
): number {
  if (!err) {
    // Default exponential backoff
    return Math.pow(2, attemptsMade - 1) * 1000
  }

  const errorType = classifyError(err)
  
  logger.debug('Calculating backoff for failed job', {
    context: {
      jobId: job.id,
      attemptsMade,
      errorType,
      errorMessage: err.message,
    }
  })

  switch (errorType) {
    case ErrorType.RATE_LIMIT:
      // Wait longer for rate limits (1 min base, up to 5 min)
      return Math.min(60000 * attemptsMade, 300000)

    case ErrorType.TIMEOUT:
      // Linear backoff for timeouts (5s increments)
      return attemptsMade * 5000

    case ErrorType.NETWORK:
      // Quick retries for network issues (exponential with jitter)
      const baseDelay = Math.pow(2, attemptsMade - 1) * 1000
      const jitter = Math.random() * 1000
      return Math.min(baseDelay + jitter, 30000)

    case ErrorType.FFMPEG:
      // FFmpeg errors usually need more time (10s increments)
      return attemptsMade * 10000

    case ErrorType.STORAGE:
      // Storage errors - moderate backoff
      return Math.pow(2, attemptsMade - 1) * 2000

    case ErrorType.AUTH:
      // Auth errors - stop retrying (likely config issue)
      logger.warn(`Auth error - stopping retries for job ${job.id}: ${err.message}`)
      return -1 // Stop retrying

    case ErrorType.FATAL:
      // Fatal errors - stop immediately
      logger.error(`Fatal error - stopping retries for job ${job.id}`, err)
      return -1 // Stop retrying

    default:
      // Unknown errors - standard exponential backoff
      return Math.pow(2, attemptsMade - 1) * 1000
  }
}

/**
 * Job options presets for different job types
 */
export const JOB_PRESETS = {
  // Fast jobs (TTS, thumbnail generation)
  fast: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    timeout: 60000, // 1 minute
  },

  // Standard jobs (image processing, short renders)
  standard: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    timeout: 5 * 60 * 1000, // 5 minutes
  },

  // Video render jobs (long running)
  render: {
    attempts: 3,
    backoff: {
      type: 'custom' as const,
    },
    timeout: 30 * 60 * 1000, // 30 minutes
  },

  // Upload jobs (depends on network)
  upload: {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    timeout: 10 * 60 * 1000, // 10 minutes
  },

  // External API calls (rate limit aware)
  external: {
    attempts: 5,
    backoff: {
      type: 'custom' as const,
    },
    timeout: 30000, // 30 seconds
  },
}

/**
 * Priority levels for jobs
 */
export const JOB_PRIORITY = {
  CRITICAL: 1,    // System health checks
  HIGH: 5,        // User-initiated actions
  NORMAL: 10,     // Standard processing
  LOW: 20,        // Background tasks
  BATCH: 50,      // Batch processing
}

/**
 * Calculate estimated wait time based on queue state
 */
export async function estimateWaitTime(
  queue: { getJobCounts: () => Promise<{ waiting: number; active: number }> },
  avgProcessingTime: number = 60000 // Default 1 minute per job
): Promise<number> {
  const counts = await queue.getJobCounts()
  const waitingJobs = counts.waiting
  const activeJobs = counts.active
  
  // Simple estimation: (waiting jobs / concurrency) * avg time
  const concurrency = Math.max(activeJobs, 1)
  const estimatedTime = (waitingJobs / concurrency) * avgProcessingTime
  
  return Math.round(estimatedTime)
}

/**
 * Format wait time for display
 */
export function formatWaitTime(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)} segundos`
  }
  if (ms < 3600000) {
    return `${Math.round(ms / 60000)} minutos`
  }
  return `${Math.round(ms / 3600000)} horas`
}
