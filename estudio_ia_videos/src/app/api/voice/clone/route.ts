import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElevenLabsService } from '@/lib/services/voice/elevenlabs-service'
import { logger } from '@/lib/logger'

const service = new ElevenLabsService()

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const name = formData.get('name') as string
    const files = formData.getAll('files') as File[]

    if (!name || files.length === 0) {
        return NextResponse.json({ error: 'Missing name or files' }, { status: 400 })
    }

    // Convert Files to Blobs (ElevenLabs service expects Blobs/Buffers)
    // Actually FormData entry is File which extends Blob, so we can pass it directly 
    // or we might need to cast/manipulate if service expects strictly Blob.
    // The service implementation takes Blob[] so File[] is fine.

    const voiceId = await service.cloneVoice(name, files)

    return NextResponse.json({
        success: true,
        data: {
            voiceId,
            name
        }
    })

  } catch (error) {
    logger.error('Voice Cloning Failed', error as Error)
    return NextResponse.json({ error: 'Failed to clone voice' }, { status: 500 })
  }
}
