
import { NextResponse } from 'next/server'

export async function GET() {
  // Return available voices for ElevenLabs integration
  const voices = [
    {
      voiceId: 'pMsXgVXv3BLzUgSXRplE',
      name: 'Adam (PT-BR)',
      category: 'professional',
      language: 'pt-BR',
      gender: 'male',
      previewUrl: '/api/voices/preview/adam',
      isPremium: true
    },
    {
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Bella (PT-BR)',
      category: 'friendly',
      language: 'pt-BR',
      gender: 'female',
      previewUrl: '/api/voices/preview/bella',
      isPremium: true
    }
  ]

  return NextResponse.json({
    voices,
    total_count: voices.length,
    premium_count: voices.filter(v => v.isPremium).length
  })
}

