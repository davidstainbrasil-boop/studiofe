
/**
 * API: Cancelar job de render
 * POST /api/render/cancel/:jobId
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { authConfig } from '@lib/auth/auth-config';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const blocked = await applyRateLimit(req, 'render-cancel', 20);
    if (blocked) return blocked;

    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { jobId } = params;

    // TODO: Implementar cancelamento real quando o render queue estiver ativo
    // Por enquanto, apenas retorna sucesso
    logger.info('Cancelamento de render solicitado', {
      component: 'API: render/cancel',
      jobId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro ao cancelar render', err, { component: 'API: render/cancel' })
    return NextResponse.json(
      { error: 'Erro ao cancelar render' },
      { status: 500 }
    );
  }
}
