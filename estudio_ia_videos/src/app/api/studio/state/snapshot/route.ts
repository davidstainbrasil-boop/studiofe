/**
 * 🎬 Studio State Snapshot API
 * POST: Criar snapshot do estado atual
 * GET: Listar snapshots do projeto
 * 
 * NOTA: Esta API utiliza a tabela 'project_snapshots' que pode não existir no schema atual.
 * A funcionalidade de snapshots é uma feature adicional que será implementada no futuro.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient, fromUntypedTable } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

interface SnapshotRecord {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  state: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Schemas
// ============================================================================

const createSnapshotSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

// ============================================================================
// POST - Create Snapshot
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSnapshotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, name, description } = parsed.data;
    const supabase = createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('userId, metadata, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create snapshot using untyped table helper
    const snapshotId = uuidv4();
    const snapshotName = name || `Snapshot ${new Date().toLocaleString()}`;

    try {
      const snapshotTable = fromUntypedTable<SnapshotRecord>(supabase, 'project_snapshots');
      const { error: snapshotError } = await snapshotTable.insert({
        id: snapshotId,
        project_id: projectId,
        user_id: user.id,
        name: snapshotName,
        description: description || null,
        state: project.metadata || {},
        created_at: new Date().toISOString(),
      });

      if (snapshotError) {
        throw snapshotError;
      }
    } catch (snapshotErr) {
      // If table doesn't exist, return graceful error
      logger.warn('Snapshots feature not available', { projectId });
      return NextResponse.json(
        { error: 'Snapshots feature not configured. Table may not exist.' },
        { status: 501 }
      );
    }

    logger.info('Snapshot created', { 
      snapshotId, 
      projectId, 
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: snapshotId,
        name: snapshotName,
        description: description || null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Snapshot creation error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List Snapshots
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('userId')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get snapshots using untyped table helper
    try {
      const snapshotTable = fromUntypedTable<SnapshotRecord>(supabase, 'project_snapshots');
      const { data: snapshots, error: snapshotsError } = await snapshotTable
        .select('id, name, description, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (snapshotsError) {
        throw snapshotsError;
      }

      return NextResponse.json({
        success: true,
        data: (snapshots || []).map((s: { id: string; name: string; description: string | null; created_at: string }) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          createdAt: s.created_at,
        })),
      });
    } catch (snapshotsErr) {
      // If table doesn't exist, return empty array
      logger.warn('Snapshots feature not available');
      return NextResponse.json({
        success: true,
        data: [],
        warning: 'Snapshots feature not configured',
      });
    }
  } catch (error) {
    logger.error('Snapshot list error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
