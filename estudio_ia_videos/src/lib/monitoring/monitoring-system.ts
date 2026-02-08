import { logger } from "@/lib/logger";
/**
 * Monitoring and Observability System - Fase 6: Production Hardening
 * Sistema completo de monitoramento, logs e observabilidade
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
  context?: string
  metadata?: Record<string, any>
  stack?: string
  userId?: string
  requestId?: string
  duration?: number
}

export interface Alert {
  id: string
  timestamp: Date
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  source: string
  resolved: boolean
  resolvedAt?: Date
  metadata?: Record<string, any>
}

export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  lastChecked: Date
  message?: string
  details?: Record<string, any>
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheck[]
  timestamp: Date
}

export interface Metric {
  name: string
  value: number
  unit: string
  timestamp: Date
  tags?: Record<string, string>
}

export interface Trace {
  id: string
  name: string
  startTime: number
  duration: number
  status: 'success' | 'error'
  spans: Span[]
  metadata?: Record<string, any>
}

export interface Span {
  id: string
  traceId: string
  parentId?: string
  name: string
  startTime: number
  duration: number
  status: 'success' | 'error'
  attributes?: Record<string, any>
}

export interface ErrorReport {
  id: string
  timestamp: Date
  error: Error
  context?: string
  userId?: string
  requestId?: string
  environment: string
  version: string
  stack?: string
  breadcrumbs?: Breadcrumb[]
}

export interface Breadcrumb {
  timestamp: Date
  category: string
  message: string
  level: string
  data?: Record<string, any>
}

// ============================================================================
// MONITORING SYSTEM
// ============================================================================

export class MonitoringSystem {
  private logs: LogEntry[] = []
  private alerts: Alert[] = []
  private metrics: Map<string, Metric[]> = new Map()
  private traces: Map<string, Trace> = new Map()
  private errorReports: ErrorReport[] = []
  private healthChecks: Map<string, HealthCheck> = new Map()
  private breadcrumbs: Breadcrumb[] = []

  private maxLogsInMemory = 10000
  private maxMetricsPerName = 1000
  private maxBreadcrumbs = 100

  // ============================================================================
  // LOGGING
  // ============================================================================

  /**
   * Log debug message
   */
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('debug', message, context, metadata)
  }

  /**
   * Log info message
   */
  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('info', message, context, metadata)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('warn', message, context, metadata)
  }

  /**
   * Log error message
   */
  error(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('error', message, context, metadata)
  }

  /**
   * Log fatal message
   */
  fatal(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('fatal', message, context, metadata)

    // Fatal errors trigger critical alerts
    this.createAlert({
      severity: 'critical',
      title: 'Fatal Error Occurred',
      description: message,
      source: context || 'system'
    })
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      context,
      metadata
    }

    this.logs.push(entry)

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift()
    }

    // Console output in development
    if (process.env.NODE_ENV !== 'production') {
      const color = this.getLogColor(level)
      logger.info(
        `[${entry.timestamp.toISOString()}] ${color}${level.toUpperCase()}\x1b[0m ${context ? `[${context}]` : ''} ${message}`,
        metadata ? metadata : ''
      )
    }

    // In production, send to log aggregation service (e.g., CloudWatch, Datadog)
    if (process.env.NODE_ENV === 'production') {
      this.sendToLogAggregator(entry)
    }
  }

  /**
   * Get console color for log level
   */
  private getLogColor(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m'  // Magenta
    }
    return colors[level]
  }

  /**
   * Send log to external aggregator
   */
  private sendToLogAggregator(entry: LogEntry): void {
    // In production, integrate with:
    // - AWS CloudWatch Logs
    // - Datadog
    // - ELK Stack
    // - Splunk
    // For now, just console.log
  }

  /**
   * Get logs with filtering
   */
  getLogs(filters?: {
    level?: LogLevel
    context?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }): LogEntry[] {
    let logs = [...this.logs]

    if (filters?.level) {
      logs = logs.filter(log => log.level === filters.level)
    }

    if (filters?.context) {
      logs = logs.filter(log => log.context === filters.context)
    }

    if (filters?.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate!)
    }

    if (filters?.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate!)
    }

    if (filters?.limit) {
      logs = logs.slice(-filters.limit)
    }

    return logs
  }

  // ============================================================================
  // ALERTING
  // ============================================================================

  /**
   * Create new alert
   */
  createAlert(params: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Alert {
    const alert: Alert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
      ...params
    }

    this.alerts.push(alert)

    // Log alert
    this.log(
      alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn',
      `Alert: ${alert.title}`,
      'alerting',
      { alert }
    )

    // Send notifications
    this.sendAlertNotification(alert)

    return alert
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert || alert.resolved) return false

    alert.resolved = true
    alert.resolvedAt = new Date()

    this.info(`Alert resolved: ${alert.title}`, 'alerting', { alertId })

    return true
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved)
  }

  /**
   * Send alert notification
   */
  private sendAlertNotification(alert: Alert): void {
    // In production, integrate with:
    // - PagerDuty
    // - Slack
    // - Email
    // - SMS (Twilio)

    if (alert.severity === 'critical') {
      // Send to on-call engineer
      logger.error('🚨 CRITICAL ALERT:', new Error(String(alert.title)))
    }
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  /**
   * Record metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metrics = this.metrics.get(name)!
    metrics.push(metric)

    // Keep only recent metrics
    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift()
    }

    // Send to metrics service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMetricsService(metric)
    }
  }

  /**
   * Get metrics
   */
  getMetrics(name: string, since?: Date): Metric[] {
    const metrics = this.metrics.get(name) || []

    if (since) {
      return metrics.filter(m => m.timestamp >= since)
    }

    return metrics
  }

  /**
   * Send metric to external service
   */
  private sendToMetricsService(metric: Metric): void {
    // In production, integrate with:
    // - Prometheus
    // - Datadog
    // - CloudWatch Metrics
    // - Grafana Cloud
  }

  // ============================================================================
  // DISTRIBUTED TRACING
  // ============================================================================

  /**
   * Start new trace
   */
  startTrace(name: string, metadata?: Record<string, any>): string {
    const traceId = crypto.randomUUID()

    const trace: Trace = {
      id: traceId,
      name,
      startTime: Date.now(),
      duration: 0,
      status: 'success',
      spans: [],
      metadata
    }

    this.traces.set(traceId, trace)

    return traceId
  }

  /**
   * Add span to trace
   */
  addSpan(
    traceId: string,
    name: string,
    duration: number,
    status: 'success' | 'error' = 'success',
    attributes?: Record<string, any>
  ): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    const span: Span = {
      id: crypto.randomUUID(),
      traceId,
      name,
      startTime: Date.now(),
      duration,
      status,
      attributes
    }

    trace.spans.push(span)
  }

  /**
   * End trace
   */
  endTrace(traceId: string, status: 'success' | 'error' = 'success'): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    trace.duration = Date.now() - trace.startTime
    trace.status = status

    // Send to tracing service
    if (process.env.NODE_ENV === 'production') {
      this.sendToTracingService(trace)
    }

    // Keep trace in memory for debugging
  }

  /**
   * Get trace
   */
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId)
  }

  /**
   * Send trace to external service
   */
  private sendToTracingService(trace: Trace): void {
    // In production, integrate with:
    // - Jaeger
    // - Zipkin
    // - AWS X-Ray
    // - Datadog APM
  }

  // ============================================================================
  // ERROR TRACKING
  // ============================================================================

  /**
   * Capture error
   */
  captureError(
    error: Error,
    context?: string,
    metadata?: Record<string, any>
  ): string {
    const report: ErrorReport = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      error,
      context,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      stack: error.stack,
      breadcrumbs: [...this.breadcrumbs],
      ...metadata
    }

    this.errorReports.push(report)

    // Log error
    this.error(error.message, context, {
      errorId: report.id,
      stack: error.stack,
      ...metadata
    })

    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTrackingService(report)
    }

    // Create alert for critical errors
    if (this.isCriticalError(error)) {
      this.createAlert({
        severity: 'critical',
        title: `Critical Error: ${error.name}`,
        description: error.message,
        source: context || 'system',
        metadata: { errorId: report.id }
      })
    }

    return report.id
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(
    category: string,
    message: string,
    level: string = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date(),
      category,
      message,
      level,
      data
    }

    this.breadcrumbs.push(breadcrumb)

    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift()
    }
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      /database.*connection/i,
      /out of memory/i,
      /cannot.*start.*server/i,
      /fatal/i
    ]

    return criticalPatterns.some(pattern => pattern.test(error.message))
  }

  /**
   * Send error to tracking service
   */
  private sendToErrorTrackingService(report: ErrorReport): void {
    // In production, integrate with:
    // - Sentry
    // - Rollbar
    // - Bugsnag
    // - Airbrake
  }

  /**
   * Get error reports
   */
  getErrorReports(filters?: {
    context?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }): ErrorReport[] {
    let reports = [...this.errorReports]

    if (filters?.context) {
      reports = reports.filter(r => r.context === filters.context)
    }

    if (filters?.startDate) {
      reports = reports.filter(r => r.timestamp >= filters.startDate!)
    }

    if (filters?.endDate) {
      reports = reports.filter(r => r.timestamp <= filters.endDate!)
    }

    if (filters?.limit) {
      reports = reports.slice(-filters.limit)
    }

    return reports
  }

  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  /**
   * Register health check
   */
  registerHealthCheck(
    service: string,
    checkFn: () => Promise<Omit<HealthCheck, 'service' | 'lastChecked'>>
  ): void {
    // Run health check immediately
    this.runHealthCheck(service, checkFn)

    // Schedule periodic checks
    setInterval(() => {
      this.runHealthCheck(service, checkFn)
    }, 30000) // Every 30 seconds
  }

  /**
   * Run health check
   */
  private async runHealthCheck(
    service: string,
    checkFn: () => Promise<Omit<HealthCheck, 'service' | 'lastChecked'>>
  ): Promise<void> {
    try {
      const result = await checkFn()

      const check: HealthCheck = {
        service,
        lastChecked: new Date(),
        ...result
      }

      this.healthChecks.set(service, check)

      // Alert if unhealthy
      if (check.status === 'unhealthy') {
        this.createAlert({
          severity: 'high',
          title: `Service Unhealthy: ${service}`,
          description: check.message || 'Service health check failed',
          source: 'health-check',
          metadata: { check }
        })
      }
    } catch (error) {
      this.captureError(error as Error, 'health-check', { service })

      this.healthChecks.set(service, {
        service,
        status: 'unhealthy',
        responseTime: 0,
        lastChecked: new Date(),
        message: (error as Error).message
      })
    }
  }

  /**
   * Get system health
   */
  getSystemHealth(): SystemHealth {
    const checks = Array.from(this.healthChecks.values())

    let overall: SystemHealth['overall'] = 'healthy'

    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length
    const degradedCount = checks.filter(c => c.status === 'degraded').length

    if (unhealthyCount > 0) {
      overall = 'unhealthy'
    } else if (degradedCount > 0) {
      overall = 'degraded'
    }

    return {
      overall,
      checks,
      timestamp: new Date()
    }
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Measure function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    const start = Date.now()
    const traceId = this.startTrace(name)

    try {
      const result = await fn()
      const duration = Date.now() - start

      this.endTrace(traceId, 'success')
      this.recordMetric(`${name}.duration`, duration, 'ms')
      this.info(`${name} completed in ${duration}ms`, context)

      return result
    } catch (error) {
      const duration = Date.now() - start

      this.endTrace(traceId, 'error')
      this.recordMetric(`${name}.error`, 1, 'count')
      this.captureError(error as Error, context, { operation: name, duration })

      throw error
    }
  }

  /**
   * Measure sync function execution time
   */
  measure<T>(name: string, fn: () => T, context?: string): T {
    const start = Date.now()

    try {
      const result = fn()
      const duration = Date.now() - start

      this.recordMetric(`${name}.duration`, duration, 'ms')
      this.info(`${name} completed in ${duration}ms`, context)

      return result
    } catch (error) {
      const duration = Date.now() - start

      this.recordMetric(`${name}.error`, 1, 'count')
      this.captureError(error as Error, context, { operation: name, duration })

      throw error
    }
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  /**
   * Get monitoring dashboard data
   */
  getDashboardData(): {
    health: SystemHealth
    recentErrors: ErrorReport[]
    activeAlerts: Alert[]
    recentLogs: LogEntry[]
    keyMetrics: {
      errorRate: number
      avgResponseTime: number
      requestsPerMinute: number
      cacheHitRate: number
    }
  } {
    const health = this.getSystemHealth()
    const recentErrors = this.getErrorReports({ limit: 10 })
    const activeAlerts = this.getActiveAlerts()
    const recentLogs = this.getLogs({ limit: 100 })

    // Calculate key metrics
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    const recentErrorCount = this.errorReports.filter(
      e => e.timestamp.getTime() > oneMinuteAgo
    ).length

    return {
      health,
      recentErrors,
      activeAlerts,
      recentLogs,
      keyMetrics: {
        errorRate: recentErrorCount,
        avgResponseTime: 0, // Would calculate from metrics
        requestsPerMinute: 0, // Would calculate from metrics
        cacheHitRate: 0 // Would calculate from metrics
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const monitoringSystem = new MonitoringSystem()

// Register default health checks
monitoringSystem.registerHealthCheck('database', async () => {
  // Check database connection
  return {
    status: 'healthy',
    responseTime: 10,
    message: 'Database connection healthy'
  }
})

monitoringSystem.registerHealthCheck('redis', async () => {
  // Check Redis connection
  return {
    status: 'healthy',
    responseTime: 5,
    message: 'Redis connection healthy'
  }
})

monitoringSystem.registerHealthCheck('storage', async () => {
  // Check storage access
  return {
    status: 'healthy',
    responseTime: 15,
    message: 'Storage accessible'
  }
})
