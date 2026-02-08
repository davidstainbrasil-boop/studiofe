export const dynamic = 'force-dynamic';

/**
 * 🔌 API: User Metrics
 * 
 * Endpoint para obter métricas do usuário
 * 
 * @route GET /api/analytics/user
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { analytics } from '@lib/analytics/analytics-standalone';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/analytics/user
 * 
 * Obtém métricas do usuário atual
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'analytics-user-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const metrics = await analytics.getUserMetrics(session.user.id);

    if (!metrics) {
      return NextResponse.json(
        { error: 'Métricas não encontradas' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao obter métricas', err, { component: 'API: analytics/user' });
    return NextResponse.json(
      { error: 'Erro ao obter métricas' },
      { status: 500 }
    );
  }
}

