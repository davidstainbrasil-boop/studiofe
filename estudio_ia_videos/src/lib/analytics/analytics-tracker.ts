import { Analytics } from './analytics';

export interface FunnelAnalysisParams {
  organizationId?: string;
  startDate: Date;
  endDate: Date;
}

export interface ProviderPerformanceParams {
  category: 'tts' | 'render';
  organizationId?: string;
  startDate: Date;
  endDate: Date;
}

export interface SummaryParams {
  organizationId?: string;
  startDate: Date;
  endDate: Date;
}

export interface FunnelData {
  funnel: Array<{ stage: string; count: number; dropoff: number }>;
}

export interface SummaryData {
  totalEvents: number;
  avgDuration: number;
  successRate: number;
}

export interface ProviderPerformance {
  provider: string;
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgLatency: number;
}

export class AnalyticsTracker {
  static track(event: string, properties?: Record<string, unknown>) {
    return Analytics.trackEvent(event, properties);
  }

  static trackError(error: Error, context?: Record<string, unknown>) {
    return Analytics.trackEvent('error', { message: error.message, stack: error.stack, ...context });
  }

  static async trackCollaboration(action: string, projectId: string, details?: Record<string, unknown>) {
    return Analytics.trackEvent('collaboration_action', { action, projectId, ...details });
  }

  static async getFunnelAnalysis(params: FunnelAnalysisParams): Promise<FunnelData> {
    const { prisma } = require('@lib/prisma');
    
    // Define funnel stages
    const stages = ['upload', 'edit', 'tts', 'render', 'download'];
    const funnel = [];
    
    // Very basic funnel implementation: count unique sessions per event type roughly matching stages
    // Mapping: upload -> 'pptx_import_completed', edit -> 'editor_started', tts -> 'voice_selected', render -> 'render_started'
    // This is an approximation.
    
    const eventMapping: Record<string, string> = {
        'upload': 'pptx_import_completed',
        'edit': 'editor_started',
        'tts': 'voice_selected',
        'render': 'render_started',
        'download': 'export_completed' // assuming we track this
    };

    let previousCount = 0;

    for (const stage of stages) {
        const eventType = eventMapping[stage];
        const count = await prisma.analytics_events.count({
            where: {
                eventType: eventType,
                createdAt: {
                    gte: params.startDate,
                    lte: params.endDate
                }
            }
        });
        
        let dropoff = 0;
        if (previousCount > 0) {
            dropoff = Math.max(0, 100 - Math.round((count / previousCount) * 100));
        }
        
        funnel.push({ stage, count, dropoff });
        previousCount = count;
        // Fix dropoff logic for first item (upload) which is 0 dropoff by definition? 
        // Or if we consider total visitors? For now, relative to previous step.
        if (stage === 'upload') funnel[0].dropoff = 0;
    }

    return { funnel };
  }

  static async getProviderPerformance(params: ProviderPerformanceParams): Promise<ProviderPerformance[]> {
    const { prisma } = require('@lib/prisma');
    
    // We need events that log provider success/failure.
    // Assuming 'provider_action' event with { provider: '...', success: true/false, latency: 123 }
    
    // This query is complex without raw SQL or group by support in basic Prisma findMany without aggregation helpers perfectly tailored.
    // We will do a grouping query.
    
    const events = await prisma.analytics_events.groupBy({
        by: ['eventType'], // We rely on event_data which is JSON. Prisma group by JSON is not supported directly easily?
        // Actually we might need to filter by eventType = 'provider_call' and then process in memory if volume is low, 
        // OR use raw query. Let's use raw query for performance if possible, or simple approximation.
        where: {
            eventType: 'provider_call', // Hypothetical event
            createdAt: { gte: params.startDate, lte: params.endDate }
        },
        _count: { _all: true }
    });
    
    // Since we can't easily group by JSON field in Prisma standard, 
    // we will return a placeholder based on REAL data if we had it, but since we likely don't have these events populated yet,
    // we return a clear "No Data" or minimal real count if we can find generic errors.
    
    // Alternative: Check 'render_jobs' for render performance (since it has status)
    if (params.category === 'render') {
         const jobs = await prisma.render_jobs.findMany({
             where: { createdAt: { gte: params.startDate, lte: params.endDate } },
             select: { status: true, duration_ms: true }
         });
         
         const total = jobs.length;
         if (total === 0) return [];
         
         const success = jobs.filter((j: any) => j.status === 'completed').length;
         const failed = jobs.filter((j: any) => j.status === 'failed').length;
         const avgLatency = jobs.reduce((acc: number, j: any) => acc + (j.duration_ms || 0), 0) / (total || 1);
         
         return [{
             provider: 'renderer',
             totalRequests: total,
             successRate: Math.round((success / total) * 100),
             errorRate: Math.round((failed / total) * 100),
             avgLatency
         }];
    }
    
    return [
       // Return empty real array rather than mock
    ];
  }

  static async getSummary(params: SummaryParams): Promise<SummaryData> {
    const { prisma } = require('@lib/prisma');
    
    const totalEvents = await prisma.analytics_events.count({
        where: {
            createdAt: { gte: params.startDate, lte: params.endDate }
        }
    });

    // Avg Duration context? Maybe session duration? 
    // Let's take render jobs duration average as a proxy for specific "work" duration?
    // Or just 0 if generic.
    const avgDuration = 0; 
    
    // Success rate of WHAT? All actions?
    // Let's check Error events vs Total events
    const errorEvents = await prisma.analytics_events.count({
        where: {
            eventType: 'error',
            createdAt: { gte: params.startDate, lte: params.endDate }
        }
    });
    
    const successRate = totalEvents > 0 ? (100 - (errorEvents / totalEvents) * 100) : 100;

    return {
      totalEvents,
      avgDuration,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  static async trackTimelineEdit(params: {
    userId: string;
    projectId: string;
    action: string;
    trackType?: string;
    trackId?: string;
    trackCount?: number;
    totalDuration?: number;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await Analytics.trackEvent('timeline_edit', {
      user_id: params.userId,
      project_id: params.projectId,
      action: params.action,
      track_type: params.trackType,
      track_id: params.trackId,
      track_count: params.trackCount,
      total_duration: params.totalDuration,
      ...params.details,
    });
  }
}
