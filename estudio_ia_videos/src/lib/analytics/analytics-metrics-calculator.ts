import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AnalyticsEvent, AnalyticsMetrics, VideoMetrics, UserMetrics, EngagementMetrics, PerformanceMetrics, RevenueMetrics } from './analytics-types';

/**
 * Analytics Metrics Calculator - Separated from main analytics system
 * to reduce file complexity and improve maintainability
 */

export class AnalyticsMetricsCalculator {
  private supabase = supabaseAdmin;

  async calculateVideoMetrics(events: AnalyticsEvent[], period: { start: Date; end: Date }): Promise<VideoMetrics> {
    try {
      const videoEvents = events.filter(e => e.type === 'video_view');

      const totalVideos = new Set(videoEvents.map(e => e.videoId)).size;
      const totalViews = videoEvents.length;
      const totalWatchTime = videoEvents.reduce((sum, e) => sum + (e.metadata?.watchTime || 0), 0) / 3600; // Convert to hours

      const averageVideoLength = totalViews > 0 ? totalWatchTime / totalViews * 60 : 0; // Convert to minutes
      const completionRate = totalViews > 0 ?
        (videoEvents.filter(e => e.metadata?.completed).length / totalViews) * 100 : 0;

      // Top videos by views
      const videoViewCounts = videoEvents.reduce((acc, e) => {
        if (e.videoId) {
          acc[e.videoId] = (acc[e.videoId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topVideos = Object.entries(videoViewCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id, views]) => ({ id, title: `Video ${id}`, views, engagement: 0 }));

      // Videos by category and language (placeholder implementation)
      const videosByCategory: Record<string, number> = {};
      const videosByLanguage: Record<string, number> = {};

      return {
        totalVideos,
        totalViews,
        totalWatchTime,
        averageVideoLength,
        completionRate,
        topVideos,
        videosByCategory,
        videosByLanguage
      };
    } catch (error) {
      logger.error('Error calculating video metrics:', error);
      throw error;
    }
  }

  async calculateUserMetrics(events: AnalyticsEvent[], period: { start: Date; end: Date }): Promise<UserMetrics> {
    try {
      const userIds = [...new Set(events.map(e => e.userId).filter(Boolean))];
      const totalUsers = userIds.length;

      // Calculate active users (users with events in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers = new Set(
        events.filter(e => e.timestamp >= thirtyDaysAgo).map(e => e.userId).filter(Boolean)
      ).size;

      // Calculate new users (first event in the period)
      const userFirstEvents = events.reduce((acc, e) => {
        if (e.userId && (!acc[e.userId] || e.timestamp < acc[e.userId])) {
          acc[e.userId] = e.timestamp;
        }
        return acc;
      }, {} as Record<string, Date>);

      const newUsers = Object.values(userFirstEvents).filter(date =>
        date >= period.start && date <= period.end
      ).length;

      const returningUsers = totalUsers - newUsers;
      const userRetentionRate = totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0;

      // Calculate session durations
      const sessions = new Map<string, { start: Date; end: Date; events: AnalyticsEvent[] }>();
      events.forEach(e => {
        if (!sessions.has(e.sessionId)) {
          sessions.set(e.sessionId, { start: e.timestamp, end: e.timestamp, events: [] });
        }
        const session = sessions.get(e.sessionId)!;
        session.end = e.timestamp > session.end ? e.timestamp : session.end;
        session.events.push(e);
      });

      const totalSessionDuration = Array.from(sessions.values()).reduce((sum, s) => {
        return sum + (s.end.getTime() - s.start.getTime()) / (1000 * 60); // Convert to minutes
      }, 0);

      const averageSessionDuration = sessions.size > 0 ? totalSessionDuration / sessions.size : 0;

      // Top users by watch time
      const userWatchTimes = events.reduce((acc, e) => {
        if (e.userId) {
          acc[e.userId] = acc[e.userId] || { watchTime: 0, videosWatched: 0 };
          acc[e.userId].watchTime += e.metadata?.watchTime || 0;
          if (e.type === 'video_view') {
            acc[e.userId].videosWatched += 1;
          }
        }
        return acc;
      }, {} as Record<string, { watchTime: number; videosWatched: number }>);

      const topUsers = Object.entries(userWatchTimes)
        .sort(([, a], [, b]) => b.watchTime - a.watchTime)
        .slice(0, 10)
        .map(([id, data]) => ({ id, name: `User ${id}`, ...data }));

      return {
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers,
        userRetentionRate,
        averageSessionDuration,
        topUsers
      };
    } catch (error) {
      logger.error('Error calculating user metrics:', error);
      throw error;
    }
  }

  async calculateEngagementMetrics(events: AnalyticsEvent[], period: { start: Date; end: Date }): Promise<EngagementMetrics> {
    try {
      const interactionEvents = events.filter(e => e.type === 'user_interaction');
      const totalInteractions = interactionEvents.length;

      const videoViews = events.filter(e => e.type === 'video_view').length;
      const interactionRate = videoViews > 0 ? (totalInteractions / videoViews) * 100 : 0;

      const quizEvents = events.filter(e => e.type === 'quiz_completion');
      const averageQuizScore = quizEvents.length > 0 ?
        quizEvents.reduce((sum, e) => sum + (e.metadata?.score || 0), 0) / quizEvents.length : 0;

      // Placeholder calculations for other metrics
      const clickThroughRate = 0;
      const shareRate = 0;
      const commentRate = 0;

      const topEngagedContent: Array<{ id: string; title: string; interactions: number; engagement: number }> = [];

      return {
        totalInteractions,
        interactionRate,
        averageQuizScore,
        clickThroughRate,
        shareRate,
        commentRate,
        topEngagedContent
      };
    } catch (error) {
      logger.error('Error calculating engagement metrics:', error);
      throw error;
    }
  }

  async calculatePerformanceMetrics(events: AnalyticsEvent[], period: { start: Date; end: Date }): Promise<PerformanceMetrics> {
    try {
      const errorEvents = events.filter(e => e.type === 'error');
      const totalEvents = events.length;
      const errorRate = totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0;

      // Placeholder calculations
      const averageLoadTime = 0;
      const uptime = 99.9;
      const apiResponseTime = 0;
      const cacheHitRate = 0;
      const bandwidthUsage = 0;

      return {
        averageLoadTime,
        errorRate,
        uptime,
        apiResponseTime,
        cacheHitRate,
        bandwidthUsage
      };
    } catch (error) {
      logger.error('Error calculating performance metrics:', error);
      throw error;
    }
  }

  async calculateRevenueMetrics(events: AnalyticsEvent[], period: { start: Date; end: Date }): Promise<RevenueMetrics> {
    try {
      const subscriptionEvents = events.filter(e => e.type === 'subscription');

      // Placeholder calculations
      const totalRevenue = 0;
      const averageRevenuePerUser = 0;
      const subscriptionRevenue = subscriptionEvents.length * 9.99; // Assuming $9.99/month
      const adRevenue = 0;
      const conversionRate = 0;
      const churnRate = 0;

      return {
        totalRevenue,
        averageRevenuePerUser,
        subscriptionRevenue,
        adRevenue,
        conversionRate,
        churnRate
      };
    } catch (error) {
      logger.error('Error calculating revenue metrics:', error);
      throw error;
    }
  }
}