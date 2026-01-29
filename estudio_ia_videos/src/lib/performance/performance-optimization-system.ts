/**
 * Performance Optimization System - Fase 6: Production Hardening
 * Sistema completo de otimização de performance e caching
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PerformanceMetrics {
  responseTime: {
    avg: number
    p50: number
    p95: number
    p99: number
  }
  throughput: {
    requestsPerSecond: number
    requestsPerMinute: number
  }
  resources: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
  }
  cache: {
    hitRate: number
    missRate: number
    evictions: number
    size: number
  }
  database: {
    queryTime: {
      avg: number
      p95: number
    }
    connectionPoolSize: number
    activeConnections: number
  }
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  ttl: number // milliseconds
  createdAt: number
  expiresAt: number
  hits: number
  size: number // bytes
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitCount: number
  missCount: number
  evictionCount: number
  hitRate: number
}

export interface OptimizationResult {
  category: string
  improvements: OptimizationImprovement[]
  estimatedSpeedup: number // percentage
  priority: 'high' | 'medium' | 'low'
}

export interface OptimizationImprovement {
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  implemented: boolean
}

export interface PerformanceBudget {
  maxResponseTime: number // milliseconds
  maxMemoryUsage: number // MB
  maxDatabaseQueries: number
  minCacheHitRate: number // percentage
  maxPayloadSize: number // KB
}

// ============================================================================
// PERFORMANCE OPTIMIZATION SYSTEM
// ============================================================================

export class PerformanceOptimizationSystem {
  private cache: Map<string, CacheEntry> = new Map()
  private cacheStats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0
  }
  private responseTimes: number[] = []
  private requestTimestamps: number[] = []
  private maxCacheSize: number = 100 * 1024 * 1024 // 100MB
  private budget: PerformanceBudget

  constructor(budget?: Partial<PerformanceBudget>) {
    this.budget = {
      maxResponseTime: 1000, // 1 second
      maxMemoryUsage: 512, // 512 MB
      maxDatabaseQueries: 10,
      minCacheHitRate: 80, // 80%
      maxPayloadSize: 1024, // 1 MB
      ...budget
    }

    // Start cache cleanup interval
    this.startCacheCleanup()
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.cacheStats.missCount++
      this.updateCacheHitRate()
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.cacheStats.totalSize -= entry.size
      this.cacheStats.totalEntries--
      this.cacheStats.missCount++
      this.updateCacheHitRate()
      return null
    }

    // Update hit count
    entry.hits++
    this.cacheStats.hitCount++
    this.updateCacheHitRate()

    return entry.value as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl: number = 3600000): void {
    const now = Date.now()
    const size = this.estimateSize(value)

    // Check if we need to evict entries
    while (this.cacheStats.totalSize + size > this.maxCacheSize && this.cache.size > 0) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl,
      createdAt: now,
      expiresAt: now + ttl,
      hits: 0,
      size
    }

    // Remove old entry if exists
    const oldEntry = this.cache.get(key)
    if (oldEntry) {
      this.cacheStats.totalSize -= oldEntry.size
    } else {
      this.cacheStats.totalEntries++
    }

    this.cache.set(key, entry)
    this.cacheStats.totalSize += size
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    this.cache.delete(key)
    this.cacheStats.totalSize -= entry.size
    this.cacheStats.totalEntries--
    return true
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.cacheStats = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.cacheStats }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruHits = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits
        lruKey = key
      }
    }

    if (lruKey) {
      const entry = this.cache.get(lruKey)!
      this.cache.delete(lruKey)
      this.cacheStats.totalSize -= entry.size
      this.cacheStats.totalEntries--
      this.cacheStats.evictionCount++
    }
  }

  /**
   * Clean expired entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      const entry = this.cache.get(key)!
      this.cache.delete(key)
      this.cacheStats.totalSize -= entry.size
      this.cacheStats.totalEntries--
    }
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanExpiredEntries()
    }, 60000) // Every minute
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.cacheStats.hitCount + this.cacheStats.missCount
    this.cacheStats.hitRate = total > 0 ? (this.cacheStats.hitCount / total) * 100 : 0
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj)
    return new Blob([str]).size
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Track response time
   */
  trackResponseTime(duration: number): void {
    this.responseTimes.push(duration)

    // Keep only last 1000 entries
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift()
    }
  }

  /**
   * Track request
   */
  trackRequest(): void {
    const now = Date.now()
    this.requestTimestamps.push(now)

    // Keep only last 5 minutes
    const fiveMinutesAgo = now - 5 * 60 * 1000
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > fiveMinutesAgo)
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b)

    return {
      responseTime: {
        avg: this.calculateAverage(this.responseTimes),
        p50: this.calculatePercentile(sortedTimes, 50),
        p95: this.calculatePercentile(sortedTimes, 95),
        p99: this.calculatePercentile(sortedTimes, 99)
      },
      throughput: {
        requestsPerSecond: this.calculateRPS(60),
        requestsPerMinute: this.requestTimestamps.length
      },
      resources: {
        cpuUsage: this.getCPUUsage(),
        memoryUsage: this.getMemoryUsage(),
        diskUsage: 0 // Would need system-specific implementation
      },
      cache: {
        hitRate: this.cacheStats.hitRate,
        missRate: 100 - this.cacheStats.hitRate,
        evictions: this.cacheStats.evictionCount,
        size: this.cacheStats.totalSize
      },
      database: {
        queryTime: {
          avg: 0, // Would be tracked separately
          p95: 0
        },
        connectionPoolSize: 10, // From Prisma config
        activeConnections: 0 // Would need actual tracking
      }
    }
  }

  /**
   * Calculate average
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1
    return sortedNumbers[Math.max(0, index)]
  }

  /**
   * Calculate requests per second
   */
  private calculateRPS(windowSeconds: number): number {
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000
    const recentRequests = this.requestTimestamps.filter(ts => ts > windowStart)
    return recentRequests.length / windowSeconds
  }

  /**
   * Get CPU usage (Node.js)
   */
  private getCPUUsage(): number {
    const usage = process.cpuUsage()
    return (usage.user + usage.system) / 1000000 // Convert to percentage
  }

  /**
   * Get memory usage (Node.js)
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage()
    return Math.round(usage.heapUsed / 1024 / 1024) // MB
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATION
  // ============================================================================

  /**
   * Analyze performance and suggest optimizations
   */
  analyzePerformance(): OptimizationResult[] {
    const results: OptimizationResult[] = []
    const metrics = this.getPerformanceMetrics()

    // Database optimization
    results.push(this.analyzeDatabasePerformance(metrics))

    // Caching optimization
    results.push(this.analyzeCachingStrategy(metrics))

    // Response time optimization
    results.push(this.analyzeResponseTime(metrics))

    // Resource optimization
    results.push(this.analyzeResourceUsage(metrics))

    // Payload optimization
    results.push(this.analyzePayloadSize())

    return results.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Analyze database performance
   */
  private analyzeDatabasePerformance(metrics: PerformanceMetrics): OptimizationResult {
    const improvements: OptimizationImprovement[] = []

    improvements.push({
      title: 'Add database indexes',
      description: 'Create indexes on frequently queried columns (userId, videoId, createdAt)',
      impact: 'high',
      effort: 'low',
      implemented: false
    })

    improvements.push({
      title: 'Implement connection pooling',
      description: 'Use Prisma connection pooling with optimal pool size',
      impact: 'medium',
      effort: 'low',
      implemented: true
    })

    improvements.push({
      title: 'Use database read replicas',
      description: 'Distribute read queries across multiple replicas',
      impact: 'high',
      effort: 'high',
      implemented: false
    })

    improvements.push({
      title: 'Optimize N+1 queries',
      description: 'Use Prisma include/select to avoid N+1 query patterns',
      impact: 'high',
      effort: 'medium',
      implemented: false
    })

    return {
      category: 'Database',
      improvements,
      estimatedSpeedup: 40,
      priority: 'high'
    }
  }

  /**
   * Analyze caching strategy
   */
  private analyzeCachingStrategy(metrics: PerformanceMetrics): OptimizationResult {
    const improvements: OptimizationImprovement[] = []

    if (metrics.cache.hitRate < this.budget.minCacheHitRate) {
      improvements.push({
        title: 'Improve cache hit rate',
        description: `Current hit rate: ${metrics.cache.hitRate.toFixed(1)}%, target: ${this.budget.minCacheHitRate}%`,
        impact: 'high',
        effort: 'medium',
        implemented: false
      })
    }

    improvements.push({
      title: 'Implement Redis caching',
      description: 'Use Redis for distributed caching across multiple servers',
      impact: 'high',
      effort: 'medium',
      implemented: false
    })

    improvements.push({
      title: 'Cache expensive computations',
      description: 'Cache lip-sync results, avatar renders, and analytics queries',
      impact: 'high',
      effort: 'low',
      implemented: true
    })

    improvements.push({
      title: 'Implement cache warming',
      description: 'Pre-populate cache with frequently accessed data',
      impact: 'medium',
      effort: 'medium',
      implemented: false
    })

    return {
      category: 'Caching',
      improvements,
      estimatedSpeedup: 35,
      priority: 'high'
    }
  }

  /**
   * Analyze response time
   */
  private analyzeResponseTime(metrics: PerformanceMetrics): OptimizationResult {
    const improvements: OptimizationImprovement[] = []

    if (metrics.responseTime.p95 > this.budget.maxResponseTime) {
      improvements.push({
        title: 'Reduce P95 response time',
        description: `Current P95: ${metrics.responseTime.p95}ms, target: ${this.budget.maxResponseTime}ms`,
        impact: 'high',
        effort: 'medium',
        implemented: false
      })
    }

    improvements.push({
      title: 'Implement code splitting',
      description: 'Split JavaScript bundles to reduce initial load time',
      impact: 'medium',
      effort: 'medium',
      implemented: false
    })

    improvements.push({
      title: 'Enable gzip/brotli compression',
      description: 'Compress API responses and static assets',
      impact: 'medium',
      effort: 'low',
      implemented: false
    })

    improvements.push({
      title: 'Optimize images and videos',
      description: 'Use WebP/AVIF for images, optimize video encoding',
      impact: 'medium',
      effort: 'medium',
      implemented: false
    })

    return {
      category: 'Response Time',
      improvements,
      estimatedSpeedup: 30,
      priority: 'medium'
    }
  }

  /**
   * Analyze resource usage
   */
  private analyzeResourceUsage(metrics: PerformanceMetrics): OptimizationResult {
    const improvements: OptimizationImprovement[] = []

    if (metrics.resources.memoryUsage > this.budget.maxMemoryUsage) {
      improvements.push({
        title: 'Reduce memory usage',
        description: `Current: ${metrics.resources.memoryUsage}MB, target: ${this.budget.maxMemoryUsage}MB`,
        impact: 'medium',
        effort: 'medium',
        implemented: false
      })
    }

    improvements.push({
      title: 'Implement streaming for large files',
      description: 'Stream video files instead of loading into memory',
      impact: 'high',
      effort: 'medium',
      implemented: false
    })

    improvements.push({
      title: 'Optimize worker memory',
      description: 'Limit memory usage per render worker',
      impact: 'medium',
      effort: 'low',
      implemented: false
    })

    return {
      category: 'Resources',
      improvements,
      estimatedSpeedup: 20,
      priority: 'medium'
    }
  }

  /**
   * Analyze payload size
   */
  private analyzePayloadSize(): OptimizationResult {
    const improvements: OptimizationImprovement[] = []

    improvements.push({
      title: 'Implement API response pagination',
      description: 'Paginate large lists to reduce payload size',
      impact: 'medium',
      effort: 'low',
      implemented: false
    })

    improvements.push({
      title: 'Use GraphQL or selective fields',
      description: 'Allow clients to request only needed fields',
      impact: 'low',
      effort: 'high',
      implemented: false
    })

    improvements.push({
      title: 'Compress API responses',
      description: 'Enable gzip compression for JSON responses',
      impact: 'medium',
      effort: 'low',
      implemented: false
    })

    return {
      category: 'Payload',
      improvements,
      estimatedSpeedup: 15,
      priority: 'low'
    }
  }

  // ============================================================================
  // PERFORMANCE BUDGET
  // ============================================================================

  /**
   * Check if performance meets budget
   */
  checkPerformanceBudget(): {
    passed: boolean
    violations: string[]
  } {
    const metrics = this.getPerformanceMetrics()
    const violations: string[] = []

    if (metrics.responseTime.p95 > this.budget.maxResponseTime) {
      violations.push(
        `Response time P95 (${metrics.responseTime.p95}ms) exceeds budget (${this.budget.maxResponseTime}ms)`
      )
    }

    if (metrics.resources.memoryUsage > this.budget.maxMemoryUsage) {
      violations.push(
        `Memory usage (${metrics.resources.memoryUsage}MB) exceeds budget (${this.budget.maxMemoryUsage}MB)`
      )
    }

    if (metrics.cache.hitRate < this.budget.minCacheHitRate) {
      violations.push(
        `Cache hit rate (${metrics.cache.hitRate.toFixed(1)}%) below budget (${this.budget.minCacheHitRate}%)`
      )
    }

    return {
      passed: violations.length === 0,
      violations
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Memoize expensive function calls
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    ttl: number = 3600000
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>): ReturnType<T> => {
      const key = `memoize:${fn.name}:${JSON.stringify(args)}`
      const cached = this.get<ReturnType<T>>(key)

      if (cached !== null) {
        return cached
      }

      const result = fn(...args)
      this.set(key, result, ttl)
      return result
    }
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle: boolean

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const performanceOptimizationSystem = new PerformanceOptimizationSystem()
