import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@lib/logger'
import { getRequiredEnv } from '@lib/env'
import { createClient as createServerClient } from '@lib/supabase/server'
import { applyRateLimit } from '@/lib/rate-limit';

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

type ActivityType = 'create' | 'edit' | 'delete' | 'share' | 'export' | 'auth' | 'settings' | 'view'

const actionToType: Record<string, ActivityType> = {
  'create': 'create',
  'insert': 'create',
  'update': 'edit',
  'edit': 'edit',
  'delete': 'delete',
  'remove': 'delete',
  'share': 'share',
  'export': 'export',
  'download': 'export',
  'login': 'auth',
  'logout': 'auth',
  'register': 'auth',
  'settings': 'settings',
  'config': 'settings',
  'view': 'view'
}

function mapActionToType(action: string): ActivityType {
  const lowercased = action.toLowerCase()
  
  for (const [key, value] of Object.entries(actionToType)) {
    if (lowercased.includes(key)) {
      return value
    }
  }
  
  return 'edit' // default
}

function formatActivityDescription(log: {
  action: string
  resource_type?: string
  resource_id?: string
  new_values?: Record<string, unknown>
  old_values?: Record<string, unknown>
}): string {
  const resourceType = log.resource_type || 'item'
  const resourceName = (log.new_values as Record<string, unknown>)?.title || 
                       (log.new_values as Record<string, unknown>)?.name || 
                       resourceType
  
  switch (log.action.toLowerCase()) {
    case 'create':
    case 'insert':
      return `Criou ${resourceType} "${resourceName}"`
    case 'update':
    case 'edit':
      return `Editou ${resourceType} "${resourceName}"`
    case 'delete':
    case 'remove':
      return `Excluiu ${resourceType}`
    case 'login':
      return `Fez login no sistema`
    case 'logout':
      return `Saiu do sistema`
    case 'share':
      return `Compartilhou ${resourceType} "${resourceName}"`
    case 'export':
      return `Exportou ${resourceType} "${resourceName}"`
    default:
      return `${log.action} em ${resourceType}`
  }
}

/**
 * GET /api/activity
 * Returns activity logs for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'activity-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

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
    const type = searchParams.get('type') // filter by type
    const search = searchParams.get('search') // search query

    // Build query
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply type filter if provided
    if (type && type !== 'all') {
      // Map type to possible actions
      const actionsForType = Object.entries(actionToType)
        .filter(([_, v]) => v === type)
        .map(([k]) => k)
      
      if (actionsForType.length > 0) {
        query = query.in('action', actionsForType)
      }
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%`)
    }

    const { data: logs, error, count } = await query

    if (error) {
      logger.error('Failed to fetch activity logs', error)
      throw error
    }

    // Get user profile for display
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name || user.email?.split('@')[0] || 'Usuário'
    const userAvatar = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)

    // Format activities for UI
    const activities = (logs || []).map(log => ({
      id: log.id,
      action: formatActionLabel(log.action),
      description: formatActivityDescription(log),
      user: userName,
      userAvatar,
      timestamp: log.created_at,
      type: mapActionToType(log.action),
      metadata: {
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        ipAddress: log.ip_address,
        userAgent: log.user_agent
      }
    }))

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        total: count || 0,
        limit,
        offset
      }
    })
  } catch (error) {
    logger.error('Activity fetch error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Falha ao carregar atividades'
    }, { status: 500 })
  }
}

function formatActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'create': 'Item criado',
    'insert': 'Item criado',
    'update': 'Item atualizado',
    'edit': 'Item editado',
    'delete': 'Item excluído',
    'remove': 'Item removido',
    'share': 'Item compartilhado',
    'export': 'Exportação realizada',
    'download': 'Download realizado',
    'login': 'Login realizado',
    'logout': 'Logout realizado',
    'register': 'Conta criada'
  }
  
  return labels[action.toLowerCase()] || action
}

/**
 * POST /api/activity
 * Create a new activity log entry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 })
    }

    const body = await request.json()
    const { action, resourceType, resourceId, newValues, oldValues, metadata } = body

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Ação é obrigatória'
      }, { status: 400 })
    }

    // Get request info
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        new_values: newValues,
        old_values: oldValues,
        ip_address: ip,
        user_agent: userAgent,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create activity log', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 })
  } catch (error) {
    logger.error('Activity creation error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      success: false,
      error: 'Falha ao registrar atividade'
    }, { status: 500 })
  }
}
