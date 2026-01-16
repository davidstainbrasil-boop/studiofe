/**
 * 📊 Usage Service
 * Tracks and enforces usage limits for different plan tiers
 */

import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export interface PlanLimits {
  maxProjects: number;
  maxStorageMB: number;
  maxVideoMinutes: number;
  maxCollaborators: number;
  maxExportsPerMonth: number;
}

export interface UserUsage {
  projectCount: number;
  storageUsedMB: number;
  videoMinutesUsed: number;
  exportsThisMonth: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  percentUsed: number;
}

// Plan definitions
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxProjects: 3,
    maxStorageMB: 500,
    maxVideoMinutes: 10,
    maxCollaborators: 1,
    maxExportsPerMonth: 5
  },
  pro: {
    maxProjects: 50,
    maxStorageMB: 10240, // 10 GB
    maxVideoMinutes: 120,
    maxCollaborators: 5,
    maxExportsPerMonth: 100
  },
  enterprise: {
    maxProjects: -1, // Unlimited
    maxStorageMB: -1,
    maxVideoMinutes: -1,
    maxCollaborators: -1,
    maxExportsPerMonth: -1
  }
};

/**
 * Get user's current plan
 */
export async function getUserPlan(userId: string): Promise<string> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });

    const metadata = user?.metadata as Record<string, unknown> | null;
    return (metadata?.plan as string) || 'free';
  } catch (error) {
    logger.error('Failed to get user plan', error instanceof Error ? error : new Error(String(error)));
    return 'free';
  }
}

/**
 * Get plan limits for a user
 */
export async function getPlanLimits(userId: string): Promise<PlanLimits> {
  const plan = await getUserPlan(userId);
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/**
 * Get current usage for a user
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  try {
    // Count projects
    const projectCount = await prisma.projects.count({
      where: { userId }
    });

    // Get storage used (from render jobs file sizes)
    const storageResult = await prisma.render_jobs.aggregate({
      where: { userId, status: 'completed' },
      _sum: { actualDuration: true }
    });
    const storageUsedMB = Math.round((storageResult._sum.actualDuration || 0) / 1024);

    // Video minutes (from completed renders)
    const videoMinutesUsed = Math.round((storageResult._sum.actualDuration || 0) / 60);

    // Exports this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const exportsThisMonth = await prisma.render_jobs.count({
      where: {
        userId,
        status: 'completed',
        completedAt: { gte: startOfMonth }
      }
    });

    return {
      projectCount,
      storageUsedMB,
      videoMinutesUsed,
      exportsThisMonth
    };
  } catch (error) {
    logger.error('Failed to get user usage', error instanceof Error ? error : new Error(String(error)));
    return {
      projectCount: 0,
      storageUsedMB: 0,
      videoMinutesUsed: 0,
      exportsThisMonth: 0
    };
  }
}

/**
 * Check if a resource action is allowed
 */
export async function checkLimit(
  userId: string,
  resource: 'projects' | 'storage' | 'videoMinutes' | 'exports'
): Promise<UsageCheckResult> {
  const limits = await getPlanLimits(userId);
  const usage = await getUserUsage(userId);

  let currentUsage: number;
  let limit: number;

  switch (resource) {
    case 'projects':
      currentUsage = usage.projectCount;
      limit = limits.maxProjects;
      break;
    case 'storage':
      currentUsage = usage.storageUsedMB;
      limit = limits.maxStorageMB;
      break;
    case 'videoMinutes':
      currentUsage = usage.videoMinutesUsed;
      limit = limits.maxVideoMinutes;
      break;
    case 'exports':
      currentUsage = usage.exportsThisMonth;
      limit = limits.maxExportsPerMonth;
      break;
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      currentUsage,
      limit: -1,
      percentUsed: 0
    };
  }

  const percentUsed = Math.round((currentUsage / limit) * 100);
  const allowed = currentUsage < limit;

  return {
    allowed,
    reason: allowed ? undefined : `${resource} limit reached (${currentUsage}/${limit})`,
    currentUsage,
    limit,
    percentUsed
  };
}

/**
 * Increment usage for a resource
 */
export async function incrementUsage(
  userId: string,
  resource: 'exports',
  amount: number = 1
): Promise<void> {
  try {
    // Log usage event for analytics
    await prisma.analytics_events.create({
      data: {
        userId,
        eventType: `usage:${resource}`,
        eventData: { amount }
      }
    });

    logger.debug(`Usage incremented: ${resource} +${amount}`, {
      component: 'UsageService',
      userId
    });
  } catch (error) {
    logger.error('Failed to increment usage', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get usage summary with limits for display
 */
export async function getUsageSummary(userId: string) {
  const [limits, usage] = await Promise.all([
    getPlanLimits(userId),
    getUserUsage(userId)
  ]);

  const plan = await getUserPlan(userId);

  return {
    plan,
    limits,
    usage,
    resources: {
      projects: {
        used: usage.projectCount,
        limit: limits.maxProjects,
        percent: limits.maxProjects > 0 ? Math.round((usage.projectCount / limits.maxProjects) * 100) : 0
      },
      storage: {
        used: usage.storageUsedMB,
        limit: limits.maxStorageMB,
        percent: limits.maxStorageMB > 0 ? Math.round((usage.storageUsedMB / limits.maxStorageMB) * 100) : 0
      },
      videoMinutes: {
        used: usage.videoMinutesUsed,
        limit: limits.maxVideoMinutes,
        percent: limits.maxVideoMinutes > 0 ? Math.round((usage.videoMinutesUsed / limits.maxVideoMinutes) * 100) : 0
      },
      exports: {
        used: usage.exportsThisMonth,
        limit: limits.maxExportsPerMonth,
        percent: limits.maxExportsPerMonth > 0 ? Math.round((usage.exportsThisMonth / limits.maxExportsPerMonth) * 100) : 0
      }
    }
  };
}
