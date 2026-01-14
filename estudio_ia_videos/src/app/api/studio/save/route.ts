/**
 * API Endpoint: Studio Save
 * POST /api/studio/save
 * Salva snapshot do timeline-store no campo metadata.studioSnapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Autenticação
    let userId = req.headers.get('x-user-id');
    
    if (!userId) {
      const supabase = getSupabaseForRequest(req);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Fallback para dev sem auth
        userId = 'demo-user';
        logger.warn('No auth, using demo-user', { component: 'StudioSave' });
      } else {
        userId = user.id;
      }
    }

    const body = await req.json();
    const { projectId, name, snapshot } = body;

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot é obrigatório' },
        { status: 400 }
      );
    }

    let savedProject;

    if (projectId) {
      // UPDATE projeto existente
      logger.info('Updating project', { projectId, userId });

      // Verifica ownership
      const existing = await prisma.projects.findUnique({
        where: { id: projectId },
        select: { userId: true }
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Projeto não encontrado' },
          { status: 404 }
        );
      }

      if (existing.userId !== userId) {
        return NextResponse.json(
          { error: 'Sem permissão para salvar este projeto' },
          { status: 403 }
        );
      }

      savedProject = await prisma.projects.update({
        where: { id: projectId },
        data: {
          name: name || undefined,
          metadata: {
            studioSnapshot: snapshot,
            lastSavedAt: new Date().toISOString()
          },
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          updatedAt: true
        }
      });

    } else {
      // CREATE novo projeto
      logger.info('Creating new project', { userId, name });

      const newId = randomUUID();

      savedProject = await prisma.projects.create({
        data: {
          id: newId,
          userId,
          name: name || 'Projeto Sem Título',
          type: 'custom',
          status: 'draft',
          metadata: {
            studioSnapshot: snapshot,
            lastSavedAt: new Date().toISOString()
          }
        },
        select: {
          id: true,
          name: true,
          updatedAt: true
        }
      });
    }

    logger.info('Project saved successfully', {
      projectId: savedProject.id,
      userId
    });

    return NextResponse.json({
      success: true,
      projectId: savedProject.id,
      name: savedProject.name,
      savedAt: savedProject.updatedAt.toISOString()
    });

  } catch (error) {
    logger.error('Studio save error', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao salvar projeto',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
