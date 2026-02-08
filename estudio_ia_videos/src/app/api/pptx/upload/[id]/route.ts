import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { withRateLimit, RATE_LIMITS } from '@lib/rate-limiter-real'
import { S3StorageService } from '@lib/s3-storage'
import { videoCache } from '@lib/video/video-cache'
import { notificationManager } from '@lib/notifications/notification-manager'
import { unlink } from 'fs/promises'
import { logger } from '@lib/logger'

/** Shape of pptx_uploads rows accessed in this route */
interface PptxUpload {
  id: string
  project_id: string
  original_filename?: string
  preview_url?: string
  file_path?: string
  status?: string
  [key: string]: unknown
}

/** Shape of project row for permission check */
interface ProjectPermission {
  user_id: string
  is_public: boolean
}

// GET /api/pptx/upload/[id] - Buscar status e metadados de um upload específico
export const GET = withRateLimit(RATE_LIMITS.AUTH_API, 'user')(async function GET(request: NextRequest, context?: { params: Record<string, string> }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const uploadId = context?.params?.id
    if (!uploadId) {
      return NextResponse.json({ error: 'ID do upload é obrigatório' }, { status: 400 })
    }

    // Buscar upload
    const { data: uploadRaw, error } = await supabase
      .from('pptx_uploads')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (error) {
      logger.error('Erro ao buscar upload', error instanceof Error ? error : new Error(String(error)), { component: 'API: pptx/upload/[id]' })
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    if (!uploadRaw) {
      return NextResponse.json({ error: 'Upload não encontrado' }, { status: 404 })
    }

    const upload = uploadRaw as unknown as PptxUpload

    // Verificar permissões no projeto
    const { data: project } = await supabase
      .from('projects')
      .select('user_id, is_public')
      .eq('id', upload.project_id)
      .single()

    const proj = project as unknown as ProjectPermission | null
    let hasPermission = proj && (proj.user_id === user.id || proj.is_public)

    if (!hasPermission && proj) {
      const { data: collaborator } = await supabase
        .from('project_collaborators')
        .select("userId")
        .eq("projectId", upload.project_id)
        .eq("userId", user.id)
        .single()
      
      if (collaborator) hasPermission = true
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão para acessar este upload' }, { status: 403 })
    }

    // Buscar slides relacionados
    const { data: slides } = await supabase
      .from('pptx_slides')
      .select('*')
      .eq('upload_id', uploadId)
      .order('slide_number', { ascending: true })

    return NextResponse.json({ upload, slides: slides || [] })
  } catch (error) {
    logger.error('Erro na API de upload by id', error instanceof Error ? error : new Error(String(error)), { component: 'API: pptx/upload/[id]' })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})

// DELETE /api/pptx/upload/[id] - Remover upload, slides e limpar assets de preview
export const DELETE = withRateLimit(RATE_LIMITS.AUTH_STRICT, 'user')(async function DELETE(request: NextRequest, context?: { params: Record<string, string> }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const uploadId = context?.params?.id
    if (!uploadId) {
      return NextResponse.json({ error: 'ID do upload é obrigatório' }, { status: 400 })
    }

    // Buscar upload para validar e obter dados
    const { data: uploadRaw } = await supabase
      .from('pptx_uploads')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (!uploadRaw) {
      return NextResponse.json({ error: 'Upload não encontrado' }, { status: 404 })
    }

    const upload = uploadRaw as unknown as PptxUpload

    // Verificar permissões no projeto
    const { data: project } = await supabase
      .from('projects')
      .select('user_id, is_public')
      .eq('id', upload.project_id)
      .single()

    const proj = project as unknown as ProjectPermission | null
    let hasPermission = proj && (proj.user_id === user.id || proj.is_public)

    if (!hasPermission && proj) {
      const { data: collaboratorData } = await supabase
        .from('project_collaborators')
        .select('role')
        .eq("projectId", upload.project_id)
        .eq("userId", user.id)
        .single()
      
      const collaborator = collaboratorData as unknown as { role: string } | null;
      if (collaborator?.role && ['editor', 'owner'].includes(collaborator.role)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão para excluir este upload' }, { status: 403 })
    }

    // Remover slides
    await supabase
      .from('pptx_slides')
      .delete()
      .eq('upload_id', uploadId)

    // Limpar preview assets (S3 ou cache local)
    if (upload.preview_url && typeof upload.preview_url === 'string') {
      try {
        if (upload.preview_url.startsWith('/api/s3/serve/')) {
          const key = decodeURIComponent(upload.preview_url.replace('/api/s3/serve/', ''))
          await S3StorageService.deleteFile(key)
        } else if (upload.preview_url.startsWith('/api/videos/cache/')) {
          const filename = decodeURIComponent(upload.preview_url.replace('/api/videos/cache/', ''))
          videoCache.delete(filename)
        }
      } catch (err) {
        logger.warn('Falha ao limpar preview asset', { component: 'API: pptx/upload/[id]' })
      }
    }

    // Remover arquivo original do disco, se existir
    if (upload.file_path && typeof upload.file_path === 'string') {
      try {
        await unlink(upload.file_path)
      } catch (err) {
        logger.warn('Failed to remove temp upload file', err instanceof Error ? err : new Error(String(err)));
      }
    }

    // Remover registro de upload
    await supabase
      .from('pptx_uploads')
      .delete()
      .eq('id', uploadId)

    // Notificar sala do projeto (opcional)
    const roomId = `project:${upload.project_id}:uploads`
    notificationManager.sendNotification({
      id: `upload_${uploadId}_deleted_${Date.now()}`,
      type: 'system_alert',
      title: 'Upload removido',
      message: `O upload ${upload.original_filename || 'unknown'} foi removido do projeto`,
      priority: 'low',
      timestamp: Date.now(),
      roomId,
      data: { uploadId, projectId: upload.project_id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erro ao excluir upload', error instanceof Error ? error : new Error(String(error)), { component: 'API: pptx/upload/[id]' })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})