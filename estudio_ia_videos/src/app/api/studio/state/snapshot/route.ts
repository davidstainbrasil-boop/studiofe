/**
 * 🎬 Studio State Snapshot API
 * POST: Criar snapshot real do estado atual
 * GET: Listar snapshots reais do projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { applyRateLimit } from '@/lib/rate-limit';

interface SnapshotRecord {
  id: string;
  project_id: string;
  user_id: string;
  name: string | null;
  description: string | null;
  version: number;
  snapshot_type: string;
  is_bookmarked: boolean;
  file_size: number;
  created_at: string;
}

const createSnapshotSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  snapshotType: z.string().min(1).max(50).optional(),
  bookmark: z.boolean().optional(),
});

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

    const { projectId, name, description, snapshotType, bookmark } = parsed.data;
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get latest version
    const { data: latestRows, error: latestError } = await supabase
      .from('project_version_snapshots')
      .select('version')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1);

    if (latestError) {
      logger.error('Failed to fetch latest snapshot version', latestError);
      return NextResponse.json(
        { error: 'Failed to compute snapshot version' },
        { status: 500 }
      );
    }

    const nextVersion = (latestRows?.[0]?.version || 0) + 1;
    const snapshotId = uuidv4();
    const snapshotName = name || `Snapshot v${nextVersion}`;
    const createdAt = new Date().toISOString();

    const projectState = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        metadata: project.metadata || {},
        render_settings: project.render_settings || {},
        updated_at: project.updated_at,
      },
    };

    const serializedState = JSON.stringify(projectState);
    const fileSize = Buffer.byteLength(serializedState, 'utf8');

    const { error: insertError } = await supabase
      .from('project_version_snapshots')
      .insert({
        id: snapshotId,
        project_id: projectId,
        user_id: user.id,
        version: nextVersion,
        name: snapshotName,
        description: description || null,
        snapshot_type: snapshotType || 'manual',
        is_bookmarked: bookmark ?? false,
        file_size: fileSize,
        project_state: projectState,
        scenes_state: ((project.metadata as any)?.scenes || []),
        timeline_state: ((project.metadata as any)?.timeline || null),
        created_at: createdAt,
        checksum: null,
        delta_from_prev: null,
        restored_at: null
      });

    if (insertError) {
      logger.error('Failed to insert snapshot', insertError);
      return NextResponse.json(
        { error: 'Failed to create snapshot' },
        { status: 500 }
      );
    }

    logger.info('Snapshot created', {
      snapshotId,
      projectId,
      userId: user.id,
      version: nextVersion
    });

    return NextResponse.json({
      success: true,
      data: {
        id: snapshotId,
        version: nextVersion,
        name: snapshotName,
        description: description || null,
        snapshotType: snapshotType || 'manual',
        createdAt
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

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'studio-state-snapshot-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { data: snapshots, error: snapshotsError } = await supabase
      .from('project_version_snapshots')
      .select('id, name, description, version, snapshot_type, is_bookmarked, file_size, created_at')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(50);

    if (snapshotsError) {
      logger.error('Failed to list snapshots', snapshotsError);
      return NextResponse.json(
        { error: 'Failed to list snapshots' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (snapshots || []).map((s) => ({
        id: s.id,
        version: s.version,
        name: s.name,
        description: s.description,
        snapshotType: s.snapshot_type,
        isBookmarked: s.is_bookmarked,
        fileSize: s.file_size,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    logger.error('Snapshot list error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
