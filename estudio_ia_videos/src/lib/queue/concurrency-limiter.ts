/**
 * Concurrency Limiter - Resource Pool Implementation
 * 
 * Semaphore-based concurrency control for pipeline resources.
 * Prevents overwhelming external APIs and system resources.
 * 
 * Feature Flag: ENABLE_CONCURRENCY_LIMITS (default: true)
 */

import { logger } from '../logger';

/**
 * Simple semaphore-based resource pool
 */
export class ResourcePool {
  private available: number;
  private waiting: Array<() => void> = [];
  private readonly maxConcurrency: number;

  constructor(
    private readonly name: string,
    maxConcurrency: number
  ) {
    this.maxConcurrency = maxConcurrency;
    this.available = maxConcurrency;

    logger.info(`ResourcePool initialized`, {
      service: 'ResourcePool',
      name: this.name,
      maxConcurrency: this.maxConcurrency,
    });
  }

  /**
   * Acquire a resource slot
   * Blocks until a slot is available
   */
  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      logger.debug(`Resource acquired`, {
        service: 'ResourcePool',
        pool: this.name,
        available: this.available,
        max: this.maxConcurrency,
      });
      return;
    }

    // Wait for slot to become available
    await new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  /**
   * Release a resource slot
   */
  release(): void {
    const next = this.waiting.shift();
    
    if (next) {
      // Immediately give slot to waiting request
      next();
    } else {
      // No waiting requests, increment available
      this.available++;
    }

    logger.debug(`Resource released`, {
      service: 'ResourcePool',
      pool: this.name,
      available: this.available,
      waiting: this.waiting.length,
    });
  }

  /**
   * Execute operation with resource pooling
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      name: this.name,
      maxConcurrency: this.maxConcurrency,
      available: this.available,
      inUse: this.maxConcurrency - this.available,
      waiting: this.waiting.length,
      utilization: ((this.maxConcurrency - this.available) / this.maxConcurrency) * 100,
    };
  }
}

/**
 * Global resource pools for pipeline operations
 */
export const resourcePools = {
  render: new ResourcePool(
    'render',
    parseInt(process.env.RENDER_CONCURRENCY || '2', 10)
  ),
  tts: new ResourcePool(
    'tts',
    parseInt(process.env.TTS_CONCURRENCY || '5', 10)
  ),
  storage: new ResourcePool(
    'storage',
    parseInt(process.env.STORAGE_CONCURRENCY || '3', 10)
  ),
};

/**
 * Feature flag for concurrency limits
 */
export const CONCURRENCY_LIMITS_ENABLED = process.env.ENABLE_CONCURRENCY_LIMITS !== 'false';

/**
 * Wrapper for render operations with concurrency control
 */
export async function withRenderConcurrency<T>(operation: () => Promise<T>): Promise<T> {
  if (!CONCURRENCY_LIMITS_ENABLED) {
    return operation();
  }
  return resourcePools.render.execute(operation);
}

/**
 * Wrapper for TTS operations with concurrency control
 */
export async function withTTSConcurrency<T>(operation: () => Promise<T>): Promise<T> {
  if (!CONCURRENCY_LIMITS_ENABLED) {
    return operation();
  }
  return resourcePools.tts.execute(operation);
}

/**
 * Wrapper for storage operations with concurrency control
 */
export async function withStorageConcurrency<T>(operation: () => Promise<T>): Promise<T> {
  if (!CONCURRENCY_LIMITS_ENABLED) {
    return operation();
  }
  return resourcePools.storage.execute(operation);
}

/**
 * Get concurrency statistics for all pools
 */
export function getConcurrencyStats() {
  return {
    enabled: CONCURRENCY_LIMITS_ENABLED,
    pools: {
      render: resourcePools.render.getStats(),
      tts: resourcePools.tts.getStats(),
      storage: resourcePools.storage.getStats(),
    },
  };
}
