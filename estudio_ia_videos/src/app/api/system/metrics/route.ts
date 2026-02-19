import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import { statfs } from 'fs/promises'
import { getServerAuth } from '@lib/auth/unified-session'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';
import { prisma } from '@lib/prisma';
import { clearAll as clearRedisCache, ping as pingRedis } from '@lib/cache/redis-cache';
import { clearAll as clearQueryCache } from '@lib/cache/query-cache';

/**
 * 🖥️ SYSTEM METRICS API
 * Provides real-time system performance metrics
 */

interface SystemMetrics {
  cpu: number
  memory: number
  storage: number
  activeConnections: number
  queueLength: number
  uptime: number
  lastUpdated: Date
}

async function getStorageUsagePercent(): Promise<number> {
  try {
    const stats = await statfs(process.cwd());
    const total = Number(stats.blocks) * Number(stats.bsize);
    const free = Number(stats.bfree) * Number(stats.bsize);
    if (total <= 0) return 0;
    const used = total - free;
    return Math.round((used / total) * 1000) / 10;
  } catch {
    return 0;
  }
}

function calculateCPUUsagePercent(): number {
  const cores = os.cpus().length || 1;
  const load = os.loadavg()[0];
  return Math.max(0, Math.min(100, Math.round((load / cores) * 1000) / 10));
}

function calculateMemoryUsagePercent(): number {
  const total = os.totalmem();
  const free = os.freemem();
  if (total <= 0) return 0;
  const used = total - free;
  return Math.max(0, Math.min(100, Math.round((used / total) * 1000) / 10));
}

async function isAdminUser(userId: string, email?: string | null): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { role: true, email: true }
  });

  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'super_admin') return true;

  const effectiveEmail = user?.email || email || '';
  return effectiveEmail.includes('admin');
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'system-metrics-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [storage, activeRenders, processingQueue, redisAvailable] = await Promise.all([
      getStorageUsagePercent(),
      prisma.render_jobs.count({
        where: {
          status: { in: ['queued', 'pending', 'processing'] }
        }
      }),
      prisma.processing_queue.count({
        where: {
          status: { in: ['queued', 'pending', 'processing'] }
        }
      }),
      pingRedis().catch(() => false)
    ]);

    const metrics: SystemMetrics = {
      cpu: calculateCPUUsagePercent(),
      memory: calculateMemoryUsagePercent(),
      storage,
      activeConnections: activeRenders,
      queueLength: processingQueue + activeRenders,
      uptime: Math.round(os.uptime()),
      lastUpdated: new Date()
    }

    return NextResponse.json({
      ...metrics,
      infrastructure: {
        redis: redisAvailable ? 'online' : 'offline'
      }
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error fetching system metrics', err, { component: 'API: system/metrics' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'system-metrics-post', 20);
    if (blocked) return blocked;

    const session = await getServerAuth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const admin = await isAdminUser(session.user.id, session.user.email);
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body as { action?: string }

    switch (action) {
      case 'clear_cache': {
        await Promise.all([
          clearRedisCache().catch(() => undefined),
          Promise.resolve(clearQueryCache())
        ]);

        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        })
      }

      case 'clear_queue': {
        const [jobsCancelled, queueCancelled] = await Promise.all([
          prisma.render_jobs.updateMany({
            where: {
              status: { in: ['queued', 'pending', 'processing'] }
            },
            data: {
              status: 'cancelled',
              updatedAt: new Date()
            }
          }),
          prisma.processing_queue.updateMany({
            where: {
              status: { in: ['queued', 'pending', 'processing'] }
            },
            data: {
              status: 'cancelled',
              updatedAt: new Date()
            }
          })
        ]);

        return NextResponse.json({
          success: true,
          message: 'Render queue cleared successfully',
          data: {
            renderJobsCancelled: jobsCancelled.count,
            processingQueueCancelled: queueCancelled.count
          }
        })
      }

      case 'optimize_storage': {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [oldFailedJobsRemoved, oldCompletedQueueRemoved] = await Promise.all([
          prisma.render_jobs.deleteMany({
            where: {
              status: 'failed',
              createdAt: { lt: cutoff }
            }
          }),
          prisma.processing_queue.deleteMany({
            where: {
              status: 'completed',
              updatedAt: { lt: cutoff }
            }
          })
        ]);

        return NextResponse.json({
          success: true,
          message: 'Storage optimized successfully',
          data: {
            oldFailedJobsRemoved: oldFailedJobsRemoved.count,
            oldCompletedQueueRemoved: oldCompletedQueueRemoved.count
          }
        })
      }

      case 'restart_services': {
        const key = 'maintenance:restart_services_request';
        const payload = {
          requestedBy: session.user.id,
          requestedAt: new Date().toISOString(),
          status: 'requested'
        };

        await prisma.system_settings.upsert({
          where: { key },
          create: {
            key,
            category: 'maintenance',
            value: payload
          },
          update: {
            value: payload,
            category: 'maintenance'
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Service restart request registered'
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error executing system action', err, { component: 'API: system/metrics' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

