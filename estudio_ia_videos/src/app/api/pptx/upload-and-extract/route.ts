/**
 * API Route: POST /api/pptx/upload-and-extract
 *
 * Uploads a PPTX file and extracts slides in one step
 * Used by the PPTXToVideoWizard Step 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { PPTXProcessorReal } from '@/lib/pptx/pptx-processor-real';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';

export const maxDuration = 60; // 60 seconds max

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      return NextResponse.json(
        { success: false, message: 'Arquivo deve ser um .pptx válido' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Arquivo muito grande. Máximo: 100MB' },
        { status: 400 }
      );
    }

    logger.info('Processing PPTX upload', {
      fileName: file.name,
      fileSize: file.size,
      component: 'pptx-upload-and-extract',
    });

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate project ID
    const projectId = randomUUID();

    // Extract slides using the real processor
    const result = await PPTXProcessorReal.extract(buffer, projectId);

    if (!result.success) {
      logger.error('PPTX extraction failed', result.error as Error, {
        component: 'pptx-upload-and-extract',
      });
      return NextResponse.json(
        { success: false, message: 'Falha ao extrair slides do PPTX' },
        { status: 500 }
      );
    }

    logger.info('PPTX extraction successful', {
      projectId,
      slideCount: result.slides.length,
      component: 'pptx-upload-and-extract',
    });

    return NextResponse.json({
      success: true,
      projectId,
      slides: result.slides,
      metadata: result.metadata,
      assets: result.assets,
      timeline: result.timeline,
      stats: result.extractionStats,
    });
  } catch (error) {
    logger.error('PPTX upload error', error instanceof Error ? error : new Error(String(error)), {
      component: 'pptx-upload-and-extract',
    });

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao processar PPTX',
      },
      { status: 500 }
    );
  }
}
