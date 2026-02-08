/**
 * 🌐 Collaboration API Endpoint
 * Gerencia locks de tracks via REST (fallback para quando WebSocket não disponível)
 */

import { NextRequest, NextResponse } from 'next/server';
import { lockService } from '@lib/collaboration/lock-service';
import { logger } from '@lib/logger';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

// ============================================================================
// Schemas
// ============================================================================

const acquireLockSchema = z.object({
  projectId: z.string().uuid(),
  trackId: z.string().min(1),
  userName: z.string().optional().default('Unknown'),
  userColor: z.string().optional().default('#3B82F6')
});

const releaseLockSchema = z.object({
  projectId: z.string().uuid(),
  trackId: z.string().min(1)
});

// ============================================================================
// GET - List locks for a project
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }
    
    const locks = await lockService.getProjectLocks(projectId);
    
    return NextResponse.json({
      success: true,
      locks,
      count: locks.length
    });
    
  } catch (error) {
    logger.error('Failed to get locks', error as Error, {
      component: 'CollaborationAPI'
    });
    
    return NextResponse.json(
      { error: 'Failed to get locks' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Acquire a lock
// ============================================================================

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = acquireLockSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    // Get user ID from header or session
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { projectId, trackId, userName, userColor } = parsed.data;
    
    const result = await lockService.acquireLock({
      projectId,
      trackId,
      userId,
      userName,
      userColor
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        lock: result.lock
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        existingLock: result.existingLock
      }, { status: 409 }); // Conflict
    }
    
  } catch (error) {
    logger.error('Failed to acquire lock', error as Error, {
      component: 'CollaborationAPI'
    });
    
    return NextResponse.json(
      { error: 'Failed to acquire lock' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Release a lock
// ============================================================================

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = releaseLockSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { projectId, trackId } = parsed.data;
    
    const released = await lockService.releaseLock(projectId, trackId, userId);
    
    return NextResponse.json({
      success: released,
      message: released ? 'Lock released' : 'Lock not found or not owned by user'
    });
    
  } catch (error) {
    logger.error('Failed to release lock', error as Error, {
      component: 'CollaborationAPI'
    });
    
    return NextResponse.json(
      { error: 'Failed to release lock' },
      { status: 500 }
    );
  }
}
