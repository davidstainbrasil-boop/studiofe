/**
 * 🔌 API: System Metrics
 * 
 * Endpoint para obter métricas do sistema
 * 
 * @route GET /api/analytics/system
 * @version 2.0.0
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin-middleware';
import { analytics } from '@lib/analytics/analytics-standalone';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/analytics/system
 * 
 * Obtém métricas do sistema (apenas para admins)
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'analytics-system-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Require admin authentication
    const { isAdmin, response } = await requireAdmin(request);
    if (!isAdmin) return response!;

    const metrics = await analytics.getSystemMetrics();

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('❌ Erro ao obter métricas do sistema:', error instanceof Error ? error : new Error(String(error))
, { component: 'API: analytics/system' });
    return NextResponse.json(
      { error: 'Erro ao obter métricas do sistema' },
      { status: 500 }
    );
  }
}

