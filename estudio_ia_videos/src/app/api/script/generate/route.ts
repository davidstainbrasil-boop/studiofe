
import { NextRequest, NextResponse } from 'next/server';
import { ScriptGenerator } from '@/lib/scripting/script-generator';
import { logger } from '@/lib/monitoring/logger';

export async function POST(req: NextRequest) {
  logger.info('Recebida requisição para gerar roteiro.');

  try {
    const body = await req.json();
    const { projectId, pptxAst } = body;

    if (!projectId || !pptxAst) {
      logger.warn('Requisição inválida: projectId ou pptxAst ausentes.');
      return NextResponse.json(
        { error: 'As propriedades "projectId" e "pptxAst" são obrigatórias.' },
        { status: 400 }
      );
    }

    const generator = new ScriptGenerator();
    const script = generator.generate({ projectId, pptxAst });

    logger.info(`Roteiro gerado com sucesso para o projeto ${projectId}.`);
    return NextResponse.json(script);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno no servidor.';
    logger.error('Erro ao manusear a requisição de geração de roteiro.', error as Error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
