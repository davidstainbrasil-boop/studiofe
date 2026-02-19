import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { z } from 'zod'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'

const avatarCreateSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
  provider: z.string().min(1).default('custom'),
  external_id: z.string().optional(),
  preview_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  gender: z.string().optional(),
  style: z.string().optional(),
  category: z.string().optional(),
  is_public: z.boolean().optional(),
  is_premium: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  projectId: z.string().uuid().optional(),
  ready_player_me_url: z.string().url().optional(),
  avatar_type: z.enum(['full_body', 'half_body', 'head_only']).optional(),
  properties: z.record(z.unknown()).optional(),
  voiceSettings: z.record(z.unknown()).optional(),
}).passthrough()

const avatarProjectSettingsSchema = z.object({
  project_id: z.string().uuid(),
  global_settings: z.record(z.unknown()),
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidReadyPlayerMeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('readyplayer.me') ||
           urlObj.hostname.includes('models.readyplayer.me')
  } catch {
    return false
  }
}

function extractExternalIdFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const lastSegment = pathname.split('/').filter(Boolean).pop()
    return lastSegment ? lastSegment.replace('.glb', '').replace('.png', '') : null
  } catch {
    return null
  }
}

async function canManageProject(
  request: NextRequest,
  projectId: string,
  userId: string
): Promise<{ exists: boolean; allowed: boolean; metadata?: unknown }> {
  const supabase = getSupabaseForRequest(request)

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, metadata')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    throw projectError
  }

  if (!projectData) {
    return { exists: false, allowed: false }
  }

  if (projectData.user_id === userId) {
    return { exists: true, allowed: true, metadata: projectData.metadata }
  }

  const { data: collaborator, error: collaboratorError } = await supabase
    .from('project_collaborators')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (collaboratorError) {
    throw collaboratorError
  }

  const role = collaborator?.role || ''
  const allowed = role === 'owner' || role === 'editor'

  return { exists: true, allowed, metadata: projectData.metadata }
}

