/**
 * 🎬 Studio State API
 * GET: Carregar estado do projeto
 * PUT: Atualizar estado do projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

// ============================================================================
// Schemas
// ============================================================================

const studioStateSchema = z.object({
  tracks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['video', 'audio', 'avatar', 'subtitle', 'effects']),
    muted: z.boolean().optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
    height: z.number().optional(),
    order: z.number().optional(),
  })).optional(),
  clips: z.array(z.object({
    id: z.string(),
    trackId: z.string(),
    name: z.string(),
    type: z.string(),
    startTime: z.number(),
    duration: z.number(),
    inPoint: z.number().optional(),
    outPoint: z.number().optional(),
    data: z.record(z.unknown()).optional(),
  })).optional(),
  canvasElements: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'image', 'shape', 'video', 'avatar']),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number().optional(),
    opacity: z.number().optional(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
    data: z.record(z.unknown()).optional(),
  })).optional(),
  duration: z.number().optional(),
  currentTime: z.number().optional(),
  zoom: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// GET - Load State
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
    const rateLimitBlocked = await applyRateLimit(request, 'studio-state-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { projectId } = await params;

  try {
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

    // Get project with state
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      logger.error('Failed to load project', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Return state
    return NextResponse.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        state: project.metadata || {},
        metadata: project.render_settings || {},
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Studio state load error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update State
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = studioStateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid state format', details: parsed.error.flatten() },
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

    // Verify ownership
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

    // Update state
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        metadata: JSON.parse(JSON.stringify(parsed.data)),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update project state', updateError);
      return NextResponse.json(
        { error: 'Failed to update state' },
        { status: 500 }
      );
    }

    logger.info('Studio state updated', { projectId, userId: user.id });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedProject.id,
        updatedAt: updatedProject.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Studio state update error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
