/**
 * Performance Analytics Service
 * Real system metrics monitoring with alerting and reporting
 */

import { cpus, freemem, totalmem, uptime, loadavg } from 'os';
import { logger } from '@lib/logger';

export interface PerformanceSnapshot {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  system: SystemMetrics;
  jobs: JobMetrics;
}

export interface CPUMetrics {
  count: number;
  usage: number;
  loadAverage: [number, number, number];
  perCore: Array<{ idle: number; total: number; usage: number }>;
}

export interface MemoryMetrics {
  total: number;
  free: number;
  used: number;
  usagePercent: number;
  heapTotal: number;
  heapUsed: number;
  rss: number;
  external: number;
}

export interface SystemMetrics {
  uptime: number;
  platform: string;
  nodeVersion: string;
  processUptime: number;
  activeHandles: number;
}

export interface JobMetrics {
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  throughput: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'job' | 'error';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceReport {
  id: string;
  period: { start: Date; end: Date };
  snapshots: number;
  summary: {
    avgCpuUsage: number;
    maxCpuUsage: number;
    avgMemoryUsage: number;
    maxMemoryUsage: number;
    totalJobsProcessed: number;
    avgProcessingTime: number;
    alertsTriggered: number;
  };
  alerts: PerformanceAlert[];
  generatedAt: Date;
}

export interface AlertThresholds {
  cpuWarning: number;
  cpuCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  jobQueueWarning: number;
  processingTimeWarning: number;
}

export class PerformanceAnalyticsService {
  private static instance: PerformanceAnalyticsService;
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: AlertThresholds;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private jobCounters = { completed: 0, failed: 0, totalProcessingTime: 0 };
  private maxSnapshots = 1000;
  private previousCpuTimes: { idle: number; total: number } | null = null;

  private constructor() {
    this.thresholds = {
      cpuWarning: 0.8,
      cpuCritical: 0.95,
      memoryWarning: 0.8,
      memoryCritical: 0.9,
      jobQueueWarning: 50,
      processingTimeWarning: 300000
    };
    logger.info('PerformanceAnalyticsService initialized', { service: 'PerformanceAnalytics' });
  }

  static getInstance(): PerformanceAnalyticsService {
    if (!PerformanceAnalyticsService.instance) {
      PerformanceAnalyticsService.instance = new PerformanceAnalyticsService();
    }
    return PerformanceAnalyticsService.instance;
  }

