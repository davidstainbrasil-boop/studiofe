import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@lib/logger'
import { getServerAuth } from '@lib/auth/unified-session'
import { applyRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

interface InteractiveElementInput {
  id?: string
  type: string
  timestamp?: number
  duration?: number | null
  orderIndex?: number
  width?: number | null
  height?: number | null
  position?: { x?: number; y?: number }
  content?: Record<string, unknown>
  action?: Record<string, unknown>
  conditions?: Record<string, unknown> | null
  styling?: Record<string, unknown> | null
}

interface InteractiveEventRow {
  element_id: string | null
  event_type: string
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? {})) as Json
}

function mapElementRow(
  element: InteractiveElementInput,
  videoId: string,
  index: number
) {
  return {
    id: element.id || uuidv4(),
    video_id: videoId,
    type: element.type,
    timestamp: Number.isFinite(element.timestamp) ? Number(element.timestamp) : 0,
    duration:
      element.duration === undefined || element.duration === null
        ? null
        : Number(element.duration),
    order_index: Number.isFinite(element.orderIndex) ? Number(element.orderIndex) : index,
    width: element.width === undefined || element.width === null ? null : Number(element.width),
    height: element.height === undefined || element.height === null ? null : Number(element.height),
    position_x: Number(element.position?.x || 0),
    position_y: Number(element.position?.y || 0),
    content: asJson(element.content || {}),
    action: asJson(element.action || {}),
    conditions: element.conditions ? asJson(element.conditions) : null,
    styling: element.styling ? asJson(element.styling) : null,
    updated_at: new Date().toISOString()
  }
}

