import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { synthesizeToFile, type TTSOptions } from '@/lib/tts/tts-service';
import { RhubarbLipSyncEngine } from '@/lib/sync/rhubarb-lip-sync-engine';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const monitoring = MonitoringService.getInstance();
  const startTime = Date.now();
  let tempAudioPath: string | null = null;
  
  try {
    // Rate limit: 20 TTS requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`tts-generate:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      logger.warn('TTS rate limit exceeded', { ip, retryAfter: rl.retryAfterSec });
      return NextResponse.json(
        { error: 'Too many TTS requests', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

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

    // ---------------------------------------------------------
    // GENERATE LIP SYNC DATA (REAL)
    // ---------------------------------------------------------
    let lipSyncData = null;
    
    try {
       // Download audio to temp file for Rhubarb processing
       const response = await fetch(result.fileUrl);
       if (response.ok) {
         const buffer = await response.arrayBuffer();
         const tempDir = process.env.TEMP_PATH || '/tmp';
         const tempFileName = `${randomUUID()}.${result.format || 'mp3'}`;
         tempAudioPath = join(tempDir, tempFileName);
         
         await writeFile(tempAudioPath, Buffer.from(buffer));
         
         // In a real environment, Rhubarb binary must be present.
         // If it fails (e.g. binary missing), we log and continue without lip sync.
         const rhubarb = new RhubarbLipSyncEngine();
         
         // Use preprocess which converts to WAV 16khz usually required by Rhubarb
         // Note: Rhubarb might fail if ffmpeg is not present, wrap in try/catch safely
         let processingPath = tempAudioPath;
         try {
            processingPath = await rhubarb.preprocessAudio(tempAudioPath);
         } catch (preprocessError) {
            logger.warn('Preprocess audio failed, trying original', { error: preprocessError });
         }

         lipSyncData = await rhubarb.generatePhonemes(processingPath, text);
         
         // Cleanup preprocessed if created
         if (processingPath !== tempAudioPath) {
             try { await unlink(processingPath).catch(() => {}); } catch {}
         }
       }
    } catch (lipSyncError) {
      logger.warn('Failed to generate lip-sync data', { error: lipSyncError });
      // Continue without lip-sync, don't fail the request
      // We return empty visemes so frontend doesn't crash
    } finally {
      // Cleanup original temp download
      if (tempAudioPath) {
        try { await unlink(tempAudioPath).catch(() => {}); } catch {}
      }
    }

    // Log success
    monitoring.logEvent('tts_generate_success', {
      userId,
      engine: result.provider || engine,
      duration: result.duration,
      processingTime: Date.now() - startTime,
      audioUrl: result.fileUrl,
      hasLipSync: !!lipSyncData
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
        visemes: lipSyncData?.phonemes || [], // Return the phonemes for the frontend
        lipSyncMetadata: lipSyncData?.metadata,
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
