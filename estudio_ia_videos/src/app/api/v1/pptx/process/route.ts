import { NextRequest, NextResponse } from 'next/server'
import { S3StorageService } from '@lib/s3-storage'
import { prisma } from '@lib/prisma'
import { PPTXProcessor, PPTXProcessResult } from '@lib/pptx/pptx-processor'
import type { Prisma } from '@prisma/client'
import { logger } from '@lib/logger';

interface ProcessingProgress {
  stage: string;
  progress: number;
  message: string;
}

interface PPTXProcessingResult {
  success: boolean
  projectId?: string
  extractedContent?: PPTXProcessResult
  thumbnailUrl?: string
  error?: string
  processingTime?: number
}

export async function POST(request: NextRequest) {
  logger.info('🎯 Iniciando processamento PPTX real - FASE 1...', { component: 'API: v1/pptx/process' })
  const startTime = Date.now()
  let requestBody: { s3Key?: string; projectId?: string } = {}
  
  try {
    requestBody = await request.json()
    const { s3Key, projectId } = requestBody

    if (!s3Key || !projectId) {
      return NextResponse.json({
        success: false,
        error: 'S3 key e Project ID são obrigatórios'
      }, { status: 400 })
    }

    logger.info(`🔄 Processando projeto: ${projectId}, arquivo: ${s3Key}`, { component: 'API: v1/pptx/process' })

    // Atualizar status do projeto para processando
    await prisma.projects.update({
      where: { id: projectId },
      data: {
        status: 'PROCESSING',
        processingLog: {
          processingStarted: new Date().toISOString(),
          s3Key: s3Key,
          status: 'processing',
          phase: 'FASE_1_REAL_PROCESSING'
        }
      }
    })

    // Verificar se o arquivo existe no S3
    const fileExists = await S3StorageService.fileExists(s3Key)
    if (!fileExists) {
      await prisma.projects.update({
        where: { id: projectId },
        data: { 
          status: 'ERROR', 
          processingLog: { error: 'Arquivo não encontrado no S3', failedAt: new Date().toISOString() } as Prisma.InputJsonValue
        }
      })
      
      return NextResponse.json({
        success: false,
        error: 'Arquivo não encontrado no S3'
      }, { status: 404 })
    }

    // Baixar arquivo do S3 para processamento
    logger.info('📥 Baixando arquivo do S3...', { component: 'API: v1/pptx/process' })
    const downloadResult = await S3StorageService.downloadFile(s3Key)
    if (!downloadResult.success || !downloadResult.buffer) {
      const errorMsg = `Erro ao baixar arquivo: ${downloadResult.error}`
      
      await prisma.projects.update({
        where: { id: projectId },
        data: { 
          status: 'ERROR', 
          processingLog: { error: errorMsg, failedAt: new Date().toISOString() } as Prisma.InputJsonValue
        }
      })
      
      return NextResponse.json({
        success: false,
        error: errorMsg
      }, { status: 500 })
    }

    logger.info(`📦 Arquivo baixado: ${downloadResult.buffer.length} bytes`, { component: 'API: v1/pptx/process' })

    // Validar arquivo PPTX
    logger.info('🔍 Validando arquivo PPTX...', { component: 'API: v1/pptx/process' })
    const validation = await PPTXProcessor.validatePPTXFile(downloadResult.buffer)
    if (!validation.isValid) {
      const errorMsg = `Arquivo PPTX inválido: ${validation.error || 'Erro desconhecido'}`
      
      await prisma.projects.update({
        where: { id: projectId },
        data: { 
          status: 'ERROR', 
          processingLog: { error: errorMsg, failedAt: new Date().toISOString() } as Prisma.InputJsonValue
        }
      })
      
      return NextResponse.json({
        success: false,
        error: errorMsg
      }, { status: 400 })
    }

    if (validation.warnings.length > 0) {
      logger.warn('⚠️ Avisos na validação:', { component: 'API: v1/pptx/process', warnings: validation.warnings })
    }

    // Processar arquivo PPTX com o novo processador real
    logger.info('🎯 Iniciando processamento real com PPTXProcessor...', { component: 'API: v1/pptx/process' })
    
    const progressCallback = (progress: ProcessingProgress) => {
      logger.info(`📊 ${progress.stage}: ${Math.round(progress.progress)}% - ${progress.message}`, { component: 'API: v1/pptx/process' })
    }

    const extractionResult = await PPTXProcessor.processFile(
      downloadResult.buffer,
      projectId,
      {
        extractImages: true,
        detectLayouts: true,
        estimateDurations: true,
        uploadToS3: true,
        generateThumbnails: true,
        maxImageSize: 1920,
        imageQuality: 85,
        extractHyperlinks: true
      },
      progressCallback
    )
    
    if (!extractionResult.success) {
      const errorMsg = `Erro ao processar PPTX: ${extractionResult.error}`
      
      await prisma.projects.update({
        where: { id: projectId },
        data: {
          status: 'ERROR',
          processingLog: { error: errorMsg, failedAt: new Date().toISOString() } as Prisma.InputJsonValue,
        },
      })
      
      return NextResponse.json({
        success: false,
        error: errorMsg,
      }, { status: 500 })
    }

    logger.info(`✅ Processamento concluído: ${extractionResult.slides.length} slides extraídos`, { component: 'API: v1/pptx/process' })
    
    // Gerar thumbnail do primeiro slide se houver imagens
    let thumbnailUrl: string | null = null
    if (extractionResult.assets.images.length > 0) {
      const firstImage = extractionResult.assets.images[0]
      if (firstImage.s3Url) {
        thumbnailUrl = firstImage.s3Url as string
      }
    }

    // Salvar dados processados no banco
    logger.info('💾 Salvando dados processados no banco...', { component: 'API: v1/pptx/process' })
    
    const processingTime = Date.now() - startTime
    
    // Ensure data is JSON compatible (remove undefined)
    const safeSlidesData = JSON.parse(JSON.stringify(extractionResult));
    const safeProcessingLog = JSON.parse(JSON.stringify({
      processingCompleted: new Date().toISOString(),
      s3Key: s3Key,
      status: 'completed',
      phase: 'FASE_1_REAL_PROCESSING',
      slidesExtracted: extractionResult.slides.length,
      imagesExtracted: extractionResult.assets.images.length,
      totalDuration: extractionResult.timeline?.totalDuration || 0,
      processingTime: processingTime,
      extractionStats: extractionResult.extractionStats
    }));

    const updatedProject = await prisma.projects.update({
      where: { id: projectId },
      data: {
        status: 'COMPLETED',
        slidesData: safeSlidesData as Prisma.InputJsonValue,
        totalSlides: extractionResult.slides.length,
        duration: extractionResult.timeline ? Math.round(extractionResult.timeline.totalDuration / 1000) : 0, // Converter para segundos
        thumbnailUrl: thumbnailUrl,
        processingLog: safeProcessingLog as Prisma.InputJsonValue
      }
    })

    // Criar slides individuais no banco de dados
    logger.info('📄 Criando slides individuais no banco...', { component: 'API: v1/pptx/process' })
    
    for (let i = 0; i < extractionResult.slides.length; i++) {
      const slide = extractionResult.slides[i];
      
      const safeAvatarConfig = JSON.parse(JSON.stringify({
        layout: slide.layout,
        textElements: slide.textBoxes,
        animations: slide.animations,
        backgroundType: slide.backgroundType,
        images: slide.images,
        shapes: slide.shapes,
        audioText: slide.content + (slide.notes ? '\n\n' + slide.notes : '')
      }));

      await prisma.slide.create({
        data: {
          project_id: projectId,
          title: slide.title || '',
          content: slide.content || '',
          orderIndex: i, // Usar orderIndex em vez de slideNumber
          duration: Math.round((slide.duration || 5000) / 1000), // Converter para segundos, default 5s
          backgroundColor: slide.backgroundColor || '#FFFFFF',
          // Armazenar dados extras em avatarConfig (JSON disponível no modelo)
          avatarConfig: safeAvatarConfig as Prisma.InputJsonValue
        }
      })
    }

    logger.info(`✅ Processamento PPTX concluído em ${processingTime}ms e salvo no banco`, { component: 'API: v1/pptx/process' })

    const result: PPTXProcessingResult = {
      success: true,
      project_id: projectId,
      extractedContent: extractionResult,
      thumbnailUrl: thumbnailUrl || undefined,
      processingTime
    }

    return NextResponse.json(result)

  } catch (error: unknown) {
    logger.error('❌ Erro no processamento PPTX:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/pptx/process' })
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    const processingTime = Date.now() - startTime
    
    // Atualizar projeto com status de erro se projectId estiver disponível
    if (requestBody.project_id) {
      await prisma.projects.update({
        where: { id: requestBody.project_id },
        data: {
          status: 'ERROR',
          processingLog: {
            error: errorMessage,
            timestamp: new Date().toISOString(),
            phase: 'FASE_1_REAL_PROCESSING',
            processingTime: processingTime,
            failedAt: new Date().toISOString()
          } as Prisma.InputJsonValue
        }
      }).catch((e) => logger.error('Erro ao atualizar status de erro do projeto', e instanceof Error ? e : new Error(String(e)), { component: 'API: v1/pptx/process' }))
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      processingTime
    }, { status: 500 })
  }
}