async function assertVideoOwnership(
  supabase: ReturnType<typeof createClient>,
  videoId: string,
  userId: string
) {
  const { data: video, error } = await supabase
    .from('interactive_videos')
    .select('id, user_id')
    .eq('id', videoId)
    .single()

  if (error || !video) return { ok: false as const, status: 404, error: 'Interactive video not found' }
  if (video.user_id !== userId) return { ok: false as const, status: 403, error: 'Access denied' }
  return { ok: true as const }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      projectId?: string
      videoId?: string
      title?: string
      description?: string
      duration?: number
      videoUrl?: string
      settings?: Record<string, unknown>
      elements?: InteractiveElementInput[]
    }

    const videoId = body.videoId || body.projectId
    const elements = Array.isArray(body.elements) ? body.elements : []
    if (!videoId) {
      return NextResponse.json(
        { success: false, message: 'projectId ou videoId é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data: existingVideo } = await supabase
      .from('interactive_videos')
      .select('id, user_id')
      .eq('id', videoId)
      .maybeSingle()

    if (!existingVideo) {
      const { error: createVideoError } = await supabase
        .from('interactive_videos')
        .insert({
          id: videoId,
          user_id: session.user.id,
          title: body.title || `Interactive ${videoId}`,
          description: body.description || null,
          duration: Number.isFinite(body.duration) ? Number(body.duration) : 0,
          video_url: body.videoUrl || '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settings: asJson(body.settings || {}) as any,
          updated_at: new Date().toISOString()
        })

      if (createVideoError) {
        logger.error('Failed to create interactive video', createVideoError instanceof Error ? createVideoError : new Error(String(createVideoError)))
        return NextResponse.json(
          { success: false, message: 'Erro ao criar vídeo interativo' },
          { status: 500 }
        )
      }
    } else if (existingVideo.user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado ao vídeo interativo' },
        { status: 403 }
      )
    }

    if (elements.length > 0) {
      const mappedRows = elements.map((element, index) => mapElementRow(element, videoId, index))
      const { error: upsertError } = await supabase
        .from('interactive_elements')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(mappedRows as any, { onConflict: 'id' })

      if (upsertError) {
        logger.error('Failed to upsert interactive elements', upsertError instanceof Error ? upsertError : new Error(String(upsertError)))
        return NextResponse.json(
          { success: false, message: 'Erro ao salvar elementos interativos' },
          { status: 500 }
        )
      }
    }

    if (body.settings) {
      await supabase
        .from('interactive_videos')
        .update({
          settings: asJson(body.settings),
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId)
    }

    const [{ data: savedElements }, { data: events }, { data: sessions }] = await Promise.all([
      supabase
        .from('interactive_elements')
        .select('*')
        .eq('video_id', videoId)
        .order('order_index', { ascending: true }),
      supabase
        .from('interactive_events')
        .select('element_id, event_type')
        .eq('video_id', videoId),
      supabase
        .from('interactive_video_sessions')
        .select('duration, completed')
        .eq('video_id', videoId)
    ])

    const eventRows = (events || []) as InteractiveEventRow[]
    const eventMap = new Map<string, { impressions: number; interactions: number }>()
    eventRows.forEach((event) => {
      const key = event.element_id || 'unknown'
      const current = eventMap.get(key) || { impressions: 0, interactions: 0 }
      const type = (event.event_type || '').toLowerCase()

      if (type.includes('impression') || type.includes('view')) current.impressions += 1
      if (type.includes('interaction') || type.includes('click')) current.interactions += 1
      eventMap.set(key, current)
    })

    const avgSessionDuration = (sessions || []).length
      ? (sessions || []).reduce((acc, s) => acc + (s.duration || 0), 0) / (sessions || []).length
      : 0
    const completedSessions = (sessions || []).filter((s) => s.completed).length
    const completionRate = (sessions || []).length
      ? round((completedSessions / (sessions || []).length) * 100)
      : 0

    const responseElements = (savedElements || []).map((element) => {
      const stats = eventMap.get(element.id) || { impressions: 0, interactions: 0 }
      const elementCompletion = stats.impressions > 0
        ? round((stats.interactions / stats.impressions) * 100)
        : 0

      return {
        ...element,
        analytics: {
          impressions: stats.impressions,
          interactions: stats.interactions,
          completionRate: elementCompletion,
          averageTime: round(avgSessionDuration)
        }
      }
    })

    const typeCounts = responseElements.reduce<Record<string, number>>((acc, element) => {
      const type = String(element.type || 'unknown')
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        id: videoId,
        elements: responseElements,
        metadata: {
          totalElements: responseElements.length,
          elementTypes: typeCounts,
          estimatedEngagement: completionRate,
          complexity:
            responseElements.length > 10
              ? 'high'
              : responseElements.length > 5
                ? 'medium'
                : 'low'
        },
        export: {
          formats: ['html', 'scorm', 'xapi', 'json'],
          endpoint: `/api/v1/interactive/export?videoId=${videoId}`
        },
        updatedAt: new Date().toISOString()
      },
      message: 'Elementos interativos salvos com sucesso'
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Interactive elements processing error', err, { component: 'API: v1/interactive/elements' })
    return NextResponse.json(
      { success: false, message: 'Erro ao processar elementos interativos' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-interactive-elements-get', 60)
    if (rateLimitBlocked) return rateLimitBlocked

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')

    if (projectId) {
      const ownership = await assertVideoOwnership(supabase, projectId, session.user.id)
      if (!ownership.ok) {
        return NextResponse.json({ success: false, message: ownership.error }, { status: ownership.status })
      }

      const [{ data: video }, { data: elements }, { data: events }] = await Promise.all([
        supabase
          .from('interactive_videos')
          .select('id, title, description, total_views, average_engagement, completion_rate, updated_at')
          .eq('id', projectId)
          .single(),
        supabase
          .from('interactive_elements')
          .select('*')
          .eq('video_id', projectId)
          .order('order_index', { ascending: true }),
        supabase
          .from('interactive_events')
          .select('id')
          .eq('video_id', projectId)
      ])

      return NextResponse.json({
        success: true,
        data: {
          id: video?.id || projectId,
          title: video?.title || null,
          description: video?.description || null,
          elements: elements || [],
          analytics: {
            totalViews: video?.total_views || 0,
            totalInteractions: (events || []).length,
            avgCompletionRate: video?.completion_rate || 0,
            avgEngagement: video?.average_engagement || 0,
            lastUpdated: video?.updated_at || null
          }
        }
      })
    }

    const { data: videos } = await supabase
      .from('interactive_videos')
      .select('id')
      .eq('user_id', session.user.id)
      .limit(200)

    const videoIds = (videos || []).map((v) => v.id)
    if (!videoIds.length) {
      return NextResponse.json({
        success: true,
        data: type ? { type, elements: [], count: 0 } : { library: [], summary: { totalElements: 0 } }
      })
    }

    let query = supabase
      .from('interactive_elements')
      .select('*')
      .in('video_id', videoIds)
      .order('updated_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data: allElements, error } = await query.limit(200)
    if (error) {
      logger.error('Get interactive elements error', error instanceof Error ? error : new Error(String(error)), {
        component: 'API: v1/interactive/elements'
      })
      return NextResponse.json(
        { success: false, message: 'Erro ao carregar elementos interativos' },
        { status: 500 }
      )
    }

    if (type) {
      return NextResponse.json({
        success: true,
        data: {
          type,
          elements: allElements || [],
          count: (allElements || []).length
        }
      })
    }

    const grouped = (allElements || []).reduce<Record<string, unknown[]>>((acc, element) => {
      const key = String(element.type || 'unknown')
      acc[key] = acc[key] || []
      acc[key].push(element)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        library: grouped,
        summary: {
          totalElements: (allElements || []).length,
          categories: Object.keys(grouped)
        }
      }
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Get interactive elements error', err, { component: 'API: v1/interactive/elements' })
    return NextResponse.json(
      { success: false, message: 'Erro ao carregar elementos interativos' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      elementId?: string
      properties?: Partial<InteractiveElementInput>
      content?: Record<string, unknown>
    }
    const elementId = body.elementId
    if (!elementId) {
      return NextResponse.json(
        { success: false, message: 'ID do elemento é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data: element } = await supabase
      .from('interactive_elements')
      .select('id, video_id')
      .eq('id', elementId)
      .single()

    if (!element) {
      return NextResponse.json(
        { success: false, message: 'Elemento não encontrado' },
        { status: 404 }
      )
    }

    const ownership = await assertVideoOwnership(supabase, element.video_id, session.user.id)
    if (!ownership.ok) {
      return NextResponse.json({ success: false, message: ownership.error }, { status: ownership.status })
    }

    const properties = body.properties || {}
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (properties.type) updatePayload.type = properties.type
    if (properties.timestamp !== undefined) updatePayload.timestamp = Number(properties.timestamp)
    if (properties.duration !== undefined) updatePayload.duration = properties.duration
    if (properties.orderIndex !== undefined) updatePayload.order_index = Number(properties.orderIndex)
    if (properties.width !== undefined) updatePayload.width = properties.width
    if (properties.height !== undefined) updatePayload.height = properties.height
    if (properties.position?.x !== undefined) updatePayload.position_x = Number(properties.position.x)
    if (properties.position?.y !== undefined) updatePayload.position_y = Number(properties.position.y)
    if (properties.action !== undefined) updatePayload.action = asJson(properties.action)
    if (properties.conditions !== undefined) updatePayload.conditions = properties.conditions ? asJson(properties.conditions) : null
    if (properties.styling !== undefined) updatePayload.styling = properties.styling ? asJson(properties.styling) : null
    if (body.content !== undefined) updatePayload.content = asJson(body.content)

    const { data: updatedElement, error: updateError } = await supabase
      .from('interactive_elements')
      .update(updatePayload)
      .eq('id', elementId)
      .select('*')
      .single()

    if (updateError || !updatedElement) {
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar elemento interativo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedElement,
      message: 'Elemento interativo atualizado com sucesso'
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Update interactive element error', err, { component: 'API: v1/interactive/elements' })
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar elemento interativo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const elementId = searchParams.get('elementId')

    if (!elementId) {
      return NextResponse.json(
        { success: false, message: 'ID do elemento é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: element } = await supabase
      .from('interactive_elements')
      .select('id, video_id')
      .eq('id', elementId)
      .single()

    if (!element) {
      return NextResponse.json(
        { success: false, message: 'Elemento não encontrado' },
        { status: 404 }
      )
    }

    const ownership = await assertVideoOwnership(supabase, element.video_id, session.user.id)
    if (!ownership.ok) {
      return NextResponse.json({ success: false, message: ownership.error }, { status: ownership.status })
    }

    const { error: deleteError } = await supabase
      .from('interactive_elements')
      .delete()
      .eq('id', elementId)

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: 'Erro ao remover elemento interativo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        elementId,
        deletedAt: new Date().toISOString(),
        status: 'deleted'
      },
      message: 'Elemento interativo removido com sucesso'
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Delete interactive element error', err, { component: 'API: v1/interactive/elements' })
    return NextResponse.json(
      { success: false, message: 'Erro ao remover elemento interativo' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
