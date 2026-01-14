/**
 * Production PPTX Processing API
 * Real processing pipeline with S3 integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { logger } from '@lib/logger'
import { prisma } from '@lib/prisma'
import { PPTXProcessor } from '@lib/pptx/pptx-processor'
import { S3StorageService } from '@lib/s3-storage'
import { getSupabaseForRequest } from '@lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    // Verify authentication
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const { s3Key, jobId } = await request.json()
    
    if (!s3Key || !jobId) {
      return NextResponse.json(
        { error: 'S3 key e job ID são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Verify or create job record
    let jobRecord = await prisma.processing_queue.findFirst({
        where: { jobData: { path: ['jobId'], equals: jobId } }
    });

    if (!jobRecord) {
        // Create initial record
        jobRecord = await prisma.processing_queue.create({
            data: {
                id: randomUUID(),
                jobType: 'pptx_process',
                status: 'processing',
                priority: 5,
                progress: 0,
                jobData: { jobId, s3Key, startedAt: new Date().toISOString() },
                scheduledFor: new Date()
            }
        });
    } else {
        // Update existing
        await prisma.processing_queue.update({
             where: { id: jobRecord.id },
             data: { status: 'processing', progress: 10, updatedAt: new Date() }
        });
    }
    
    logger.info('🔄 Starting PPTX processing:', { component: 'API: v1/pptx/process-production', s3Key, jobId })
    
    // Download file from S3
    logger.info('📥 Downloading file from S3...', { component: 'API: v1/pptx/process-production' })
    const downloadResult = await S3StorageService.downloadFile(s3Key)
    
    if (!downloadResult.success || !downloadResult.buffer) {
      throw new Error(`Failed to download file: ${downloadResult.error}`)
    }
    
    // Update progress
    await prisma.processing_queue.update({
        where: { id: jobRecord.id },
        data: { progress: 30, currentStep: 'downloaded' }
    });
    
    logger.info(`📦 File downloaded: ${downloadResult.buffer.length} bytes`, { component: 'API: v1/pptx/process-production' })
    
    // Process PPTX content
    logger.info('🔍 Processing PPTX content...', { component: 'API: v1/pptx/process-production' })
    const { pptxProcessor } = await import('@/lib/pptx/pptx-real-processor');
    const processingResult = await pptxProcessor.processBuffer(downloadResult.buffer, {
      extractImages: true,
      extractNotes: true
    })
    
    if (!processingResult.slides) {
      throw new Error(`Processing failed: No slides found`)
    }
    
    logger.info(`✅ Processing successful: ${processingResult.slides.length} slides`, { component: 'API: v1/pptx/process-production' })
    
    // Calculate metrics
    interface ProcessedSlide { duration?: number; images: unknown[]; animations?: unknown[]; id: string; title: string; textContent?: string; content?: string }
    const slides = processingResult.slides as ProcessedSlide[]
    const totalDuration = slides.reduce((acc, slide) => acc + (slide.duration || 5), 0)
    const totalImages = slides.reduce((acc, slide) => acc + slide.images.length, 0)
    const hasAnimations = slides.some((slide) => slide.animations && slide.animations.length > 0)
    
    // Format response
    const processedData = {
      slides: slides.map((slide) => ({
        id: slide.id,
        title: slide.title,
        content: slide.textContent || slide.content,
        images: slide.images.length,
        duration: slide.duration || 5,
        animations: slide.animations || []
      })),
      totalDuration,
      slideCount: processingResult.slides.length,
      imageCount: totalImages,
      hasAnimations,
      metadata: {
        title: processingResult.metadata?.title || 'Untitled',
        author: processingResult.metadata?.author || 'Unknown',
        subject: processingResult.metadata?.subject || '',
        createdAt: processingResult.metadata?.createdAt || new Date().toISOString(),
        modifiedAt: processingResult.metadata?.modifiedAt || new Date().toISOString()
      }
    }
    
    // Update DB with success
    await prisma.processing_queue.update({
        where: { id: jobRecord.id },
        data: { 
            status: 'completed', 
            progress: 100, 
            currentStep: 'finished',
            jobData: { ...(jobRecord.jobData as object), result: processedData as any }
        }
    });
    
    // Return processed data
    return NextResponse.json({
      success: true,
      data: processedData,
      message: 'Processamento concluído com sucesso',
      processingTime: Date.now() - startTime
    })
    
  } catch (error) {
    logger.error('Processing API Error:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/pptx/process-production' })
    
    // Try to update error status if jobId is available
    try {
        const { jobId } = await request.clone().json().catch(() => ({ jobId: null }));
        if (jobId) {
             const job = await prisma.processing_queue.findFirst({ where: { jobData: { path: ['jobId'], equals: jobId } } });
             if (job) {
                 await prisma.processing_queue.update({
                     where: { id: job.id },
                     data: { status: 'failed', errorMessage: error instanceof Error ? error.message : 'Unknown error' }
                 });
             }
        }
    } catch (e) { /* ignore */ }
    
    return NextResponse.json(
      { 
        error: 'Erro durante o processamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Get processing status endpoint
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID é obrigatório' },
      { status: 400 }
    )
  }
  
  try {
    const jobRecord = await prisma.processing_queue.findFirst({
        where: { jobData: { path: ['jobId'], equals: jobId } }
    });

    if (!jobRecord) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: jobRecord.status === 'failed' ? 'error' : jobRecord.status,
      progress: jobRecord.progress,
      message: jobRecord.status === 'completed' ? 'Processamento concluído' : 'Em andamento',
      data: jobRecord.status === 'completed' ? (jobRecord.jobData as any).result : null
    })
    
  } catch (error) {
    logger.error('Status check error:', error instanceof Error ? error : new Error(String(error)), { component: 'API: v1/pptx/process-production' })
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
