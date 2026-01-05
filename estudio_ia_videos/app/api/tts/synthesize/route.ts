/**
 * API TTS Synthesize - Gera áudio a partir de texto
 * POST /api/tts/synthesize
 */

import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTSService } from '@/lib/tts/edge-tts-service';
import { z } from 'zod';

const synthesizeSchema = z.object({
  text: z.string().min(1, 'Texto é obrigatório').max(5000, 'Texto muito longo (máx 5000 caracteres)'),
  voice: z.string().optional().default('pt-BR-FranciscaNeural'),
  rate: z.string().optional().default('+0%'),
  volume: z.string().optional().default('+0%'),
  pitch: z.string().optional().default('+0Hz'),
  slideId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = synthesizeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos', 
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { text, voice, rate, volume, pitch, slideId } = validation.data;

    console.log(`[TTS] Sintetizando: "${text.substring(0, 50)}..." com voz ${voice}`);

    const result = await EdgeTTSService.synthesize({
      text,
      voice,
      rate,
      volume,
      pitch,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Falha na síntese de áudio' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slideId,
      audioUrl: result.fileUrl,
      duration: result.duration,
      voice: result.voice,
      format: result.format,
      fileSize: result.fileSize,
    });

  } catch (error) {
    console.error('[TTS] Erro na API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

// Suporte a GET para debug
export async function GET() {
  return NextResponse.json({
    service: 'TTS Synthesize API',
    version: '1.0.0',
    engine: 'Microsoft Edge TTS',
    usage: {
      method: 'POST',
      body: {
        text: 'Texto para sintetizar (obrigatório)',
        voice: 'Voz a usar (opcional, padrão: pt-BR-FranciscaNeural)',
        rate: 'Velocidade (opcional, ex: +10%, -20%)',
        volume: 'Volume (opcional, ex: +50%, -30%)',
        pitch: 'Tom (opcional, ex: +5Hz, -10Hz)',
        slideId: 'ID do slide (opcional, para referência)',
      },
    },
    example: {
      text: 'Olá, bem-vindo ao curso de segurança do trabalho.',
      voice: 'pt-BR-FranciscaNeural',
    },
  });
}

