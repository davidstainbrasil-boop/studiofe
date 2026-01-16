/**
 * Admin Storage Garbage Collection API
 * Triggers cleanup of orphaned storage files
 */

import { NextRequest, NextResponse } from 'next/server';
import { runStorageGC, getStorageStats } from '@lib/storage/storage-gc';
import { requireAuth, unauthorizedResponse, forbiddenResponse } from '@lib/api/auth-middleware';
import { logger } from '@lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check if user is admin (simplified check)
    const isAdmin = auth.user.email?.endsWith('@admin.com') || 
                    auth.user.user_metadata?.role === 'admin';
    
    if (!isAdmin) {
      return forbiddenResponse('Admin access required');
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety

    logger.info('Starting storage garbage collection', {
      component: 'API:StorageGC',
      dryRun,
      userId: auth.user.id
    });

    const result = await runStorageGC({
      dryRun,
      minAgeHours: body.minAgeHours || 24,
      buckets: body.buckets
    });

    return NextResponse.json({
      success: true,
      dryRun,
      data: result
    });
  } catch (error) {
    logger.error('Storage GC failed', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:StorageGC'
    });

    return NextResponse.json(
      { success: false, error: 'Garbage collection failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Get storage stats
    const stats = await getStorageStats();

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get storage stats', error instanceof Error ? error : new Error(String(error)), {
      component: 'API:StorageGC'
    });

    return NextResponse.json(
      { success: false, error: 'Failed to get storage stats' },
      { status: 500 }
    );
  }
}