// GET - Listar avatares
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const avatarType = searchParams.get('avatar_type')
    const style = searchParams.get('style')
    const provider = searchParams.get('provider')
    const gender = searchParams.get('gender')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('avatars')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // `avatars` e uma biblioteca global (sem project_id no schema atual).
    // Mantemos o parametro por compatibilidade sem quebrar clientes antigos.
    if (projectId) {
      logger.debug('Parametro projectId ignorado para tabela avatars (schema global)', {
        component: 'API: avatars',
        projectId,
      })
    }

    if (avatarType) {
      query = query.eq('category', avatarType)
    }

    if (style) {
      query = query.eq('style', style)
    }

    if (provider) {
      query = query.eq('provider', provider)
    }

    if (gender) {
      query = query.eq('gender', gender)
    }

    const { data: avatarsData, error } = await query

    if (error) {
      logger.error(
        'Erro ao buscar avatares:',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'API: avatars' }
      )
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    const avatars = avatarsData || []

    return NextResponse.json({
      success: true,
      avatars,
      data: avatars,
      count: avatars.length,
    })
  } catch (error) {
    logger.error(
      'Erro na API de avatares:',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: avatars' }
    )
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar avatar na biblioteca
export async function POST(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'avatars', 20)
    if (blocked) return blocked

    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = avatarCreateSchema.parse(body)

    if (validatedData.ready_player_me_url && !isValidReadyPlayerMeUrl(validatedData.ready_player_me_url)) {
      return NextResponse.json(
        { error: 'URL do Ready Player Me invalida' },
        { status: 400 }
      )
    }

    if (validatedData.projectId) {
      const access = await canManageProject(request, validatedData.projectId, user.id)
      if (!access.exists) {
        return NextResponse.json(
          { error: 'Projeto nao encontrado' },
          { status: 404 }
        )
      }
      if (!access.allowed) {
        return NextResponse.json(
          { error: 'Sem permissao para criar avatar neste projeto' },
          { status: 403 }
        )
      }
    }

    const provider = validatedData.provider || 'custom'

    const { data: existingAvatar, error: existingAvatarError } = await supabase
      .from('avatars')
      .select('id')
      .eq('name', validatedData.name)
      .eq('provider', provider)
      .maybeSingle()

    if (existingAvatarError) {
      logger.error(
        'Erro ao verificar avatar existente',
        existingAvatarError instanceof Error ? existingAvatarError : new Error(String(existingAvatarError)),
        { component: 'API: avatars' }
      )
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    if (existingAvatar) {
      return NextResponse.json(
        { error: `Ja existe um avatar "${validatedData.name}" para provider "${provider}"` },
        { status: 409 }
      )
    }

    const previewUrl = validatedData.preview_url || validatedData.ready_player_me_url || null
    const externalId = validatedData.external_id ||
      (validatedData.ready_player_me_url ? extractExternalIdFromUrl(validatedData.ready_player_me_url) : null)

    const metadata: Record<string, unknown> = {
      ...(isRecord(validatedData.metadata) ? validatedData.metadata : {}),
      ...(isRecord(validatedData.properties) ? { properties: validatedData.properties } : {}),
      ...(isRecord(validatedData.voiceSettings) ? { voiceSettings: validatedData.voiceSettings } : {}),
      ...(validatedData.avatar_type ? { avatar_type: validatedData.avatar_type } : {}),
      ...(validatedData.ready_player_me_url ? { ready_player_me_url: validatedData.ready_player_me_url } : {}),
      ...(validatedData.projectId ? { project_id: validatedData.projectId } : {}),
      created_by: user.id,
    }

    const { data: avatar, error: createError } = await supabase
      .from('avatars')
      .insert({
        name: validatedData.name,
        provider,
        external_id: externalId,
        preview_url: previewUrl,
        thumbnail_url: validatedData.thumbnail_url || null,
        gender: validatedData.gender || null,
        style: validatedData.style || null,
        category: validatedData.category || validatedData.avatar_type || null,
        is_public: validatedData.is_public ?? true,
        is_premium: validatedData.is_premium ?? false,
        metadata,
      } as never)
      .select()
      .single()

    if (createError || !avatar) {
      logger.error(
        'Erro ao criar avatar:',
        createError instanceof Error ? createError : new Error(String(createError)),
        { component: 'API: avatars' }
      )
      return NextResponse.json(
        { error: 'Erro ao criar avatar' },
        { status: 500 }
      )
    }

    if (validatedData.projectId) {
      const { error: historyError } = await supabase
        .from('project_history')
        .insert({
          project_id: validatedData.projectId,
          user_id: user.id,
          action: 'create',
          entity_type: 'avatar',
          entity_id: avatar.id,
          description: `Avatar "${validatedData.name}" criado`,
          changes: {
            avatar_id: avatar.id,
            provider,
          },
        } as never)

      if (historyError) {
        logger.warn('Falha ao registrar historico de avatar', {
          component: 'API: avatars',
          projectId: validatedData.projectId,
          error: historyError,
        })
      }
    }

    return NextResponse.json(
      { success: true, avatar, data: avatar },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(
      'Erro ao criar avatar:',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: avatars' }
    )
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configuracoes globais de avatar no metadata do projeto
export async function PUT(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'avatars', 20)
    if (blocked) return blocked

    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = avatarProjectSettingsSchema.parse(body)

    const access = await canManageProject(request, validatedBody.project_id, user.id)

    if (!access.exists) {
      return NextResponse.json(
        { error: 'Projeto nao encontrado' },
        { status: 404 }
      )
    }

    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Sem permissao para atualizar configuracoes deste projeto' },
        { status: 403 }
      )
    }

    const currentMetadata = isRecord(access.metadata) ? access.metadata : {}
    const currentAvatarSettings = isRecord(currentMetadata.avatars_3d)
      ? currentMetadata.avatars_3d
      : {}

    const updatedMetadata = {
      ...currentMetadata,
      avatars_3d: {
        ...currentAvatarSettings,
        ...validatedBody.global_settings,
      },
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ metadata: updatedMetadata } as never)
      .eq('id', validatedBody.project_id)

    if (updateError) {
      logger.error(
        'Erro ao atualizar configuracoes de avatar',
        updateError instanceof Error ? updateError : new Error(String(updateError)),
        { component: 'API: avatars' }
      )
      return NextResponse.json(
        { error: 'Erro ao atualizar configuracoes' },
        { status: 500 }
      )
    }

    const { error: historyError } = await supabase
      .from('project_history')
      .insert({
        project_id: validatedBody.project_id,
        user_id: user.id,
        action: 'update',
        entity_type: 'project_settings',
        entity_id: validatedBody.project_id,
        description: 'Configuracoes globais de avatares atualizadas',
        changes: { avatars_3d_settings: validatedBody.global_settings },
      } as never)

    if (historyError) {
      logger.warn('Falha ao registrar historico de configuracoes de avatar', {
        component: 'API: avatars',
        projectId: validatedBody.project_id,
        error: historyError,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Configuracoes atualizadas com sucesso',
      settings: updatedMetadata.avatars_3d,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(
      'Erro ao atualizar configuracoes de avatares:',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: avatars' }
    )
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
