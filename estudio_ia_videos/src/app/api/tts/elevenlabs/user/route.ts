
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@lib/auth'
import ElevenLabsService from '@lib/elevenlabs-service'
import { logger } from '@lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
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
