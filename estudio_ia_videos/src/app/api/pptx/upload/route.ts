import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@lib/prisma'
import { z } from 'zod'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { withRateLimit, RATE_LIMITS } from '@lib/rate-limiter-real'
import PPTXProcessorReal from '@lib/pptx/pptx-processor-real'
import { notificationManager } from '@lib/notifications/notification-manager'
import { logger } from '@lib/logger'
import { randomUUID } from 'crypto'
import {
  createErrorResponse,
  createQuotaError,
  createValidationError,
  wrapError
} from '@lib/errors/error-responses'

// Schema de validação para upload
const uploadSchema = z.object({
  projectId: z.string().uuid('ID do projeto inválido')
})

// Configurações de upload
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint'
]

// POST - Upload de arquivo PPTX (usando Prisma)
export const POST = withRateLimit(RATE_LIMITS.UPLOAD, 'user')(async function POST(request: NextRequest) {
  try {
    // Get user_id from header or use demo user for local dev
    const userId = request.headers.get('x-user-id') || '0cd20276-6657-43f2-b89d-21fcb5b4e08d'

    // Verificar se é multipart/form-data
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type deve ser multipart/form-data' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    // Validar dados
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    // Se não tiver project_id, criar um projeto automaticamente
    let projectId = formData.get("projectId") as string | null
    let autoCreatedProject = false

    if (!projectId) {
      // Criar projeto automaticamente com base no nome do arquivo
      const projectName = file.name.replace('.pptx', '').replace('.ppt', '')
      
      const newProject = await prisma.projects.create({
        data: {
          id: randomUUID(),
          userId: userId,
          name: projectName,
          description: `Projeto criado a partir do arquivo ${file.name}`,
          status: 'draft',
          type: 'pptx'
        }
      })
      
      projectId = newProject.id
      autoCreatedProject = true
    }

    // Validar projeto
    uploadSchema.parse({ projectId: projectId })

    // Verificar permissões no projeto (pular se foi auto-criado)
    if (!autoCreatedProject) {
      const project = await prisma.projects.findUnique({
        where: { id: projectId },
        select: { userId: true }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Projeto não encontrado' },
          { status: 404 }
        )
      }

      // Check ownership or collaborator status
      let hasPermission = project.userId === userId;

      // If not owner, check collaborators table
      if (!hasPermission) {
        const collaborator = await prisma.project_collaborators.findFirst({
          where: {
            projectId: projectId,
            userId: userId
          }
        });

        if (collaborator) hasPermission = true;
      }

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Sem permissão para fazer upload neste projeto' },
          { status: 403 }
        )
      }
    }

    // QUOTA PRE-CHECK: Verificar se usuário tem espaço disponível
    const { checkQuota } = await import('@lib/storage/quota-manager');
    const quotaCheck = await checkQuota(userId, file.size);

    if (!quotaCheck.allowed) {
      logger.warn('Upload blocked by quota', {
        userId,
        fileSize: file.size,
        currentUsage: quotaCheck.currentUsage,
        limit: quotaCheck.limit
      });

      return NextResponse.json({
        error: quotaCheck.reason || 'Storage quota exceeded',
        quota: {
          current: quotaCheck.currentUsage,
          limit: quotaCheck.limit,
          required: quotaCheck.requiredSpace
        }
      }, { status: 413 }); // 413 Payload Too Large
    }

    // Validar arquivo
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Apenas arquivos PPTX são aceitos.' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const filename = `${timestamp}_${randomString}.${fileExtension}`

    // Criar diretório de uploads se não existir
    const uploadsDir = join(process.cwd(), 'uploads', 'pptx')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Ler arquivo para validação
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // VALIDAÇÃO DE SEGURANÇA: Magic bytes, ZIP bomb, path traversal
    const { validatePPTXFile } = await import('@lib/security/file-validator');
    const validation = await validatePPTXFile(buffer);

    if (!validation.valid) {
      logger.warn('File validation failed', {
        error: validation.error,
        details: validation.details,
        filename: file.name
      });

      return NextResponse.json({
        error: validation.error || 'Arquivo inválido',
        details: validation.details
      }, { status: 400 });
    }

    // Salvar arquivo (validação passou)
    const filePath = join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    // Generate upload ID for local storage (no pptx_uploads table needed)
    const uploadId = randomUUID()

    // Update project with pptx info using Prisma
    await prisma.projects.update({
      where: { id: projectId },
      data: {
        pptxUrl: filePath,
        originalFileName: file.name,
        status: 'in_progress'
      }
    })

    // Notificação: upload iniciado
    const roomId = `project:${projectId}:uploads`
    notificationManager.sendNotification({
      id: `upload_${uploadId}_started_${Date.now()}`,
      type: 'upload_started',
      title: 'Upload iniciado',
      message: `Arquivo ${file.name} enviado, iniciando processamento`,
      priority: 'low',
      timestamp: Date.now(),
      userId: userId,
      roomId,
      data: {
        uploadId: uploadId,
        filename: file.name,
        projectId
      }
    })

    // Iniciar processamento assíncrono
    processPPTXAsync(uploadId, filePath, projectId)

    return NextResponse.json({
      upload_id: uploadId,
      projectId: projectId,
      autoCreatedProject: autoCreatedProject,
      filename: filename,
      original_filename: file.name,
      fileSize: file.size,
      status: 'processing',
      message: autoCreatedProject 
        ? 'Upload realizado com sucesso. Projeto criado automaticamente. Processamento iniciado.'
        : 'Upload realizado com sucesso. Processamento iniciado.'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Erro no upload de PPTX:', error instanceof Error ? error : new Error(String(error)), { component: 'API: pptx/upload' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// GET - Listar projetos com PPTX
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const status = searchParams.get('status')

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID do projeto é obrigatório' },
        { status: 400 }
      )
    }

    // Get project using Prisma
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { 
        id: true,
        userId: true, 
        isPublic: true,
        pptxUrl: true,
        originalFileName: true,
        status: true,
        totalSlides: true,
        slidesData: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      )
    }

    // Return project PPTX info
    return NextResponse.json({ 
      projectId: project.id,
      pptxUrl: project.pptxUrl,
      original_filename: project.originalFileName,
      status: project.status,
      totalSlides: project.totalSlides,
      slidesData: project.slidesData
    })

  } catch (error) {
    logger.error('Erro na API de uploads PPTX:', error instanceof Error ? error : new Error(String(error)), { component: 'API: pptx/upload' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função para processar PPTX assincronamente (usando Prisma)
async function processPPTXAsync(uploadId: string, filePath: string, projectId: string) {
  try {
    // Definir sala do projeto para notificações
    const roomId = `project:${projectId}:uploads`

    // Notificação: preparando/processing inicial
    notificationManager.sendNotification({
      id: `upload_${uploadId}_processing_start_${Date.now()}`,
      type: 'video_processing',
      title: 'Processando arquivo',
      message: 'Analisando e extraindo slides do PPTX...',
      priority: 'medium',
      timestamp: Date.now(),
      roomId,
      data: {
        uploadId,
        phase: 'processing',
        progress: 10,
        total: 100,
        percentage: 10
      }
    })

    // Ler arquivo para buffer
    const buffer = await readFile(filePath)

    // Extrair dados reais do PPTX
    const extraction = await PPTXProcessorReal.extract(buffer)
    if (!extraction.success) {
      const errorMessage = typeof extraction.error === 'string' ? extraction.error : 'Falha ao extrair dados do PPTX'
      throw new Error(errorMessage)
    }

    // Notificação: extração concluída
    notificationManager.sendNotification({
      id: `upload_${uploadId}_processing_mid_${Date.now()}`,
      type: 'upload_progress',
      title: 'Extração de slides concluída',
      message: 'Gerando thumbnails e salvando slides...',
      priority: 'medium',
      timestamp: Date.now(),
      roomId: roomId || '',
      data: {
        uploadId,
        phase: 'processing',
        progress: 50,
        total: 100,
        percentage: 50,
        slideCount: extraction.slides.length
      }
    })

    // Gerar thumbnail do primeiro slide (FORA da transação - operação de I/O)
    const previewUrl = await PPTXProcessorReal.generateThumbnail(buffer, projectId)

    // TRANSAÇÃO ATÔMICA: Inserir slides + atualizar projeto
    // Se qualquer operação falhar, todas são revertidas (rollback automático)
    await prisma.$transaction(async (tx) => {
      // 1. Inserir todos os slides atomicamente
      for (let idx = 0; idx < extraction.slides.length; idx++) {
        const slide = extraction.slides[idx]
        await tx.slides.create({
          data: {
            id: randomUUID(),
            projectId: projectId,
            slideOrder: slide.slideNumber,
            orderIndex: idx,
            title: slide.title || `Slide ${slide.slideNumber}`,
            content: {
              text: slide.content,
              shapes: slide.shapes,
              textBlocks: slide.textBlocks,
              images: slide.images,
            },
            notes: slide.notes || '',
            durationSeconds: slide.duration || 5,
          }
        })
      }

      // 2. Atualizar projeto com informações do processamento
      await tx.projects.update({
        where: { id: projectId },
        data: {
          status: 'completed',
          totalSlides: extraction.slides.length,
          slidesData: extraction.slides as object,
          thumbnailUrl: previewUrl,
          pptxFileSize: file.size, // 📊 Track file size for quota
          processingLog: {
            completedAt: new Date().toISOString(),
            slideCount: extraction.slides.length
          }
        }
      })
    })

    // Notificação: upload completo
    notificationManager.sendNotification({
      id: `upload_${uploadId}_complete_${Date.now()}`,
      type: 'upload_complete',
      title: 'Processamento concluído',
      message: 'Seu PPTX foi processado com sucesso!',
      priority: 'low',
      timestamp: Date.now(),
      roomId,
      persistent: true,
      data: {
        uploadId,
        phase: 'complete',
        progress: 100,
        total: 100,
        percentage: 100,
        slideCount: extraction.slides.length,
        previewUrl
      }
    })

  } catch (error) {
    logger.error('Erro no processamento de PPTX:', error instanceof Error ? error : new Error(String(error)), { component: 'API: pptx/upload' })

    // Marcar projeto como falha
    try {
      await prisma.projects.update({
        where: { id: projectId },
        data: {
          status: 'error',
          processingLog: {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            failed_at: new Date().toISOString()
          }
        }
      })
    } catch (updateError) {
      // Log but don't throw - this is cleanup after main error
      logger.error('Failed to mark project as error', updateError instanceof Error ? updateError : new Error(String(updateError)), {
        component: 'API: pptx/upload',
        projectId,
        originalError: error instanceof Error ? error.message : String(error)
      })
    }

    // Notificação: erro
    notificationManager.sendNotification({
      id: `upload_${uploadId}_error_${Date.now()}`,
      type: 'upload_error',
      title: 'Erro no processamento',
      message: 'Ocorreu um erro durante o processamento do PPTX.',
      priority: 'high',
      timestamp: Date.now(),
      roomId: `project:${projectId}:uploads`,
      persistent: true,
      data: {
        uploadId,
        phase: 'error'
      }
    })
  }
}
