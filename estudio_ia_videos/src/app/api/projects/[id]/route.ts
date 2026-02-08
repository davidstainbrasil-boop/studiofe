import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'
import { sanitizeInput } from '@lib/middleware/security'

// Type definitions for PPTX slides and timeline elements
interface PptxSlide {
  id: string;
  content: string | { text?: string };
  durationSeconds?: number;
  background_image?: string;
  backgroundImage?: string;
  order_index?: number;
}

interface TimelineElement {
  id: string;
  type: string;
  name: string;
  startTime: number;
  duration: number;
  content: string;
  properties: Record<string, unknown>;
  locked: boolean;
  visible: boolean;
}

// Schema de validação para atualização de projetos
const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').optional(),
  description: z.string().optional(),
  type: z.enum(['pptx', 'template-nr', 'talking-photo', 'custom', 'ai-generated']).optional(),
  status: z.enum(['draft', 'in-progress', 'review', 'completed', 'archived', 'error']).optional(),
  settings: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    fps: z.number().optional(),
    duration: z.number().optional(),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    format: z.enum(['mp4', 'mov', 'avi']).optional()
  }).optional(),
  isPublic: z.boolean().optional()
})

// GET - Obter projeto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'projects-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = getSupabaseForRequest(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('*, timeline:timelines(*)')
      .eq('id', params.id)
      .single()
    
    if (error || !project) {
      return NextResponse.json({
        success: false,
        error: 'Projeto não encontrado',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    let hasPermission = (project.user_id || project.userId) === user.id || project.is_public


    if (!hasPermission) {
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select("userId")
        .eq("project_id", params.id)
        .eq("userId", user.id)
        .single()
      
      if (collaborator) hasPermission = true
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // --- PPTX IMPORT ADAPTER ---
    // If project is PPTX import and no timeline exists, generate one from slides
    // Cast to Record to get around strict type checks for adapter logic
    const projectRecord = project as Record<string, unknown>;
    const isPptxProject = projectRecord.type === 'pptx' || projectRecord.type === 'pptx_import';
    let pptxSlides: PptxSlide[] = [];

    if (isPptxProject) {
      const { data: slides, error: slidesError } = await supabase
        .from('slides')
        .select('*')
        .eq("project_id", params.id)
        .order('order_index');

      if (slidesError) {
        logger.warn('Erro ao carregar slides do projeto PPTX', { error: slidesError, projectId: params.id });
      } else if (slides) {
        pptxSlides = slides as PptxSlide[];
        projectRecord.slides = slides;
      }
    }

    if (isPptxProject && (!projectRecord.timeline || (projectRecord.timeline as unknown[]).length === 0) && pptxSlides.length > 0) {
      // Convert to Timeline Structure
      const elements: TimelineElement[] = [];
      const imageElements: TimelineElement[] = [];
      let currentTime = 0;

      pptxSlides.forEach((slide: PptxSlide, index: number) => {
        const duration = slide.durationSeconds || 5;
        const slideContent = typeof slide.content === 'object' ? slide.content?.text : slide.content;

        // 1. Text Element
        elements.push({
          id: `text-${slide.id}`,
          type: 'text',
          name: `Slide ${index + 1} Text`,
          startTime: currentTime,
          duration: duration,
          content: (slideContent || 'Texto do slide').substring(0, 100),
          properties: {
            fontSize: 40,
            color: '#ffffff',
            x: 100, y: 100,
            width: 800
          },
          locked: false, visible: true
        });

        // 2. Image Element (if any)
        const imgUrl = slide.background_image || slide.backgroundImage;

        if (imgUrl) {
          imageElements.push({
            id: `img-${slide.id}`,
            type: 'image',
            name: `Slide ${index + 1} Image`,
            startTime: currentTime,
            duration: duration,
            content: imgUrl,
            properties: {
              x: 0, y: 0, // Fill screen
              width: 1920, height: 1080,
              opacity: 1
            },
            locked: false, visible: true
          });
        }

        currentTime += duration;
      });

      const tracks = [];

      if (imageElements.length > 0) {
        tracks.push({
          id: 'track-images',
          name: 'Imagens Slides',
          type: 'video',
          elements: imageElements,
          height: 100, color: '#10B981',
          visible: true, locked: false, muted: false, volume: 1
        });
      }

      tracks.push({
        id: 'track-text',
        name: 'Texto Slides',
        type: 'video', // Using video track for visual elements
        elements: elements,
        height: 100, color: '#3B82F6',
        visible: true, locked: false, muted: false, volume: 1
      });

      // Mock a timeline object attached to project for the frontend
      projectRecord.timeline = [{
        id: 'virtual-timeline',
        projectId: project.id,
        tracks: tracks,
        totalDuration: currentTime,
        settings: projectRecord.settings || { resolution: { width: 1920, height: 1080 }, fps: 30 }
      }];
    }


    if (!hasPermission) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro ao buscar projeto', err, {
      component: 'API: projects/[id]',
      context: { id: params.id }
    })
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// PUT - Atualizar projeto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const rawBody = await request.json()
    
    // Sanitizar inputs contra XSS
    const body = sanitizeInput(rawBody) as Record<string, unknown>;
    
    // Validação dos dados
    const validationResult = UpdateProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const validatedData = validationResult.data
    
    // Verificar permissões
    const { data: project } = await supabase
      .from('projects')
      .select("user_id")

      .eq('id', params.id)
      .single()

    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Projeto não encontrado',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    let hasPermission = (project.user_id || project.userId) === user.id


    if (!hasPermission) {
      const { data: collaboratorData } = await supabase
        .from('collaborators')
        .select('role')
        .eq("project_id", params.id)
        .eq("userId", user.id)
        .single()
      
      const collaborator = collaboratorData as unknown as { role: string } | null;
      if (collaborator?.role && ['editor', 'owner'].includes(collaborator.role)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.type) updateData.type = validatedData.type
    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.isPublic !== undefined) updateData.is_public = validatedData.isPublic
    
    // Se houver settings, precisamos fazer merge com o existente ou substituir
    // Como é JSONB, o update do supabase faz merge se for top-level, mas aqui é uma coluna
    // Vamos buscar o atual primeiro se precisarmos fazer merge profundo, mas por simplicidade vamos assumir substituição ou merge via jsonb_set se fosse complexo.
    // Aqui vamos apenas atualizar a coluna render_settings se fornecida.
    if (validatedData.settings) {
        // Fetch current settings to merge? Or just overwrite?
        // Let's overwrite for now as the schema implies complete settings object or partial update of the column
        // Actually, let's fetch first to be safe if we want partial update inside jsonb
        const { data: currentProject } = await supabase
            .from('projects')
            .select("render_settings")
            .eq('id', params.id)
            .single()
        
        const currentSettings = (typeof currentProject?.render_settings === 'object' && currentProject?.render_settings !== null)  
          ? (currentProject as unknown as { render_settings: Record<string, unknown> }).render_settings
          : {}
        updateData.render_settings = { ...currentSettings, ...validatedData.settings }
    }

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Projeto atualizado com sucesso!',
      data: updatedProject,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro ao atualizar projeto', err, {
      component: 'API: projects/[id]',
      context: { id: params.id }
    })
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// DELETE - Excluir projeto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.id)
      .eq("user_id", user.id)


    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Projeto excluído com sucesso!',
      data: { id: params.id },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error(`Erro ao excluir projeto ${params.id}`, err, {
      component: 'API: projects/[id]',
      context: { id: params.id }
    })
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
