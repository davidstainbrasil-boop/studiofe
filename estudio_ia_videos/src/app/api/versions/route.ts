// TODO: Fix Prisma includes type

/**
 * POST /api/versions
 * Cria uma nova versão do projeto
 * 
 * GET /api/versions?projectId=xxx
 * Lista versões de um projeto
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@lib/auth'
import { prisma } from '@lib/db'
import { logger } from '@lib/logger'


const getUserId = (user: unknown): string => ((user as { id?: string }).id || '');
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { projectId, name, description, projectData } = await req.json()

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'projectId e name são obrigatórios' },
        { status: 400 }
      )
    }

    // Busca projeto
    const project = await prisma.projects.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Verifica permissão
    if (project.userId !== getUserId(session.user)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Conta versões existentes para incrementar
    const versionCount = await prisma.project_versions.count({
      where: { projectId }
    })

    // Cria nova versão - usando UncheckedCreate
    const userId = getUserId(session.user);
    const version = await prisma.$queryRaw`
      INSERT INTO project_versions (id, project_id, created_by, user_id, name, description, version_number, project_data, created_at)
      VALUES (gen_random_uuid(), ${projectId}, ${userId}, ${userId}, ${name}, ${description}, ${String(versionCount + 1)}, ${JSON.stringify(projectData || {})}::jsonb, NOW())
      RETURNING *
    ` as unknown[];

    return NextResponse.json({ version: version[0] })

  } catch (error) {
    logger.error('Error creating version', error instanceof Error ? error : new Error(String(error)), { component: 'API: versions' })
    return NextResponse.json(
      { error: 'Erro ao criar versão' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório' },
        { status: 400 }
      )
    }

    // Busca versões
    const versions = await prisma.project_versions.findMany({
      where: { projectId },
      include: {
        users_project_versions_created_byTousers: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { versionNumber: 'desc' }
    })

    return NextResponse.json({ versions })

  } catch (error) {
    logger.error('Error fetching versions', error instanceof Error ? error : new Error(String(error)), { component: 'API: versions' })
    return NextResponse.json(
      { error: 'Erro ao buscar versões' },
      { status: 500 }
    )
  }
}


