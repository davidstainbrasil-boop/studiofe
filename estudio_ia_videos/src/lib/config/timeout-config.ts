/**
 * Centralized Timeout Configuration for Video Pipeline
 * 
 * Defines Service Level Objectives (SLOs) for all pipeline operations.
 * All timeouts are configurable via environment variables with sensible defaults.
 * 
 * Feature Flag: ENABLE_TIMEOUT_ENFORCEMENT (default: true)
 */

import { logger } from '../logger';

interface TimeoutConfig {
  renderJob: number;
  slideComposition: number;
  ttsPerSlide: number;
  ttsBatch: number;
  avatarPerSlide: number;
  avatarBatch: number;
  storageUpload: number;
  storageDownload: number;
}

/**
 * Parse timeout from environment variable with validation
 */
function parseTimeout(envVar: string, defaultValue: number, name: string): number {
  const value = process.env[envVar];
  
  if (!value) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    logger.warn(`Invalid timeout configuration for ${envVar}, using default`, {
      service: 'TimeoutConfig',
      envVar,
      value,
      default: defaultValue,
    });
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Default timeout values (in milliseconds)
 */
const DEFAULT_TIMEOUTS: TimeoutConfig = {
  renderJob: 30 * 60 * 1000,        // 30 minutes - total job timeout
  slideComposition: 5 * 60 * 1000,  // 5 minutes - FFmpeg slide composition
  ttsPerSlide: 60 * 1000,            // 60 seconds - single TTS request
  ttsBatch: 3 * 60 * 1000,           // 3 minutes - batch TTS processing
  avatarPerSlide: 180 * 1000,        // 3 minutes - single talking head generation
  avatarBatch: 20 * 60 * 1000,       // 20 minutes - batch avatar processing
  storageUpload: 10 * 60 * 1000,     // 10 minutes - video file upload
  storageDownload: 5 * 60 * 1000,    // 5 minutes - file download
};

/**
 * Load timeout configuration from environment variables
 */
export const PIPELINE_TIMEOUTS: TimeoutConfig = {
  renderJob: parseTimeout('RENDER_JOB_TIMEOUT_MS', DEFAULT_TIMEOUTS.renderJob, 'Render Job'),
  slideComposition: parseTimeout('SLIDE_COMPOSITION_TIMEOUT_MS', DEFAULT_TIMEOUTS.slideComposition, 'Slide Composition'),
  ttsPerSlide: parseTimeout('TTS_PER_SLIDE_TIMEOUT_MS', DEFAULT_TIMEOUTS.ttsPerSlide, 'TTS Per Slide'),
  ttsBatch: parseTimeout('TTS_BATCH_TIMEOUT_MS', DEFAULT_TIMEOUTS.ttsBatch, 'TTS Batch'),
  avatarPerSlide: parseTimeout('AVATAR_PER_SLIDE_TIMEOUT_MS', DEFAULT_TIMEOUTS.avatarPerSlide, 'Avatar Per Slide'),
  avatarBatch: parseTimeout('AVATAR_BATCH_TIMEOUT_MS', DEFAULT_TIMEOUTS.avatarBatch, 'Avatar Batch'),
  storageUpload: parseTimeout('STORAGE_UPLOAD_TIMEOUT_MS', DEFAULT_TIMEOUTS.storageUpload, 'Storage Upload'),
  storageDownload: parseTimeout('STORAGE_DOWNLOAD_TIMEOUT_MS', DEFAULT_TIMEOUTS.storageDownload, 'Storage Download'),
};

/**
 * Feature flag for timeout enforcement
 */
export const TIMEOUT_ENFORCEMENT_ENABLED = process.env.ENABLE_TIMEOUT_ENFORCEMENT !== 'false';

/**
 * Log loaded configuration on module import
 */
logger.info('Timeout configuration loaded', {
  service: 'TimeoutConfig',
  timeouts: PIPELINE_TIMEOUTS,
  enforcementEnabled: TIMEOUT_ENFORCEMENT_ENABLED,
});

/**
 * Timeout error class for better error handling
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Utility: Wrap a promise with a timeout
 * 
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param operation - Operation name for error messages
 * @returns Promise that rejects with TimeoutError if timeout exceeded
 * 
 * @example
 * const result = await withTimeout(
 *   fetchData(),
 *   5000,
 *   'Data Fetch'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  if (!TIMEOUT_ENFORCEMENT_ENABLED) {
    return promise;
  }
  
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(
          `${operation} exceeded timeout of ${timeoutMs}ms`,
          operation,
          timeoutMs
        ));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Utility: Create an AbortController with timeout
 * Useful for fetch requests and other abortable operations
 * 
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController that aborts after timeout
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  
  if (TIMEOUT_ENFORCEMENT_ENABLED) {
    setTimeout(() => controller.abort(), timeoutMs);
  }
  
  return controller;
}
