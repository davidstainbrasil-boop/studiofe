import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface VoiceLibraryItem {
  id: string
  name: string
  type: 'custom' | 'professional' | 'few-shot'
  voiceId: string
  userId: string
  quality: number
  language: string
  gender: 'male' | 'female' | 'neutral'
  age: string
  accent: string
  sampleUrl?: string
  sampleDuration: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * GET /api/voice-library
 * List all voices for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'
    const type = searchParams.get('type') as VoiceLibraryItem['type'] | null
    const language = searchParams.get('language')

    // Build query filters
    const where: any = { userId }
    if (type) where.type = type
    if (language) where.language = language

    // Fetch voices from database
    const voices = await prisma.voiceModel.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      voices: voices.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        voiceId: v.voiceId,
        quality: v.quality,
        language: v.language,
        gender: v.gender,
        age: v.age,
        accent: v.accent,
        sampleUrl: v.sampleUrl,
        sampleDuration: v.sampleDuration,
        metadata: v.metadata,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      })),
      total: voices.length
    })
  } catch (error) {
    console.error('Error fetching voice library:', error)
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
  try {
    const body = await request.json()
    const {
      name,
      type = 'custom',
      voiceId,
      userId = 'default-user',
      quality = 0.9,
      language = 'pt-BR',
      gender = 'neutral',
      age = 'adult',
      accent = 'neutral',
      sampleUrl,
      sampleDuration = 0,
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
    const voiceModel = await prisma.voiceModel.create({
      data: {
        name,
        type,
        voiceId,
        userId,
        quality,
        language,
        gender,
        age,
        accent,
        sampleUrl,
        sampleDuration,
        metadata,
        trainingStatus: 'ready',
        trainingProgress: 100
      }
    })

    return NextResponse.json({
      success: true,
      voice: {
        id: voiceModel.id,
        name: voiceModel.name,
        type: voiceModel.type,
        voiceId: voiceModel.voiceId,
        quality: voiceModel.quality,
        language: voiceModel.language,
        gender: voiceModel.gender,
        age: voiceModel.age,
        accent: voiceModel.accent,
        sampleUrl: voiceModel.sampleUrl,
        sampleDuration: voiceModel.sampleDuration,
        createdAt: voiceModel.createdAt
      },
      message: 'Voice model saved successfully'
    })
  } catch (error) {
    console.error('Error saving voice model:', error)
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
  try {
    const body = await request.json()
    const { id, name, metadata } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (metadata) updateData.metadata = metadata
    updateData.updatedAt = new Date()

    const voiceModel = await prisma.voiceModel.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      voice: voiceModel,
      message: 'Voice model updated successfully'
    })
  } catch (error) {
    console.error('Error updating voice model:', error)
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
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    await prisma.voiceModel.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Voice model deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting voice model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete voice model' },
      { status: 500 }
    )
  }
}
