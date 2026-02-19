
/**
 * API: Cancelar job de render
 * POST/DELETE /api/render/cancel/:jobId
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { jobManager } from '@lib/render/job-manager';
import { removeVideoJob } from '@lib/queue/render-queue';

async function cancelRender(
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

    const job = await jobManager.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    if (job.userId && job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado a este job' }, { status: 403 });
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: `Job não pode ser cancelado no status atual: ${job.status}` },
        { status: 409 }
      );
    }

    let queueRemoved = false;
    try {
      queueRemoved = await removeVideoJob(jobId);
    } catch (queueError) {
      logger.warn('Falha ao remover job da fila durante cancelamento', {
        component: 'API: render/cancel',
        jobId,
        error: queueError instanceof Error ? queueError.message : String(queueError)
      });
    }

    await jobManager.cancelJob(jobId);

    logger.info('Render cancelado com sucesso', {
      component: 'API: render/cancel',
      jobId,
      queueRemoved
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'cancelled',
        queueRemoved
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro ao cancelar render', err, { component: 'API: render/cancel' })
    return NextResponse.json(
      { error: 'Erro ao cancelar render' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: { jobId: string } }
) {
  return cancelRender(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: { jobId: string } }
) {
  return cancelRender(req, context);
}
