
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { PptxProcessor } from '@/lib/pptx/pptx-processor';

/**
 * Rota da API para processar um arquivo .pptx.
 * Espera um corpo de requisição com a propriedade "storagePath".
 */
export async function POST(req: NextRequest) {
  logger.info('Recebida requisição para processar PPTX.');

  try {
    const body = await req.json();
    const { storagePath } = body;

    if (!storagePath) {
      logger.warn('Nenhum storagePath encontrado no corpo da requisição.');
      return NextResponse.json({ error: 'A propriedade "storagePath" é obrigatória.' }, { status: 400 });
    }

    const processor = new PptxProcessor();
    const result = await processor.process({ storagePath });

    logger.info('Processamento de PPTX concluído com sucesso.', { storagePath });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Erro ao manusear a requisição de processamento de PPTX.', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erro interno no servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
