import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElevenLabsService } from '@/lib/services/voice/elevenlabs-service'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { createValidationError } from '@/lib/validation/api-validator'

const service = new ElevenLabsService()

// Schema para validação manual dos dados extraídos do FormData
const CloneVoiceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  files: z.array(z.any()) // Validaremos se são Blobs/Files manualmente ou via custom refine
    .min(1, 'Pelo menos um arquivo de áudio é necessário')
    .refine((files) => files.every(f => f && typeof f.arrayBuffer === 'function'), {
      message: 'Arquivos de áudio inválidos'
    })
})

export async function POST(req: NextRequest) {
  logger.info('Iniciando processo de clonagem de voz')

  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Tentativa de clonagem de voz não autorizada')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const rawData = {
      name: formData.get('name'),
      files: formData.getAll('files')
    }

    const validation = CloneVoiceSchema.safeParse(rawData)

    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || 'Dados inválidos'
      logger.warn('Validação de clonagem de voz falhou', { error: errorMsg })
      return createValidationError(errorMsg)
    }

    const { name, files } = validation.data
    
    // Cast seguro para o tipo esperado pelo serviço
    const audioFiles = files as File[]

    logger.info(`Clonando voz: ${name} com ${audioFiles.length} arquivos`)

    const voiceId = await service.cloneVoice(name, audioFiles)

    logger.info(`Voz clonada com sucesso: ${voiceId}`)

    return NextResponse.json({
        success: true,
        data: {
            voiceId,
            name
        }
    })

  } catch (error) {
    logger.error('Falha ao clonar voz', error as Error)
    return NextResponse.json({ error: 'Falha ao processar clonagem de voz' }, { status: 500 })
  }
}
