/**
 * Automatic Resource Cleanup System
 *
 * Periodically cleans up old/orphaned resources:
 * - Old render outputs (completed jobs older than X days)
 * - Failed jobs (failed more than 7 days ago)
 * - Temporary upload files
 * - Orphaned database records
 */

import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export interface CleanupResult {
  resourceType: string;
  deleted: number;
  freedSpace?: number;
  errors: number;
  duration: number;
}

export interface CleanupPolicy {
  name: string;
  enabled: boolean;
  retention: {
    completed: number;    // days to keep completed renders
    failed: number;        // days to keep failed renders
    temporary: number;     // days to keep temp files
  };
  dryRun?: boolean;       // if true, only report what would be deleted
}

const DEFAULT_POLICY: CleanupPolicy = {
  name: 'default',
  enabled: true,
  retention: {
    completed: 30,  // Keep completed renders for 30 days
    failed: 7,      // Keep failed renders for 7 days
    temporary: 1    // Keep temp files for 1 day
  },
  dryRun: false
};

/**
 * Clean old completed render jobs
 */
export async function cleanOldCompletedJobs(
  retentionDays: number = 30,
  dryRun: boolean = false
): Promise<CleanupResult> {
  const startTime = Date.now();
  let deleted = 0;
  let errors = 0;
  let freedSpace = 0;

  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    logger.info('Starting cleanup of old completed jobs', {
      component: 'ResourceCleaner',
      retentionDays,
      cutoffDate,
      dryRun
    });

    // Find old completed jobs
    const oldJobs = await prisma.render_jobs.findMany({
      where: {
        status: 'completed',
        completed_at: { lt: cutoffDate }
      },
      select: {
        id: true,
        output_url: true,
        outputSize: true,
        completed_at: true
      }
    });

    logger.info(`Found ${oldJobs.length} old completed jobs`, {
      component: 'ResourceCleaner'
    });

    for (const job of oldJobs) {
      try {
        if (dryRun) {
          logger.info('DRY RUN: Would delete job', {
            jobId: job.id,
            outputUrl: job.output_url,
            size: job.outputSize,
            completedAt: job.completed_at
          });
          deleted++;
          freedSpace += job.outputSize || 0;
          continue;
        }

        // Delete physical file if it exists locally
        if (job.output_url) {
          const filePath = extractLocalPath(job.output_url);
          if (filePath && existsSync(filePath)) {
            await fs.unlink(filePath);
            logger.debug('Deleted render output file', {
              jobId: job.id,
              path: filePath
            });
          }
        }

        // Delete database record
        await prisma.render_jobs.delete({
          where: { id: job.id }
        });

        deleted++;
        freedSpace += job.outputSize || 0;

        logger.debug('Deleted old completed job', {
          jobId: job.id,
          freedSpace: job.outputSize
        });
      } catch (error) {
        errors++;
        logger.error('Failed to delete job', error instanceof Error ? error : new Error(String(error)), {
          component: 'ResourceCleaner',
          jobId: job.id
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Completed cleanup of old completed jobs', {
      component: 'ResourceCleaner',
      deleted,
      errors,
      freedSpaceMB: (freedSpace / (1024 * 1024)).toFixed(2),
      duration
    });

    return {
      resourceType: 'completed_jobs',
      deleted,
      freedSpace,
      errors,
      duration
    };
  } catch (error) {
    logger.error('Failed to clean old completed jobs', error instanceof Error ? error : new Error(String(error)), {
      component: 'ResourceCleaner'
    });

    return {
      resourceType: 'completed_jobs',
      deleted,
      freedSpace,
      errors: errors + 1,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Clean failed render jobs
 */
export async function cleanFailedJobs(
  retentionDays: number = 7,
  dryRun: boolean = false
): Promise<CleanupResult> {
  const startTime = Date.now();
  let deleted = 0;
  let errors = 0;

  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    logger.info('Starting cleanup of failed jobs', {
      component: 'ResourceCleaner',
      retentionDays,
      cutoffDate,
      dryRun
    });

    const failedJobs = await prisma.render_jobs.findMany({
      where: {
        status: 'failed',
        updatedAt: { lt: cutoffDate }
      },
      select: {
        id: true,
        error_message: true,
        updatedAt: true
      }
    });

    logger.info(`Found ${failedJobs.length} old failed jobs`, {
      component: 'ResourceCleaner'
    });

    for (const job of failedJobs) {
      try {
        if (dryRun) {
          logger.info('DRY RUN: Would delete failed job', {
            jobId: job.id,
            error: job.error_message,
            updatedAt: job.updatedAt
          });
          deleted++;
          continue;
        }

        await prisma.render_jobs.delete({
          where: { id: job.id }
        });

        deleted++;

        logger.debug('Deleted old failed job', { jobId: job.id });
      } catch (error) {
        errors++;
        logger.error('Failed to delete failed job', error instanceof Error ? error : new Error(String(error)), {
          component: 'ResourceCleaner',
          jobId: job.id
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Completed cleanup of failed jobs', {
      component: 'ResourceCleaner',
      deleted,
      errors,
      duration
    });

    return {
      resourceType: 'failed_jobs',
      deleted,
      errors,
      duration
    };
  } catch (error) {
    logger.error('Failed to clean failed jobs', error instanceof Error ? error : new Error(String(error)), {
      component: 'ResourceCleaner'
    });

    return {
      resourceType: 'failed_jobs',
      deleted,
      errors: errors + 1,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Clean temporary upload files
 */
export async function cleanTempFiles(
  retentionDays: number = 1,
  dryRun: boolean = false
): Promise<CleanupResult> {
  const startTime = Date.now();
  let deleted = 0;
  let errors = 0;
  let freedSpace = 0;

  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    logger.info('Starting cleanup of temp files', {
      component: 'ResourceCleaner',
      uploadsDir,
      retentionDays,
      dryRun
    });

    if (!existsSync(uploadsDir)) {
      logger.info('Uploads directory does not exist, skipping', {
        component: 'ResourceCleaner'
      });
      return {
        resourceType: 'temp_files',
        deleted: 0,
        freedSpace: 0,
        errors: 0,
        duration: Date.now() - startTime
      };
    }

    // Recursively find old files
    await cleanDirectoryRecursive(uploadsDir, cutoffTime, dryRun, {
      deleted: () => deleted++,
      error: () => errors++,
      freedSpace: (size: number) => freedSpace += size
    });

    const duration = Date.now() - startTime;

    logger.info('Completed cleanup of temp files', {
      component: 'ResourceCleaner',
      deleted,
      errors,
      freedSpaceMB: (freedSpace / (1024 * 1024)).toFixed(2),
      duration
    });

    return {
      resourceType: 'temp_files',
      deleted,
      freedSpace,
      errors,
      duration
    };
  } catch (error) {
    logger.error('Failed to clean temp files', error instanceof Error ? error : new Error(String(error)), {
      component: 'ResourceCleaner'
    });

    return {
      resourceType: 'temp_files',
      deleted,
      freedSpace,
      errors: errors + 1,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Clean orphaned idempotency keys (older than 24h)
 */
export async function cleanIdempotencyKeys(
  retentionHours: number = 24,
  dryRun: boolean = false
): Promise<CleanupResult> {
  const startTime = Date.now();
  let deleted = 0;
  let errors = 0;

  try {
    const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    logger.info('Starting cleanup of idempotency keys', {
      component: 'ResourceCleaner',
      retentionHours,
      cutoffDate,
      dryRun
    });

    if (dryRun) {
      const count = await prisma.render_jobs.count({
        where: {
          idempotencyKey: { not: null },
          createdAt: { lt: cutoffDate }
        }
      });

      logger.info(`DRY RUN: Would clear ${count} idempotency keys`, {
        component: 'ResourceCleaner'
      });

      return {
        resourceType: 'idempotency_keys',
        deleted: count,
        errors: 0,
        duration: Date.now() - startTime
      };
    }

    // Clear idempotency keys but keep the job records
    const result = await prisma.render_jobs.updateMany({
      where: {
        idempotencyKey: { not: null },
        createdAt: { lt: cutoffDate }
      },
      data: {
        idempotencyKey: null
      }
    });

    deleted = result.count;

    const duration = Date.now() - startTime;

    logger.info('Completed cleanup of idempotency keys', {
      component: 'ResourceCleaner',
      deleted,
      duration
    });

    return {
      resourceType: 'idempotency_keys',
      deleted,
      errors,
      duration
    };
  } catch (error) {
    logger.error('Failed to clean idempotency keys', error instanceof Error ? error : new Error(String(error)), {
      component: 'ResourceCleaner'
    });

    return {
      resourceType: 'idempotency_keys',
      deleted,
      errors: errors + 1,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run all cleanup tasks with policy
 */
export async function runCleanup(policy: CleanupPolicy = DEFAULT_POLICY): Promise<CleanupResult[]> {
  logger.info('Starting resource cleanup', {
    component: 'ResourceCleaner',
    policy: policy.name,
    dryRun: policy.dryRun
  });

  const results: CleanupResult[] = [];

  if (policy.enabled) {
    // Clean old completed jobs
    results.push(await cleanOldCompletedJobs(policy.retention.completed, policy.dryRun));

    // Clean failed jobs
    results.push(await cleanFailedJobs(policy.retention.failed, policy.dryRun));

    // Clean temp files
    results.push(await cleanTempFiles(policy.retention.temporary, policy.dryRun));

    // Clean idempotency keys
    results.push(await cleanIdempotencyKeys(24, policy.dryRun));
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
  const totalFreed = results.reduce((sum, r) => sum + (r.freedSpace || 0), 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

  logger.info('Resource cleanup completed', {
    component: 'ResourceCleaner',
    totalDeleted,
    totalFreedMB: (totalFreed / (1024 * 1024)).toFixed(2),
    totalErrors,
    dryRun: policy.dryRun
  });

  return results;
}

/**
 * Helper: Recursively clean directory
 */
async function cleanDirectoryRecursive(
  dir: string,
  cutoffTime: number,
  dryRun: boolean,
  counters: { deleted: () => void; error: () => void; freedSpace: (size: number) => void }
): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      try {
        if (entry.isDirectory()) {
          await cleanDirectoryRecursive(fullPath, cutoffTime, dryRun, counters);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);

          if (stats.mtimeMs < cutoffTime) {
            if (dryRun) {
              logger.debug('DRY RUN: Would delete temp file', {
                path: fullPath,
                size: stats.size,
                age: Math.round((Date.now() - stats.mtimeMs) / (1000 * 60 * 60))
              });
            } else {
              await fs.unlink(fullPath);
              logger.debug('Deleted temp file', { path: fullPath, size: stats.size });
            }

            counters.deleted();
            counters.freedSpace(stats.size);
          }
        }
      } catch (error) {
        counters.error();
        logger.error('Failed to process file', error instanceof Error ? error : new Error(String(error)), {
          component: 'ResourceCleaner',
          path: fullPath
        });
      }
    }
  } catch (error) {
    counters.error();
    logger.error('Failed to read directory', error instanceof Error ? error : new Error(String(error)), {
      component: 'ResourceCleaner',
      dir
    });
  }
}

/**
 * Helper: Extract local file path from URL
 */
function extractLocalPath(url: string): string | null {
  try {
    // Handle local file URLs like /uploads/renders/file.mp4
    if (url.startsWith('/uploads/')) {
      return path.join(process.cwd(), url);
    }

    // Handle full URLs with local paths
    const urlObj = new URL(url);
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return path.join(process.cwd(), urlObj.pathname);
    }

    // External URL, can't delete
    return null;
  } catch {
    return null;
  }
}

/**
 * Cleanup scheduler (call this from a cron job)
 */
export async function scheduleCleanup(intervalHours: number = 24) {
  logger.info('Scheduling resource cleanup', {
    component: 'ResourceCleaner',
    intervalHours
  });

  // Run immediately
  await runCleanup(DEFAULT_POLICY);

  // Schedule recurring cleanup
  setInterval(async () => {
    try {
      await runCleanup(DEFAULT_POLICY);
    } catch (error) {
      logger.error('Scheduled cleanup failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'ResourceCleaner'
      });
    }
  }, intervalHours * 60 * 60 * 1000);
}
