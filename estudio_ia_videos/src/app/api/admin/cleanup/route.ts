/**
 * Admin Cleanup API
 * Manually trigger resource cleanup or view cleanup status
 *
 * GET  /api/admin/cleanup - Get cleanup status
 * POST /api/admin/cleanup - Trigger cleanup (requires admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { runCleanup, CleanupPolicy } from '@lib/cleanup/resource-cleaner';
import { logger } from '@lib/logger';
import { requireAdmin } from '@lib/auth/admin-middleware';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET - Get cleanup configuration and last run info
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'admin-cleanup-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Require admin authentication
    const { isAdmin, response } = await requireAdmin(req);
    if (!isAdmin) return response!;

    return NextResponse.json({
      status: 'ready',
      defaultPolicy: {
        enabled: true,
        retention: {
          completed: 30,
          failed: 7,
          temporary: 1
        }
      },
      endpoints: {
        trigger: 'POST /api/admin/cleanup',
        dryRun: 'POST /api/admin/cleanup?dryRun=true'
      }
    });
  } catch (error) {
    logger.error('GET /api/admin/cleanup error', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger cleanup
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check: Allow cron secret OR user authentication
    const cronSecret = req.headers.get('X-Cron-Secret');
    const validCronSecret = process.env.CRON_SECRET;

    let userId: string | undefined;
    let authenticatedViaCron = false;

    if (cronSecret && validCronSecret && cronSecret === validCronSecret) {
      // Authenticated via cron secret
      authenticatedViaCron = true;
      logger.info('Cleanup triggered by cron job', { component: 'API: admin/cleanup' });
    } else {
      // Check user authentication and admin status
      const { isAdmin, response } = await requireAdmin(req);
      if (!isAdmin) return response!;

      // Get user ID for logging
      const supabase = getSupabaseForRequest(req);
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    // Parse options
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    // Parse custom policy from body (optional)
    let policy: CleanupPolicy = {
      name: 'manual',
      enabled: true,
      retention: {
        completed: 30,
        failed: 7,
        temporary: 1
      },
      dryRun
    };

    try {
      const body = await req.json().catch(() => ({}));
      if (body.policy) {
        policy = { ...policy, ...body.policy, dryRun };
      }
    } catch {
      // No body provided, use default
    }

    logger.info('Starting cleanup', {
      component: 'API: admin/cleanup',
      userId: userId || 'cron',
      authenticatedViaCron,
      policy: policy.name,
      dryRun
    });

    // Run cleanup
    const results = await runCleanup(policy);

    // Calculate totals
    const summary = {
      totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0),
      totalFreedBytes: results.reduce((sum, r) => sum + (r.freedSpace || 0), 0),
      totalFreedMB: ((results.reduce((sum, r) => sum + (r.freedSpace || 0), 0)) / (1024 * 1024)).toFixed(2),
      totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      dryRun
    };

    logger.info('Cleanup completed', {
      component: 'API: admin/cleanup',
      userId: userId || 'cron',
      authenticatedViaCron,
      summary
    });

    return NextResponse.json({
      success: true,
      summary,
      details: results,
      message: dryRun
        ? 'Dry run completed - no resources were actually deleted'
        : 'Cleanup completed successfully'
    });
  } catch (error) {
    logger.error('POST /api/admin/cleanup error', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      {
        error: 'Erro ao executar cleanup',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
