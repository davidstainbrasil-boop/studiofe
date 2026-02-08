
import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@lib/auth/unified-session'
import ElevenLabsService from '@lib/elevenlabs-service'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'tts-elevenlabs-user-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const elevenLabsService = ElevenLabsService.getInstance()
    const userInfo = await elevenLabsService.getUserInfo()
    
    return NextResponse.json({
      success: true,
      user: userInfo
    })
  } catch (error) {
    logger.error('Erro ao buscar informações do usuário', error instanceof Error ? error : new Error(String(error))
, { component: 'API: tts/elevenlabs/user' })
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar informações do usuário',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
