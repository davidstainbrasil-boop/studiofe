/**
 * Retry Logic with Exponential Backoff
 *
 * Automatically retries failed operations with increasing delays between attempts.
 * Combines well with circuit breakers for comprehensive resilience.
 */

import { logger } from '@lib/logger';

export interface RetryOptions {
  maxAttempts: number;          // Maximum retry attempts (default: 3)
  initialDelay: number;         // Initial delay in ms (default: 1000)
  maxDelay: number;             // Maximum delay in ms (default: 30000)
  backoffMultiplier: number;    // Multiplier for exponential backoff (default: 2)
  jitter: boolean;              // Add randomness to delays (default: true)
  retryableErrors?: string[];   // Only retry these error types (default: all)
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Calculate delay for next retry with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: initialDelay * multiplier^attempt
  let delay = initialDelay * Math.pow(multiplier, attempt - 1);

  // Cap at max delay
  delay = Math.min(delay, maxDelay);

  // Add jitter (±25% randomness)
  if (jitter) {
    const jitterAmount = delay * 0.25;
    delay = delay + (Math.random() * 2 - 1) * jitterAmount;
  }

  return Math.floor(delay);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, retryableErrors?: string[]): boolean {
  if (!retryableErrors || retryableErrors.length === 0) {
    // Retry all errors by default
    return true;
  }

  // Check if error name or message matches retryable patterns
  return retryableErrors.some(pattern => {
    return error.name.includes(pattern) || error.message.includes(pattern);
  });
}

/**
 * Retry an async function with exponential backoff
 *
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Promise with result or throws RetryError
 *
 * @example
 * const result = await retry(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 1000,
 *     backoffMultiplier: 2
 *   }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors'>> & Pick<RetryOptions, 'onRetry' | 'retryableErrors'> = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < config.maxAttempts) {
    attempt++;

    try {
      logger.debug('Retry attempt', { attempt, maxAttempts: config.maxAttempts });
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(lastError, config.retryableErrors)) {
        logger.warn('Non-retryable error encountered', {
          error: lastError.message,
          attempt
        });
        throw lastError;
      }

      // If this was the last attempt, throw
      if (attempt >= config.maxAttempts) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier,
        config.jitter
      );

      logger.warn('Retry attempt failed, waiting before next attempt', {
        attempt,
        maxAttempts: config.maxAttempts,
        delay,
        error: lastError.message
      });

      // Call onRetry callback if provided
      if (config.onRetry) {
        try {
          config.onRetry(attempt, lastError, delay);
        } catch (callbackError) {
          logger.error('Error in onRetry callback', callbackError instanceof Error ? callbackError : new Error(String(callbackError)));
        }
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  throw new RetryError(
    `Failed after ${attempt} attempts: ${lastError?.message}`,
    attempt,
    lastError!
  );
}

/**
 * Retry-specific configuration presets
 */
export const RETRY_PRESETS = {
  /**
   * Quick retry for fast operations (APIs, database queries)
   */
  QUICK: {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true
  },

  /**
   * Standard retry for normal operations
   */
  STANDARD: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },

  /**
   * Patient retry for slow operations (video processing, large uploads)
   */
  PATIENT: {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitter: true
  },

  /**
   * Aggressive retry for critical operations
   */
  AGGRESSIVE: {
    maxAttempts: 10,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true
  }
} as const;

/**
 * Helper: Retry with circuit breaker
 *
 * Combines retry logic with circuit breaker pattern for maximum resilience
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreakerFn: (fn: () => Promise<T>) => Promise<T>,
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  return retry(
    () => circuitBreakerFn(fn),
    retryOptions
  );
}

/**
 * Helper: Retry HTTP fetch
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  return retry(
    async () => {
      const response = await fetch(url, options);

      // Retry on 5xx errors and 429 (rate limit)
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    },
    {
      ...RETRY_PRESETS.STANDARD,
      ...retryOptions,
      retryableErrors: ['HTTP 5', 'HTTP 429', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
    }
  );
}

/**
 * Helper: Retry database operation
 */
export async function retryDatabaseOp<T>(
  operation: () => Promise<T>,
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  return retry(operation, {
    ...RETRY_PRESETS.QUICK,
    ...retryOptions,
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Connection',
      'Deadlock',
      'Lock wait timeout'
    ]
  });
}

/**
 * Helper: Retry TTS operation
 */
export async function retryTTS<T>(
  operation: () => Promise<T>,
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  return retry(operation, {
    ...RETRY_PRESETS.PATIENT,
    maxAttempts: 5,
    initialDelay: 2000,
    ...retryOptions,
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'timeout',
      'HTTP 5',
      'HTTP 429'
    ]
  });
}
