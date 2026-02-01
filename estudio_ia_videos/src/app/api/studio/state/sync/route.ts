/**
 * 🎬 Studio State Sync API
 * POST: Sincronizar estado com servidor (batched updates)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Schemas
// ============================================================================

const syncRequestSchema = z.object({
  projectId: z.string().uuid(),
  changes: z.array(z.object({
    type: z.enum(['add', 'update', 'delete']),
    entity: z.enum(['track', 'clip', 'element']),
    id: z.string(),
    data: z.record(z.unknown()).optional(),
    timestamp: z.number(),
  })),
  clientVersion: z.number(),
});

// ============================================================================
// POST - Sync State
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = syncRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid sync request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, changes, clientVersion } = parsed.data;
    const supabase = createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('userId, metadata, current_version')
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

    // Check for conflicts (optimistic locking)
    const serverVersion = parseInt(project.current_version || '0', 10);
    if (clientVersion < serverVersion) {
      // Return current state for client to merge
      return NextResponse.json({
        success: false,
        conflict: true,
        serverVersion,
        serverState: project.metadata,
      });
    }

    // Apply changes to state
    const currentState = (project.metadata as StudioState) || {
      tracks: [],
      clips: [],
      canvasElements: [],
    };

    const newState = applyChanges(currentState, changes);
    const newVersion = serverVersion + 1;

    // Update in database
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        metadata: JSON.parse(JSON.stringify(newState)),
        current_version: String(newVersion),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      logger.error('Failed to sync state', updateError);
      return NextResponse.json(
        { error: 'Sync failed' },
        { status: 500 }
      );
    }

    logger.info('State synced', { 
      projectId, 
      userId: user.id, 
      changesCount: changes.length,
      newVersion,
    });

    return NextResponse.json({
      success: true,
      serverVersion: newVersion,
      appliedChanges: changes.length,
    });
  } catch (error) {
    logger.error('Studio state sync error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface StateChange {
  type: 'add' | 'update' | 'delete';
  entity: 'track' | 'clip' | 'element';
  id: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface StudioState {
  tracks: Array<Record<string, unknown>>;
  clips: Array<Record<string, unknown>>;
  canvasElements: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

function applyChanges(state: StudioState, changes: StateChange[]): StudioState {
  const newState = { ...state };

  for (const change of changes) {
    const collectionMap: Record<string, keyof StudioState> = {
      track: 'tracks',
      clip: 'clips',
      element: 'canvasElements',
    };

    const collection = collectionMap[change.entity];
    if (!collection || !Array.isArray(newState[collection])) {
      continue;
    }

    const arr = [...(newState[collection] as Array<Record<string, unknown>>)];

    switch (change.type) {
      case 'add':
        if (change.data) {
          arr.push({ id: change.id, ...change.data });
        }
        break;

      case 'update': {
        const index = arr.findIndex((item) => item.id === change.id);
        if (index !== -1 && change.data) {
          arr[index] = { ...arr[index], ...change.data };
        }
        break;
      }

      case 'delete': {
        const deleteIndex = arr.findIndex((item) => item.id === change.id);
        if (deleteIndex !== -1) {
          arr.splice(deleteIndex, 1);
        }
        break;
      }
    }

    (newState[collection] as Array<Record<string, unknown>>) = arr;
  }

  return newState;
}