  startMonitoring(intervalMs = 30000): void {
    if (this.monitoringInterval) return;
    this.monitoringInterval = setInterval(() => {
      const snapshot = this.captureSnapshot();
      this.snapshots.push(snapshot);
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots = this.snapshots.slice(-this.maxSnapshots);
      }
      this.checkAlerts(snapshot);
    }, intervalMs);
    logger.info('Performance monitoring started', { intervalMs, service: 'PerformanceAnalytics' });
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Performance monitoring stopped', { service: 'PerformanceAnalytics' });
    }
  }

  captureSnapshot(): PerformanceSnapshot {
    return {
      timestamp: new Date(),
      cpu: this.getCPUMetrics(),
      memory: this.getMemoryMetrics(),
      system: this.getSystemMetrics(),
      jobs: this.getJobMetrics()
    };
  }

  getCPUMetrics(): CPUMetrics {
    const cpuList = cpus();
    const perCore = cpuList.map(c => {
      const total = c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq;
      return { idle: c.times.idle, total, usage: total > 0 ? 1 - c.times.idle / total : 0 };
    });

    // Calculate delta-based CPU usage
    const currentIdle = cpuList.reduce((s, c) => s + c.times.idle, 0);
    const currentTotal = cpuList.reduce((s, c) => s + c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq, 0);

    let usage = 0;
    if (this.previousCpuTimes) {
      const idleDelta = currentIdle - this.previousCpuTimes.idle;
      const totalDelta = currentTotal - this.previousCpuTimes.total;
      usage = totalDelta > 0 ? 1 - idleDelta / totalDelta : 0;
    } else {
      usage = perCore.reduce((s, c) => s + c.usage, 0) / perCore.length;
    }
    this.previousCpuTimes = { idle: currentIdle, total: currentTotal };

    const la = loadavg();

    return {
      count: cpuList.length,
      usage: Math.min(1, Math.max(0, usage)),
      loadAverage: [la[0], la[1], la[2]] as [number, number, number],
      perCore
    };
  }

  getMemoryMetrics(): MemoryMetrics {
    const total = totalmem();
    const free = freemem();
    const mem = process.memoryUsage();

    return {
      total,
      free,
      used: total - free,
      usagePercent: total > 0 ? (total - free) / total : 0,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      rss: mem.rss,
      external: mem.external
    };
  }

  getSystemMetrics(): SystemMetrics {
    return {
      uptime: uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      processUptime: process.uptime(),
      activeHandles: (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles?.()?.length ?? 0
    };
  }

  getJobMetrics(): JobMetrics {
    return {
      activeJobs: 0,
      queuedJobs: 0,
      completedJobs: this.jobCounters.completed,
      failedJobs: this.jobCounters.failed,
      averageProcessingTime: this.jobCounters.completed > 0
        ? this.jobCounters.totalProcessingTime / this.jobCounters.completed
        : 0,
      throughput: this.calculateThroughput()
    };
  }

  recordJobCompletion(processingTimeMs: number): void {
    this.jobCounters.completed++;
    this.jobCounters.totalProcessingTime += processingTimeMs;
  }

  recordJobFailure(): void {
    this.jobCounters.failed++;
  }

  private calculateThroughput(): number {
    const recentSnapshots = this.snapshots.filter(
      s => s.timestamp.getTime() > Date.now() - 3600000
    );
    if (recentSnapshots.length < 2) return 0;
    const first = recentSnapshots[0];
    const last = recentSnapshots[recentSnapshots.length - 1];
    const durationHours = (last.timestamp.getTime() - first.timestamp.getTime()) / 3600000;
    return durationHours > 0 ? this.jobCounters.completed / durationHours : 0;
  }

  private checkAlerts(snapshot: PerformanceSnapshot): void {
    if (snapshot.cpu.usage > this.thresholds.cpuCritical) {
      this.createAlert('cpu', 'critical', `CPU usage critical: ${(snapshot.cpu.usage * 100).toFixed(1)}%`, snapshot.cpu.usage, this.thresholds.cpuCritical);
    } else if (snapshot.cpu.usage > this.thresholds.cpuWarning) {
      this.createAlert('cpu', 'warning', `CPU usage high: ${(snapshot.cpu.usage * 100).toFixed(1)}%`, snapshot.cpu.usage, this.thresholds.cpuWarning);
    }

    if (snapshot.memory.usagePercent > this.thresholds.memoryCritical) {
      this.createAlert('memory', 'critical', `Memory usage critical: ${(snapshot.memory.usagePercent * 100).toFixed(1)}%`, snapshot.memory.usagePercent, this.thresholds.memoryCritical);
    } else if (snapshot.memory.usagePercent > this.thresholds.memoryWarning) {
      this.createAlert('memory', 'warning', `Memory usage high: ${(snapshot.memory.usagePercent * 100).toFixed(1)}%`, snapshot.memory.usagePercent, this.thresholds.memoryWarning);
    }
  }

  private createAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], message: string, value: number, threshold: number): void {
    const existing = this.alerts.find(a => a.type === type && !a.resolved && a.severity === severity);
    if (existing) return; // Don't duplicate

    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    logger.warn('Performance alert', { alertId: alert.id, type, severity, message, service: 'PerformanceAnalytics' });
  }

  generateReport(periodMs = 3600000): PerformanceReport {
    const now = Date.now();
    const periodSnapshots = this.snapshots.filter(s => s.timestamp.getTime() > now - periodMs);
    const periodAlerts = this.alerts.filter(a => a.timestamp.getTime() > now - periodMs);

    const cpuUsages = periodSnapshots.map(s => s.cpu.usage);
    const memUsages = periodSnapshots.map(s => s.memory.usagePercent);
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      id: `report-${Date.now()}`,
      period: { start: new Date(now - periodMs), end: new Date(now) },
      snapshots: periodSnapshots.length,
      summary: {
        avgCpuUsage: avg(cpuUsages),
        maxCpuUsage: cpuUsages.length > 0 ? Math.max(...cpuUsages) : 0,
        avgMemoryUsage: avg(memUsages),
        maxMemoryUsage: memUsages.length > 0 ? Math.max(...memUsages) : 0,
        totalJobsProcessed: this.jobCounters.completed,
        avgProcessingTime: this.jobCounters.completed > 0 ? this.jobCounters.totalProcessingTime / this.jobCounters.completed : 0,
        alertsTriggered: periodAlerts.length
      },
      alerts: periodAlerts,
      generatedAt: new Date()
    };
  }

  getRecentAlerts(limit = 20): PerformanceAlert[] {
    return this.alerts.slice(-limit).reverse();
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  updateThresholds(updates: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...updates };
    logger.info('Alert thresholds updated', { thresholds: this.thresholds, service: 'PerformanceAnalytics' });
  }

  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  getSnapshots(limit = 100): PerformanceSnapshot[] {
    return this.snapshots.slice(-limit);
  }

  async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.snapshots = [];
    this.alerts = [];
    this.jobCounters = { completed: 0, failed: 0, totalProcessingTime: 0 };
    logger.info('PerformanceAnalyticsService cleaned up', { service: 'PerformanceAnalytics' });
  }
}

export const performanceAnalyticsService = PerformanceAnalyticsService.getInstance();
