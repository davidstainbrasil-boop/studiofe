/**
 * Usage Tracker
 *
 * Tracks API usage for billing and analytics
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from '@lib/logger';

const logger = new Logger('usage-tracker');

// =============================================================================
// Types
// =============================================================================

export interface UsageEvent {
  apiKeyId: string;
  userId: string;
  endpoint: string;
  method: string;
  status: number;
  duration: number; // milliseconds
  metadata?: Record<string, unknown>;
}

export interface UsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  usageByDay: Array<{ date: string; count: number }>;
}

// =============================================================================
// Usage Tracker Class
// =============================================================================

export class UsageTracker {
  private supabase: ReturnType<typeof createClient> | null = null;
  private eventQueue: UsageEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);

      // Flush events every 10 seconds
      this.flushInterval = setInterval(() => this.flush(), 10000);
    }
  }

  /**
   * Track an API usage event
   */
  track(event: UsageEvent): void {
    this.eventQueue.push({
      ...event,
      metadata: {
        ...event.metadata,
        timestamp: new Date().toISOString(),
      },
    });

    // Flush if queue is large
    if (this.eventQueue.length >= 100) {
      this.flush();
    }
  }

  /**
   * Track a request with timing
   */
  async trackRequest<T>(
    apiKeyId: string,
    userId: string,
    endpoint: string,
    method: string,
    handler: () => Promise<{ status: number; response: T }>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await handler();
      const duration = Date.now() - startTime;

      this.track({
        apiKeyId,
        userId,
        endpoint,
        method,
        status: result.status,
        duration,
      });

      return result.response;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.track({
        apiKeyId,
        userId,
        endpoint,
        method,
        status: 500,
        duration,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Get usage summary for a user
   */
  async getSummary(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<UsageSummary> {
    if (!this.supabase) {
      return this.getEmptySummary();
    }

    try {
      const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = options?.endDate || new Date();

      // Get total requests
      const { data: events, error } = await (this.supabase
        .from('api_usage' as any)
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()) as any);

      if (error || !events) {
        return this.getEmptySummary();
      }

      // Calculate summary
      const totalRequests = events.length;
      const successfulRequests = events.filter((e: any) => e.status < 400).length;
      const failedRequests = events.filter((e: any) => e.status >= 400).length;
      const averageLatency =
        events.length > 0
          ? events.reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / events.length
          : 0;

      // Top endpoints
      const endpointCounts = new Map<string, number>();
      for (const event of events) {
        const count = endpointCounts.get(event.endpoint) || 0;
        endpointCounts.set(event.endpoint, count + 1);
      }
      const topEndpoints = Array.from(endpointCounts.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Usage by day
      const dayCounts = new Map<string, number>();
      for (const event of events) {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        const count = dayCounts.get(date) || 0;
        dayCounts.set(date, count + 1);
      }
      const usageByDay = Array.from(dayCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageLatency,
        topEndpoints,
        usageByDay,
      };
    } catch (error) {
      logger.error('Failed to get usage summary', error instanceof Error ? error : new Error(String(error)));
      return this.getEmptySummary();
    }
  }

  /**
   * Flush queued events to database
   */
  private async flush(): Promise<void> {
    if (!this.supabase || this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await (this.supabase.from('api_usage' as any) as any).insert(
        events.map((e) => ({
          api_key_id: e.apiKeyId,
          user_id: e.userId,
          endpoint: e.endpoint,
          method: e.method,
          status: e.status,
          duration: e.duration,
          metadata: e.metadata,
        }))
      );
    } catch (error) {
      // Re-queue on failure
      this.eventQueue.push(...events);
      logger.error('Failed to flush usage events', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private getEmptySummary(): UsageSummary {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      topEndpoints: [],
      usageByDay: [],
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// =============================================================================
// Singleton
// =============================================================================

let trackerInstance: UsageTracker | null = null;

export function getUsageTracker(): UsageTracker {
  if (!trackerInstance) {
    trackerInstance = new UsageTracker();
  }
  return trackerInstance;
}

export default UsageTracker;
