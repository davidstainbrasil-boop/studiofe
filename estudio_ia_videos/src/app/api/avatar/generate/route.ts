import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AvatarQualityNegotiator } from '@/lib/avatar/avatar-quality-negotiator'
import { AvatarRendererFactory } from '@/lib/avatar/avatar-renderer-factory'
import { CreditManager } from '@/lib/billing/credit-manager'
import { logger } from '@/lib/logger'
import { AvatarQuality } from '@/lib/avatar/quality-tier-system'

// Services
const negotiator = new AvatarQualityNegotiator()
const factory = new AvatarRendererFactory()
const creditManager = new CreditManager()

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
        text, 
        audioUrl, 
        sourceImageUrl, 
        quality = AvatarQuality.STANDARD,
        voiceId
    } = body

    if ((!text && !audioUrl)) {
        return NextResponse.json({ error: 'Missing text or audioUrl' }, { status: 400 })
    }

    // 1. Negotiate Quality
    // Fetch user plan and credits from DB (Stubbed in CreditManager for now, or fetch here)
    const userPlan = 'pro' // Stub: fetch from user profile
    const userCredits = await creditManager.getBalance(user.id)
    const systemLoad = 0.5 // Stub: fetch from monitoring

    const negotiation = await negotiator.selectBestQuality({
        requestedQuality: quality,
        userPlan,
        userCredits,
        systemLoad,
        urgency: 'medium'
    })

    if (negotiation.quality !== quality) {
        logger.info('Quality degraded/changed during negotiation', { requested: quality, final: negotiation.quality, reason: negotiation.reason })
    }

    // 2. Get Renderer
    const renderer = factory.getRenderer(negotiation.quality)

    // 3. Generate
    const params = {
        userId: user.id,
        text,
        audioUrl,
        sourceImageUrl,
        voiceId,
        quality: negotiation.quality
    }
    
    // Check validation
    if (!await renderer.validateConfig(params)) {
        return NextResponse.json({ error: 'Invalid configuration for selected quality' }, { status: 400 })
    }

    const result = await renderer.generate(params)

    // 4. Deduct Credits (if successful or pending)
    if (result.cost > 0) {
        await creditManager.deductCredits(user.id, result.cost, `Avatar Generation (${negotiation.quality})`)
    }

    return NextResponse.json({
        success: true,
        data: result,
        negotiation: {
            requested: quality,
            actual: negotiation.quality,
            reason: negotiation.reason
        }
    })

  } catch (error) {
    console.error('API Error Detailed:', error)
    logger.error('Failed to generate avatar', error as Error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
