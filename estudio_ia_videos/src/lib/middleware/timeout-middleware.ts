/**
 * Timeout Middleware for Render Job Processor
 * 
 * Wraps job processing functions with per-operation timeouts.
 * Uses the centralized timeout configuration from timeout-config.ts.
 * 
 * Feature Flag: ENABLE_TIMEOUT_ENFORCEMENT (default: true)
 */

import { Job } from 'bullmq';
import { logger } from '../logger';
import { 
  PIPELINE_TIMEOUTS, 
  TIMEOUT_ENFORCEMENT_ENABLED, 
  withTimeout, 
  TimeoutError 
} from '../config/timeout-config';

/**
 * Timeout context for tracking operation status
 */
interface TimeoutContext {
  startTime: number;
  operation: string;
  timeoutMs: number;
  abortController: AbortController;
}

/**
 * Creates a timeout context for an operation
 */
export function createTimeoutContext(operation: string, timeoutMs: number): TimeoutContext {
  return {
    startTime: Date.now(),
    operation,
    timeoutMs,
    abortController: new AbortController()
  };
}

/**
 * Wraps a TTS generation call with timeout enforcement
 */
export async function withTtsTimeout<T>(
  operation: () => Promise<T>,
  slideIndex?: number
): Promise<T> {
  const operationName = slideIndex !== undefined 
    ? `TTS Generation (Slide ${slideIndex})` 
    : 'TTS Generation';
    
  return withTimeout(
    operation(),
    PIPELINE_TIMEOUTS.ttsPerSlide,
    operationName
  );
}

/**
 * Wraps a batch TTS operation with timeout enforcement
 */
export async function withTtsBatchTimeout<T>(
  operation: () => Promise<T>,
  batchSize?: number
): Promise<T> {
  const operationName = batchSize !== undefined 
    ? `TTS Batch (${batchSize} slides)` 
    : 'TTS Batch';
    
  return withTimeout(
    operation(),
    PIPELINE_TIMEOUTS.ttsBatch,
    operationName
  );
}

/**
 * Wraps a slide composition (FFmpeg) call with timeout enforcement
 */
export async function withSlideCompositionTimeout<T>(
  operation: () => Promise<T>,
  slideIndex?: number
): Promise<T> {
  const operationName = slideIndex !== undefined 
    ? `Slide Composition (Slide ${slideIndex})` 
    : 'Slide Composition';
    
  return withTimeout(
    operation(),
    PIPELINE_TIMEOUTS.slideComposition,
    operationName
  );
}

/**
 * Wraps a storage upload call with timeout enforcement
 */
export async function withStorageUploadTimeout<T>(
  operation: () => Promise<T>,
  fileName?: string
): Promise<T> {
  const operationName = fileName 
    ? `Storage Upload (${fileName})` 
    : 'Storage Upload';
    
  return withTimeout(
    operation(),
    PIPELINE_TIMEOUTS.storageUpload,
    operationName
  );
}

/**
 * Wraps a storage download call with timeout enforcement
 */
export async function withStorageDownloadTimeout<T>(
  operation: () => Promise<T>,
  fileName?: string
): Promise<T> {
  const operationName = fileName 
    ? `Storage Download (${fileName})` 
    : 'Storage Download';
    
  return withTimeout(
    operation(),
    PIPELINE_TIMEOUTS.storageDownload,
    operationName
  );
}

/**
 * Higher-order function: Wraps a job processor with timeout error handling
 * 
 * Catches TimeoutError and converts it to a structured job failure with proper logging.
 * 
 * @param processor - The original job processor function
 * @returns Wrapped processor with timeout error handling
 */
export function withTimeoutErrorHandling<TPayload, TResult>(
  processor: (job: Job<TPayload, TResult>) => Promise<TResult>
): (job: Job<TPayload, TResult>) => Promise<TResult> {
  return async (job: Job<TPayload, TResult>): Promise<TResult> => {
    const jobData = job.data as any;
    
    try {
      return await processor(job);
    } catch (error) {
      if (error instanceof TimeoutError) {
        logger.error('Job operation timed out', error, {
          service: 'TimeoutMiddleware',
          jobId: job.id,
          projectId: jobData?.projectId,
          operation: error.operation,
          timeoutMs: error.timeoutMs,
        });
        
        // Rethrow with a more descriptive message for job failure tracking
        throw new Error(`Operation timeout: ${error.operation} exceeded ${error.timeoutMs}ms limit`);
      }
      
      throw error;
    }
  };
}

/**
 * Logging middleware: Log operation start/end with duration
 */
export async function withOperationLogging<T>(
  operation: string,
  jobId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  logger.debug(`Starting operation: ${operation}`, {
    service: 'TimeoutMiddleware',
    jobId,
    operation,
    timeoutEnforced: TIMEOUT_ENFORCEMENT_ENABLED,
  });
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.debug(`Completed operation: ${operation}`, {
      service: 'TimeoutMiddleware',
      jobId,
      operation,
      durationMs: duration,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.warn(`Failed operation: ${operation}`, {
      service: 'TimeoutMiddleware',
      jobId,
      operation,
      durationMs: duration,
      error: error instanceof Error ? error.message : String(error),
    });
    
    throw error;
  }
}

/**
 * Utility: Check if timeout enforcement is enabled
 */
export function isTimeoutEnforcementEnabled(): boolean {
  return TIMEOUT_ENFORCEMENT_ENABLED;
}

/**
 * Utility: Get configured timeouts (read-only)
 */
export function getConfiguredTimeouts(): Readonly<typeof PIPELINE_TIMEOUTS> {
  return Object.freeze({ ...PIPELINE_TIMEOUTS });
}
