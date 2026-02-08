// TODO: Add timeline_elements and timeline_tracks tables to Supabase types
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { z } from 'zod'
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

// Type interfaces for Supabase query results
interface ProjectPermissions {
  owner_id: string;
  collaborators?: string[];
  is_public?: boolean;
}

interface TrackWithProject {
  id: string;
  name?: string;
  locked?: boolean;
  project_id?: string;
  project: ProjectPermissions;
}

interface TimelineElement {
  id: string;
  trackId: string;
  project_id?: string;
  start_time: number;
  duration: number;
  type?: string;
  content?: string;
  source_url?: string;
  properties?: Record<string, unknown>;
  effects?: Record<string, unknown>[];
  transitions?: Record<string, unknown>;
  locked?: boolean;
  track?: TrackWithProject;
}

// Schema de validação para criação de elemento
const createElementSchema = z.object({
  trackId: z.string().uuid('ID da track inválido'),
  projectId: z.string().uuid('ID do projeto inválido'),
  start_time: z.number().min(0, 'Tempo de início deve ser positivo'),
  duration: z.number().min(0.1, 'Duração deve ser maior que 0.1 segundos'),
  type: z.enum(['video', 'audio', 'text', 'image', 'pptx_slide', '3d_avatar']),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  source_url: z.string().url().optional(),
  properties: z.object({
    volume: z.number().min(0).max(2).optional(),
    opacity: z.number().min(0).max(1).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().min(1).optional(),
    height: z.number().min(1).optional(),
    rotation: z.number().optional(),
    scale: z.number().min(0.1).max(10).optional()
  }).optional(),
  effects: z.array(z.record(z.unknown())).optional(),
  transitions: z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().url().optional(),
  fileSize: z.number().int().min(0).optional(),
  mimeType: z.string().optional()
})

// Schema de validação para atualização de elemento
const updateElementSchema = createElementSchema.omit({ trackId: true, projectId: true }).partial()

// Schema de validação para mover elemento
const moveElementSchema = z.object({
  trackId: z.string().uuid().optional(),
  start_time: z.number().min(0).optional(),
  duration: z.number().min(0.1).optional()
})

