'use client'

import useSWR from 'swr'
import { useCallback, useState } from 'react'
import { logger } from '@lib/logger'

export type ActivityType = 'create' | 'edit' | 'delete' | 'share' | 'export' | 'auth' | 'settings' | 'view'

export interface ActivityLog {
  id: string
  action: string
  description: string
  user: string
  userAvatar: string
  timestamp: string
  type: ActivityType
  metadata?: {
    resourceType?: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
  }
}

interface ActivityResponse {
  success: boolean
  data?: ActivityLog[]
  pagination?: {
    total: number
    limit: number
    offset: number
  }
  error?: string
}

const fetcher = async (url: string): Promise<ActivityResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch activity')
  }
  return response.json()
}

export interface UseActivityOptions {
  limit?: number
  type?: ActivityType | 'all'
  search?: string
}

export function useActivity(options: UseActivityOptions = {}) {
  const { limit = 50, type = 'all', search = '' } = options
  const [actionLoading, setActionLoading] = useState(false)

  // Build query string
  const params = new URLSearchParams()
  params.set('limit', limit.toString())
  if (type !== 'all') params.set('type', type)
  if (search) params.set('search', search)

  const { data, error, isLoading, mutate } = useSWR<ActivityResponse>(
    `/api/activity?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  )

  const activities = data?.data || []
  const pagination = data?.pagination

  const logActivity = useCallback(async (
    action: string,
    details: {
      resourceType?: string
      resourceId?: string
      newValues?: Record<string, unknown>
      oldValues?: Record<string, unknown>
      metadata?: Record<string, unknown>
    } = {}
  ) => {
    try {
      setActionLoading(true)

      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          resourceType: details.resourceType,
          resourceId: details.resourceId,
          newValues: details.newValues,
          oldValues: details.oldValues,
          metadata: details.metadata
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to log activity')
      }

      // Refresh the list
      await mutate()
      return result.data
    } catch (err) {
      logger.error('Failed to log activity', err instanceof Error ? err : new Error(String(err)))
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [mutate])

  return {
    activities,
    pagination,
    loading: isLoading,
    error: error?.message || data?.error || null,
    actionLoading,
    logActivity,
    refresh: () => mutate()
  }
}
