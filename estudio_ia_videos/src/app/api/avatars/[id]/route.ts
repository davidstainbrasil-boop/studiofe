import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { z } from 'zod'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'

const updateAvatarSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).optional(),
  external_id: z.string().optional(),
  preview_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  gender: z.string().optional(),
  style: z.string().optional(),
  category: z.string().optional(),
  is_public: z.boolean().optional(),
  is_premium: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  ready_player_me_url: z.string().url().optional(),
  avatar_type: z.enum(['full_body', 'half_body', 'head_only']).optional(),
  properties: z.record(z.unknown()).optional(),
  voiceSettings: z.record(z.unknown()).optional(),
}).passthrough()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// GET - Obter detalhes de um avatar
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const avatarId = params.id

    const { data: avatarData, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('id', avatarId)
      .maybeSingle()

    if (error) {
      logger.error(
        'Erro ao buscar avatar',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'API: avatars/[id]' }
      )
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    if (!avatarData) {
      return NextResponse.json(
        { error: 'Avatar nao encontrado' },
        { status: 404 }
      )
    }

    await supabase
      .from('avatars')
      .update({ updated_at: new Date().toISOString() } as never)
      .eq('id', avatarId)

    return NextResponse.json({
      success: true,
      avatar: avatarData,
      data: avatarData,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro ao buscar avatar', err, { component: 'API: avatars/[id]' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar avatar
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const blocked = await applyRateLimit(request, 'avatars-id', 20)
    if (blocked) return blocked

    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const avatarId = params.id
    const body = await request.json()
    const validatedData = updateAvatarSchema.parse(body)

    const { data: currentAvatar, error: currentAvatarError } = await supabase
      .from('avatars')
      .select('*')
      .eq('id', avatarId)
      .maybeSingle()

    if (currentAvatarError) {
      logger.error(
        'Erro ao verificar avatar',
        currentAvatarError instanceof Error ? currentAvatarError : new Error(String(currentAvatarError)),
        { component: 'API: avatars/[id]' }
      )
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    if (!currentAvatar) {
      return NextResponse.json(
        { error: 'Avatar nao encontrado' },
        { status: 404 }
      )
    }

    const metadata = {
      ...(isRecord(currentAvatar.metadata) ? currentAvatar.metadata : {}),
      ...(isRecord(validatedData.metadata) ? validatedData.metadata : {}),
      ...(isRecord(validatedData.properties) ? { properties: validatedData.properties } : {}),
      ...(isRecord(validatedData.voiceSettings) ? { voiceSettings: validatedData.voiceSettings } : {}),
      ...(validatedData.avatar_type ? { avatar_type: validatedData.avatar_type } : {}),
      ...(validatedData.ready_player_me_url ? { ready_player_me_url: validatedData.ready_player_me_url } : {}),
      updated_by: user.id,
    }

    const { data: updatedAvatar, error: updateError } = await supabase
      .from('avatars')
      .update({
        name: validatedData.name,
        provider: validatedData.provider,
        external_id: validatedData.external_id,
        preview_url: validatedData.preview_url || validatedData.ready_player_me_url,
        thumbnail_url: validatedData.thumbnail_url,
        gender: validatedData.gender,
        style: validatedData.style,
        category: validatedData.category || validatedData.avatar_type,
        is_public: validatedData.is_public,
        is_premium: validatedData.is_premium,
        metadata,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', avatarId)
      .select()
      .single()

    if (updateError || !updatedAvatar) {
      logger.error(
        'Erro ao atualizar avatar',
        updateError instanceof Error ? updateError : new Error(String(updateError)),
        { component: 'API: avatars/[id]' }
      )
      return NextResponse.json(
        { error: 'Erro ao atualizar avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      avatar: updatedAvatar,
      data: updatedAvatar,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.errors },
        { status: 400 }
      )
    }

    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro ao atualizar avatar', err, { component: 'API: avatars/[id]' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar avatar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const blocked = await applyRateLimit(request, 'avatars-id', 20)
    if (blocked) return blocked

    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const avatarId = params.id

    const { data: avatarData, error: avatarError } = await supabase
      .from('avatars')
      .select('id, name')
      .eq('id', avatarId)
      .maybeSingle()

    if (avatarError) {
      logger.error(
        'Erro ao buscar avatar para exclusao',
        avatarError instanceof Error ? avatarError : new Error(String(avatarError)),
        { component: 'API: avatars/[id]' }
      )
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    if (!avatarData) {
      return NextResponse.json(
        { error: 'Avatar nao encontrado' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('avatars')
      .delete()
      .eq('id', avatarId)

    if (deleteError) {
      logger.error(
        'Erro ao excluir avatar',
        deleteError instanceof Error ? deleteError : new Error(String(deleteError)),
        { component: 'API: avatars/[id]' }
      )
      return NextResponse.json(
        { error: 'Erro ao excluir avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Avatar "${avatarData.name}" excluido com sucesso`,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro ao excluir avatar', err, { component: 'API: avatars/[id]' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
