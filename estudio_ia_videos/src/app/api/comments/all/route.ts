import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@lib/logger'
import { getRequiredEnv } from '@lib/env'
import { createClient as createServerClient } from '@lib/supabase/server'

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

/**
 * GET /api/comments/all
 * Returns all comments from all projects the user has access to
 * Used by the comments dashboard page
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // First get projects the user has access to
    const { data: userProjects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title')
      .eq('user_id', user.id)

    if (projectsError) {
      logger.error('Failed to fetch user projects', projectsError)
      throw projectsError
    }

    if (!userProjects || userProjects.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, limit, offset }
      })
    }

    const projectIds = userProjects.map(p => p.id)
    const projectMap = Object.fromEntries(userProjects.map(p => [p.id, p.title]))

    // Fetch comments from user's projects
    const { data: comments, error: commentsError, count } = await supabaseAdmin
      .from('comments')
      .select(`
        id,
        project_id,
        user_id,
        parent_id,
        content,
        slide_index,
        timestamp_sec,
        is_resolved,
        created_at,
        updated_at,
        metadata
      `, { count: 'exact' })
      .in('project_id', projectIds)
      .is('parent_id', null) // Only top-level comments
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (commentsError) {
      logger.error('Failed to fetch comments', commentsError)
      throw commentsError
    }

    // Fetch replies for these comments
    const commentIds = (comments || []).map(c => c.id)
    let replies: Array<{
      id: string
      parent_id: string
      user_id: string
      content: string
      created_at: string
    }> = []

    if (commentIds.length > 0) {
      const { data: repliesData, error: repliesError } = await supabaseAdmin
        .from('comments')
        .select('id, parent_id, user_id, content, created_at')
        .in('parent_id', commentIds)
        .order('created_at', { ascending: true })

      if (!repliesError && repliesData) {
        replies = repliesData
      }
    }

    // Get unique user IDs to fetch user info
    const allUserIds = new Set<string>()
    comments?.forEach(c => allUserIds.add(c.user_id))
    replies.forEach(r => allUserIds.add(r.user_id))

    // Fetch user profiles from auth.users via admin API
    const userProfiles: Record<string, { name: string; avatar: string }> = {}
    
    // For now, generate avatar initials from user_id
    // In production, you would fetch from profiles table
    for (const userId of allUserIds) {
      const initials = userId.substring(0, 2).toUpperCase()
      userProfiles[userId] = {
        name: `Usuário ${initials}`,
        avatar: initials
      }
    }

    // Try to get actual user profile data
    if (allUserIds.size > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(allUserIds))

      if (profiles) {
        for (const profile of profiles) {
          const name = profile.full_name || `Usuário ${profile.id.substring(0, 2).toUpperCase()}`
          userProfiles[profile.id] = {
            name,
            avatar: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
          }
        }
      }
    }

    // Map replies to their parent comments
    const repliesByParent: Record<string, typeof replies> = {}
    for (const reply of replies) {
      if (!repliesByParent[reply.parent_id]) {
        repliesByParent[reply.parent_id] = []
      }
      repliesByParent[reply.parent_id].push(reply)
    }

    // Format response to match UI expectations
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      text: comment.content,
      author: userProfiles[comment.user_id]?.name || 'Usuário',
      authorAvatar: userProfiles[comment.user_id]?.avatar || 'U',
      timestamp: comment.created_at,
      projectId: comment.project_id,
      projectName: projectMap[comment.project_id] || 'Projeto',
      slideIndex: comment.slide_index,
      timecode: comment.timestamp_sec ? formatTimecode(comment.timestamp_sec) : undefined,
      isResolved: comment.is_resolved,
      likes: (comment.metadata as Record<string, unknown>)?.likes as number || 0,
      liked: false, // Would need to track per-user likes
      replies: (repliesByParent[comment.id] || []).map(reply => ({
        id: reply.id,
        text: reply.content,
        author: userProfiles[reply.user_id]?.name || 'Usuário',
        authorAvatar: userProfiles[reply.user_id]?.avatar || 'U',
        timestamp: reply.created_at
      }))
    }))

    return NextResponse.json({
      success: true,
      data: formattedComments,
      pagination: {
        total: count || 0,
        limit,
        offset
      }
    })
  } catch (error) {
    logger.error('All comments fetch error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Falha ao carregar comentários'
    }, { status: 500 })
  }
}

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
