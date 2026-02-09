/**
 * API v1: POST /api/v1/pptx/upload
 *
 * Public API endpoint for PPTX upload and extraction.
 * Reuses the real extraction logic from PPTXProcessorReal.
 * Persists records in pptx_uploads + pptx_slides (OpenSpec e2e-pptx-integration).
 * Returns format expected by E2E helpers and OpenSpec.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PPTXProcessorReal } from '@/lib/pptx/pptx-processor-real';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getServerAuth } from '@lib/auth/unified-session';
import { supabaseAdmin } from '@lib/supabase/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  try {
    // Rate limit: 10 uploads per minute per IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`v1-pptx-upload:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    // Parse multipart / form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PPTX file provided' },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith('.pptx')) {
      return NextResponse.json(
        { success: false, error: 'File must be a .pptx' },
        { status: 400 },
      );
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Max: 100MB' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const projectId = randomUUID();

    logger.info('v1 PPTX upload', {
      fileName: file.name,
      fileSize: file.size,
      projectId,
      component: 'api-v1-pptx-upload',
    });

    const result = await PPTXProcessorReal.extract(buffer, projectId);

    if (!result.success || result.slides.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract slides from PPTX' },
        { status: 500 },
      );
    }

    // ------------------------------------------------------------------
    // Persist to pptx_uploads + pptx_slides (OpenSpec e2e-pptx-integration)
    // ------------------------------------------------------------------
    const { error: uploadInsertError } = await supabaseAdmin
      .from('pptx_uploads')
      .insert({
        id: projectId,
        original_filename: file.name,
        status: 'completed',
        slide_count: result.slides.length,
      });

    if (uploadInsertError) {
      logger.error('Failed to persist pptx_uploads', new Error(uploadInsertError.message), {
        projectId,
        component: 'api-v1-pptx-upload',
      });
      // Non-blocking: log but don't fail the API response
    }

    if (!uploadInsertError) {
      const slideRows = result.slides.map((slide, idx) => ({
        upload_id: projectId,
        slide_number: slide.slideNumber ?? idx + 1,
        title: slide.title || '',
        content: slide.content || '',
        duration: slide.duration || 5,
        notes: slide.notes || '',
        properties: {
          layout: slide.layout || 'default',
          shapes: slide.shapes ?? 0,
          textBlocks: slide.textBlocks ?? 0,
          images: slide.images || [],
        },
      }));

      const { error: slidesInsertError } = await supabaseAdmin
        .from('pptx_slides')
        .insert(slideRows);

      if (slidesInsertError) {
        logger.error('Failed to persist pptx_slides', new Error(slidesInsertError.message), {
          projectId,
          slideCount: slideRows.length,
          component: 'api-v1-pptx-upload',
        });
      }
    }

    logger.info('v1 PPTX extraction OK', {
      projectId,
      slideCount: result.slides.length,
      component: 'api-v1-pptx-upload',
    });

    return NextResponse.json({
      success: true,
      data: {
        processingId: projectId,
        result: {
          slides: result.slides,
          metadata: result.metadata,
          assets: result.assets,
        },
      },
    });
  } catch (error) {
    logger.error(
      'v1 PPTX upload error',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'api-v1-pptx-upload' },
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
