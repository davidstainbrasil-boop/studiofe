/**
 * API Endpoint: Studio Load
 * GET /api/studio/load/[id]
 * Carrega snapshot do projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID do projeto é obrigatório' },
        { status: 400 }
      );
    }

    // Autenticação
    let userId = req.headers.get('x-user-id');
    
    if (!userId) {
      const supabase = getSupabaseForRequest(req);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        userId = 'demo-user';
        logger.warn('No auth, using demo-user', { component: 'StudioLoad' });
      } else {
        userId = user.id;
      }
    }

    // Busca projeto
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        userId: true,
        metadata: true,
        updatedAt: true,
        type: true // Added type
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Valida ownership
    if (project.userId !== userId) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este projeto' },
        { status: 403 }
      );
    }

    // Extrai snapshot do metadata
    const metadata = project.metadata as any;
    const snapshot = metadata?.studioSnapshot;

    // TODO: Remover verificação estrita de snapshot para permitir projetos novos sem save anterior
    // if (!snapshot) { ... }

    logger.info('Project loaded successfully', {
      projectId,
      userId,
      type: project.type
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
      name: project.name,
      type: project.type,
      snapshot,
      updatedAt: project.updatedAt.toISOString()
    });

  } catch (error) {
    logger.error('Studio load error', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao carregar projeto',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
