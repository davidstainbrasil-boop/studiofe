import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@lib/logger'
import { getRequiredEnv } from '@lib/env'
import { applyRateLimit } from '@/lib/rate-limit';

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'avatars-models-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const provider = searchParams.get('provider')

    let query = supabase
      .from('avatar_models')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (category) {
      query = query.eq('category', category)
    }

    if (provider) {
      query = query.eq('avatar_provider', provider)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    logger.error('Avatar models API error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch avatar models'
    }, { status: 500 })
  }
}
