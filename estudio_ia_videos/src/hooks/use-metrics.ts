
'use client'

import useSWR from 'swr'
import { logger } from '@lib/logger'

export interface Metrics {
  overview: {
    totalProjects: number
    completedProjects: number
    processingProjects: number
    totalDuration: number
    totalViews: number
    totalDownloads: number
    avgProcessingTime: number
  }
  projectStatus: Array<{
    status: string
    count: number
  }>
  activity: {
    timeline: Array<{
      date: string
      activities: number
    }>
    events: Array<{
      type: string
      count: number
    }>
  }
  performance: {
    avgProcessingTime: number
    successRate: number
    cacheHitRate: number
  }
  period: string
  dateRange: {
    start: string
    end: string
  }
}

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, {
      credentials: 'include' // Send cookies for auth
    })
    
    if (!res.ok) {
      // Handle auth errors gracefully
      if (res.status === 401) {
        logger.warn('Unauthorized access to metrics', { component: 'use-metrics' })
        return null
      }
      throw new Error(`Failed to fetch: ${res.status}`)
    }
    
    const data = await res.json()
    return data.data || data // Support both {data: ...} and direct response
  } catch (error) {
    logger.error('Error fetching metrics', error as Error, { component: 'use-metrics' })
    // Return fallback data on error
    return {
      overview: {
        totalProjects: 0,
        completedProjects: 0,
        processingProjects: 0,
        totalDuration: 0,
        totalViews: 0,
        totalDownloads: 0,
        avgProcessingTime: 0
      },
      projectStatus: [],
      activity: {
        timeline: [],
        events: []
      },
      performance: {
        avgProcessingTime: 0,
        successRate: 0,
        cacheHitRate: 0
      },
      period: 'month',
      dateRange: {
        start: '',
        end: ''
      }
    }
  }
}

export function useMetrics(period: 'day' | 'week' | 'month' | 'quarter' = 'month') {
  const { data, error, mutate, isLoading } = useSWR<Metrics>(
    `/api/metrics/dashboard?period=${period}`,
    fetcher,
    { 
      refreshInterval: 30000, // Refresh a cada 30 segundos
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 second deduping
      errorRetryCount: 2,
      errorRetryInterval: 5000,
      fallbackData: {
        overview: {
          totalProjects: 0,
          completedProjects: 0,
          processingProjects: 0,
          totalDuration: 0,
          totalViews: 0,
          totalDownloads: 0,
          avgProcessingTime: 0
        },
        projectStatus: [],
        activity: {
          timeline: [],
          events: []
        },
        performance: {
          avgProcessingTime: 0,
          successRate: 0,
          cacheHitRate: 0
        },
        period: 'month',
        dateRange: {
          start: '',
          end: ''
        }
      }
    }
  )

  return {
    metrics: data,
    loading: isLoading,
    error,
    refresh: mutate
  }
}
