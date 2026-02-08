import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AudioGeneratorFactory, AudioProvider } from '@/lib/services/voice/audio-generator-factory'
import { CreditManager } from '@/lib/billing/credit-manager'
import { logger } from '@/lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

const factory = new AudioGeneratorFactory()

export async function POST(req: NextRequest) {
  try {
    const blocked = await applyRateLimit(req, 'voice-gen', 10);
    if (blocked) return blocked;

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, voiceId, provider = AudioProvider.AZURE } = await req.json()

    if (!text || !voiceId) {
        return NextResponse.json({ error: 'Missing text or voiceId' }, { status: 400 })
    }

    // Generate Audio
    const audioBuffer = await factory.generateAudio({
        text,
        voiceId,
        provider
    })

    // Calculate cost (e.g. 1 credit per 1000 chars, min 1)
    const cost = Math.max(1, Math.ceil(text.length / 1000))
    const creditManager = new CreditManager()
    await creditManager.deductCredits(user.id, cost, `Voice Generation (${provider}, ${text.length} chars)`)

    // Return as Audio Stream or Base64?
    // Returning Base64 JSON for simplicity in client-side preview
    const base64Audio = audioBuffer.toString('base64')

    return NextResponse.json({
        success: true,
        data: {
            audioBase64: base64Audio,
            contentType: 'audio/mpeg',
            cost
        }
    })

  } catch (error) {
    logger.error('Voice Generation Failed', error as Error)
    return NextResponse.json({ error: 'Failed to generate voice' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
    // List voices
    try {
        const voices = await factory.getAvailableVoices()
        return NextResponse.json({ success: true, data: voices })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to list voices' }, { status: 500 })
    }
}
