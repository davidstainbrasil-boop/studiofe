/**
 * API Quota Monitor Service
 * Tracks and displays quota usage for external APIs
 * D-ID, HeyGen, ElevenLabs, Azure Speech
 */

import { logger } from '@lib/logger';

export interface QuotaInfo {
  service: string;
  used: number;
  total: number;
  remaining: number;
  percentage: number;
  resetDate?: Date;
  warning: boolean;
  critical: boolean;
}

export interface AllQuotas {
  did: QuotaInfo | null;
  heygen: QuotaInfo | null;
  elevenlabs: QuotaInfo | null;
  azure: QuotaInfo | null;
  lastUpdated: Date;
  hasWarnings: boolean;
  hasCritical: boolean;
}

export class APIQuotaMonitor {
  private cache: AllQuotas | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastFetch: number = 0;

  /**
   * Get D-ID quota
   */
  async getDIDQuota(): Promise<QuotaInfo | null> {
    const apiKey = process.env.DID_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.d-id.com/credits', {
        headers: {
          'Authorization': `Basic ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        logger.warn('Failed to fetch D-ID quota', { status: response.status });
        return null;
      }

      const data = await response.json();
      const remaining = data.remaining || 0;
      const total = data.total || 20; // Default for trial
      const used = total - remaining;
      const percentage = Math.round((used / total) * 100);

      return {
        service: 'D-ID',
        used,
        total,
        remaining,
        percentage,
        warning: percentage >= 80,
        critical: percentage >= 95 || remaining <= 2
      };
    } catch (error) {
      logger.error('Error fetching D-ID quota', error as Error);
      return null;
    }
  }

  /**
   * Get HeyGen quota
   */
  async getHeyGenQuota(): Promise<QuotaInfo | null> {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        logger.warn('Failed to fetch HeyGen quota', { status: response.status });
        return null;
      }

      const data = await response.json();
      const remaining = data.data?.remaining_quota || 0;
      const total = 1000; // Estimated based on plan
      const used = total - remaining;
      const percentage = Math.round((used / total) * 100);

      return {
        service: 'HeyGen',
        used,
        total,
        remaining,
        percentage,
        warning: percentage >= 80,
        critical: percentage >= 95 || remaining <= 50
      };
    } catch (error) {
      logger.error('Error fetching HeyGen quota', error as Error);
      return null;
    }
  }

  /**
   * Get ElevenLabs quota
   */
  async getElevenLabsQuota(): Promise<QuotaInfo | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': apiKey
        }
      });

      if (!response.ok) {
        logger.warn('Failed to fetch ElevenLabs quota', { status: response.status });
        return null;
      }

      const data = await response.json();
      const subscription = data.subscription || {};
      const used = subscription.character_count || 0;
      const total = subscription.character_limit || 10000;
      const remaining = total - used;
      const percentage = Math.round((used / total) * 100);
      const resetDate = subscription.next_character_count_reset_unix 
        ? new Date(subscription.next_character_count_reset_unix * 1000)
        : undefined;

      return {
        service: 'ElevenLabs',
        used,
        total,
        remaining,
        percentage,
        resetDate,
        warning: percentage >= 80,
        critical: percentage >= 95 || remaining <= 500
      };
    } catch (error) {
      logger.error('Error fetching ElevenLabs quota', error as Error);
      return null;
    }
  }

  /**
   * Get Azure Speech quota (estimated from usage)
   */
  async getAzureQuota(): Promise<QuotaInfo | null> {
    const apiKey = process.env.AZURE_SPEECH_KEY;
    if (!apiKey) return null;

    // Azure doesn't have a direct quota API, return estimated usage
    // In production, track usage in database
    return {
      service: 'Azure Speech',
      used: 0,
      total: 500000, // Free tier monthly characters
      remaining: 500000,
      percentage: 0,
      warning: false,
      critical: false
    };
  }

  /**
   * Get all quotas with caching
   */
  async getAllQuotas(forceRefresh = false): Promise<AllQuotas> {
    const now = Date.now();
    
    // Return cached if still valid
    if (!forceRefresh && this.cache && (now - this.lastFetch) < this.cacheExpiry) {
      return this.cache;
    }

    logger.info('Fetching API quotas', { component: 'APIQuotaMonitor' });

    const [did, heygen, elevenlabs, azure] = await Promise.all([
      this.getDIDQuota(),
      this.getHeyGenQuota(),
      this.getElevenLabsQuota(),
      this.getAzureQuota()
    ]);

    const quotas = [did, heygen, elevenlabs, azure].filter(Boolean) as QuotaInfo[];

    this.cache = {
      did,
      heygen,
      elevenlabs,
      azure,
      lastUpdated: new Date(),
      hasWarnings: quotas.some(q => q.warning),
      hasCritical: quotas.some(q => q.critical)
    };

    this.lastFetch = now;

    // Log warnings
    if (this.cache.hasCritical) {
      logger.warn('CRITICAL: API quota almost exhausted!', { 
        quotas: quotas.filter(q => q.critical).map(q => q.service)
      });
    } else if (this.cache.hasWarnings) {
      logger.warn('WARNING: API quota running low', {
        quotas: quotas.filter(q => q.warning).map(q => q.service)
      });
    }

    return this.cache;
  }

  /**
   * Check if a specific service has quota available
   */
  async hasQuotaAvailable(service: 'did' | 'heygen' | 'elevenlabs' | 'azure'): Promise<boolean> {
    const quotas = await this.getAllQuotas();
    const quota = quotas[service];
    return quota ? quota.remaining > 0 && !quota.critical : false;
  }

  /**
   * Get formatted quota summary for display
   */
  async getQuotaSummary(): Promise<string> {
    const quotas = await this.getAllQuotas();
    const lines: string[] = [];

    if (quotas.did) {
      lines.push(`D-ID: ${quotas.did.remaining}/${quotas.did.total} créditos${quotas.did.warning ? ' ⚠️' : ''}`);
    }
    if (quotas.heygen) {
      lines.push(`HeyGen: ${quotas.heygen.remaining} quota${quotas.heygen.warning ? ' ⚠️' : ''}`);
    }
    if (quotas.elevenlabs) {
      lines.push(`ElevenLabs: ${quotas.elevenlabs.remaining.toLocaleString()}/${quotas.elevenlabs.total.toLocaleString()} chars${quotas.elevenlabs.warning ? ' ⚠️' : ''}`);
    }

    return lines.join('\n');
  }
}

export const apiQuotaMonitor = new APIQuotaMonitor();
