import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@lib/services'
import { logger } from '@lib/logger'

interface Comment {
  id: string
  project_id: string
  user_id: string
  parent_id?: string
  content: string
  slide_index?: number
  timestamp_sec?: number
  is_resolved: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    raw_user_meta_data?: any
  }
}

interface UseCommentsOptions {
  projectId: string
  enableRealtime?: boolean
}

export function useComments({ projectId, enableRealtime = true }: UseCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/comments?projectId=${projectId}`)
      const data = await response.json()

      if (data.success) {
        setComments(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      logger.error('Failed to fetch comments', err instanceof Error ? err : new Error(String(err)))
      setError('Failed to fetch comments')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const addComment = useCallback(async (
    content: string,
    options?: { parentId?: string; slideIndex?: number; timestampSec?: number }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: user.id,
          content,
          parentId: options?.parentId,
          slideIndex: options?.slideIndex,
          timestampSec: options?.timestampSec
        })
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      return data.data
    } catch (err) {
      logger.error('Failed to add comment', err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }, [projectId, supabase])

  const updateComment = useCallback(async (commentId: string, updates: { content?: string; isResolved?: boolean }) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          ...updates
        })
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      return data.data
    } catch (err) {
      logger.error('Failed to update comment', err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }, [])

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)
    } catch (err) {
      logger.error('Failed to delete comment', err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }, [])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  useEffect(() => {
    if (!enableRealtime) return

    const channel = supabase
      .channel(`comments:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments((prev) => [...prev, payload.new as Comment])
          } else if (payload.eventType === 'UPDATE') {
            setComments((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Comment) : c))
            )
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, enableRealtime, supabase])

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    refresh: fetchComments
  }
}
