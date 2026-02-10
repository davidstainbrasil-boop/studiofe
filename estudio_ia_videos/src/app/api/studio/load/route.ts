/**
 * API Endpoint: Studio Load
 * GET /api/studio/load?projectId=xxx
 * Carrega snapshot do projeto para edição no Studio Pro
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Autenticação segura
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar projeto
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        userId: true,
        metadata: true,
        status: true,
        currentVersion: true,
        updatedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Verificar ownership ou colaboração
    if (project.userId !== userId) {
      // Check collaborator access
      const collaborator = await prisma.project_collaborators.findFirst({
        where: {
          project_id: projectId,
          user_id: userId,
        },
      });

      if (!collaborator) {
        return NextResponse.json(
          { error: 'Sem permissão para acessar este projeto' },
          { status: 403 }
        );
      }
    }

    // Extrair snapshot do metadata
    const metadata = project.metadata as Record<string, unknown> | null;
    const snapshot = metadata?.studioSnapshot || null;

    logger.info('Project loaded for studio', {
      projectId,
      userId,
      hasSnapshot: !!snapshot,
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
      name: project.name,
      status: project.status,
      version: project.currentVersion,
      updatedAt: project.updatedAt?.toISOString(),
      snapshot,
    });
  } catch (error) {
    logger.error('Studio load error', error as Error);

    return NextResponse.json(
      {
        error: 'Erro ao carregar projeto',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
