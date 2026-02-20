import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
/**
 * Advanced Analytics System - Fase 5: Integrações Premium
 * Sistema completo de analytics e reporting para vídeos, avatares e engagement
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AnalyticsMetrics {
  videoMetrics: VideoMetrics
  userMetrics: UserMetrics
  engagementMetrics: EngagementMetrics
  performanceMetrics: PerformanceMetrics
  revenueMetrics: RevenueMetrics
}

export interface VideoMetrics {
  totalVideos: number
  totalViews: number
  totalWatchTime: number // hours
  averageVideoLength: number // minutes
  completionRate: number // percentage
  topVideos: Array<{
    id: string
    title: string
    views: number
    engagement: number
  }>
  videosByCategory: Record<string, number>
  videosByLanguage: Record<string, number>
}

export interface UserMetrics {
  totalUsers: number
  activeUsers: number
  newUsers: number
  returningUsers: number
  userRetentionRate: number // percentage
  averageSessionDuration: number // minutes
  topUsers: Array<{
    id: string
    name: string
    watchTime: number
    videosWatched: number
  }>
}

export interface EngagementMetrics {
  interactionRate: number // percentage
  quizCompletionRate: number // percentage
  averageQuizScore: number
  clickThroughRate: number // percentage (for CTAs)
  dropOffPoints: Array<{
    timestamp: number
    percentage: number
  }>
  heatmap: Array<{
    timestamp: number
    engagement: number // 0-100
  }>
}

export interface PerformanceMetrics {
  averageLoadTime: number // seconds
  averageRenderTime: number // seconds
  successRate: number // percentage
  errorRate: number // percentage
  queueMetrics: {
    waiting: number
    active: number
    completed: number
    failed: number
  }
  workerMetrics: {
    totalWorkers: number
    activeWorkers: number
    averageJobTime: number
  }
}

export interface RevenueMetrics {
  totalRevenue: number
  creditsUsed: number
  creditsPurchased: number
  averageRevenuePerUser: number
  revenueByService: Record<string, number>
  conversionRate: number // percentage
}

export interface AnalyticsEvent {
  id: string
  type: 'video_view' | 'video_complete' | 'interaction' | 'quiz_submit' | 'cta_click' | 'error'
  videoId?: string
  userId?: string
  sessionId: string
  timestamp: Date
  data: Record<string, any>
  metadata: {
    userAgent?: string
    ip?: string
    country?: string
    device?: string
    browser?: string
  }
}

export interface AnalyticsReport {
  id: string
  type: 'video' | 'user' | 'engagement' | 'revenue' | 'custom'
  title: string
  description?: string
  period: {
    start: Date
    end: Date
  }
  metrics: AnalyticsMetrics
  insights: string[]
  recommendations: string[]
  generatedAt: Date
}

// ============================================================================
// ADVANCED ANALYTICS SYSTEM
// ============================================================================

export class AdvancedAnalyticsSystem {
  private events: Map<string, AnalyticsEvent> = new Map()
  private reports: Map<string, AnalyticsReport> = new Map()

  // ============================================================================
  // EVENT TRACKING
  // ============================================================================

  /**
   * Track analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent> {
    const newEvent: AnalyticsEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date()
    }

    this.events.set(newEvent.id, newEvent)

    // Persist to database
    await this.saveEvent(newEvent)

    // Send to external analytics (Google Analytics, Mixpanel, etc.)
    await this.sendToExternalAnalytics(newEvent)

    return newEvent
  }

  /**
   * Batch track events
   */
  async batchTrackEvents(events: Array<Omit<AnalyticsEvent, 'id' | 'timestamp'>>): Promise<AnalyticsEvent[]> {
    return await Promise.all(events.map(event => this.trackEvent(event)))
  }

  // ============================================================================
  // METRICS CALCULATION
  // ============================================================================

  /**
   * Calculate all metrics for period
   */
  async calculateMetrics(period: { start: Date; end: Date }): Promise<AnalyticsMetrics> {
    const [
      videoMetrics,
      userMetrics,
      engagementMetrics,
      performanceMetrics,
      revenueMetrics
    ] = await Promise.all([
      this.calculateVideoMetrics(period),
      this.calculateUserMetrics(period),
      this.calculateEngagementMetrics(period),
      this.calculatePerformanceMetrics(period),
      this.calculateRevenueMetrics(period)
    ])

    return {
      videoMetrics,
      userMetrics,
      engagementMetrics,
      performanceMetrics,
      revenueMetrics
    }
  }

  /**
   * Calculate video metrics
   */
  private async calculateVideoMetrics(period: { start: Date; end: Date }): Promise<VideoMetrics> {
    // Get all video events in period
    const videoEvents = this.getEventsInPeriod(period).filter(e =>
      e.type === 'video_view' || e.type === 'video_complete'
    )

    const videoViews = new Map<string, number>()
    const videoCompletions = new Map<string, number>()
    const videoWatchTime = new Map<string, number>()

    videoEvents.forEach(event => {
      const videoId = event.videoId || 'unknown'

      if (event.type === 'video_view') {
        videoViews.set(videoId, (videoViews.get(videoId) || 0) + 1)
        videoWatchTime.set(videoId, (videoWatchTime.get(videoId) || 0) + (event.data.duration || 0))
      } else if (event.type === 'video_complete') {
        videoCompletions.set(videoId, (videoCompletions.get(videoId) || 0) + 1)
      }
    })

    const totalViews = Array.from(videoViews.values()).reduce((sum, count) => sum + count, 0)
    const totalCompletions = Array.from(videoCompletions.values()).reduce((sum, count) => sum + count, 0)

    return {
      totalVideos: videoViews.size,
      totalViews,
      totalWatchTime: Array.from(videoWatchTime.values()).reduce((sum, time) => sum + time, 0) / 3600,
      averageVideoLength: videoWatchTime.size > 0
        ? Array.from(videoWatchTime.values()).reduce((sum, t) => sum + t, 0) / videoWatchTime.size / 60
        : 0,
      completionRate: totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0,
      topVideos: Array.from(videoViews.entries())
        .map(([id, views]) => ({
          id,
          title: id,
          views,
          engagement: videoCompletions.get(id)
            ? ((videoCompletions.get(id) || 0) / views) * 100
            : 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 20),
      videosByCategory: {},
      videosByLanguage: {}
    }
  }

  /**
   * Calculate user metrics
   */
  private async calculateUserMetrics(period: { start: Date; end: Date }): Promise<UserMetrics> {
    const events = this.getEventsInPeriod(period)

    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean))
    const sessions = new Map<string, { start: Date; end: Date }>()

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, {
          start: event.timestamp,
          end: event.timestamp
        })
      } else {
        const session = sessions.get(event.sessionId)!
        if (event.timestamp > session.end) {
          session.end = event.timestamp
        }
      }
    })

    const totalSessionDuration = Array.from(sessions.values()).reduce((sum, session) => {
      return sum + (session.end.getTime() - session.start.getTime())
    }, 0)

    // Calculate new vs returning users from database
    let newUsers = 0
    let returningUsers = 0
    try {
      const { count: newCount } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString())
      newUsers = newCount || 0

      // Returning users: appeared in events but created before this period
      const userIds = Array.from(uniqueUsers).filter((id): id is string => Boolean(id))
      if (userIds.length > 0) {
        const { count: retCount } = await supabaseAdmin
          .from('users')
          .select('id', { count: 'exact', head: true })
          .in('id', userIds.slice(0, 100))
          .lt('created_at', period.start.toISOString())
        returningUsers = retCount || 0
      }
    } catch (err) {
      logger.error('[AdvancedAnalyticsSystem] Error calculating user metrics from DB:', { error: err })
    }

    // Active users: users with at least 2 events in the period
    const userEventCount = new Map<string, number>()
    events.forEach(e => {
      if (e.userId) {
        userEventCount.set(e.userId, (userEventCount.get(e.userId) || 0) + 1)
      }
    })
    const activeUsers = Array.from(userEventCount.values()).filter(count => count >= 2).length

    const totalUsersInPeriod = uniqueUsers.size
    const userRetentionRate = totalUsersInPeriod > 0
      ? (returningUsers / totalUsersInPeriod) * 100
      : 0

    return {
      totalUsers: uniqueUsers.size,
      activeUsers,
      newUsers,
      returningUsers,
      userRetentionRate,
      averageSessionDuration: sessions.size > 0 ? (totalSessionDuration / sessions.size) / 60000 : 0,
      topUsers: []
    }
  }

  /**
   * Calculate engagement metrics
   */
  private async calculateEngagementMetrics(period: { start: Date; end: Date }): Promise<EngagementMetrics> {
    const events = this.getEventsInPeriod(period)

    const totalViews = events.filter(e => e.type === 'video_view').length
    const totalInteractions = events.filter(e => e.type === 'interaction').length
    const quizEvents = events.filter(e => e.type === 'quiz_submit')
    const ctaEvents = events.filter(e => e.type === 'cta_click')

    const correctQuizzes = quizEvents.filter(e => e.data.correct).length
    const averageQuizScore = quizEvents.length > 0
      ? (correctQuizzes / quizEvents.length) * 100
      : 0

    return {
      interactionRate: totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0,
      quizCompletionRate: quizEvents.length > 0 ? (quizEvents.filter(e => e.data.completed).length / quizEvents.length) * 100 : 0,
      averageQuizScore,
      clickThroughRate: totalViews > 0 ? (ctaEvents.length / totalViews) * 100 : 0,
      dropOffPoints: [],
      heatmap: []
    }
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(period: { start: Date; end: Date }): Promise<PerformanceMetrics> {
    const events = this.getEventsInPeriod(period)

    const loadTimes = events
      .filter(e => e.data.loadTime)
      .map(e => e.data.loadTime)

    const renderTimes = events
      .filter(e => e.data.renderTime)
      .map(e => e.data.renderTime)

    const totalEvents = events.length
    const errorEvents = events.filter(e => e.type === 'error').length

    return {
      averageLoadTime: loadTimes.length > 0
        ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
        : 0,
      averageRenderTime: renderTimes.length > 0
        ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
        : 0,
      successRate: totalEvents > 0 ? ((totalEvents - errorEvents) / totalEvents) * 100 : 0,
      errorRate: totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0,
      queueMetrics: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      },
      workerMetrics: {
        totalWorkers: 0,
        activeWorkers: 0,
        averageJobTime: 0
      }
    }
  }

  /**
   * Calculate revenue metrics
   */
  private async calculateRevenueMetrics(period: { start: Date; end: Date }): Promise<RevenueMetrics> {
    let totalRevenue = 0
    let creditsUsed = 0
    let creditsPurchased = 0
    let totalPaidUsers = 0
    let totalUsers = 0
    const revenueByService: Record<string, number> = {}

    try {
      // Get subscription revenue in period
      const { data: subs } = await (supabaseAdmin as any)
        .from('subscriptions')
        .select('plan, amount, status')
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString())

      if (subs) {
        for (const sub of subs) {
          const amount = Number(sub.amount) || 0
          totalRevenue += amount
          totalPaidUsers++
          const plan = String(sub.plan || 'unknown')
          revenueByService[plan] = (revenueByService[plan] || 0) + amount
        }
      }

      // Total users in period for conversion rate
      const { count } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .lte('created_at', period.end.toISOString())
      totalUsers = count || 0
    } catch (err) {
      logger.error('[AdvancedAnalyticsSystem] Error calculating revenue metrics:', { error: err })
    }

    return {
      totalRevenue,
      creditsUsed,
      creditsPurchased,
      averageRevenuePerUser: totalPaidUsers > 0 ? totalRevenue / totalPaidUsers : 0,
      revenueByService,
      conversionRate: totalUsers > 0 ? (totalPaidUsers / totalUsers) * 100 : 0
    }
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  /**
   * Generate analytics report
   */
  async generateReport(params: {
    type: AnalyticsReport['type']
    title: string
    description?: string
    period: { start: Date; end: Date }
  }): Promise<AnalyticsReport> {
    const metrics = await this.calculateMetrics(params.period)
    const insights = this.generateInsights(metrics)
    const recommendations = this.generateRecommendations(metrics)

    const report: AnalyticsReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type: params.type,
      title: params.title,
      description: params.description,
      period: params.period,
      metrics,
      insights,
      recommendations,
      generatedAt: new Date()
    }

    this.reports.set(report.id, report)
    await this.saveReport(report)

    return report
  }

  /**
   * Generate insights from metrics
   */
  private generateInsights(metrics: AnalyticsMetrics): string[] {
    const insights: string[] = []

    // Video insights
    if (metrics.videoMetrics.completionRate < 50) {
      insights.push(`Low completion rate (${metrics.videoMetrics.completionRate.toFixed(1)}%) suggests content may be too long or not engaging enough`)
    }

    if (metrics.videoMetrics.totalViews > 1000) {
      insights.push(`Strong viewership with ${metrics.videoMetrics.totalViews} total views`)
    }

    // Engagement insights
    if (metrics.engagementMetrics.interactionRate > 30) {
      insights.push(`High interaction rate (${metrics.engagementMetrics.interactionRate.toFixed(1)}%) indicates strong engagement`)
    }

    if (metrics.engagementMetrics.averageQuizScore < 60) {
      insights.push(`Quiz performance is below average (${metrics.engagementMetrics.averageQuizScore.toFixed(1)}%), consider reviewing content difficulty`)
    }

    // Performance insights
    if (metrics.performanceMetrics.averageLoadTime > 3) {
      insights.push(`Average load time is ${metrics.performanceMetrics.averageLoadTime.toFixed(1)}s, optimization recommended`)
    }

    if (metrics.performanceMetrics.errorRate > 5) {
      insights.push(`Error rate is ${metrics.performanceMetrics.errorRate.toFixed(1)}%, investigate common failure points`)
    }

    return insights
  }

  /**
   * Generate recommendations from metrics
   */
  private generateRecommendations(metrics: AnalyticsMetrics): string[] {
    const recommendations: string[] = []

    // Video recommendations
    if (metrics.videoMetrics.completionRate < 70) {
      recommendations.push('Consider shorter video segments or adding more interactive elements')
      recommendations.push('Add chapter markers to allow users to skip to relevant sections')
    }

    // Engagement recommendations
    if (metrics.engagementMetrics.interactionRate < 20) {
      recommendations.push('Add more interactive elements (quizzes, CTAs, hotspots) to increase engagement')
    }

    if (metrics.engagementMetrics.clickThroughRate < 5) {
      recommendations.push('Improve CTA placement and messaging to increase click-through rate')
    }

    // Performance recommendations
    if (metrics.performanceMetrics.averageLoadTime > 2) {
      recommendations.push('Optimize video encoding and use CDN for faster delivery')
      recommendations.push('Implement progressive loading for better perceived performance')
    }

    if (metrics.performanceMetrics.errorRate > 2) {
      recommendations.push('Improve error handling and implement automatic retry logic')
    }

    return recommendations
  }

  /**
   * Export report to PDF/Excel
   */
  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'json'): Promise<string> {
    const report = this.reports.get(reportId)
    if (!report) {
      throw new Error(`Report ${reportId} not found`)
    }

    logger.info(`[AdvancedAnalyticsSystem] Exporting report ${reportId} as ${format}`)

    if (format === 'json') {
      // Store JSON export in Supabase Storage
      try {
        const jsonContent = JSON.stringify(report, null, 2)
        const filePath = `exports/report-${reportId}.json`
        const { error } = await supabaseAdmin.storage
          .from('uploads')
          .upload(filePath, Buffer.from(jsonContent), {
            contentType: 'application/json',
            upsert: true,
          })

        if (error) {
          logger.error('[AdvancedAnalyticsSystem] Failed to upload report:', { error: error.message })
        } else {
          const { data: urlData } = supabaseAdmin.storage
            .from('uploads')
            .getPublicUrl(filePath)
          return urlData.publicUrl
        }
      } catch (err) {
        logger.error('[AdvancedAnalyticsSystem] Error exporting report:', { error: err })
      }
    }

    // Fallback: log export request for PDF/Excel (requires external service)
    logger.info(`[AdvancedAnalyticsSystem] Export format '${format}' logged for async processing`)
    return `/exports/report-${reportId}.${format}`
  }

  // ============================================================================
  // DASHBOARD DATA
  // ============================================================================

  /**
   * Get dashboard data
   */
  async getDashboardData(period: { start: Date; end: Date }): Promise<{
    summary: {
      totalViews: number
      uniqueViewers: number
      totalWatchTime: number
      averageEngagement: number
    }
    charts: {
      viewsOverTime: Array<{ date: string; views: number }>
      engagementByVideo: Array<{ videoId: string; engagement: number }>
      userGrowth: Array<{ date: string; users: number }>
      revenueOverTime: Array<{ date: string; revenue: number }>
    }
    topContent: {
      videos: Array<{ id: string; title: string; views: number }>
      quizzes: Array<{ id: string; title: string; completions: number }>
    }
    realtimeMetrics: {
      activeViewers: number
      currentLoad: number
      queueSize: number
    }
  }> {
    const metrics = await this.calculateMetrics(period)

    return {
      summary: {
        totalViews: metrics.videoMetrics.totalViews,
        uniqueViewers: metrics.userMetrics.totalUsers,
        totalWatchTime: metrics.videoMetrics.totalWatchTime,
        averageEngagement: metrics.engagementMetrics.interactionRate
      },
      charts: {
        viewsOverTime: await this.getViewsOverTime(period),
        engagementByVideo: [],
        userGrowth: [],
        revenueOverTime: []
      },
      topContent: {
        videos: metrics.videoMetrics.topVideos.slice(0, 10),
        quizzes: []
      },
      realtimeMetrics: {
        activeViewers: 0,
        currentLoad: 0,
        queueSize: 0
      }
    }
  }

  /**
   * Get views over time (for charts)
   */
  private async getViewsOverTime(period: { start: Date; end: Date }): Promise<Array<{ date: string; views: number }>> {
    const events = this.getEventsInPeriod(period).filter(e => e.type === 'video_view')

    const viewsByDate = new Map<string, number>()

    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0]
      viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1)
    })

    return Array.from(viewsByDate.entries())
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get events in period
   */
  private getEventsInPeriod(period: { start: Date; end: Date }): AnalyticsEvent[] {
    return Array.from(this.events.values()).filter(event =>
      event.timestamp >= period.start && event.timestamp <= period.end
    )
  }

  /**
   * Save event to database
   */
  private async saveEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('analytics_events')
        .insert({
          id: event.id,
          event_type: event.type,
          video_id: event.videoId || null,
          user_id: event.userId || null,
          session_id: event.sessionId,
          data: event.data as unknown as Record<string, unknown>,
          metadata: event.metadata as unknown as Record<string, unknown>,
          created_at: event.timestamp.toISOString(),
        })

      if (error) {
        logger.error('[AdvancedAnalyticsSystem] Failed to save event:', { id: event.id, error: error.message })
      } else {
        logger.info('[AdvancedAnalyticsSystem] Saved event:', event.id)
      }
    } catch (err) {
      logger.error('[AdvancedAnalyticsSystem] Error saving event:', { id: event.id, error: err })
    }
  }

  /**
   * Save report to database
   */
  private async saveReport(report: AnalyticsReport): Promise<void> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('analytics_reports')
        .upsert({
          id: report.id,
          type: report.type,
          title: report.title,
          description: report.description || null,
          period_start: report.period.start.toISOString(),
          period_end: report.period.end.toISOString(),
          metrics: report.metrics as unknown as Record<string, unknown>,
          insights: report.insights,
          recommendations: report.recommendations,
          generated_at: report.generatedAt.toISOString(),
        } as any, { onConflict: 'id' })

      if (error) {
        logger.error('[AdvancedAnalyticsSystem] Failed to save report:', { id: report.id, error: error.message })
      } else {
        logger.info('[AdvancedAnalyticsSystem] Saved report:', report.id)
      }
    } catch (err) {
      logger.error('[AdvancedAnalyticsSystem] Error saving report:', { id: report.id, error: err })
    }
  }

  /**
   * Send to external analytics
   */
  private async sendToExternalAnalytics(event: AnalyticsEvent): Promise<void> {
    // External analytics integration (Google Analytics, Mixpanel, etc.)
    // Currently logs events for future integration when API keys are configured
    logger.debug('[AdvancedAnalyticsSystem] External analytics event logged:', event.type)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const advancedAnalyticsSystem = new AdvancedAnalyticsSystem()
