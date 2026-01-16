/**
 * API TTS Batch - Sintetiza múltiplos textos de uma vez
 * POST /api/tts/batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTSService } from '@lib/tts/edge-tts-service';
import { z } from 'zod';
import { logger } from '@lib/logger';

const batchSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    text: z.string().min(1).max(5000),
    voice: z.string().optional(),
  })).min(1).max(50),
  defaultVoice: z.string().optional().default('pt-BR-FranciscaNeural'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = batchSchema.safeParse(body);

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

    const { items, defaultVoice } = validation.data;

    logger.info('Processando batch TTS', {
      component: 'API: tts/batch',
      itemCount: items.length
    });

    // Preparar itens com voz padrão se não especificada
    const preparedItems = items.map(item => ({
      id: item.id,
      text: item.text,
      voice: item.voice || defaultVoice,
    }));

    const results = await EdgeTTSService.synthesizeBatch(preparedItems);

    // Converter Map para objeto
    const resultsObject: Record<string, {
      success: boolean;
      audioUrl?: string;
      duration?: number;
      error?: string;
    }> = {};

    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, id) => {
      if (result.success) {
        successCount++;
        resultsObject[id] = {
          success: true,
          audioUrl: result.fileUrl,
          duration: result.duration,
        };
      } else {
        errorCount++;
        resultsObject[id] = {
          success: false,
          error: result.error,
        };
      }
    });

    return NextResponse.json({
      success: true,
      totalItems: items.length,
      successCount,
      errorCount,
      results: resultsObject,
    });

  } catch (error) {
    logger.error('Erro ao processar batch TTS', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: tts/batch'
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao processar batch' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'TTS Batch API',
    version: '1.0.0',
    usage: {
      method: 'POST',
      body: {
        items: [
          { id: 'slide-1', text: 'Texto do primeiro slide' },
          { id: 'slide-2', text: 'Texto do segundo slide', voice: 'pt-BR-AntonioNeural' },
        ],
        defaultVoice: 'pt-BR-FranciscaNeural (opcional)',
      },
    },
    limits: {
      maxItems: 50,
      maxTextLength: 5000,
    },
  });
}

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
