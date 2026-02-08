import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@lib/prisma'
import { Prisma } from '@prisma/client'
import { logger } from '@lib/logger'
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

interface VoiceLibraryItem {
  id: string
  name: string
  provider: string
  voiceId: string
  userId?: string | null
  language?: string | null
  gender?: string | null
  style?: string | null
  previewUrl?: string | null
  metadata?: Record<string, unknown>
  isCustom: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * GET /api/voice-library
 * List all voices for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const provider = searchParams.get('provider')
    const language = searchParams.get('language')

    // Build query filters
    const where: Prisma.voice_modelsWhereInput = {}
    if (userId) where.userId = userId
    if (provider) where.provider = provider
    if (language) where.language = language

    // Fetch voices from database
    const voices = await prisma.voice_models.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      voices: voices.map((v) => ({
        id: v.id,
        name: v.name,
        provider: v.provider,
        voiceId: v.voiceId,
        language: v.language,
        gender: v.gender,
        style: v.style,
        previewUrl: v.previewUrl,
        isCustom: v.isCustom,
        metadata: v.metadata,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      })),
      total: voices.length
    })
  } catch (error) {
    logger.error('Erro ao buscar biblioteca de vozes', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: voice-library'
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch voice library' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/voice-library
 * Save a new cloned voice model
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const {
      name,
      provider = 'elevenlabs',
      voiceId,
      userId,
      language = 'pt-BR',
      gender = 'neutral',
      style = 'default',
      previewUrl,
      metadata = {}
    } = body

    // Validate required fields
    if (!name || !voiceId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, voiceId' },
        { status: 400 }
      )
    }

    // Create voice model in database
    const voiceModel = await prisma.voice_models.create({
      data: {
        name,
        provider,
        voiceId,
        userId: userId || undefined,
        language,
        gender,
        style,
        previewUrl,
        metadata: metadata as Prisma.InputJsonValue,
        isCustom: true
      }
    })

    return NextResponse.json({
      success: true,
      voice: {
        id: voiceModel.id,
        name: voiceModel.name,
        provider: voiceModel.provider,
        voiceId: voiceModel.voiceId,
        language: voiceModel.language,
        gender: voiceModel.gender,
        style: voiceModel.style,
        previewUrl: voiceModel.previewUrl,
        createdAt: voiceModel.createdAt
      },
      message: 'Voice model saved successfully'
    })
  } catch (error) {
    logger.error('Erro ao salvar modelo de voz', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: voice-library'
    });
    return NextResponse.json(
      { success: false, error: 'Failed to save voice model' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/voice-library
 * Update voice metadata
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { id, name, metadata } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    interface VoiceUpdateData {
      name?: string;
      metadata?: Record<string, unknown>;
      updatedAt: Date;
    }
    
    const updateData: VoiceUpdateData = { updatedAt: new Date() }
    if (name) updateData.name = name
    if (metadata) updateData.metadata = metadata

    const voiceModel = await prisma.voice_models.update({
      where: { id },
      data: updateData as Record<string, unknown>
    })

    return NextResponse.json({
      success: true,
      voice: voiceModel,
      message: 'Voice model updated successfully'
    })
  } catch (error) {
    logger.error('Error updating voice model', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: voice-library'
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update voice model' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/voice-library
 * Remove a voice model
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    await prisma.voice_models.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Voice model deleted successfully'
    })
  } catch (error) {
    logger.error('Erro ao deletar modelo de voz', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: voice-library'
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete voice model' },
      { status: 500 }
    )
  }
}
