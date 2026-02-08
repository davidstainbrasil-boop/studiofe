import { NextRequest, NextResponse } from 'next/server'
import { LipSyncOrchestrator, LipSyncProvider } from '@/lib/sync/lip-sync-orchestrator'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { withPlanGuard } from '@/middleware/with-plan-guard'

const requestSchema = z.object({
  text: z.string().optional(),
  audioUrl: z.string().url().optional(),
  voice: z.string().optional(),
  provider: z.enum(['azure', 'rhubarb', 'auto']).default('auto')
}).refine(
  data => data.text || data.audioUrl,
  { message: 'Either text or audioUrl must be provided' }
)

const handlePost = async (request: NextRequest) => {
  try {
    // 1. Autenticar usuário
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Validar input
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { text, audioUrl, voice, provider } = validation.data

    // 3. Baixar áudio se URL fornecida
    let audioPath: string | undefined
    if (audioUrl) {
      audioPath = await downloadAudio(audioUrl)
    }

    // 4. Gerar lip-sync
    const orchestrator = new LipSyncOrchestrator()
    const result = await orchestrator.generateLipSync({
      text,
      audioPath,
      voice,
      forceProvider: provider === 'auto' ? undefined : (provider as LipSyncProvider)
    })

    const phonemes = result.result.phonemes || []
    
    logger.info('Lip-sync generated successfully', {
      userId: user.id,
      provider: result.provider,
      cached: result.cached,
      phonemeCount: phonemes.length
    })

    // 5. Retornar resultado
    return NextResponse.json({
      success: true,
      data: {
        phonemes: phonemes,
        duration: result.result.duration,
        metadata: {
          ...result.result.metadata,
          provider: result.provider,
          cached: result.cached
        }
      }
    })

  } catch (error) {
    logger.error('Lip-sync generation failed', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to generate lip-sync',
        message: (error as Error).message
      },
      { status: 500 }
    )
  }
}

export const POST = withPlanGuard(handlePost, {
  requiredPlan: 'pro',
  feature: 'lip_sync',
})

async function downloadAudio(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  const tempPath = `/tmp/audio-${Date.now()}.mp3`

  await require('fs/promises').writeFile(tempPath, Buffer.from(buffer))

  return tempPath
}
