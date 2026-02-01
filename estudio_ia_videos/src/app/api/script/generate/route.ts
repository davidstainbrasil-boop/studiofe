import { NextRequest, NextResponse } from 'next/server';
import { ScriptGenerator } from '@/lib/scripting/script-generator';
import { logger } from '@/lib/monitoring/logger';
import { validateRequestBody } from '@/lib/validation/api-validator';
import { ScriptGenerateSchema } from '@/lib/validation/schemas';
import { isPresentationNode, PPTXPresentationNode } from '@/lib/pptx/types/pptx-ast.types';

export async function POST(req: NextRequest) {
  logger.info('Recebida requisição para gerar roteiro.');

  const validation = await validateRequestBody(req, ScriptGenerateSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { projectId, pptxAst } = validation.data;

  // Validação de runtime do pptxAst como PPTXPresentationNode
  if (!isPresentationNode(pptxAst)) {
    return NextResponse.json(
      { error: 'AST inválida: estrutura não corresponde a um PPTXPresentationNode' },
      { status: 400 }
    );
  }

  try {
    const generator = new ScriptGenerator();
    const script = generator.generate({ projectId, pptxAst: pptxAst as PPTXPresentationNode });

    logger.info(`Roteiro gerado com sucesso para o projeto ${projectId}.`);
    return NextResponse.json(script);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno no servidor.';
    logger.error('Erro ao manusear a requisição de geração de roteiro.', error as Error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
