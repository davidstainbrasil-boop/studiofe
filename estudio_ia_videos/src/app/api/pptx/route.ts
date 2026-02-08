/**
 * 📄 API PPTX - Upload, Parse e Processamento
 * Sistema completo para gerenciamento de apresentações
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@lib/services/server';
import { logger } from '@lib/logger';
import { getRequiredEnv } from '@lib/env';
import type { CompletePPTXData, CompleteSlideData } from '@lib/pptx/parsers/advanced-parser';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * POST - Upload e parse de arquivo PPTX
 */
export async function POST(request: NextRequest) {
  let user: { id: string } | null = null;
  
  try {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    
    let supabase;

    if (authHeader) {
        // Create a clean client and set session manually
        supabase = createClient(
            getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
            getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader.startsWith('bearer ') ? authHeader.substring(7) : authHeader;
        
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: 'dummy'
        });
        
        if (sessionError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const result = await supabase.auth.getUser();
        user = result.data.user;
    } else {
        supabase = getSupabaseForRequest(request);
        const result = await supabase.auth.getUser();
        user = result.data.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const settingsStr = formData.get('settings') as string;
    const settings = settingsStr ? JSON.parse(settingsStr) : {};

    if (!file) {
      return NextResponse.json({ error: 'Arquivo PPTX não fornecido' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pptx')) {
      return NextResponse.json({ error: 'Formato inválido. Apenas arquivos .pptx são permitidos.' }, { status: 400 });
    }

    // HARDENING: File Size Limit (25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Arquivo muito grande. O limite é 25MB.' }, { status: 400 });
    }

    // 2. Create Project in DB
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: user.id,
        name: file.name.replace('.pptx', ''),
        status: 'processing', // Or 'draft'
        type: 'pptx',
        metadata: settings
      })
      .select()
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to create project: ${projectError?.message}`);
    }

    logger.info(`[PPTX API] Project created: ${project.id}`, { component: 'API: pptx' });

    // 3. Parse PPTX (Using Advanced Parser)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Dynamically import the advanced parser
    const { parseCompletePPTX } = await import('@/lib/pptx/parsers/advanced-parser');
    
    logger.info(`[PPTX API] Starting Advanced Parse for project: ${project.id}`, { component: 'API: pptx' });
    
    // HARDENING: Timeout Wrapper (60s)
    const PARSE_TIMEOUT_MS = 60000;
    const parsePromise = parseCompletePPTX(fileBuffer, project.id, {
      includeImages: true,
      includeNotes: true,
      includeAnimations: false
    }) as Promise<CompletePPTXData>;

    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Tempo limite de processamento excedido (60s)')), PARSE_TIMEOUT_MS)
    );

    let parsedData: CompletePPTXData;
    try {
        parsedData = await Promise.race([parsePromise, timeoutPromise]);
    } catch (parseErr) {
        logger.error(`[PPTX API] Parse Timeout/Error for project ${project.id}`, parseErr as Error, { 
            userId: user.id, projectId: project.id, filename: file.name 
        });
        // Update project status to error
        await supabaseAdmin.from('projects').update({ status: 'error' }).eq('id', project.id);
        throw new Error('Falha no processamento: O arquivo é muito complexo ou demorou muito para responder.');
    }

    if (!parsedData.success) {
        logger.error('[PPTX API] Parse errors:', new Error(parsedData.errors.join(', ')), { component: 'API: pptx' });
        throw new Error(`PPTX Parse failed: ${parsedData.errors.join(', ')}`);
    }

    // HARDENING: Slide Sanity Check
    const MAX_SLIDES = 80;
    if (parsedData.slides.length > MAX_SLIDES) {
        // Safe fail or truncation? Let's truncate and warn for now to avoid crashing good large files, 
        // OR reject if strict. Prompt says: "Validate slide count".
        // Let's reject to enforce quality/performance limits for MVP.
        throw new Error(`O arquivo possui ${parsedData.slides.length} slides. O limite atual é ${MAX_SLIDES}.`);
    }

    // 4. Insert Slides (with Filter for empty)
    const slidesToInsert = parsedData.slides
        .map((slide: CompleteSlideData, index: number) => {
            // Use o texto principal do slide (combina lines ou usa text diretamente)
            const textContent = slide.text.lines?.join('\n').trim() || slide.text.text?.trim() || '';
            // ExtractedImage tem dataUrl, não url
            const backgroundImage = slide.images.length > 0 ? slide.images[0].dataUrl : null;

            // HARDENING: Skip truly empty slides
            if (!textContent && !backgroundImage) {
                logger.warn(`[PPTX API] Skipping empty slide ${slide.slideNumber}`, { projectId: project.id });
                return null;
            }
            
            return {
                project_id: project.id,
                order_index: index,
                title: `Slide ${slide.slideNumber}`,
                content: { text: textContent || `Slide ${slide.slideNumber}` }, 
                durationSeconds: Math.max(5, slide.duration.estimatedDuration),
                notes: slide.notes.notes || null,
                background_image: backgroundImage,
                layoutType: slide.layout.layout?.type || 'custom',
                metadata: {
                    hasImages: slide.images.length > 0,
                    wordCount: slide.text.wordCount,
                    originalSlideNumber: slide.slideNumber
                }
            };
        })
        .filter(Boolean); // Remove nulls

    if (slidesToInsert.length > 0) {
      const { error: slidesError } = await supabaseAdmin
        .from('slides')
        .insert(slidesToInsert as Record<string, unknown>[]);

      if (slidesError) {
        logger.error('Failed to insert slides:', new Error(slidesError.message), { component: 'API: pptx' });
        // Don't fail the whole request, but log it. 
        // Actually, if slides fail, the project is empty. We should probably fail.
        throw new Error(`Failed to save slides: ${slidesError.message}`);
      }
    }

    // 5. Update Project Status
    await supabaseAdmin
      .from('projects')
      .update({
        status: 'draft', // Ready for editing

      })
      .eq('id', project.id);

    return NextResponse.json({
      success: true,
      projectId: project.id,
      message: 'PPTX processado com sucesso',
      slideCount: slidesToInsert.length,
      slides: slidesToInsert.map(s => s ? {
          slideNumber: s.metadata?.originalSlideNumber ?? 0,
          title: s.title ?? '',
          thumbnailUrl: s.background_image || '',
          duration: s.durationSeconds ?? 0,
          selected: true
      } : null).filter(Boolean)
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error('[PPTX API] Process Error:', err, { 
        component: 'API: pptx',
        userId: user?.id || 'unknown',
        // We might not have project ID here if it failed early, captured in context if possible
    });

    // HARDENING: User-safe error
    // Don't expose internal db/parsing errors
    let userMessage = 'Erro ao processar arquivo PPTX.';
    if (err.message.includes('Tempo limite')) userMessage = err.message;
    if (err.message.includes('Arquivo muito grande')) userMessage = err.message;
    if (err.message.includes('Formato inválido')) userMessage = err.message;
    if (err.message.includes('limite atual é')) userMessage = err.message;
    if (err.message.includes('PPTX Parse failed')) userMessage = 'O arquivo PPTX parece estar corrompido ou protegido.';

    return NextResponse.json(
      { error: userMessage, details: process.env.NODE_ENV === 'development' ? err.message : undefined },
      { status: err.message.includes('Arquivo muito grande') ? 413 : 500 }
    );
  }
}

/**
 * GET - Obter status de job ou listar jobs
 */
export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'pptx-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Placeholder for future implementation if needed
    return NextResponse.json({ message: 'Use /api/projects to list projects' });
}

/**
 * DELETE - Cancelar job ou remover documento
 */
export async function DELETE(request: NextRequest) {
    // Placeholder
    return NextResponse.json({ message: 'Use /api/projects to delete projects' });
}
