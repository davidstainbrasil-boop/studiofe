/**
 * API v1: GET /api/v1/voices
 *
 * List available TTS voices
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAPIKey, APIKey } from '@/lib/api/api-key-middleware';
import { withRateLimit } from '@/lib/api/rate-limiter';
import { getTTSService, NR_VOICE_PRESETS } from '@/lib/tts/tts-service-real';

async function handleRequest(request: NextRequest, apiKey: APIKey): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const language = searchParams.get('language');
    const gender = searchParams.get('gender');

    const ttsService = getTTSService();
    let voices = await ttsService.listVoices();

    // Apply filters
    if (provider) {
      voices = voices.filter((v) => v.provider === provider);
    }
    if (language) {
      voices = voices.filter((v) => v.language.toLowerCase().includes(language.toLowerCase()));
    }
    if (gender) {
      voices = voices.filter((v) => v.gender === gender);
    }

    // Add NR presets as recommended
    const presetVoices = Object.entries(NR_VOICE_PRESETS).map(([id, preset]) => ({
      id,
      name: preset.name,
      provider: preset.provider,
      language: 'pt-BR',
      gender: id.includes('narradora') || id.includes('female') ? 'female' : 'male',
      is_recommended: true,
    }));

    return NextResponse.json({
      success: true,
      count: voices.length,
      recommended: presetVoices,
      voices: voices.map((voice) => ({
        id: voice.id,
        name: voice.name,
        provider: voice.provider,
        language: voice.language,
        gender: voice.gender,
        preview_url: voice.previewUrl,
        accent: voice.accent,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list voices',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return withRateLimit(request, (req) => withAPIKey(req, handleRequest));
}
