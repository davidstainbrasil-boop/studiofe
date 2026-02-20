import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AnalyticsEvent, AnalyticsMetrics, AnalyticsReport } from './analytics-types';
import { AnalyticsMetricsCalculator } from './analytics-metrics-calculator';
import { AnalyticsReportGenerator } from './analytics-report-generator';

/**
 * Advanced Analytics System - Fase 5: Integrações Premium
 * Sistema completo de analytics e reporting para vídeos, avatares e engagement
 * Refatorado para reduzir complexidade dividindo em módulos menores
 */

export class AdvancedAnalyticsSystem {
  private supabase = supabaseAdmin;
  private metricsCalculator = new AnalyticsMetricsCalculator();
  private reportGenerator = new AnalyticsReportGenerator();

  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        ...event,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      const { error } = await (this.supabase as any)
        .from('analytics_events')
        .insert({
          id: analyticsEvent.id,
          event_type: analyticsEvent.type,
          user_id: analyticsEvent.userId,
          session_id: analyticsEvent.sessionId,
          event_data: {
            video_id: analyticsEvent.videoId,
            metadata: analyticsEvent.metadata
          },
          created_at: analyticsEvent.timestamp.toISOString(),
        } as any);

      if (error) {
        logger.error('Error tracking analytics event:', error);
        throw error;
      }

      logger.info('Analytics event tracked successfully', { eventId: analyticsEvent.id });
      return analyticsEvent;
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  async batchTrackEvents(events: Array<Omit<AnalyticsEvent, 'id' | 'timestamp'>>): Promise<AnalyticsEvent[]> {
    try {
      const analyticsEvents = events.map(event => ({
        ...event,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      }));

      const { error } = await (this.supabase as any)
        .from('analytics_events')
        .insert(
          analyticsEvents.map(event => ({
            id: event.id,
            event_type: event.type,
            user_id: event.userId,
            session_id: event.sessionId,
            event_data: {
              video_id: event.videoId,
              metadata: event.metadata
            },
            created_at: event.timestamp.toISOString(),
          })) as any
        );

      if (error) {
        logger.error('Error batch tracking analytics events:', error);
        throw error;
      }

      logger.info('Analytics events batch tracked successfully', { count: analyticsEvents.length });
      return analyticsEvents;
    } catch (error) {
      logger.error('Error batch tracking analytics events:', error);
      throw error;
    }
  }

  async calculateMetrics(period: { start: Date; end: Date }): Promise<AnalyticsMetrics> {
    try {
      // Fetch events from database
      const { data: events, error } = await (this.supabase as any)
        .from('analytics_events')
        .select('*')
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching analytics events:', error);
        throw error;
      }

      // Convert database events to AnalyticsEvent format
      const analyticsEvents: AnalyticsEvent[] = ((events || []) as Array<Record<string, any>>).map(event => {
        const eventData = (event.event_data || {}) as Record<string, any>;
        const rawType = event.event_type as AnalyticsEvent['type'];
        const type: AnalyticsEvent['type'] =
          rawType === 'video_view' ||
          rawType === 'user_interaction' ||
          rawType === 'quiz_completion' ||
          rawType === 'subscription' ||
          rawType === 'error'
            ? rawType
            : 'error';

        return {
          id: String(event.id),
          type,
          userId: event.user_id || undefined,
          sessionId: String(event.session_id || 'unknown'),
          videoId: eventData.video_id || undefined,
          timestamp: new Date(event.created_at || Date.now()),
          metadata: (eventData.metadata || {}) as Record<string, any>,
        };
      });

      // Calculate all metrics using the calculator
      const [videoMetrics, userMetrics, engagementMetrics, performanceMetrics, revenueMetrics] = await Promise.all([
        this.metricsCalculator.calculateVideoMetrics(analyticsEvents, period),
        this.metricsCalculator.calculateUserMetrics(analyticsEvents, period),
        this.metricsCalculator.calculateEngagementMetrics(analyticsEvents, period),
        this.metricsCalculator.calculatePerformanceMetrics(analyticsEvents, period),
        this.metricsCalculator.calculateRevenueMetrics(analyticsEvents, period)
      ]);

      const metrics: AnalyticsMetrics = {
        videoMetrics,
        userMetrics,
        engagementMetrics,
        performanceMetrics,
        revenueMetrics
      };

      logger.info('Analytics metrics calculated successfully', { period });
      return metrics;
    } catch (error) {
      logger.error('Error calculating analytics metrics:', error);
      throw error;
    }
  }

  async generateReport(params: {
    title: string;
    period: { start: Date; end: Date };
  }): Promise<AnalyticsReport> {
    try {
      const metrics = await this.calculateMetrics(params.period);
      return await this.reportGenerator.generateReport({
        title: params.title,
        period: params.period,
        metrics
      });
    } catch (error) {
      logger.error('Error generating analytics report:', error);
      throw error;
    }
  }
}
