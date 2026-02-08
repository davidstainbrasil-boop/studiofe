/**
 * API: Real-Time Collaboration
 * Endpoints para colaboração simultânea
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { prisma } from '@lib/prisma'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'collaboration-realtime-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseForRequest(req)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      )
    }

    const collaboratorRecord = await prisma.project_collaborators.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: user.id
        }
      },
      select: { id: true }
    })

    if (project.userId !== user.id && !collaboratorRecord) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este projeto' },
        { status: 403 }
      )
    }

    const collaborators = await prisma.project_collaborators.findMany({
      where: { project_id: projectId },
      select: { user_id: true, role: true }
    })

    const uniqueUserIds = Array.from(new Set([project.userId, ...collaborators.map((c) => c.user_id)]))
    const users = await prisma.users.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, email: true, name: true, avatarUrl: true }
    })

    const userMap = new Map(users.map((profile) => [profile.id, profile]))
    const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

    const activeUsers = uniqueUserIds.map((userId, index) => {
      const profile = userMap.get(userId)
      const collaborator = collaborators.find((item) => item.user_id === userId)

      return {
        id: userId,
        name: profile?.name || profile?.email || 'Usuário',
        email: profile?.email || '',
        role: userId === project.userId ? 'owner' : (collaborator?.role || 'viewer'),
        color: palette[index % palette.length],
        status: userId === user.id ? 'online' : 'offline'
      }
    })

    return NextResponse.json({
      success: true,
      projectId,
      activeUsers,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro na API de colaboração', err, { component: 'API: collaboration/realtime' })
    return NextResponse.json(
      { error: 'Erro ao buscar dados de colaboração' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, projectId, userId, data } = body

    switch (action) {
      case 'lock_element':
        return NextResponse.json({
          success: true,
          message: 'Elemento bloqueado',
          elementId: data.elementId,
          lockedBy: userId
        })

      case 'unlock_element':
        return NextResponse.json({
          success: true,
          message: 'Elemento desbloqueado',
          elementId: data.elementId
        })

      case 'add_comment':
        return NextResponse.json({
          success: true,
          message: 'Comentário adicionado',
          commentId: `comment-${Date.now()}`
        })

      case 'save_version':
        return NextResponse.json({
          success: true,
          message: 'Versão salva',
          versionId: `version-${Date.now()}`
        })

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        )
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao processar ação de colaboração', err, { component: 'API: collaboration/realtime' })
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
