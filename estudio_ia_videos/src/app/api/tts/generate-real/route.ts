/**
 * API TTS Generate REAL
 * POST /api/tts/generate-real
 * 
 * Gera áudio TTS real usando ElevenLabs ou Edge TTS
 * e faz upload para Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTTSService } from '@/lib/tts/tts-service-real'
import { getSupabaseForRequest } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema de validação
const TTSRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().optional(),
  voiceId: z.string().optional(),
  provider: z.enum(['elevenlabs', 'azure', 'edge', 'auto']).optional(),
  language: z.string().optional(),
  speed: z.number().min(0.5).max(2).optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  slideId: z.string().optional(),
  projectId: z.string().optional(),
})

const BatchTTSRequestSchema = z.object({
  slides: z.array(z.object({
    id: z.string(),
    text: z.string().min(1).max(5000),
    voice: z.string().optional(),
  })),
  projectId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Autenticação
    const supabase = getSupabaseForRequest(req)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Verificar se é requisição batch
    if (body.slides && Array.isArray(body.slides)) {
      return handleBatchRequest(body, user.id)
    }

    // Validar request único
    const parsed = TTSRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { text, voice, voiceId, provider, language, speed, stability, similarityBoost, slideId, projectId } = parsed.data

    // Gerar TTS
    const ttsService = getTTSService()
    const result = await ttsService.generate({
      text,
      voice: voice || voiceId,
      provider: provider || 'auto',
      language: language || 'pt-BR',
      speed,
      stability,
      similarityBoost,
      cacheEnabled: true,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'TTS generation failed' },
        { status: 500 }
      )
    }

    // Se tiver slideId, atualizar o slide no banco
    if (slideId && projectId) {
      try {
        await supabase
          .from('slides')
          .update({
            audio_url: result.audioUrl,
            audio_duration: result.duration,
            updated_at: new Date().toISOString(),
          })
          .eq('id', slideId)
          .eq('project_id', projectId)
      } catch (dbError) {
        logger.warn('Failed to update slide with audio URL', { 
          slideId, 
          projectId,
          component: 'API: tts/generate-real'
        })
      }
    }

    const totalTime = Date.now() - startTime

    logger.info(`TTS generated successfully`, {
      characters: result.characters,
      provider: result.provider,
      cached: result.cached,
      timeMs: totalTime,
      component: 'API: tts/generate-real'
    })

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      characters: result.characters,
      provider: result.provider,
      cached: result.cached,
      cost: result.cost,
      processingTime: totalTime,
    })

  } catch (error) {
    logger.error('TTS API error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: tts/generate-real'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleBatchRequest(body: unknown, userId: string) {
  const parsed = BatchTTSRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid batch request', details: parsed.error.errors },
      { status: 400 }
    )
  }

  const { slides, projectId } = parsed.data

  const ttsService = getTTSService()
  
  const results = await ttsService.generateBatch(slides)

  const successCount = results.filter(r => r.result.success).length
  const totalCost = results.reduce((sum, r) => sum + (r.result.cost || 0), 0)

  logger.info(`Batch TTS completed`, {
    total: slides.length,
    success: successCount,
    failed: slides.length - successCount,
    projectId,
    component: 'API: tts/generate-real'
  })

  return NextResponse.json({
    success: true,
    total: slides.length,
    completed: successCount,
    failed: slides.length - successCount,
    totalCost,
    results: results.map(r => ({
      slideId: r.slideId,
      success: r.result.success,
      audioUrl: r.result.audioUrl,
      duration: r.result.duration,
      error: r.result.error,
    })),
  })
}

/**
 * GET /api/tts/generate-real
 * Lista vozes disponíveis e verifica quota
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    const ttsService = getTTSService()

    if (action === 'voices') {
      const voices = await ttsService.listVoices()
      return NextResponse.json({
        success: true,
        voices,
        count: voices.length,
      })
    }

    if (action === 'quota') {
      const quota = await ttsService.checkQuota()
      return NextResponse.json({
        success: true,
        quota,
      })
    }

    // Default: retornar info do serviço
    return NextResponse.json({
      success: true,
      service: 'TTS Service Real',
      version: '2.0',
      endpoints: {
        generate: 'POST /api/tts/generate-real',
        voices: 'GET /api/tts/generate-real?action=voices',
        quota: 'GET /api/tts/generate-real?action=quota',
      },
      providers: ['elevenlabs', 'azure', 'edge'],
      defaultProvider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'edge',
    })

  } catch (error) {
    logger.error('TTS GET error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: tts/generate-real'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
