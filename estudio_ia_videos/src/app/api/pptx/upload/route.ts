
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

// Helper to create Supabase Admin Client for database operations ensuring RLS bypass if needed
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

export async function POST(req: NextRequest) {
  logger.info('PPTX upload request received');

  try {
    let user;
    
    // [NON-PROD] Bypass check - configurável via env var
    const bypassEnabled = process.env.NODE_ENV !== 'production';
    const bypassId = process.env.DEV_BYPASS_USER_ID; // UUID externalizado
    const headerUserId = req.headers.get('x-user-id');
    let devBypassCookie = false;
    if (bypassEnabled) {
      try {
        devBypassCookie = req.cookies.get('dev_bypass')?.value === 'true';
      } catch {
        devBypassCookie = false;
      }
    }
    
    // Bypass só funciona se DEV_BYPASS_USER_ID estiver configurado
    if (bypassEnabled && bypassId && (devBypassCookie || headerUserId === bypassId)) {
        user = { id: bypassId, email: 'admin@estudio.ai' };
    } else {
        const supabase = getSupabaseForRequest(req);
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }
        user = authUser;
    }

    // Apply rate limiting
    const tier = await getUserTier(user.id);
    const rateLimitResponse = await rateLimit(req, user.id, tier);

    if (rateLimitResponse) {
      logger.warn('PPTX upload rate limit exceeded', { userId: user.id, tier });
      return rateLimitResponse;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let projectId = formData.get('projectId') as string;

    if (!file) {
      logger.warn('No file found in the upload request');
      return NextResponse.json({ error: 'Nenhum arquivo encontrado.' }, { status: 400 });
    }

    if (file.size === 0) {
      logger.warn('Empty file uploaded', { userId: user.id });
      return NextResponse.json({ error: 'O arquivo está vazio.' }, { status: 400 });
    }

    // Upload File first
    const uploader = new PptxUploader();
    const isNewProject = !projectId || projectId === 'mock-project-id';
    if (isNewProject) {
        projectId = randomUUID();
    }

    const result = await uploader.upload({ file, userId: user.id, projectId });
    logger.info('File uploaded successfully via service', { result, userId: user.id });

    // Extract Slides Content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let extraction;
    try {
        // Pass projectId to allow image uploads to correct path
        extraction = await PPTXProcessorReal.extract(buffer, projectId);
        logger.info('PPTX extracted', { slideCount: extraction.slides.length });
    } catch (extractError) {
        logger.error('Failed to extract PPTX content', extractError as Error);
        // We continue, but project will be empty. User might edit manually.
        extraction = { success: false, slides: [], metadata: { title: file.name, totalSlides: 0 } as any };
    }

    // Create Project in DB if new
    if (isNewProject) {
        const projectName = extraction.metadata?.title || file.name.replace(/\.[^/.]+$/, "") || 'Untitled Project';
        
        try {
            await prisma.projects.create({
                data: {
                    id: projectId,
                    userId: user.id,
                    name: projectName,
                    type: 'pptx',
                    status: 'draft',
                    metadata: {
                        created_via: 'upload_api',
                        original_filename: file.name,
                        extraction_stats: extraction.extractionStats as any
                    }
                }
            });
            logger.info('Created new project for upload', { projectId, userId: user.id });
        } catch (dbError) {
            logger.error('Failed to create project record', dbError as Error);
            return NextResponse.json({ error: 'Erro ao criar registro do projeto.' }, { status: 500 });
        }
    }

    // Insert Slides into DB (using Supabase Admin to ensure write access if RLS is strict/weird, 
    // or just consistency with schema that might not be in Prisma)
    if (extraction.success && extraction.slides.length > 0) {
        const supabaseAdmin = createClient<Database>(
            getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
            getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
        );

        const slidesToInsert = extraction.slides.map((slide: any, index: number) => ({
            project_id: projectId,
            order_index: index,
            title: slide.title?.substring(0, 100),
            content: slide.content,
            duration: 5, // Default duration
            background_image: slide.images?.[0] || null, // Pick first image as background
            notes: slide.notes
        }));

        const { error: slidesError } = await supabaseAdmin
            .from('slides')
            .delete()
            .eq('project_id' as any, projectId) // Clear existing if any (e.g. re-upload)
            .then(() => supabaseAdmin.from('slides').insert(slidesToInsert as any));

        if (slidesError) {
             logger.error('Failed to insert slides', slidesError);
             // We don't fail the request, but log it.
        } else {
            logger.info('Slides inserted successfully', { count: slidesToInsert.length });
        }
    }

    return NextResponse.json({
        ...result,
        projectId,
        slidesCount: extraction.slides.length || 0
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const normalized = normalizeError(error);

    logger.error('Error handling PPTX upload', err, {
      category: normalized.category,
      context: normalized.context,
    });

    const message =
      error instanceof AppError
        ? error.message
        : process.env.NODE_ENV === 'production'
          ? getUserMessage(error)
          : err.message;

    return NextResponse.json({ error: message }, { status: normalized.statusCode });
  }
}
