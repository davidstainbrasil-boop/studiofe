
/**
 * 📊 API: Alert Statistics
 * GET /api/org/{orgId}/alerts/statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { authConfig } from '@lib/auth/auth-config';
import { getOrgContext } from '@lib/multi-tenancy/org-context';
import { alertManager } from '@lib/alerts/alert-manager';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'org-alerts-statistics-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const orgContext = await getOrgContext(session.user.id, params.orgId);
    if (!orgContext) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: startDate, endDate' },
        { status: 400 }
      );
    }

    const statistics = await alertManager.getAlertStatistics(
      params.orgId,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({ statistics });
  } catch (error) {
    logger.error('Erro ao buscar estatísticas de alertas', error instanceof Error ? error : new Error(String(error)) 
, { component: 'API: org/alerts/statistics' });
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}

