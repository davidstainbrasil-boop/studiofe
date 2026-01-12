/**
 * Admin Metrics API
 * Provides system health and operational metrics
 *
 * GET /api/admin/metrics - Get current system metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { circuitBreakerRegistry } from '@lib/resilience/circuit-breaker';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

/**
 * GET - Get system metrics
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const supabase = getSupabaseForRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // TODO: Check if user is admin
    // For now, allow all authenticated users to view metrics

    // Collect metrics
    const [
      renderJobsLast24h,
      errorJobsLast24h,
      completedJobsLast24h,
      totalProjects,
      totalUsers,
      recentActivity
    ] = await Promise.all([
      // Total render jobs in last 24 hours
      prisma.render_jobs.count({
        where: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),

      // Failed jobs in last 24 hours
      prisma.render_jobs.count({
        where: {
          status: 'failed',
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),

      // Completed jobs in last 24 hours
      prisma.render_jobs.count({
        where: {
          status: 'completed',
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),

      // Total projects
      prisma.projects.count(),

      // Total users
      prisma.users.count(),

      // Recent activity (last 10 renders)
      prisma.render_jobs.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          status: true,
          progress: true,
          created_at: true,
          completed_at: true,
          projectId: true,
        }
      })
    ]);

    // Calculate error rate
    const errorRate = renderJobsLast24h > 0
      ? ((errorJobsLast24h / renderJobsLast24h) * 100).toFixed(2)
      : '0.00';

    // Get circuit breaker states
    const circuitBreakers = Array.from(circuitBreakerRegistry.getAll().entries()).map(([name, breaker]) => {
      const stats = breaker.getStats();
      return {
        name,
        state: stats.state,
        failures: stats.failures,
        successes: stats.successes,
        totalRequests: stats.totalRequests,
        totalFailures: stats.totalFailures,
        totalSuccesses: stats.totalSuccesses,
        isHealthy: breaker.isHealthy(),
      };
    });

    // Get queue metrics (if BullMQ is available)
    let queueMetrics = null;
    try {
      const { videoQueue } = await import('@lib/queue/render-queue');

      if (videoQueue) {
        const [waiting, active, completed, failed] = await Promise.all([
          videoQueue.getWaitingCount().catch(() => 0),
          videoQueue.getActiveCount().catch(() => 0),
          videoQueue.getCompletedCount().catch(() => 0),
          videoQueue.getFailedCount().catch(() => 0),
        ]);

        queueMetrics = { waiting, active, completed, failed };
      }
    } catch (error) {
      logger.warn('Failed to get queue metrics', { error: error instanceof Error ? error.message : String(error) });
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();

    // Response
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),

      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
          heapUsagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2),
        },
      },

      database: {
        totalProjects,
        totalUsers,
      },

      renders: {
        last24Hours: renderJobsLast24h,
        completed24h: completedJobsLast24h,
        failed24h: errorJobsLast24h,
        errorRate: parseFloat(errorRate),
        errorRateFormatted: `${errorRate}%`,
        recentActivity,
      },

      circuitBreakers,

      queue: queueMetrics,

      health: {
        status: errorJobsLast24h > renderJobsLast24h * 0.5 ? 'degraded' : 'healthy',
        circuitBreakersOpen: circuitBreakers.filter(cb => cb.state === 'open').length,
        errorRate: parseFloat(errorRate),
      },
    });

  } catch (error) {
    logger.error('GET /api/admin/metrics error', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      {
        error: 'Erro ao obter métricas',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(' ') : '< 1m';
}
