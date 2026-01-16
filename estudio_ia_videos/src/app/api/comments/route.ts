import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@lib/logger'
import { getRequiredEnv } from '@lib/env'

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'projectId is required'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:auth.users(id, email, raw_user_meta_data)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    logger.error('Comments fetch error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch comments'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        project_id: body.projectId,
        user_id: body.userId,
        parent_id: body.parentId,
        content: body.content,
        slide_index: body.slideIndex,
        timestamp_sec: body.timestampSec,
        metadata: body.metadata || {}
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 })
  } catch (error) {
    logger.error('Comment creation error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Failed to create comment'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const commentId = body.commentId

    if (!commentId) {
      return NextResponse.json({
        success: false,
        error: 'commentId is required'
      }, { status: 400 })
    }

    const updates: any = {}
    if (body.content !== undefined) updates.content = body.content
    if (body.isResolved !== undefined) updates.is_resolved = body.isResolved
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    logger.error('Comment update error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Failed to update comment'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({
        success: false,
        error: 'commentId is required'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Comment deleted'
    })
  } catch (error) {
    logger.error('Comment deletion error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Failed to delete comment'
    }, { status: 500 })
  }
}
