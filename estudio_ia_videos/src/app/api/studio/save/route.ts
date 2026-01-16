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

      // Transaction to ensure project update and version history are atomic
      savedProject = await prisma.$transaction(async (tx) => {
        // 1. Get latest version to increment
        const lastVersion = await tx.project_versions.findFirst({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          select: { versionNumber: true }
        });

        let nextVersion = '1.0.0';
        if (lastVersion && lastVersion.versionNumber) {
          try {
            const parts = lastVersion.versionNumber.split('.').map(Number);
            if (parts.length === 3 && !parts.some(isNaN)) {
              parts[2] += 1;
              nextVersion = parts.join('.');
            }
          } catch (e) {
            // Fallback if parsing fails (shouldn't happen with strict constraint)
            nextVersion = `1.0.${Date.now()}`; 
          }
        }

        // 2. Update Project
        const project = await tx.projects.update({
          where: { id: projectId },
          data: {
            name: name || undefined,
            metadata: {
              studioSnapshot: snapshot,
              lastSavedAt: new Date().toISOString()
            },
            updatedAt: new Date(),
            currentVersion: nextVersion
          },
          select: {
            id: true,
            name: true,
            updatedAt: true,
            currentVersion: true
          }
        });

        // 3. Create Version History
        await tx.project_versions.create({
          data: {
            projectId: project.id,
            versionNumber: nextVersion,
            name: `Auto-save ${new Date().toLocaleTimeString()}`,
            createdBy: userId,
            metadata: {
              snapshot
            }
          }
        });

        return project;
      });

    } else {
      // CREATE novo projeto
      logger.info('Creating new project', { userId, name });

      const newId = randomUUID();
      const initialVersion = '1.0.0';

      savedProject = await prisma.$transaction(async (tx) => {
        // 1. Create Project
        const project = await tx.projects.create({
          data: {
            id: newId,
            userId,
            name: name || 'Projeto Sem Título',
            type: 'custom',
            status: 'draft',
            metadata: {
              studioSnapshot: snapshot,
              lastSavedAt: new Date().toISOString()
            },
            currentVersion: initialVersion
          },
          select: {
            id: true,
            name: true,
            updatedAt: true
          }
        });

        // 2. Create Initial Version
        await tx.project_versions.create({
          data: {
            projectId: project.id,
            versionNumber: initialVersion,
            name: 'Initial Version',
            createdBy: userId,
            metadata: {
              snapshot
            }
          }
        });

        return project;
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
      savedAt: savedProject.updatedAt?.toISOString() || new Date().toISOString()
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
