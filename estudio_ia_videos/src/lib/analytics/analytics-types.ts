/**
 * Advanced Analytics Types - Separated from main analytics system
 * to reduce file complexity and improve maintainability
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
  totalInteractions: number
  interactionRate: number // percentage
  averageQuizScore: number // percentage
  clickThroughRate: number // percentage
  shareRate: number // percentage
  commentRate: number // percentage
  topEngagedContent: Array<{
    id: string
    title: string
    interactions: number
    engagement: number
  }>
}

export interface PerformanceMetrics {
  averageLoadTime: number // seconds
  errorRate: number // percentage
  uptime: number // percentage
  apiResponseTime: number // milliseconds
  cacheHitRate: number // percentage
  bandwidthUsage: number // GB
}

export interface RevenueMetrics {
  totalRevenue: number
  averageRevenuePerUser: number
  subscriptionRevenue: number
  adRevenue: number
  conversionRate: number // percentage
  churnRate: number // percentage
}

export interface AnalyticsEvent {
  id: string
  type: 'video_view' | 'user_interaction' | 'quiz_completion' | 'subscription' | 'error'
  userId?: string
  sessionId: string
  videoId?: string
  timestamp: Date
  metadata: Record<string, any>
}

export interface AnalyticsReport {
  id: string
  title: string
  period: { start: Date; end: Date }
  metrics: AnalyticsMetrics
  insights: string[]
  recommendations: string[]
  generatedAt: Date
}