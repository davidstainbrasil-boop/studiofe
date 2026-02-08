import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerAuth } from '@lib/auth/unified-session'
import { logger } from '@lib/logger'
import { getRequiredEnv } from '@lib/env'
import { applyRateLimit } from '@/lib/rate-limit';

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'templates-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    logger.error('Templates API error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch templates'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: body.name,
        description: body.description,
        category: body.category,
        type: body.type || 'video',
        thumbnail_url: body.thumbnailUrl,
        preview_url: body.previewUrl,
        metadata: body.metadata || {},
        settings: body.settings || {},
        is_public: body.isPublic ?? true,
        is_featured: body.isFeatured ?? false
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 })
  } catch (error) {
    logger.error('Template creation error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Failed to create template'
    }, { status: 500 })
  }
}
