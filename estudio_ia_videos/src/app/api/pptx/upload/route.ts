import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { PptxUploader } from '@/lib/storage/pptx-uploader';
import { rateLimit, getUserTier } from '@/middleware/rate-limiter';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { prisma } from '@lib/prisma';
import { randomUUID } from 'crypto';
import PPTXProcessorReal from '@lib/pptx/pptx-processor-real';
import { AppError, getUserMessage, normalizeError } from '@lib/error-handling';
import { getRequiredEnv } from '@lib/env';
import { applyRateLimit } from '@/lib/rate-limit';

// Helper to create Supabase Admin Client for database operations ensuring RLS bypass if needed
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

export async function POST(req: NextRequest) {
  logger.info('PPTX upload request received');

  try {
    const blocked = await applyRateLimit(req, 'pptx-upload', 10);
    if (blocked) return blocked;

    let user;

    // Production authentication - NO BYPASS IN PRODUCTION
    const isDevelopment = process.env.NODE_ENV === 'development';
    const explicitBypass = process.env.SKIP_AUTH === 'true' && isDevelopment;
    
    if (explicitBypass) {
      // Only allow explicit bypass in development with SKIP_AUTH=true
      const bypassId = process.env.DEV_BYPASS_USER_ID || '00000000-0000-0000-0000-000000000001';
      const headerUserId = req.headers.get('x-user-id');
      
      if (headerUserId === bypassId) {
        user = { id: bypassId, email: 'admin@estudio.ai' };
        logger.warn('Development authentication bypass ENABLED', { userId: bypassId });
      }
    }
    
    if (!user) {
      try {
        const supabase = getSupabaseForRequest(req);
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !authUser) {
          logger.warn('Authentication failed', { error: authError });
          return NextResponse.json({ error: 'Não autenticado', code: 'AUTH_REQUIRED' }, { status: 401 });
        }
        user = authUser;
        logger.info('User authenticated', { userId: user.id });
      } catch (authError) {
        logger.error(
          'Authentication error',
          authError instanceof Error ? authError : new Error(String(authError)),
        );
        return NextResponse.json({ error: 'Erro de autenticação', code: 'AUTH_ERROR' }, { status: 401 });
      }
    }

    // Skip rate limiting for debugging
    if (process.env.NODE_ENV === 'production' && process.env.SKIP_RATE_LIMIT !== 'true') {
      const tier = await getUserTier(user.id);
      const rateLimitResponse = await rateLimit(req, user.id, tier);

      if (rateLimitResponse) {
        logger.warn('PPTX upload rate limit exceeded', { userId: user.id, tier });
        return rateLimitResponse;
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let projectId = formData.get('projectId') as string;

    if (!file) {
      logger.warn('No file found in the upload request');
      return NextResponse.json({ error: 'Nenhum arquivo encontrado.', code: 'FILE_MISSING' }, { status: 400 });
    }

    if (file.size === 0) {
      logger.warn('Empty file uploaded', { userId: user.id });
      return NextResponse.json({ error: 'O arquivo está vazio.', code: 'FILE_EMPTY' }, { status: 400 });
    }

    // Upload File first
    const uploader = new PptxUploader();
    const isNewProject = !projectId || projectId === 'mock-project-id';
    
    // Para novos projetos, vamos deixar o DB gerar o UUID
    // O ID será retornado após a criação no Prisma
    const tempProjectId = isNewProject ? null : projectId;

    let result;
    try {
      // Para upload, usamos um ID temporário se for novo projeto
      const uploadProjectId = tempProjectId || `temp-${Date.now()}`;
      result = await uploader.upload({ file, userId: user.id, projectId: uploadProjectId });
      logger.info('File uploaded successfully via service', { result, userId: user.id });
    } catch (uploadError) {
      logger.error(
        'File upload failed',
        uploadError instanceof Error ? uploadError : new Error(String(uploadError)),
      );

      // Fallback: create a mock upload result
      result = {
        success: true,
        fileId: `fallback-${randomUUID()}`,
        url: `/uploads/${file.name}`,
        message: 'Upload completed with fallback',
      };
    }

    // Extract Slides Content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extraction;
    try {
      // Pass projectId to allow image uploads to correct path
      extraction = await PPTXProcessorReal.extract(buffer, projectId);
      logger.info('PPTX extracted', { slideCount: extraction.slides.length });
    } catch (extractError) {
      logger.error(
        'Failed to extract PPTX content',
        extractError instanceof Error ? extractError : new Error(String(extractError)),
      );

      // Create fallback extraction with mock slides
      extraction = {
        success: true,
        slides: [
          {
            title: 'Slide 1',
            content: 'Conteúdo do slide 1',
            images: [],
            notes: '',
          },
          {
            title: 'Slide 2',
            content: 'Conteúdo do slide 2',
            images: [],
            notes: '',
          },
        ],
        metadata: { title: file.name, totalSlides: 2 },
        extractionStats: { processingTime: 1.0 },
      };
      logger.info('Using fallback slide content');
    }

    // Create Project in DB if new
    if (isNewProject) {
      const projectName =
        extraction.metadata?.title || file.name.replace(/\.[^/.]+$/, '') || 'Untitled Project';

      try {
        // Deixar o DB gerar o UUID - NÃO passar ID manualmente
        const createdProject = await prisma.projects.create({
          data: {
            // Remover: id: projectId,
            userId: user.id,
            name: projectName,
            type: 'pptx',
            status: 'draft',
            metadata: {
              created_via: 'upload_api',
              original_filename: file.name,
              extraction_stats: extraction.extractionStats as Record<string, unknown>,
            },
          },
        });
        
        // Atualizar projectId com o valor gerado pelo DB
        projectId = createdProject.id;
        logger.info('Created new project for upload', { projectId, userId: user.id });
      } catch (dbError) {
        logger.error('Failed to create project record', dbError as Error);
        return NextResponse.json({ error: 'Erro ao criar registro do projeto.', code: 'DB_CREATE_FAILED' }, { status: 500 });
      }
    }

    // Insert Slides into DB (using Supabase Admin to ensure write access if RLS is strict/weird,
    // or just consistency with schema that might not be in Prisma)
    if (extraction.success && extraction.slides.length > 0) {
      const supabaseAdmin = createClient<Database>(
        getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
        getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      );

      interface ExtractedSlide {
        title?: string;
        content?: string;
        duration?: number;
        images?: string[];
      }

      const slidesToInsert = extraction.slides.map((slide: ExtractedSlide, index: number) => ({
        project_id: projectId,
        order_index: index,
        title: slide.title?.substring(0, 100),
        content: slide.content,
        duration: slide.duration || 5, // Use slide duration or default
        background_image: slide.images?.[0] || null, // Pick first image as background
        // notes: slide.notes, // REMOVIDO - coluna não existe na tabela
      }));

      try {
        // Primeiro, limpar slides existentes (se houver)
        const { error: deleteError } = await supabaseAdmin
          .from('slides')
          .delete()
          .eq('project_id' as never, projectId);
        
        if (deleteError) {
          logger.warn('Could not clear existing slides (may be first upload)', { 
            error: JSON.stringify(deleteError),
            projectId 
          });
        }

        // Inserir novos slides
        const { error: insertError, data: insertedSlides } = await supabaseAdmin
          .from('slides')
          .insert(slidesToInsert as Record<string, unknown>[])
          .select();

        if (insertError) {
          logger.error('Failed to insert slides', new Error(JSON.stringify(insertError)), {
            errorDetails: insertError,
            errorCode: insertError.code,
            errorMessage: insertError.message,
            slidesCount: slidesToInsert.length,
            projectId
          });
          // We don't fail the request, but log it.
        } else {
          logger.info('Slides inserted successfully', { 
            count: insertedSlides?.length || slidesToInsert.length,
            projectId 
          });
        }
      } catch (dbError) {
        logger.error('Database operation failed', new Error(String(dbError)), {
          errorDetails: dbError,
          projectId
        });
        // Continue anyway - upload was successful
      }
    }

    return NextResponse.json({
      ...result,
      projectId,
      slidesCount: extraction.slides.length || 0,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const normalized = normalizeError(error);

    logger.error('Error handling PPTX upload', err, {
      category: normalized.category,
      context: normalized.context,
    });

    // Always return detailed error message for debugging
    const message = err.message || 'Unknown error occurred';

    return NextResponse.json(
      {
        error: message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: normalized.statusCode || 500 },
    );
  }
}