// GET - Listar elementos de uma track ou projeto
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'timeline-elements-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get("trackId")
    const projectId = searchParams.get("projectId")
    const type = searchParams.get('type')
    const startTime = searchParams.get('start_time')
    const endTime = searchParams.get('end_time')

    if (!trackId && !projectId) {
      return NextResponse.json(
        { error: 'ID da track ou projeto é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar permissões
    let hasPermission = false
    if (projectId) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('owner_id, collaborators, is_public')
        .eq('id', projectId)
        .single()

      const project = projectData as unknown as ProjectPermissions | null;
      if (project) {
        hasPermission = project.owner_id === user.id || 
                       (Array.isArray(project.collaborators) && (project.collaborators as string[]).includes(user.id)) ||
                       !!project.is_public
      }
    } else if (trackId) {
      const { data: trackData } = await supabase
        .from('timeline_tracks')
        .select(`
          project:projects(owner_id, collaborators, is_public)
        `)
        .eq('id', trackId)
        .single()

      const track = trackData as unknown as { project: ProjectPermissions } | null;
      if (track?.project) {
        hasPermission = track.project.owner_id === user.id || 
                       (Array.isArray(track.project.collaborators) && (track.project.collaborators as string[]).includes(user.id)) ||
                       !!track.project.is_public
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar estes elementos' },
        { status: 403 }
      )
    }

    // Construir query
    let query = supabase
      .from('timeline_elements')
      .select('*')
      .order('start_time', { ascending: true })

    if (trackId) {
      query = query.eq("trackId", trackId)
    }
    if (projectId) {
      query = query.eq("project_id", projectId)
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (startTime) {
      query = query.gte('start_time', parseFloat(startTime))
    }
    if (endTime) {
      query = query.lte('end_time', parseFloat(endTime))
    }

    const { data: elementsData, error } = await query

    if (error) {
      logger.error('Erro ao buscar elementos:', error instanceof Error ? error : new Error(String(error)), { component: 'API: timeline/elements' })
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ elements: elementsData })

  } catch (error) {
    logger.error('Erro na API de elementos:', error instanceof Error ? error : new Error(String(error)), { component: 'API: timeline/elements' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo elemento
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createElementSchema.parse(body)

    // Verificar se a track existe e obter dados do projeto
    const { data: trackData } = await supabase
      .from('timeline_tracks')
      .select(`
        *,
        project:projects(owner_id, collaborators)
      `)
      .eq('id', validatedData.trackId)
      .single()

    if (!trackData) {
      return NextResponse.json(
        { error: 'Track não encontrada' },
        { status: 404 }
      )
    }

    const track = trackData as unknown as TrackWithProject & { project_id: string; locked?: boolean };
    
    // Verificar se o project_id corresponde
    if (track.project_id !== validatedData.projectId) {
      return NextResponse.json(
        { error: 'Track não pertence ao projeto especificado' },
        { status: 400 }
      )
    }

    // Verificar permissões
    const project = track.project
    const hasPermission = project.owner_id === user.id || 
                         (Array.isArray(project.collaborators) && (project.collaborators as string[]).includes(user.id))

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para editar este projeto' },
        { status: 403 }
      )
    }

    // Verificar se a track está bloqueada
    if (track.locked) {
      return NextResponse.json(
        { error: 'Não é possível adicionar elementos a uma track bloqueada' },
        { status: 400 }
      )
    }

    // Definir propriedades padrão
    const defaultProperties = {
      volume: 1.0,
      opacity: 1.0,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      scale: 1.0,
      ...validatedData.properties
    }

    // Verificar sobreposição de elementos (opcional - pode ser configurável)
    const { data: overlappingElements } = await supabase
      .from('timeline_elements')
      .select('id, start_time, duration')
      .eq("trackId", validatedData.trackId)
      .or(`and(start_time.lte.${validatedData.start_time},end_time.gt.${validatedData.start_time}),and(start_time.lt.${validatedData.start_time + validatedData.duration},end_time.gte.${validatedData.start_time + validatedData.duration})`)

    if (overlappingElements && overlappingElements.length > 0) {
      return NextResponse.json(
        { 
          error: 'Elemento sobrepõe com elementos existentes',
          overlapping_elements: overlappingElements
        },
        { status: 409 }
      )
    }

    // Prepare input data by excluding non-column fields and mapping keys
    const { 
      trackId, effects, transitions, projectId, 
      thumbnailUrl, fileSize, mimeType,
      ...insertData 
    } = validatedData;

    // Criar elemento
    const { data: elementData, error } = await supabase
      .from('timeline_elements')
      .insert({
        ...insertData,
        track_id: trackId,
        thumbnail_url: thumbnailUrl,
        file_size: fileSize,
        mime_type: mimeType,
        properties: {
          ...defaultProperties,
          effects: validatedData.effects || [],
          transitions: validatedData.transitions || {}
        } as Record<string, unknown>
      })
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar elemento:', error instanceof Error ? error : new Error(String(error)), { component: 'API: timeline/elements' })
      return NextResponse.json(
        { error: 'Erro ao criar elemento' },
        { status: 500 }
      )
    }

    const element = elementData as unknown as TimelineElement;
    
    // Registrar no histórico
    await supabase
      .from('project_history')
      .insert({
        projectId: validatedData.projectId,
        user_id: user.id,
        action: 'create',
        entity_type: 'timeline_element',
        entity_id: element.id,
        description: `Elemento ${element.type || 'desconhecido'} adicionado à timeline`,
        changes: {
          created_element: element
        } as Record<string, unknown>
      })

    return NextResponse.json(element, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Erro na criação de elemento:', error instanceof Error ? error : new Error(String(error)), { component: 'API: timeline/elements' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Mover elemento para outra track ou posição
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const elementId = searchParams.get('id')

    if (!elementId) {
      return NextResponse.json(
        { error: 'ID do elemento é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = moveElementSchema.parse(body)

    // Verificar se o elemento existe
    const { data: existingElementData } = await supabase
      .from('timeline_elements')
      .select(`
        *,
        track:timeline_tracks(
          *,
          project:projects(owner_id, collaborators)
        )
      `)
      .eq('id', elementId)
      .single()

    if (!existingElementData) {
      return NextResponse.json(
        { error: 'Elemento não encontrado' },
        { status: 404 }
      )
    }

    const existingElement = existingElementData as unknown as TimelineElement;
    
    // Verificar permissões
    const project = existingElement.track!.project
    const hasPermission = project.owner_id === user.id || 
                         (Array.isArray(project.collaborators) && (project.collaborators as string[]).includes(user.id))

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para editar este elemento' },
        { status: 403 }
      )
    }

    // Se mudando de track, verificar se a nova track existe e pertence ao mesmo projeto
    if (validatedData.trackId && validatedData.trackId !== existingElement.trackId) {
      const { data: newTrackData } = await supabase
        .from('timeline_tracks')
        .select('project_id, locked')
        .eq('id', validatedData.trackId)
        .single()

      if (!newTrackData) {
        return NextResponse.json(
          { error: 'Track de destino não encontrada' },
          { status: 404 }
        )
      }

      const newTrack = newTrackData as unknown as { project_id: string; locked?: boolean };
      const currentProjectId = existingElement.track?.project_id;
      
      if (newTrack.project_id !== currentProjectId) {
        return NextResponse.json(
          { error: 'Track de destino deve pertencer ao mesmo projeto' },
          { status: 400 }
        )
      }

      if (newTrack.locked) {
        return NextResponse.json(
          { error: 'Não é possível mover elemento para track bloqueada' },
          { status: 400 }
        )
      }
    }

    // Atualizar elemento
    const updateData: Record<string, unknown> = {}
    if (validatedData.trackId) updateData.trackId = validatedData.trackId
    if (validatedData.start_time !== undefined) updateData.start_time = validatedData.start_time
    if (validatedData.duration !== undefined) updateData.duration = validatedData.duration

    const { data: element, error } = await supabase
      .from('timeline_elements')
      .update(updateData)
      .eq('id', elementId)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao mover elemento:', error instanceof Error ? error : new Error(String(error)), { component: 'API: timeline/elements' })
      return NextResponse.json(
        { error: 'Erro ao mover elemento' },
        { status: 500 }
      )
    }

    const currentProjectId = existingElement.project_id || existingElement.track?.project_id;
    
    if (currentProjectId) {
      // Registrar no histórico
      await supabase
        .from('project_history')
        .insert({
          projectId: currentProjectId,
          user_id: user.id,
          action: 'update',
          entity_type: 'timeline_element',
          entity_id: elementId,
          description: 'Elemento movido na timeline',
          changes: {
            previous_data: {
              trackId: existingElement.trackId,
              start_time: existingElement.start_time,
              duration: existingElement.duration
            },
            new_data: updateData
          } as Record<string, unknown>
        })
    }

    return NextResponse.json(element)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Erro ao mover elemento:', error instanceof Error ? error : new Error(String(error)), { component: 'API: timeline/elements' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
