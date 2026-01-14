/**
 * Prisma Middleware for Automatic Cache Invalidation
 * 
 * Automatically invalidates related cache keys after database mutations
 * to ensure cache consistency without manual invalidation calls.
 */

import { Prisma } from '@prisma/client'
import { 
  invalidateAfterProjectUpdate,
  invalidateAfterSubscriptionChange,
  invalidateUserProjectsListCache,
  invalidateProjectCollaboratorsCache
} from '@lib/cache/cache-invalidation-helpers'
import { logger } from '@lib/logger'

export const cacheInvalidationMiddleware: Prisma.Middleware = async (params, next) => {
  const result = await next(params)

  // Only invalidate on write operations
  if (!['create', 'update', 'delete', 'upsert'].includes(params.action)) {
    return result
  }

  const model = params.model?.toLowerCase()

  try {
    // Project mutations
    if (model === 'projects') {
      const projectId = result?.id || params.args?.where?.id
      const userId = result?.userId || result?.user_id
      
      if (projectId) {
        await invalidateAfterProjectUpdate(projectId, userId)
      }
    }

    // User subscription changes
    if (model === 'users' && params.args?.data?.subscriptionTier) {
      const userId = result?.id || params.args?.where?.id
      
      if (userId) {
        await invalidateAfterSubscriptionChange(userId)
      }
    }

    // Collaborator changes
    if (model === 'project_collaborators') {
      const projectId = result?.projectId || result?.project_id
      const userId = result?.userId || result?.user_id
      
      if (projectId) {
        await invalidateProjectCollaboratorsCache(projectId)
        if (userId) {
          await invalidateUserProjectsListCache(userId)
        }
      }
    }

    // Render jobs (invalidate project cache)
    if (model === 'render_jobs') {
      const projectId = result?.projectId || result?.project_id
      
      if (projectId) {
        await invalidateAfterProjectUpdate(projectId)
      }
    }
  } catch (error) {
    // Log but don't fail the operation if cache invalidation fails
    logger.warn('Cache invalidation failed in middleware', { 
      model, 
      action: params.action,
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return result
}
