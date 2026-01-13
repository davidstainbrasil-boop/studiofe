/**
 * Cache Invalidation Helpers
 *
 * Convenience functions for invalidating cache after data mutations.
 * Use these functions after CREATE, UPDATE, DELETE operations to ensure cache consistency.
 *
 * Usage:
 * ```typescript
 * import { invalidateProjectCache, invalidateUserCache } from '@lib/cache/cache-invalidation-helpers';
 *
 * // After updating a project
 * await prisma.projects.update({ ... });
 * await invalidateProjectCache(projectId);
 * ```
 */

import { invalidate, invalidatePattern } from './redis-cache';
import { logger } from '@lib/logger';

/**
 * Invalidate all cache keys related to a specific project
 *
 * Clears:
 * - project:${projectId}:owner
 * - project:${projectId}:collaborator:*
 * - project:${projectId}:*
 */
export async function invalidateProjectCache(projectId: string): Promise<void> {
  try {
    await invalidatePattern(`project:${projectId}:*`);
    logger.info('Project cache invalidated', { projectId });
  } catch (error) {
    logger.error('Failed to invalidate project cache', error instanceof Error ? error : new Error(String(error)), { projectId });
  }
}

/**
 * Invalidate all cache keys related to a specific user
 *
 * Clears:
 * - user:${userId}:tier
 * - user:${userId}:*
 * - projects:list:${userId}:*
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    await Promise.all([
      invalidatePattern(`user:${userId}:*`),
      invalidatePattern(`projects:list:${userId}:*`)
    ]);
    logger.info('User cache invalidated', { userId });
  } catch (error) {
    logger.error('Failed to invalidate user cache', error instanceof Error ? error : new Error(String(error)), { userId });
  }
}

/**
 * Invalidate all projects list cache for a specific user
 *
 * Use when:
 * - User creates a new project
 * - User deletes a project
 * - Project list changes
 *
 * Clears: projects:list:${userId}:*
 */
export async function invalidateUserProjectsListCache(userId: string): Promise<void> {
  try {
    await invalidatePattern(`projects:list:${userId}:*`);
    logger.info('User projects list cache invalidated', { userId });
  } catch (error) {
    logger.error('Failed to invalidate user projects list cache', error instanceof Error ? error : new Error(String(error)), { userId });
  }
}

/**
 * Invalidate user tier cache (after subscription change)
 *
 * Use when:
 * - User upgrades/downgrades subscription
 * - User subscription expires
 * - Admin changes user tier
 *
 * Clears: user:${userId}:tier
 */
export async function invalidateUserTierCache(userId: string): Promise<void> {
  try {
    await invalidate(`user:${userId}:tier`);
    logger.info('User tier cache invalidated', { userId });
  } catch (error) {
    logger.error('Failed to invalidate user tier cache', error instanceof Error ? error : new Error(String(error)), { userId });
  }
}

/**
 * Invalidate collaborator cache for a project
 *
 * Use when:
 * - Collaborator added to project
 * - Collaborator removed from project
 * - Collaborator permissions changed
 *
 * Clears: project:${projectId}:collaborator:*
 */
export async function invalidateProjectCollaboratorsCache(projectId: string): Promise<void> {
  try {
    await invalidatePattern(`project:${projectId}:collaborator:*`);
    logger.info('Project collaborators cache invalidated', { projectId });
  } catch (error) {
    logger.error('Failed to invalidate project collaborators cache', error instanceof Error ? error : new Error(String(error)), { projectId });
  }
}

/**
 * Invalidate all cache (nuclear option - use sparingly)
 *
 * Use when:
 * - Major data migration
 * - Cache corruption suspected
 * - Emergency flush needed
 *
 * ⚠️ WARNING: This will clear ALL cached data
 */
export async function invalidateAllCache(): Promise<void> {
  try {
    await invalidatePattern('*');
    logger.warn('ALL cache invalidated - nuclear option used');
  } catch (error) {
    logger.error('Failed to invalidate all cache', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Batch invalidation helper
 *
 * Use when invalidating multiple related entities at once
 *
 * Example:
 * ```typescript
 * await batchInvalidate({
 *   projects: ['project-1', 'project-2'],
 *   users: ['user-1']
 * });
 * ```
 */
export async function batchInvalidate(entities: {
  projects?: string[];
  users?: string[];
  userProjectLists?: string[];
  userTiers?: string[];
}): Promise<void> {
  try {
    const promises: Promise<void>[] = [];

    if (entities.projects) {
      promises.push(...entities.projects.map(id => invalidateProjectCache(id)));
    }

    if (entities.users) {
      promises.push(...entities.users.map(id => invalidateUserCache(id)));
    }

    if (entities.userProjectLists) {
      promises.push(...entities.userProjectLists.map(id => invalidateUserProjectsListCache(id)));
    }

    if (entities.userTiers) {
      promises.push(...entities.userTiers.map(id => invalidateUserTierCache(id)));
    }

    await Promise.all(promises);

    logger.info('Batch cache invalidation complete', {
      projects: entities.projects?.length || 0,
      users: entities.users?.length || 0,
      userProjectLists: entities.userProjectLists?.length || 0,
      userTiers: entities.userTiers?.length || 0,
    });
  } catch (error) {
    logger.error('Failed batch cache invalidation', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Smart invalidation after project update
 *
 * Automatically invalidates all related cache keys
 *
 * Use after:
 * - prisma.projects.update()
 * - prisma.projects.delete()
 *
 * @param projectId - Project ID that was updated/deleted
 * @param userId - Optional user ID if known (more efficient)
 */
export async function invalidateAfterProjectUpdate(
  projectId: string,
  userId?: string
): Promise<void> {
  try {
    const promises: Promise<void>[] = [
      invalidateProjectCache(projectId)
    ];

    if (userId) {
      promises.push(invalidateUserProjectsListCache(userId));
    }

    await Promise.all(promises);

    logger.info('Cache invalidated after project update', { projectId, userId });
  } catch (error) {
    logger.error('Failed to invalidate cache after project update', error instanceof Error ? error : new Error(String(error)), { projectId, userId });
  }
}

/**
 * Smart invalidation after collaborator change
 *
 * Invalidates project and user caches for all affected users
 *
 * Use after:
 * - Adding collaborator
 * - Removing collaborator
 * - Changing collaborator permissions
 */
export async function invalidateAfterCollaboratorChange(
  projectId: string,
  userIds: string[]
): Promise<void> {
  try {
    await Promise.all([
      invalidateProjectCollaboratorsCache(projectId),
      ...userIds.map(userId => invalidateUserProjectsListCache(userId))
    ]);

    logger.info('Cache invalidated after collaborator change', { projectId, userIds });
  } catch (error) {
    logger.error('Failed to invalidate cache after collaborator change', error instanceof Error ? error : new Error(String(error)), { projectId, userIds });
  }
}

/**
 * Smart invalidation after subscription change
 *
 * Invalidates user tier cache and rate limiting may reset
 *
 * Use after:
 * - User upgrades subscription
 * - User downgrades subscription
 * - Subscription expires
 */
export async function invalidateAfterSubscriptionChange(userId: string): Promise<void> {
  try {
    await invalidateUserTierCache(userId);
    logger.info('Cache invalidated after subscription change', { userId });
  } catch (error) {
    logger.error('Failed to invalidate cache after subscription change', error instanceof Error ? error : new Error(String(error)), { userId });
  }
}

// Export commonly used functions
export {
  // Direct invalidation functions
  invalidate as invalidateCacheKey,
  invalidatePattern as invalidateCachePattern,
} from './redis-cache';
