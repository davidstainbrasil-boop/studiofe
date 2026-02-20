import { logger } from '@/lib/logger';
import { AnalyticsMetrics, AnalyticsReport } from './analytics-types';

/**
 * Analytics Report Generator - Separated from main analytics system
 * to reduce file complexity and improve maintainability
 */

export class AnalyticsReportGenerator {
  generateInsights(metrics: AnalyticsMetrics): string[] {
    const insights: string[] = [];

    // Video insights
    if (metrics.videoMetrics.completionRate < 50) {
      insights.push('Low video completion rate detected. Consider improving video quality or shortening content.');
    }
    if (metrics.videoMetrics.totalViews > 1000) {
      insights.push('High video engagement! Current content strategy is working well.');
    }

    // Engagement insights
    if (metrics.engagementMetrics.interactionRate > 30) {
      insights.push('Excellent user interaction rate. Content is highly engaging.');
    }
    if (metrics.engagementMetrics.averageQuizScore < 60) {
      insights.push('Quiz scores are below average. Consider reviewing quiz difficulty or content clarity.');
    }

    // Performance insights
    if (metrics.performanceMetrics.averageLoadTime > 3) {
      insights.push('Slow load times detected. Consider optimizing performance.');
    }
    if (metrics.performanceMetrics.errorRate > 5) {
      insights.push('High error rate detected. Investigate and fix technical issues.');
    }

    return insights;
  }

  generateRecommendations(metrics: AnalyticsMetrics): string[] {
    const recommendations: string[] = [];

    // Video recommendations
    if (metrics.videoMetrics.completionRate < 70) {
      recommendations.push('Improve video completion rate by adding more engaging content at the beginning.');
    }

    // Engagement recommendations
    if (metrics.engagementMetrics.interactionRate < 20) {
      recommendations.push('Increase user engagement by adding interactive elements like quizzes and polls.');
    }
    if (metrics.engagementMetrics.clickThroughRate < 5) {
      recommendations.push('Improve click-through rates by optimizing titles and thumbnails.');
    }

    // Performance recommendations
    if (metrics.performanceMetrics.averageLoadTime > 2) {
      recommendations.push('Optimize load times by implementing caching and CDN.');
    }

    return recommendations;
  }

  async generateReport(params: {
    title: string;
    period: { start: Date; end: Date };
    metrics: AnalyticsMetrics;
  }): Promise<AnalyticsReport> {
    try {
      const insights = this.generateInsights(params.metrics);
      const recommendations = this.generateRecommendations(params.metrics);

      const report: AnalyticsReport = {
        id: `report_${Date.now()}`,
        title: params.title,
        period: params.period,
        metrics: params.metrics,
        insights,
        recommendations,
        generatedAt: new Date()
      };

      logger.info('Analytics report generated successfully', { reportId: report.id });
      return report;
    } catch (error) {
      logger.error('Error generating analytics report:', error);
      throw error;
    }
  }
}