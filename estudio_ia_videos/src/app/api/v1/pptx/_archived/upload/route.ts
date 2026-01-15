/**
 * 🚀 API PPTX Upload & Processing - Sistema Completo e Funcional
 * Endpoint robusto para receber, validar e processar arquivos PPTX
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { PPTXProcessorReal, PPTXExtractionResult } from '@lib/pptx/pptx-processor-real';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Configuração do endpoint - Next.js 14 format
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Tipos para resposta da API
interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    processingId: string;
    fileName: string;
    fileSize: number;
    result?: PPTXExtractionResult;
  };
  error?: string;
}

// Cache em memória para resultados de processamento
const processingCache = new Map<string, PPTXExtractionResult>();

/**
 * POST - Upload e processamento de arquivo PPTX
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    logger.info('📤 Iniciando upload e processamento PPTX...', { component: 'API: v1/pptx/upload' });

    // Verifica Content-Type
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json<UploadResponse>({
        success: false,
        message: 'Content-Type deve ser multipart/form-data',
        error: 'INVALID_CONTENT_TYPE'
      }, { status: 400 });
    }

    // Extrai FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json<UploadResponse>({
        success: false,
        message: 'Nenhum arquivo enviado',
        error: 'NO_FILE'
      }, { status: 400 });
    }

    // Valida arquivo
    const validation = await validateUploadedFile(file);
    if (!validation.isValid) {
      return NextResponse.json<UploadResponse>({
        success: false,
        message: validation.error || 'Arquivo inválido',
        error: 'INVALID_FILE'
      }, { status: 400 });
    }

    logger.info(`📄 Arquivo válido: ${file.name} (${file.size} bytes)`, { component: 'API: v1/pptx/upload' });

    // Converte para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gera ID único UUID para compatibilidade com o banco
    const processingId = crypto.randomUUID();

    // Processa PPTX
    logger.info(`⚙️ Iniciando processamento com ID: ${processingId}`, { component: 'API: v1/pptx/upload' });

    const result = await PPTXProcessorReal.extract(buffer);

    // Persist to Supabase if credentials exist
    if (result.success && supabaseUrl && supabaseServiceKey) {
        try {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            // 1. Create Upload Record
            const { error: uploadError } = await supabase.from('pptx_uploads').insert({
                id: processingId,
                original_filename: file.name,
                status: 'completed',
                slide_count: result.slides.length
            });

            if (uploadError) {
                logger.error('Failed to persist pptx upload record', { error: uploadError, processingId });
            } else {
                // 2. Insert Slides
                const slidesToInsert = result.slides.map(slide => ({
                    upload_id: processingId,
                    slide_number: slide.slideNumber,
                    title: slide.title,
                    content: slide.content,
                    notes: slide.notes,
                    properties: { layout: slide.layout, stats: slide.shapes }
                }));

                const { error: slidesError } = await supabase.from('pptx_slides').insert(slidesToInsert);
                if (slidesError) {
                    logger.error('Failed to persist pptx slides', { error: slidesError, processingId });
                }
            }
        } catch (dbError) {
            logger.error('Error persisting to database', { error: dbError });
        }
    }

    // Armazena resultado no cache
    processingCache.set(processingId, result);

    // Limpa cache antigo (mantém apenas últimos 10 resultados)
    cleanupCache();

    const processingTime = Date.now() - startTime;
    logger.info(`✅ Processamento concluído em ${processingTime}ms`, { component: 'API: v1/pptx/upload' });

    // Retorna resposta de sucesso
    const response: UploadResponse = {
      success: result.success,
      message: result.success
        ? `Arquivo processado com sucesso! ${result.slides.length} slides encontrados.`
        : `Erro no processamento: ${result.result?.error || result.error}`,
      data: {
        processingId,
        fileName: file.name,
        fileSize: file.size,
        result: result.success ? result : undefined
      }
    };

    if (!result.success) {
      return NextResponse.json(response, { status: 422 });
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logger.error('❌ Erro no upload/processamento:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/pptx/upload' });

    return NextResponse.json<UploadResponse>({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * GET - Consulta resultado de processamento por ID
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const processingId = searchParams.get('id');

    if (!processingId) {
      return NextResponse.json({
        success: false,
        message: 'ID de processamento é obrigatório',
        error: 'MISSING_ID'
      }, { status: 400 });
    }

    const result = processingCache.get(processingId);

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'Resultado não encontrado ou expirado',
        error: 'NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Resultado encontrado',
      data: {
        processingId,
        result
      }
    }, { status: 200 });

  } catch (error) {
    logger.error('❌ Erro ao consultar resultado:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/pptx/upload' });

    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * Valida arquivo enviado
 */
async function validateUploadedFile(file: File): Promise<{isValid: boolean, error?: string}> {
  try {
    // Verifica nome do arquivo
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      return {
        isValid: false,
        error: 'Arquivo deve ter extensão .pptx'
      };
    }

    // Verifica tamanho (máximo 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `Arquivo muito grande. Máximo permitido: ${maxSize / (1024 * 1024)}MB`
      };
    }

    if (file.size < 1024) {
      return {
        isValid: false,
        error: 'Arquivo muito pequeno ou corrompido'
      };
    }

    // Valida conteúdo do arquivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verificação básica de cabeçalho ZIP (PPTX é um arquivo ZIP)
    const header = buffer.subarray(0, 4);
    if (!(header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04)) {
      return {
        isValid: false,
        error: 'Arquivo não é um PPTX válido (cabeçalho inválido)'
      };
    }

    return { isValid: true };

  } catch (error) {
    return {
      isValid: false,
      error: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

// Removido generateProcessingId em favor de crypto.randomUUID()

/**
 * Limpa cache antigo mantendo apenas os últimos resultados
 */
function cleanupCache(): void {
  if (processingCache.size > 10) {
    const keys = Array.from(processingCache.keys());
    const oldKeys = keys.slice(0, keys.length - 10);

    oldKeys.forEach(key => {
      processingCache.delete(key);
    });

    logger.info(`🧹 Cache limpo: removidos ${oldKeys.length} resultados antigos`, { component: 'API: v1/pptx/upload' });
  }
}
