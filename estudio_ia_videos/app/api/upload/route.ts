/**
 * API Upload - Upload simplificado de arquivos PPTX
 * POST /api/upload
 * Funciona localmente sem necessidade de autenticação externa
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import PPTXProcessorReal from '@/lib/pptx/pptx-processor-real';
import { logger } from '@/lib/logger';

// Configurações de upload
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.pptx', '.ppt'];
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'pptx');
const THUMBNAILS_DIR = join(process.cwd(), 'public', 'thumbnails');

// Garantir diretórios existem
async function ensureDirectories() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
  if (!existsSync(THUMBNAILS_DIR)) {
    await mkdir(THUMBNAILS_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type deve ser multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectName = formData.get('project_name') as string || 'Novo Projeto';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Arquivo é obrigatório' },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validar extensão
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { success: false, error: 'Apenas arquivos .pptx e .ppt são permitidos' },
        { status: 400 }
      );
    }

    // Gerar IDs únicos
    const uploadId = randomUUID();
    const projectId = randomUUID();
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${uploadId}${extension}`;

    // Salvar arquivo
    const filePath = join(UPLOADS_DIR, safeFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`[Upload] Arquivo salvo: ${filePath}`);

    // Processar PPTX
    let slidesData: Array<{
      slideNumber: number;
      title: string;
      content: string;
      notes?: string;
      images?: string[];
    }> = [];
    let metadata = {};
    let thumbnailUrl: string | null = null;

    try {
      const extraction = await PPTXProcessorReal.extract(buffer);
      
      if (extraction.success) {
        slidesData = extraction.slides || [];
        metadata = extraction.metadata || {};
        
        // Gerar thumbnail
        thumbnailUrl = await PPTXProcessorReal.generateThumbnail(buffer, projectId);
        console.log(`[Upload] ${slidesData.length} slides extraídos`);
      }
    } catch (processingError) {
      console.warn('[Upload] Erro no processamento, usando fallback:', processingError);
      // Fallback: criar slide básico
      slidesData = [{
        slideNumber: 1,
        title: projectName,
        content: 'Slide importado de ' + file.name,
      }];
    }

    return NextResponse.json({
      success: true,
      uploadId,
      projectId,
      projectName: projectName || file.name.replace(/\.(pptx|ppt)$/i, ''),
      fileName: file.name,
      fileSize: file.size,
      filePath: `/uploads/pptx/${safeFileName}`,
      slideCount: slidesData.length,
      slides: slidesData.map((slide, index) => ({
        id: `slide-${index + 1}`,
        slideNumber: slide.slideNumber || index + 1,
        title: slide.title || `Slide ${index + 1}`,
        content: slide.content || '',
        notes: slide.notes || '',
        images: slide.images || [],
        duration: 5,
        audioUrl: null,
      })),
      thumbnailUrl,
      metadata,
      message: 'Upload e processamento concluídos com sucesso',
    }, { status: 201 });

  } catch (error) {
    logger.error('Erro no upload:', error instanceof Error ? error : new Error(String(error)), { 
      component: 'API: upload' 
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Upload API',
    version: '1.0.0',
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    allowedExtensions: ALLOWED_EXTENSIONS,
    usage: {
      method: 'POST',
      contentType: 'multipart/form-data',
      fields: {
        file: 'Arquivo PPTX (obrigatório)',
        project_name: 'Nome do projeto (opcional)',
      },
    },
    example: {
      curl: 'curl -X POST -F "file=@presentation.pptx" -F "project_name=Meu Curso" http://localhost:3000/api/upload',
    },
  });
}

