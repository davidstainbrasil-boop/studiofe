import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { randomUUID } from 'crypto';
import { getServerAuth } from '@lib/auth/unified-session';

// POST - Duplicar template (Implementação Real)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { name } = body;

    // Buscar template original no banco
    const originalTemplate: any = await prisma.nr_templates.findUnique({
      where: { id },
    });

    if (!originalTemplate) {
      return NextResponse.json(
        { error: 'Template não encontrado', success: false },
        { status: 404 }
      );
    }

    // Criar cópia
    const newId = randomUUID();
    const newName = name || `${originalTemplate.name} (Cópia)`;

    const duplicatedTemplate = await (prisma.nr_templates.create as any)({
      data: {
        id: newId,
        name: newName,
        description: originalTemplate.description,
        category: originalTemplate.category,
        thumbnail_url: originalTemplate.thumbnail_url,
        preview_url: originalTemplate.preview_url,
        metadata: originalTemplate.metadata || {},
        settings: originalTemplate.settings || {},
        is_public: false, // Cópias são privadas por padrão
        created_by: originalTemplate.created_by, // Mantém o mesmo criador
        usage_count: 0,
      } as any,
    });

    logger.info(`Template duplicado com sucesso: ${id} -> ${newId}`, { component: 'API: templates/[id]/duplicate' });

    return NextResponse.json({
      template: duplicatedTemplate,
      success: true,
    }, { status: 201 });

  } catch (error) {
    logger.error('Erro ao duplicar template', error instanceof Error ? error : new Error(String(error)), { component: 'API: templates/[id]/duplicate' });
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false },
      { status: 500 }
    );
  }
}
