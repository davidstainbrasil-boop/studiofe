import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import ElevenLabsService from '@lib/elevenlabs-service'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { logger } from '@lib/logger'

// Schema de validação com Zod
const TTSRequestSchema = z.object({
  text: z.string().min(1, 'Texto é obrigatório').max(5000, 'Texto muito longo. Máximo 5000 caracteres.'),
  voice_id: z.string().min(1, 'voice_id é obrigatório'),
  model_id: z.string().optional().default('eleven_multilingual_v2'),
  voice_settings: z.object({
    stability: z.number().min(0).max(1).optional().default(0.5),
    similarity_boost: z.number().min(0).max(1).optional().default(0.5),
    style: z.number().min(0).max(1).optional().default(0),
    use_speaker_boost: z.boolean().optional().default(true)
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticação obrigatória
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Autenticação necessária', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Validação com Zod
    const body = await request.json()
    const validationResult = TTSRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    const { text, voice_id, model_id, voice_settings } = validationResult.data

    const elevenLabsService = ElevenLabsService.getInstance()
    
    const audioBuffer = await elevenLabsService.generateSpeech({
      text,
      voice_id,
      model_id: model_id,
      voice_settings: voice_settings || {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    })

    // Converter ArrayBuffer para Buffer
    const buffer = Buffer.from(audioBuffer)

    // Log de uso para analytics
    logger.info('Usuário gerou áudio TTS', { 
      component: 'API: tts/elevenlabs', 
      user_id: user.id, 
      textLength: text.length, 
      voiceId: voice_id 
    })

    // Retornar o áudio como resposta
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="tts-${voice_id}-${Date.now()}.mp3"`,
        'X-User-Id': user.id
      }
    })
  } catch (error) {
    logger.error('Erro ao gerar áudio TTS', error instanceof Error ? error : new Error(String(error)), { component: 'API: tts/elevenlabs' })
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar áudio TTS',
        code: 'TTS_GENERATION_ERROR',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
