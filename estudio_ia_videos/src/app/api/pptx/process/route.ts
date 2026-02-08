
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { PPTXProcessorReal } from '@/lib/pptx/pptx-processor-real';
import { storageSystem } from '@/lib/storage-system-real';
import { getServerAuth } from '@lib/auth/unified-session';

/**
 * Rota da API para processar um arquivo .pptx.
 * Espera um corpo de requisição com a propriedade "storagePath" e opcionalmente "projectId".
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  logger.info('Recebida requisição para processar PPTX.');

  try {
    const body = await req.json();
    const { storagePath, projectId: bodyProjectId } = body;

    if (!storagePath) {
      logger.warn('Nenhum storagePath encontrado no corpo da requisição.');
      return NextResponse.json({ error: 'A propriedade "storagePath" é obrigatória.' }, { status: 400 });
    }

    // Tentar extrair projectId do path se não fornecido
    // Formato esperado: pptx/userId/projectId/filename
    let projectId = bodyProjectId;
    if (!projectId) {
        const parts = storagePath.split('/');
        if (parts.length >= 3) {
            projectId = parts[2];
        } else {
            // Fallback ou erro? Vamos permitir que o processador tente lidar ou falhe
            // Mas o processador REAL precisa de projectId para upload de imagens.
            logger.warn('ProjectId não fornecido e não pôde ser extraído do path.', { storagePath });
            // Se não tiver projectId, as imagens podem ir para um local genérico ou falhar.
            // Vamos gerar um temporário se necessário, mas ideal é falhar.
        }
    }
    
    if (!projectId) {
         return NextResponse.json({ error: 'Não foi possível determinar o Project ID.' }, { status: 400 });
    }

    logger.info('Iniciando download do arquivo.', { storagePath, bucket: 'uploads' });
    
    // 1. Baixar o arquivo usando StorageSystemReal
    const buffer = await storageSystem.download({
        bucket: 'uploads',
        path: storagePath
    });

    logger.info('Arquivo baixado. Iniciando processamento.', { size: buffer.length });

    // 2. Processar usando PPTXProcessorReal
    const result = await PPTXProcessorReal.extract(buffer, projectId);

    if (!result.success) {
        throw result.error || new Error('Falha desconhecida no processamento.');
    }

    logger.info('Processamento de PPTX concluído com sucesso.', { storagePath, slideCount: result.slides.length });

    return NextResponse.json({
        slideCount: result.slides.length,
        content: result.slides, // Mantendo compatibilidade de retorno com estrutura antiga se possível, ou adaptando
        metadata: result.metadata,
        // Adicionando campos extras do novo processador
        slides: result.slides,
        timeline: result.timeline
    });

  } catch (error) {
    logger.error('Erro ao manusear a requisição de processamento de PPTX.', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Erro interno no servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
