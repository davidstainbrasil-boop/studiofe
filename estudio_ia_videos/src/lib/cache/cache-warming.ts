/**
 * Cache Warming Utilities
 *
 * Pre-populate cache with frequently accessed data on server start
 * Reduces cold-start latency and improves initial user experience
 *
 * Usage:
 * ```typescript
 * import { warmCache } from '@lib/cache/cache-warming';
 *
 * // On server startup
 * warmCache().catch(console.error);
 * ```
 */

import { set, CacheTier } from './redis-cache';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

/**
 * Warm popular templates cache
 * Caches the 100 most popular templates
 */
async function warmTemplatesCache(): Promise<void> {
  try {
    logger.info('Warming templates cache...');

    // Check if templates table exists
    const templatesExist = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'templates'
      ) as exists
    `.catch(() => [{ exists: false }]);

    const tableExists = Array.isArray(templatesExist) && templatesExist.length > 0 && templatesExist[0]?.exists;
    if (!tableExists) {
      logger.info('Templates table does not exist, skipping cache warming');
      return;
    }

    // Get popular templates (if table exists)
    const popularTemplates = await prisma.$queryRaw<any[]>`
      SELECT * FROM templates
      WHERE status = 'published'
      ORDER BY usage_count DESC
      LIMIT 100
    `.catch(() => []);

    if (popularTemplates.length > 0) {
      await set('templates:popular', popularTemplates, CacheTier.HOUR);
      logger.info('Templates cache warmed', { count: popularTemplates.length });
    }
  } catch (error) {
    logger.warn('Failed to warm templates cache', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Warm active users count cache
 * Caches count of active users
 */
async function warmActiveUsersCache(): Promise<void> {
  try {
    logger.info('Warming active users cache...');

    // Count total users (users table doesn't have status field)
    const activeCount = await prisma.users.count().catch(() => 0);

    await set('users:active:count', activeCount, CacheTier.SHORT);
    logger.info('Active users cache warmed', { count: activeCount });
  } catch (error) {
    logger.warn('Failed to warm active users cache', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Warm system statistics cache
 * Caches general system stats for dashboard
 */
async function warmSystemStatsCache(): Promise<void> {
  try {
    logger.info('Warming system stats cache...');

    const [totalProjects, totalUsers, totalRenderJobs] = await Promise.all([
      prisma.projects.count().catch(() => 0),
      prisma.users.count().catch(() => 0),
      prisma.render_jobs.count().catch(() => 0),
    ]);

    const stats = {
      totalProjects,
      totalUsers,
      totalRenderJobs,
      lastUpdated: new Date().toISOString()
    };

    await set('system:stats', stats, CacheTier.MEDIUM);
    logger.info('System stats cache warmed', stats);
  } catch (error) {
    logger.warn('Failed to warm system stats cache', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Warm recent projects cache for top users
 * Pre-caches project lists for users with most projects
 */
async function warmRecentProjectsCache(): Promise<void> {
  try {
    logger.info('Warming recent projects cache...');

    // Get top 10 users by project count
    const topUsers = await prisma.$queryRaw<{ user_id: string; count: number }[]>`
      SELECT user_id, COUNT(*) as count
      FROM projects
      WHERE status != 'deleted'
      GROUP BY user_id
      ORDER BY count DESC
      LIMIT 10
    `.catch(() => []);

    if (topUsers.length === 0) {
      logger.info('No users found for recent projects cache warming');
      return;
    }

    // Pre-cache first page of projects for each top user
    for (const { user_id } of topUsers) {
      try {
        const projects = await prisma.projects.findMany({
          where: { userId: user_id },
          orderBy: { updatedAt: 'desc' },
          take: 10
        });

        const count = await prisma.projects.count({
          where: { userId: user_id }
        });

        const cacheKey = `projects:list:${user_id}:1:10:all:all:none`;
        await set(cacheKey, [projects, count], CacheTier.SHORT);

        logger.debug('Warmed projects cache for user', { userId: user_id, count });
      } catch (error) {
        logger.warn('Failed to warm projects cache for user', { userId: user_id, error: error instanceof Error ? error.message : String(error) });
      }
    }

    logger.info('Recent projects cache warmed', { users: topUsers.length });
  } catch (error) {
    logger.warn('Failed to warm recent projects cache', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Warm user tiers cache for active users
 * Pre-caches subscription tiers for recently active users
 */
async function warmUserTiersCache(): Promise<void> {
  try {
    logger.info('Warming user tiers cache...');

    // Get recently active users (last 24 hours)
    const recentUsers = await prisma.$queryRaw<{ id: string; subscription_tier: string }[]>`
      SELECT DISTINCT u.id, u.subscription_tier
      FROM users u
      INNER JOIN projects p ON p.user_id = u.id
      WHERE p.updated_at > NOW() - INTERVAL '24 hours'
      LIMIT 100
    `.catch(() => []);

    if (recentUsers.length === 0) {
      logger.info('No recent users found for tier cache warming');
      return;
    }

    // Pre-cache tier for each user
    for (const user of recentUsers) {
      const tierMap: Record<string, string> = {
        FREE: 'free',
        BASIC: 'basic',
        PRO: 'pro',
        ENTERPRISE: 'enterprise',
      };

      const tier = tierMap[user.subscription_tier || 'FREE'] || 'free';
      await set(`user:${user.id}:tier`, tier, CacheTier.SHORT);
    }

    logger.info('User tiers cache warmed', { users: recentUsers.length });
  } catch (error) {
    logger.warn('Failed to warm user tiers cache', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Main cache warming function
 * Call this on server startup to pre-populate cache
 *
 * @param options - Warming options
 */
export async function warmCache(options?: {
  templates?: boolean;
  activeUsers?: boolean;
  systemStats?: boolean;
  recentProjects?: boolean;
  userTiers?: boolean;
}): Promise<void> {
  const opts = {
    templates: true,
    activeUsers: true,
    systemStats: true,
    recentProjects: true,
    userTiers: true,
    ...options
  };

  logger.info('Starting cache warming...', opts);

  const startTime = Date.now();

  try {
    const warmingTasks: Promise<void>[] = [];

    if (opts.templates) warmingTasks.push(warmTemplatesCache());
    if (opts.activeUsers) warmingTasks.push(warmActiveUsersCache());
    if (opts.systemStats) warmingTasks.push(warmSystemStatsCache());
    if (opts.recentProjects) warmingTasks.push(warmRecentProjectsCache());
    if (opts.userTiers) warmingTasks.push(warmUserTiersCache());

    await Promise.allSettled(warmingTasks);

    const duration = Date.now() - startTime;
    logger.info('Cache warming completed', { duration: `${duration}ms` });
  } catch (error) {
    logger.error('Cache warming failed', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Schedule periodic cache warming
 * Runs cache warming on an interval to keep cache fresh
 *
 * @param intervalMs - Interval in milliseconds (default: 30 minutes)
 */
export function schedulePeriodicWarmCache(intervalMs: number = 30 * 60 * 1000): NodeJS.Timeout {
  logger.info('Scheduling periodic cache warming', { interval: `${intervalMs}ms` });

  // Initial warming
  warmCache().catch(error => {
    logger.error('Initial cache warming failed', error instanceof Error ? error : new Error(String(error)));
  });

  // Periodic warming
  return setInterval(() => {
    warmCache().catch(error => {
      logger.error('Periodic cache warming failed', error instanceof Error ? error : new Error(String(error)));
    });
  }, intervalMs);
}

/**
 * Warm cache for specific user
 * Pre-populate cache for a specific user (e.g., after login)
 *
 * @param userId - User ID to warm cache for
 */
export async function warmCacheForUser(userId: string): Promise<void> {
  try {
    logger.info('Warming cache for user', { userId });

    // Warm user tier
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { plan_tier: true }
    });

    if (user) {
      const tierMap: Record<string, string> = {
        FREE: 'free',
        BASIC: 'basic',
        PRO: 'pro',
        ENTERPRISE: 'enterprise',
      };

      const tier = tierMap[user.plan_tier || 'FREE'] || 'free';
      await set(`user:${userId}:tier`, tier, CacheTier.SHORT);
    }

    // Warm user's projects list (first page)
    const [projects, count] = await Promise.all([
      prisma.projects.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10
      }),
      prisma.projects.count({ where: { userId } })
    ]);

    const cacheKey = `projects:list:${userId}:1:10:all:all:none`;
    await set(cacheKey, [projects, count], CacheTier.SHORT);

    logger.info('Cache warmed for user', { userId, projectsCount: count });
  } catch (error) {
    logger.warn('Failed to warm cache for user', { userId, error: error instanceof Error ? error.message : String(error) });
  }
}
