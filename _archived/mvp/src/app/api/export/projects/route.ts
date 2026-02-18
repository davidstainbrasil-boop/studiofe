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

/** GET /api/export/projects — Export user's projects as CSV */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'export:projects', 5, 60_000);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        status: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            slides: true,
            renderJobs: true,
            collaborators: true,
          },
        },
      },
    });

    const headers = [
      'ID', 'Nome', 'Descrição', 'Tipo', 'Status', 'Versão',
      'Slides', 'Renders', 'Colaboradores', 'Criado em', 'Atualizado em',
    ];

    const rows = projects.map((p) => [
      escapeCsv(p.id),
      escapeCsv(p.name),
      escapeCsv(p.description),
      escapeCsv(p.type),
      escapeCsv(p.status),
      String(p.currentVersion),
      String(p._count.slides),
      String(p._count.renderJobs),
      String(p._count.collaborators),
      new Date(p.createdAt).toISOString(),
      new Date(p.updatedAt).toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    logger.info('Projects exported as CSV', {
      userId: auth.user.id,
      count: projects.length,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="projetos_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    logger.error('Failed to export projects', {
      error: err instanceof Error ? err.message : 'Unknown',
      userId: auth.user.id,
    });
    return NextResponse.json({ error: 'Falha ao exportar projetos' }, { status: 500 });
  }
}
