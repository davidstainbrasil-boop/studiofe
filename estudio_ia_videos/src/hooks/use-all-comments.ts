'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@lib/logger'
import useSWR from 'swr'

export interface CommentReply {
  id: string
  text: string
  author: string
  authorAvatar: string
  timestamp: string
}

export interface DashboardComment {
  id: string
  text: string
  author: string
  authorAvatar: string
  timestamp: string
  projectId: string
  projectName: string
  slideIndex?: number
  timecode?: string
  isResolved: boolean
  likes: number
  liked: boolean
  replies: CommentReply[]
}

interface CommentsResponse {
  success: boolean
  data?: DashboardComment[]
  pagination?: {
    total: number
    limit: number
    offset: number
  }
  error?: string
}

const fetcher = async (url: string): Promise<CommentsResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch comments')
  }
  return response.json()
}

export function useAllComments(limit: number = 50) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const { data, error, isLoading, mutate } = useSWR<CommentsResponse>(
    `/api/comments/all?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  )

  const comments = data?.data || []
  const pagination = data?.pagination

  const addComment = useCallback(async (
    projectId: string,
    content: string,
    options?: { parentId?: string; slideIndex?: number; timestampSec?: number }
  ) => {
    try {
      setActionLoading('add')
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          content,
          parentId: options?.parentId,
          slideIndex: options?.slideIndex,
          timestampSec: options?.timestampSec
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to add comment')
      }

      // Refresh the list
      await mutate()
      return result.data
    } catch (err) {
      logger.error('Failed to add comment', err instanceof Error ? err : new Error(String(err)))
      throw err
    } finally {
      setActionLoading(null)
    }
  }, [mutate])

  const addReply = useCallback(async (commentId: string, content: string) => {
    try {
      setActionLoading(`reply-${commentId}`)
      
      // Find the parent comment to get projectId
      const parentComment = comments.find(c => c.id === commentId)
      if (!parentComment) {
        throw new Error('Parent comment not found')
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parentComment.projectId,
          content,
          parentId: commentId
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to add reply')
      }

      // Refresh the list
      await mutate()
      return result.data
    } catch (err) {
      logger.error('Failed to add reply', err instanceof Error ? err : new Error(String(err)))
      throw err
    } finally {
      setActionLoading(null)
    }
  }, [comments, mutate])

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      setActionLoading(`delete-${commentId}`)
      
      const response = await fetch(`/api/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete comment')
      }

      // Optimistically update local state
      mutate((prev) => {
        if (!prev?.data) return prev
        return {
          ...prev,
          data: prev.data.filter(c => c.id !== commentId)
        }
      }, false)
    } catch (err) {
      logger.error('Failed to delete comment', err instanceof Error ? err : new Error(String(err)))
      throw err
    } finally {
      setActionLoading(null)
    }
  }, [mutate])

  const toggleLike = useCallback(async (commentId: string) => {
    try {
      setActionLoading(`like-${commentId}`)
      
      // For now, optimistically update likes locally
      // In production, you'd call an API endpoint for likes
      mutate((prev) => {
        if (!prev?.data) return prev
        return {
          ...prev,
          data: prev.data.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                liked: !c.liked,
                likes: c.liked ? c.likes - 1 : c.likes + 1
              }
            }
            return c
          })
        }
      }, false)
    } catch (err) {
      logger.error('Failed to toggle like', err instanceof Error ? err : new Error(String(err)))
      throw err
    } finally {
      setActionLoading(null)
    }
  }, [mutate])

  const resolveComment = useCallback(async (commentId: string, resolved: boolean) => {
    try {
      setActionLoading(`resolve-${commentId}`)
      
      const response = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          isResolved: resolved
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to resolve comment')
      }

      // Optimistically update local state
      mutate((prev) => {
        if (!prev?.data) return prev
        return {
          ...prev,
          data: prev.data.map(c => 
            c.id === commentId ? { ...c, isResolved: resolved } : c
          )
        }
      }, false)
    } catch (err) {
      logger.error('Failed to resolve comment', err instanceof Error ? err : new Error(String(err)))
      throw err
    } finally {
      setActionLoading(null)
    }
  }, [mutate])

  return {
    comments,
    pagination,
    loading: isLoading,
    error: error?.message || data?.error || null,
    actionLoading,
    addComment,
    addReply,
    deleteComment,
    toggleLike,
    resolveComment,
    refresh: () => mutate()
  }
}
