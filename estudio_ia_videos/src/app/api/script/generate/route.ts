import { NextRequest, NextResponse } from 'next/server';
import { ScriptGenerator } from '@/lib/scripting/script-generator';
import { logger } from '@/lib/monitoring/logger';
import { validateRequestBody } from '@/lib/validation/api-validator';
import { ScriptGenerateSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  logger.info('Recebida requisição para gerar roteiro.');

  const validation = await validateRequestBody(req, ScriptGenerateSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { projectId, pptxAst } = validation.data;

  try {
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
