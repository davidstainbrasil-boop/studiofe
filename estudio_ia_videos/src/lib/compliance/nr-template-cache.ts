/**
 * NR Template Cache
 * Caches compliance templates for faster access
 */

import { NRCode, checkCompliance } from '@lib/compliance/nr-engine';
import { logger } from '@lib/logger';

interface CachedResult {
  result: Awaited<ReturnType<typeof checkCompliance>>;
  timestamp: number;
  contentHash: string;
}

class NRTemplateCache {
  private cache: Map<string, CachedResult> = new Map();
  private ttl: number = 30 * 60 * 1000; // 30 minutes
  private maxSize: number = 100;

  /**
   * Generate cache key from NR code and content hash
   */
  private generateKey(nr: NRCode, contentHash: string): string {
    return `${nr}:${contentHash}`;
  }

  /**
   * Generate content hash for caching
   */
  private hashContent(content: unknown): string {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    // Simple hash for caching purposes
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached compliance result or compute new one
   */
  async getCompliance(nr: NRCode, content: unknown, useAi = false): Promise<Awaited<ReturnType<typeof checkCompliance>>> {
    const contentHash = this.hashContent(content);
    const key = this.generateKey(nr, contentHash);

    // Check cache
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.ttl) {
      logger.info('NR compliance cache hit', { nr, key: key.substring(0, 20) });
      return cached.result;
    }

    // Compute new result
    logger.info('NR compliance cache miss, computing...', { nr });
    const result = await checkCompliance(nr, content, useAi);

    // Store in cache
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      contentHash
    });

    // Enforce max size (LRU-style: remove oldest)
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    return result;
  }

  /**
   * Preload common NR compliance checks
   */
  async preloadCommon(content: unknown): Promise<void> {
    const commonNRs: NRCode[] = ['NR-06', 'NR-10', 'NR-35'];
    
    logger.info('Preloading common NR compliance checks');
    
    await Promise.all(
      commonNRs.map(nr => this.getCompliance(nr, content))
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttl / 60000
    };
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('NR template cache cleared');
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`NR template cache cleanup: removed ${removed} entries`);
    }

    return removed;
  }
}

export const nrTemplateCache = new NRTemplateCache();

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => nrTemplateCache.cleanup(), 10 * 60 * 1000);
}
