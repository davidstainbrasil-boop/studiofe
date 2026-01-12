/**
 * Storage Quota Manager
 *
 * Pre-checks storage quotas before uploads to prevent failures
 * Tracks usage per user/project and enforces limits
 */

import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export interface StorageQuota {
  userId: string;
  totalLimit: number;        // bytes
  used: number;              // bytes
  remaining: number;         // bytes
  percentUsed: number;       // 0-100
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  requiredSpace: number;
}

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public currentUsage: number,
    public limit: number,
    public requiredSpace: number
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Default quota limits by tier
 */
export const DEFAULT_QUOTAS = {
  FREE: 100 * 1024 * 1024,           // 100MB
  BASIC: 1024 * 1024 * 1024,         // 1GB
  PRO: 10 * 1024 * 1024 * 1024,      // 10GB
  ENTERPRISE: 100 * 1024 * 1024 * 1024 // 100GB
} as const;

/**
 * Calculate user's current storage usage
 */
export async function calculateUserStorageUsage(userId: string): Promise<number> {
  try {
    logger.debug('Calculating storage usage', { userId });

    // Sum up all project files
    const projects = await prisma.projects.findMany({
      where: { userId },
      select: {
        pptxFileSize: true,
        videoFileSize: true
      }
    });

    // Sum up all render outputs
    const renders = await prisma.render_jobs.findMany({
      where: { userId, status: 'completed' },
      select: { outputSize: true }
    });

    let totalUsage = 0;

    // Add project files
    for (const project of projects) {
      totalUsage += project.pptxFileSize || 0;
      totalUsage += project.videoFileSize || 0;
    }

    // Add render outputs
    for (const render of renders) {
      totalUsage += render.outputSize || 0;
    }

    logger.info('Storage usage calculated', {
      userId,
      totalUsage,
      totalUsageMB: (totalUsage / (1024 * 1024)).toFixed(2)
    });

    return totalUsage;
  } catch (error) {
    logger.error('Failed to calculate storage usage', error instanceof Error ? error : new Error(String(error)), { userId });
    throw error;
  }
}

/**
 * Get user's quota limit based on their tier
 */
export async function getUserQuotaLimit(userId: string): Promise<number> {
  try {
    // Check if user has a subscription
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Map subscription tier to quota
    const tier = user.subscriptionTier || 'FREE';
    const limit = DEFAULT_QUOTAS[tier as keyof typeof DEFAULT_QUOTAS] || DEFAULT_QUOTAS.FREE;

    logger.debug('User quota limit determined', {
      userId,
      tier,
      limit,
      limitMB: (limit / (1024 * 1024)).toFixed(2)
    });

    return limit;
  } catch (error) {
    logger.warn('Failed to get user quota, using FREE tier', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });

    // Default to FREE tier if we can't determine
    return DEFAULT_QUOTAS.FREE;
  }
}

/**
 * Get user's complete quota information
 */
export async function getUserQuota(userId: string): Promise<StorageQuota> {
  const [used, totalLimit] = await Promise.all([
    calculateUserStorageUsage(userId),
    getUserQuotaLimit(userId)
  ]);

  const remaining = Math.max(0, totalLimit - used);
  const percentUsed = totalLimit > 0 ? Math.round((used / totalLimit) * 100) : 0;

  return {
    userId,
    totalLimit,
    used,
    remaining,
    percentUsed
  };
}

/**
 * Check if user can upload a file of given size
 */
export async function checkQuota(
  userId: string,
  requiredSpace: number
): Promise<QuotaCheckResult> {
  try {
    logger.debug('Checking quota', { userId, requiredSpace });

    const [currentUsage, limit] = await Promise.all([
      calculateUserStorageUsage(userId),
      getUserQuotaLimit(userId)
    ]);

    const wouldExceed = (currentUsage + requiredSpace) > limit;

    if (wouldExceed) {
      const result: QuotaCheckResult = {
        allowed: false,
        reason: `Upload would exceed storage quota. Used: ${formatBytes(currentUsage)}, Limit: ${formatBytes(limit)}, Required: ${formatBytes(requiredSpace)}`,
        currentUsage,
        limit,
        requiredSpace
      };

      logger.warn('Quota check failed', result);
      return result;
    }

    const result: QuotaCheckResult = {
      allowed: true,
      currentUsage,
      limit,
      requiredSpace
    };

    logger.debug('Quota check passed', result);
    return result;
  } catch (error) {
    logger.error('Quota check error', error instanceof Error ? error : new Error(String(error)), { userId, requiredSpace });

    // Fail open in case of error (allow upload)
    return {
      allowed: true,
      reason: 'Quota check failed, allowing upload',
      currentUsage: 0,
      limit: 0,
      requiredSpace
    };
  }
}

/**
 * Check quota and throw if exceeded
 */
export async function enforceQuota(userId: string, requiredSpace: number): Promise<void> {
  const result = await checkQuota(userId, requiredSpace);

  if (!result.allowed) {
    throw new QuotaExceededError(
      result.reason || 'Storage quota exceeded',
      result.currentUsage,
      result.limit,
      result.requiredSpace
    );
  }
}

/**
 * Update project file size (called after upload)
 */
export async function updateProjectFileSize(
  projectId: string,
  field: 'pptxFileSize' | 'videoFileSize',
  size: number
): Promise<void> {
  try {
    await prisma.projects.update({
      where: { id: projectId },
      data: { [field]: size }
    });

    logger.info('Project file size updated', { projectId, field, size });
  } catch (error) {
    logger.error('Failed to update project file size', error instanceof Error ? error : new Error(String(error)), {
      projectId,
      field,
      size
    });
  }
}

/**
 * Update render output size (called after render)
 */
export async function updateRenderOutputSize(
  jobId: string,
  size: number
): Promise<void> {
  try {
    await prisma.render_jobs.update({
      where: { id: jobId },
      data: { outputSize: size }
    });

    logger.info('Render output size updated', { jobId, size });
  } catch (error) {
    logger.error('Failed to update render output size', error instanceof Error ? error : new Error(String(error)), {
      jobId,
      size
    });
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get quota warning level
 */
export function getQuotaWarningLevel(percentUsed: number): 'safe' | 'warning' | 'critical' {
  if (percentUsed >= 90) return 'critical';
  if (percentUsed >= 75) return 'warning';
  return 'safe';
}

/**
 * Cleanup old files to free space (helper for manual cleanup)
 */
export async function suggestFilesToDelete(userId: string, targetBytes: number) {
  try {
    // Find oldest completed renders
    const oldRenders = await prisma.render_jobs.findMany({
      where: {
        userId,
        status: 'completed',
        outputSize: { gt: 0 }
      },
      orderBy: { completed_at: 'asc' },
      select: {
        id: true,
        projectId: true,
        output_url: true,
        outputSize: true,
        completed_at: true
      }
    });

    let accumulated = 0;
    const suggestions: Array<{ jobId: string; projectId: string; size: number; date: Date | null }> = [];

    for (const render of oldRenders) {
      if (accumulated >= targetBytes) break;

      suggestions.push({
        jobId: render.id,
        projectId: render.projectId || '',
        size: render.outputSize || 0,
        date: render.completed_at
      });

      accumulated += render.outputSize || 0;
    }

    return {
      suggestions,
      totalBytes: accumulated,
      totalBytesFormatted: formatBytes(accumulated)
    };
  } catch (error) {
    logger.error('Failed to suggest files to delete', error instanceof Error ? error : new Error(String(error)), { userId });
    return { suggestions: [], totalBytes: 0, totalBytesFormatted: '0 Bytes' };
  }
}
