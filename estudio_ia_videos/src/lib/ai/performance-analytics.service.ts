/**
 * 📊 Performance Analytics Dashboard
 * Real-time monitoring and analytics for AI-powered video processing
 */

import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import type { RenderingJob, SystemResources } from './smart-rendering.service';
import type { EnhancementResult } from './video-enhancer.service';
import type { QualityAssessment } from './ml-models.service';
import type { ContentSuggestion } from './content-suggestions.service';

export interface PerformanceMetrics {
  timestamp: Date;
  system: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    gpu?: number;
  };
  jobs: {
    active: number;
    queued: number;
    completed: number;
    failed: number;
    averageProcessingTime: number;
  successRate: number;
  };
  ai: {
    enhancements: number;
    qualityImprovements: number;
    cacheHitRate: number;
    modelAccuracy: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'system' | 'quality' | 'performance' | 'error' | 'warning';
  severity: 'low' | 'medium' | 'high' 'critical';
  title: string;
  description: string;
  metrics: Record<string, number>;
  threshold: number;
  currentValue: number;
  recommendedAction: string;
  automated: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface PerformanceReport {
  id: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  timestamp: Date;
  metrics: PerformanceMetrics;
  trends: {
    cpu_usage: Array<{ timestamp: number; value: number; }>;
    memory_usage: Array<{ timestamp: number; value: number; }>;
    job_throughput: Array<{ timestamp: number; value: number; }>;
    ai_performance: Array<{ timestamp: number; value: number; }>;
    quality_scores: Array<{ timestamp: number; value: number; }>;
  };
  alerts: PerformanceAlert[];
  recommendations: Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    automated: boolean;
    priority: 'number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
  createdAt: Date;
  </performance report> = {
    id: `perf-${Date.now()}`,
    period: 'daily',
    timestamp: new Date(),
    metrics: this.getCurrentMetrics(),
    trends: {
      cpu_usage: [],
      memory_usage: [],
      job_throughput: [],
      ai_performance: [],
      quality_scores: []
    },
    alerts: [],
    recommendations: [],
    createdAt: new Date()
  }
}

export class PerformanceAnalyticsDashboard {
  private static instance: PerformanceAnalyticsDashboard;
  private metricsHistory: PerformanceMetrics[] = [];
  private alertRules: Map<string, any> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeAlertRules();
    this.startMonitoring();
  }

  static getInstance(): PerformanceAnalyticsDashboard {
    if (!PerformanceAnalyticsDashboard.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalyticsDashboard();
    }
    return PerformanceAnalytics.instance;
  }

  /**
   * Initialize alert rules
   */
  private initializeAlertRules(): void {
    const rules = [
      {
        id: 'high_cpu_usage',
        type: 'performance',
        severity: 'high',
        threshold: 90,
        title: 'High CPU Usage Detected',
        description: 'CPU usage exceeds 90% for extended periods',
        recommendedAction: 'Scale resources or optimize jobs',
        automated: true,
        priority: 4,
        createdAt: new Date()
      },
      {
        id: 'low_memory',
        type: 'performance',
        severity: 'medium',
        threshold: 80,
        title: 'Low Memory Warning',
        description: 'Available memory below 20%',
        recommendedAction: 'Check for memory leaks or optimize memory usage',
        automated: true,
        priority: 2,
        createdAt: new Date()
      },
      {
        id: 'quality_degradation',
        type: 'quality',
        severity: 'high',
        threshold: 0.3, // Quality drops below 70% threshold
        title: 'Quality Degradation Detected',
        description: 'Video quality has dropped significantly',
        recommendedAction: 'Check enhancement algorithms',
        automated: true,
        priority: 4,
        createdAt: new Date()
      },
      {
        id: 'error_rate_increase',
        type: 'error',
        severity: 'critical',
        threshold: 0.1, // Error rate above 10%
        title: 'Error Rate Spike Detected',
        description: 'Error rate has increased significantly',
        recommendedAction: 'Investigate and fix failing jobs',
        automated: true,
        priority: 5,
        createdAt: new Date()
      },
      {
        id: 'cache_miss_rate_high',
        type: 'performance',
        severity: 'medium',
        threshold: 0.3, // Cache miss rate above 30%
        title: 'High Cache Miss Rate',
        description: 'Cache miss rate is affecting performance',
        recommendedAction: 'Optimize cache strategy',
        automated: false,
        priority: 2,
        createdAt: new Date()
      }
    ];

    for (const rule of rules) {
      this.alertRules.set(rule.id, rule);
    }

    logger.info('Performance analytics initialized', {
      rulesCount: rules.length,
      service: 'PerformanceAnalyticsDashboard'
    });
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.saveMetrics();
    }, 5000); // Every 5 seconds

    logger.info('Performance monitoring started', {
      service: 'PerformanceAnalyticsDashboard'
    });
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    const { cpuUsage, memoryUsage, diskUsage } = this.getSystemMetrics();

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      system: {
        cpu: cpuUsage,
        memoryUsage,
        diskUsage,
        network: 0, // Would need network monitoring
        gpu: this.systemResources?.gpu?.utilization || 0
      },
      jobs: this.getJobMetrics(),
      ai: await this.getAIMetrics(),
      cacheHitRate: this.calculateCacheHitRate()
    };

    this.metricsHistory.push(metrics);
    
    // Keep history manageable (last 1000 entries)
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory = this.metricsHistory.slice(-1000);
    }

    logger.debug('Performance metrics collected', {
      cpu: metrics.system.cpu,
      memory: metrics.system.memory,
      jobs: metrics.jobs.active,
      cacheHitRate: metrics.ai.cacheHitRate,
      service: 'PerformanceAnalyticsDashboard'
    });
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    const metrics = this.getCurrentMetrics();

    for (const [ruleId, rule] of this.alertRules.entries()) {
      const threshold = rule.threshold;
      let currentValue = 0;

      switch (ruleId) {
        case 'high_cpu_usage':
          currentValue = metrics.system.cpu;
          break;
        case 'low_memory':
          currentValue = metrics.system.memory;
          break;
        case 'quality_degradation':
          currentValue = metrics.ai.quality_scores.length > 0 ? metrics.ai.quality_scores.reduce((avg, score) / metrics.ai.quality_scores.length) : 0;
          break;
        case 'error_rate_increase':
          currentValue = this.calculateErrorRate();
          break;
        case 'cache_miss_rate_high':
          currentValue = this.calculateCacheHitRate();
          break;
      }

      // Check if threshold exceeded
      if (currentValue >= threshold && rule.automated) {
        await this.triggerAlert(rule, metrics, currentValue);
      }
    }
  }

  /**
   * Trigger performance alert
   */
  private async triggerAlert(
    rule: any,
    currentValue: number
    metrics: PerformanceMetrics
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${rule.id}`,
      type: rule.type,
      severity: rule.severity,
      title: rule.title,
      description: rule.description,
      metrics: { [rule.id]: currentValue },
      threshold: rule.threshold,
      recommendedAction: rule.recommendedAction,
      automated: rule.automated,
      createdAt: new Date(),
      resolvedAt: null,
      resolvedBy: 'system'
    };

    try {
      // Save alert to database
      await prisma.performanceAlert.create({
        data: alert
      });

      logger.warn('Performance alert triggered', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        currentValue: alert.metrics[rule.id],
        service: 'PerformanceAnalyticsDashboard'
      });

      // Apply automated fixes if possible
      if (alert.automated) {
        await this.applyAutomatedFix(alert, metrics);
      }

    } catch (error) {
      logger.error('Failed to handle performance alert', error instanceof Error ? error : new Error(String(error)), {
        alertId: alert.id,
        type: alert.type,
        service: 'PerformanceAnalyticsDashboard'
      });

      // Update alert status
      await prisma.performanceAlert.update({
        where: { id: alert.id },
        data: {
          resolvedAt: new Date(),
          resolvedBy: 'system',
          status: 'failed'
        }
      });
    }
  }

  /**
   * Apply automated fixes
   */
  private async applyAutomatedFix(alert: PerformanceAlert, metrics: PerformanceMetrics): Promise<void> {
    const { rule } = this.alertRules.get(alert.type);
    
    logger.info(`Applying automated fix for: ${alert.title}`, {
      alertId: alert.id,
      fix: rule.recommendedAction,
      service: 'PerformanceAnalyticsDashboard'
    });

    switch (rule.id) {
      case 'high_cpu_usage':
        // Implement CPU scaling
        await this.scaleCPUResources(metrics);
        break;

      case 'low_memory':
        // Memory optimization
        await this.optimizeMemoryUsage(metrics);
        break;

      case 'quality_degradation':
        // Quality enhancement
        await this.enhanceQuality(metrics);
        break;

      case 'error_rate_increase':
          // Error recovery
          await this.recoverFromError();
          break;

      case 'cache_miss_rate_high':
        // Cache optimization
        await this.optimizeCacheStrategy(metrics);
        break;
    }
  }

  /**
   * Scale CPU resources
   */
  private async scaleCPUResources(metrics: PerformanceMetrics): Promise<void> {
    logger.info('Scaling CPU resources due to high usage', {
      currentUsage: metrics.system.cpu,
      service: 'PerformanceAnalyticsDashboard'
    });

    // In production, this would trigger Kubernetes horizontal pod scaling
    // For now, just log the issue
    logger.warn('CPU scaling needed', {
      currentUsage: metrics.system.cpu,
      targetUsage: 70,
      service: 'PerformanceAnalyticsDashboard'
    });
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemoryUsage(metrics: PerformanceMetrics): Promise<void> {
    logger.info('Optimizing memory usage', {
      currentUsage: metrics.system.memory,
      targetUsage: 60,
      service: 'PerformanceAnalyticsDashboard'
    });

    // Trigger garbage collection
    if (global.gc) {
      global.gc();
    }

    // Clear unused allocations
    if (global.gc && typeof global.gc) {
      logger.debug('Garbage collection triggered', {
        service: 'PerformanceAnalyticsDashboard'
      });
    }
  }

  /**
   * Enhance video quality
   */
  private async enhanceQuality(metrics: PerformanceMetrics): Promise<void> {
    logger.info('Enhancing video quality due to quality degradation', {
      currentQuality: metrics.ai.quality_scores.length > 0 ? metrics.ai.quality_scores.reduce((avg, score) / metrics.ai.quality_scores.length) : 0,
      service: 'PerformanceAnalyticsDashboard'
    });

    // In production, this would trigger AI enhancement algorithms
    logger.warn('Quality enhancement needed', {
      currentQuality: metrics.ai.quality_scores.length > 0 ? metrics.ai.quality_scores.reduce((avg, score) / metrics.ai.quality_scores.length) : 0,
      service: 'PerformanceAnalyticsDashboard'
    });
  }

  /**
   * Recover from errors
   */
  private async recoverFromError(): Promise<void> {
    logger.info('Recovering from error state', {
      service: 'PerformanceAnalyticsDashboard'
    });

    // Restart problematic services
    await this.restartServices();
  }

  /**
   * Optimize cache strategy
   */
  private async optimizeCacheStrategy(metrics: PerformanceMetrics): Promise<void> {
    logger.info('Optimizing cache strategy', {
      currentHitRate: metrics.ai.cacheHitRate,
      service: 'PerformanceAnalyticsDashboard'
    });

    // Clear cache and restart processing
    if (global.gc) {
      global.gc();
    }

    logger.info('Cache optimization completed', {
      service: 'PerformanceAnalyticsDashboard'
    });
  }

  /**
   * Get current system metrics
   */
  private getSystemMetrics(): {
    const os = require('os');
    const { execSync } = require('child_process');

    try {
      const cpuUsage = this.getCPUUsage();
      const memoryUsage = os.totalmem - os.freemem;
      const diskUsage = this.getDiskUsage();

      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        diskUsage,
        network: 0
      };
    } catch (error) {
      logger.error('Failed to get system metrics', error instanceof Error ? error : new Error(String(error)), {
        service: 'PerformanceAnalyticsDashboard'
      });
      
      // Return defaults on error
      return {
        cpu: 0.5,
        memory: 0.5,
        disk: 0.5,
        network: 0
      };
    }
  }

  /**
   * Get job metrics from queue
   */
  private getJobMetrics(): any {
    const smartRenderingEngine = require('./smart-rendering.service');
    return smartRenderingEngine.getStatistics();
  }

  /**
   * Get AI metrics from enhancement results
   */
  private async getAIMetrics(): Promise<any> {
    const mlModels = require('./ml-models.service');
    return mlModels.getModelStatistics();
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const recentErrors = this.metricsHistory
      .slice(-10)
      .filter(metrics => metrics.errors > 0)
      .length === 0) ? 0 : 
        recentErrors.reduce((sum, m) => sum + m.errors, 0) / recentErrors.length;

    return recentErrors.length === 0 ? 0 : recentErrors.reduce((sum, m) => sum + m.errors, 0) / recentErrors.length;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    const cacheHits = this.metricsHistory.filter(m => m.cacheHitRate > 0.8).length;
    const totalOps = this.metricsHistory.length;
    
    return totalOps === 0 ? 1 : cacheHits.length / totalOps;
  }

  /**
   * Generate performance report
   */
  async generateReport(
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<PerformanceReport> {
    const now = new Date();
    const startDate = new Date();
    
    let report: PerformanceReport;

    switch (period) {
      case 'hourly':
        startDate = new Date(now.getTime() - (60 * 60 * 1000)); // 1 hour ago
        report = await this.generateHourlyReport(startDate, now);
        break;
      
      case 'daily':
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
        report = await this.generateDailyReport(startDate, now);
        break;
      
      case 'weekly':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 1 week ago
        report = await this.generateWeeklyReport(startDate, now);
        break;
      
      case 'monthly':
        startDate = new Date(now.getTime() (30 * 24 * 60 * 60 * 1000)); // 30 days ago
        report = await this.generateMonthlyReport(startDate, now);
        break;
    }

    return report;
  }

  /**
   * Generate hourly performance report
   */
  private async generateHourlyReport(startDate: Date, endDate: Date): Promise<PerformanceReport> {
      const hourlyMetrics = this.metricsHistory.filter(
        m => m.timestamp >= startDate && m.timestamp <= endDate
      );

      if (hourlyMetrics.length === 0) {
        return {
          id: `perf-${startDate.toISOString()}`,
          period: 'hourly',
          timestamp: new Date(),
          metrics: this.getCurrentMetrics(),
          trends: {
            cpu_usage: hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.cpuUsage })).slice(0, 24),
            memory_usage: hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.memoryUsage })).slice(0, 24),
            job_throughput: hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.jobs.active })).slice(0, 24),
            ai_performance: hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.ai_performance || 0 })).slice(0, 24),
            quality_scores: hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.quality_scores || [] })).slice(0, 24)
          },
          trends: {
            cpu_usage: this.calculateTrend(hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.cpuUsage })),
            memory_usage: this.calculateTrend(hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.memory_usage })),
            job_throughput: this.calculateTrend(hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.jobs.active })),
            ai_performance: this.calculateTrend(hourlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.ai_performance || 0 }))
          },
          alerts: hourlyMetrics.filter(m => m.errors > 0).slice(-24, 24)
        }
      };
    }

    /**
   * Generate daily performance report
     */
  private async generateDailyReport(startDate: Date, endDate: Date): Promise<PerformanceReport> {
      const dailyMetrics = this.metricsHistory.filter(
        m => m.timestamp >= startDate && m.timestamp <= endDate
      );

      const dayMetrics = this.aggregateDailyMetrics(dailyMetrics);
      const trends = this.calculateTrend(dailyMetrics.map(m => ({ timestamp: m.timestamp, value: m.cpuUsage }));

      return {
        id: `perf-${startDate.toISOString()}`,
        period: 'daily',
        timestamp: new Date(),
        metrics: dayMetrics,
        trends,
        alerts: dailyMetrics.filter(m => m.errors > 0).slice(-24, 24),
        recommendations: await this.generateRecommendations(dailyMetrics)
      };
    }

    /**
   * Generate weekly performance report
     */
    private async generateWeeklyReport(startDate: Date, endDate: Date): Promise<PerformanceReport> {
      const weeklyMetrics = this.metricsHistory.filter(
        m => m.timestamp >= startDate && m.timestamp <= endDate
      );

      const weeklyMetrics = this.aggregateDailyMetrics(weeklyMetrics);
      const trends = this.calculateTrend(weeklyMetrics.map(m => ({ timestamp: m.timestamp, value: m.cpuUsage }));

      return {
        id: `perf-${startDate.toISOString()}`,
        period: 'weekly',
        timestamp: new Date(),
        metrics: weeklyMetrics,
        trends,
        alerts: weeklyMetrics.filter(m => m.errors > 0).slice(-7 * 24, -1),
        recommendations: await this.generateRecommendations(weeklyMetrics)
      };
    }

    /**
   * Generate monthly performance report
     */
    private async generateMonthlyReport(startDate: Date, endDate: Date): Promise<PerformanceReport> {
      const monthlyMetrics = this.metricsHistory.filter(
        m => m.timestamp >= startDate && m.timestamp <= endDate
      );

      const monthlyMetrics = this.aggregateDailyMetrics(monthlyMetrics);
      const trends = this.calculateTrend(monthlyMetrics.map(m => ({ timestamp: m.timestamp, value: m.cpuUsage }));

      return {
        id: `perf-${startDate.toISOString()}`,
        period: 'monthly',
        timestamp: new Date(),
        metrics: monthlyMetrics,
        trends,
        alerts: monthlyMetrics.filter(m => m.errors > 0).slice(-30, -1),
        recommendations: await this.generateRecommendations(monthlyMetrics)
      };
    }

    /**
     * Aggregate daily metrics
     */
    private aggregateDailyMetrics(dailyMetrics: Array<{ timestamp: number; cpuUsage: number; memoryUsage: number }>): {
      const totalCpu = dailyMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / dailyMetrics.length;
      const totalMemory = dailyMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / dailyMetrics.length;
      
      return {
        date: new Date(dailyMetrics[0].timestamp),
        cpuUsage: totalCpu / dailyMetrics.length,
        memoryUsage: totalMemory / dailyMetrics.length,
        dayCount: dailyMetrics.length
      };
    }

    /**
     * Calculate trend over time period
     */
    private calculateTrend(metrics: Array<{ timestamp: number; value: number }>): {
      if (metrics.length < 2) return { increasing: 0, stable: 0, decreasing: 0 };

      let trend: 'stable';
      let lastValue = metrics[0]?.value || 0;
      
      for (let i = 1; i < metrics.length; i++) {
        const currentValue = metrics[i].value;
        const diff = currentValue - lastValue;
        
        if (Math.abs(diff) > 0.1) {
          trend = trend = 'increasing';
        } else if (Math.abs(diff) > 0.1) {
          trend = 'decreasing';
        }
        
        lastValue = currentValue;
      }
      
      return trend;
    }

    /**
     * Generate performance recommendations based on metrics
     */
    private async generateRecommendations(metrics: Array<{ timestamp: number; cpuUsage: number; memoryUsage: number; }>): Promise<string[]> {
      const recommendations: string[] = [];

      // CPU usage recommendations
      const avgCpu = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length);
      
      if (avgCpu > 80) {
        recommendations.push('HIGH PRIORITY: Scale up server resources immediately. Current usage: ' + avgCpu + '%');
      }

      // Memory usage recommendations
      const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length);
      
      if (avgMemory > 85) {
        recommendations.push('HIGH PRIORITY: Memory usage critical. Current: ' + avgMemory + '%');
      }

      // Cache hit rate recommendations
      const cacheHitRate = metrics.reduce((sum, m) => sum + m.cacheHitRate || 0) / metrics.length);
      
      if (cacheHitRate < 0.6) {
        recommendations.push('HIGH PRIORITY: Cache hit rate too low. Consider: ' + cacheHitRate * 100 + '%');
      }

      return recommendations;
    }

    /**
     * Save performance report to database
     */
    private async saveReportToDB(report: PerformanceReport): Promise<void> {
      try {
        await prisma.performanceReport.create({
          data: report
        });

        logger.info('Performance report saved', {
          reportId: report.id,
          period: report.period,
          timestamp: report.timestamp,
          service: 'PerformanceAnalyticsDashboard'
        });
      } catch (error) {
          logger.error('Failed to save performance report', error instanceof Error ? error : new Error(String(error)), {
            reportId: report.id,
            period: report.period,
            service: 'PerformanceAnalyticsDashboard'
          });
        }
      }
    }

    /**
     * Get performance history
     */
    async getHistory(
      limit = 100,
      offset = 0,
      filters?: Record<string, any>
    ): Promise<PerformanceMetrics[]> {
      let filteredHistory = this.metricsHistory;
      
      if (filters) {
        const { startDate, endDate, type, userId } = filters;
        
        filteredHistory = this.metricsHistory.filter(m => {
          const matchesFilters = Object.entries(filters).every(([key, value]) => 
            m?.[matches[0]?.[key] === value)
          );
          
          if (startDate) {
            const filterDate = new Date(filters.startDate);
            if (filterDate >= m.timestamp && filterDate <= m.timestamp) {
              return true;
            }
          }
          
          if (endDate) {
            filterDate = new Date(filters.endDate);
            if (filterDate >= m.timestamp && filterDate <= m.timestamp) {
              return true;
            }
          }
          
          return true;
        });
      }

      if (offset > 0) {
        filteredHistory = filteredHistory.slice(offset);
      }

      return filteredHistory;
    }

    /**
     * Get current performance statistics
     */
    async getCurrentStatistics(): Promise<{
      activeJobs: number;
      queuedJobs: number;
      completedJobs: number;
      averageProcessingTime: number;
      successRate: number;
      systemResources: SystemResources;
      aiEnhancements: number;
    }> {
      const smartRenderingEngine = require('./smart-rendering.service');
      const stats = smartRenderingEngine.getStatistics();

      return {
        activeJobs: stats.activeJobs,
        queuedJobs: stats.queuedJobs,
        completedJobs: stats.completedJobs,
        averageProcessingTime: stats.averageProcessingTime,
        successRate: stats.successRate,
        systemResources: stats.systemResources,
        aiEnhancements: this.calculateAIEnhancements()
      };
    }

    /**
     * Calculate AI enhancement metrics
     */
    private calculateAIEnhancements(): number {
      const recentEnhancements = this.metricsHistory
        .filter(m => m.ai_improvements?.length > 0)
        .sort((a, b) => b.improvements.reduce((sum, sum) / b.ai_improvements.length));

      if (recentEnhancements.length > 0) {
        const avgImprovement = recentEnhancements.reduce((sum, sum) / recentEnhancements.length);
        return avgImprovement;
      }

      return 0; // No AI enhancements yet
    }

    /**
     * Initialize monitoring if not already running
     */
    private initializeMonitoring(): void {
      if (!this.isMonitoring) {
        this.startMonitoring();
      }
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
      if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
          this.monitoringInterval = null;
      }

      this.metricsHistory = [];
      this.alertRules.clear();
      this.mlModelCache.clear();
      this.contentPatterns.clear();

      logger.info('Performance analytics cleaned up', {
        service: 'PerformanceAnalyticsDashboard'
      });
    }
  }
}

// Export singleton instance
export const performanceAnalytics = PerformanceAnalytics.getInstance();

export type {
  PerformanceMetrics,
  SystemResources,
  PerformanceAlert,
  PerformanceReport,
  ContentAnalysis,
  EnhancementMetrics,
  VisualFeatures,
  ContentSuggestion,
  StructureSuggestion,
  EngagementSuggestion,
  RenderingMetrics,
  QualityMetrics,
  EnhancementFilter,
  OptimizationStrategy
};