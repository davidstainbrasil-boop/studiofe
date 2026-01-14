import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { synthesizeToFile, type TTSOptions } from '@lib/tts/tts-service';

// Monitoring service for metrics
class MonitoringService {
  private static instance: MonitoringService;
  
  static getInstance(): MonitoringService {
    if (!this.instance) {
      this.instance = new MonitoringService();
    }
    return this.instance;
  }
  
  logEvent(event: string, data: Record<string, unknown>) {
    logger.info(`📊 [${event}]`, { data, component: 'API: tts/generate' });
  }
}

export async function POST(request: NextRequest) {
  const monitoring = MonitoringService.getInstance();
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await request.json();
    const { 
      text, 
      engine = 'edge-tts',
      voice = 'pt-BR-FranciscaNeural',
      language = 'pt-BR',
      speed = 1.0,
      pitch = 1.0,
      format = 'mp3',
      userId 
    } = body;

    // Validations
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Texto é obrigatório e deve ser uma string' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Texto muito longo (máximo 10.000 caracteres)' },
        { status: 400 }
      );
    }

    // Log request
    monitoring.logEvent('tts_generate_request', {
      userId,
      engine,
      textLength: text.length,
      voice,
      language
    });

    // Generate TTS using REAL service
    const options: TTSOptions = {
      text,
      voiceId: voice,
      language,
      speed,
      pitch,
      format: format as 'mp3' | 'wav' | 'ogg',
      metadata: { userId, engine }
    };

    const result = await synthesizeToFile(options);

    // Log success
    monitoring.logEvent('tts_generate_success', {
      userId,
      engine: result.provider || engine,
      duration: result.duration,
      processingTime: Date.now() - startTime,
      audioUrl: result.fileUrl
    });

    // Return result
    return NextResponse.json({
      success: true,
      data: {
        audioUrl: result.fileUrl,
        duration: result.duration,
        engine: result.provider || engine,
        voice: result.voiceId,
        language,
        format: result.format,
        performance: {
          processingTime: Date.now() - startTime,
        }
      }
    });

  } catch (error: unknown) {
    // Log error
    monitoring.logEvent('tts_generate_error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: Date.now() - startTime
    });

    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Erro na geração TTS', err, { component: 'API: tts/generate' });

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error),
        code: 'TTS_GENERATION_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      message: 'TTS Stats not available'
    }
  });
}
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
