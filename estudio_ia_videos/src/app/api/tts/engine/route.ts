// TODO: Add tts_jobs table to Supabase types and fix TTSGenerationOptions interface
/**
 * 🎙️ TTS Engine API
 * 
 * API principal para geração de TTS multi-engine
 * com fallback automático e cache inteligente
 */

import { NextRequest, NextResponse } from 'next/server'
import { ttsEngineManager, TTSGenerationOptions } from '@lib/tts/engine-manager'
import { Logger } from '@lib/logger'
import { getSupabaseForRequest } from '@lib/supabase/server'

const logger = new Logger('TTSEngineAPI')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar parâmetros obrigatórios
    const { text, voice_id, project_id } = body
    
    if (!text || !voice_id || !project_id) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          required: ['text', "voiceId", "projectId"]
        },
        { status: 400 }
      )
    }

    // Validar tamanho do texto
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      )
    }

    // Extrair user_id do header de autenticação (se disponível)
    const supabase = getSupabaseForRequest(request)
    let userId: string | undefined

    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    } catch (error) {
      logger.warn('Failed to extract user from token', { error })
    }

    // Preparar opções de geração
    const options: TTSGenerationOptions = {
      text,
      voice_id,
      engine: body.engine,
      settings: body.settings || {},
      project_id,
      user_id: userId,
      priority: body.priority || 'normal'
    }

    logger.info('TTS generation request received', {
      textLength: text.length,
      engine: options.engine,
      voiceId: voice_id,
      projectId: project_id,
      userId: userId
    })

    // Gerar TTS
    const result = await ttsEngineManager.generateSpeech(options)

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      data: {
        audioUrl: result.audio_url,
        duration: result.duration,
        visemes: result.visemes,
        job_id: result.metadata.job_id,
        metadata: {
          engine: result.metadata.engine,
          voiceId: result.metadata.voice_id,
          generation_time: result.metadata.generation_time,
          cache_hit: result.metadata.cache_hit
        }
      }
    })

  } catch (error: unknown) {
    logger.error('TTS generation failed', error instanceof Error ? error : new Error(String(error)))
    
    return NextResponse.json(
      { 
        error: 'TTS generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'voices':
        // Obter todas as vozes disponíveis
        const voices = await ttsEngineManager.getAllVoices()
        return NextResponse.json({
          success: true,
          data: { voices }
        })

      case 'stats':
        // Obter estatísticas dos engines
        const stats = ttsEngineManager.getEngineStats()
        return NextResponse.json({
          success: true,
          data: { stats }
        })

      case 'health':
        // Health check dos engines
        const engines = ttsEngineManager.getEngineStats()
        const healthStatus = {
          overall: engines.every(e => e.status === 'healthy') ? 'healthy' : 'degraded',
          engines: engines.map(e => ({
            id: e.engine_id,
            status: e.status,
            success_rate: e.success_rate,
            avg_responseTime: e.avg_response_time,
            last_check: e.last_health_check
          }))
        }
        
        return NextResponse.json({
          success: true,
          data: healthStatus
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Available: voices, stats, health' },
          { status: 400 }
        )
    }

  } catch (error: unknown) {
    logger.error('TTS Engine API GET failed', error instanceof Error ? error : new Error(String(error)))
    
    return NextResponse.json(
      { 
        error: 'Request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing job_id parameter' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseForRequest(request)

    // Cancelar job (se ainda estiver em processamento)
    // Por enquanto, apenas marcar como cancelado no banco
    const { error } = await (supabase
      .from('tts_jobs' as never) as ReturnType<typeof supabase.from>)
      .update({ 
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })
      .eq('job_id', jobId)

    if (error) {
      throw error
    }

    logger.info('TTS job cancelled', { jobId })

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    })

  } catch (error: unknown) {
    logger.error('TTS job cancellation failed', error instanceof Error ? error : new Error(String(error)))
    
    return NextResponse.json(
      { 
        error: 'Cancellation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
