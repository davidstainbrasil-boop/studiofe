/**
 * API TTS Voices - Lista vozes disponíveis
 * GET /api/tts/voices
 */

import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTSService } from '@/lib/tts/edge-tts-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale');
    const brazilian = searchParams.get('brazilian');

    // Se solicitou apenas vozes brasileiras
    if (brazilian === 'true' || brazilian === '1') {
      const voices = EdgeTTSService.getBrazilianVoices();
      return NextResponse.json({
        success: true,
        count: voices.length,
        locale: 'pt-BR',
        voices,
      });
    }

    // Filtrar por locale se fornecido
    const voices = await EdgeTTSService.listVoices(locale || undefined);

    return NextResponse.json({
      success: true,
      count: voices.length,
      locale: locale || 'all',
      voices,
      recommended: {
        ptBR: 'pt-BR-FranciscaNeural',
        description: 'Voz feminina brasileira de alta qualidade',
      },
    });

  } catch (error) {
    console.error('[TTS] Erro ao listar vozes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao listar vozes' 
      },
      { status: 500 }
    );
  }
}

