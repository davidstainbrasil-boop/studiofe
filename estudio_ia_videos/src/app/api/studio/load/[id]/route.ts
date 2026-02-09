/**
 * API Endpoint: Studio Load
 * GET /api/studio/load/[id]
 * Carrega snapshot do projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';
import { z } from 'zod';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'studio-load-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID do projeto é obrigatório' },
        { status: 400 }
      );
    }
    
    // Validate UUID format to prevent 500 errors on DB
    const uuidSchema = z.string().uuid();
    const validation = uuidSchema.safeParse(projectId);
    
    if (!validation.success) {
        logger.warn('Invalid project ID format', { projectId });
        return NextResponse.json(
            { error: 'ID do projeto inválido' },
            { status: 400 }
        );
    }

    // Autenticação segura - x-user-id BLOCKED em produção
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(req);
    if (!authResult.authenticated) {
      logger.warn('Unauthorized access attempt', { component: 'StudioLoad', projectId });
      return NextResponse.json(
        { error: 'Não autorizado. Faça login novamente.' },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    // Busca projeto
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        userId: true,
        metadata: true,
        updatedAt: true,
        type: true
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
    const metadata = project.metadata as Record<string, unknown> | null;
    const snapshot = metadata?.studioSnapshot;

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
      updatedAt: project.updatedAt?.toISOString() || new Date().toISOString()
    });

  } catch (error) {
    // Log detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Studio load error', error as Error, {
        component: 'StudioLoadAPI',
        projectId: params.id,
        stack: errorStack
    });
    
    return NextResponse.json(
      { 
        error: 'Erro crítico ao carregar projeto',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
