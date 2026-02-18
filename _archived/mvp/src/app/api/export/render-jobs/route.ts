import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return '';
  let str = String(value);
  // Prevent CSV formula injection (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** GET /api/export/render-jobs — Export user's render jobs as CSV */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'export:render-jobs', 5, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobs = await prisma.renderJob.findMany({
      where: { project: { userId: auth.user.id } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        progress: true,
        priority: true,
        outputUrl: true,
        errorMsg: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const headers = [
      'ID', 'Projeto', 'Projeto ID', 'Status', 'Progresso (%)',
      'Prioridade', 'URL de Saída', 'Erro', 'Início', 'Conclusão', 'Criado em',
    ];

    const rows = jobs.map((j) => [
      escapeCsv(j.id),
      escapeCsv(j.project.name),
      escapeCsv(j.project.id),
      escapeCsv(j.status),
      String(Math.round(j.progress)),
      String(j.priority),
      escapeCsv(j.outputUrl),
      escapeCsv(j.errorMsg),
      j.startedAt ? new Date(j.startedAt).toISOString() : '',
      j.completedAt ? new Date(j.completedAt).toISOString() : '',
      new Date(j.createdAt).toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    logger.info('Render jobs exported as CSV', {
      userId: auth.user.id,
      count: jobs.length,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="render_jobs_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    logger.error('Failed to export render jobs', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Falha ao exportar render jobs' }, { status: 500 });
  }
}
