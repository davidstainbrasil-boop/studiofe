/**
 * 🎙️ TTS Generation API - Production Ready
 * Sistema real de geração de áudio com TTS usando ElevenLabs e Azure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/monitoring/logger';
import { ElevenLabsService } from '@/services/elevenlabs-service';
import { SupabaseStorageService } from '@/lib/storage/supabase-storage.service';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

const logger = createLogger('TTSGenerateAPI');

interface TTSRequest {
  text: string;
  provider: 'elevenlabs' | 'azure' | 'google';
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
  language?: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  logger.info('🎙️ Iniciando geração TTS...', { component: 'API: v1/tts/generate' });

  try {
    const blocked = await applyRateLimit(request, 'v1-tts-gen', 10);
    if (blocked) return blocked;

    const body: TTSRequest = await request.json();
    const {
      text,
      provider = 'azure',
      voice,
      speed = 1.0,
      pitch = 0,
      format = 'mp3',
      language = 'pt-BR',
    } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Texto muito longo. Máximo: 5000 caracteres' },
        { status: 400 },
      );
    }

    logger.info(`🔊 Gerando TTS com ${provider}:`, {
      component: 'API: v1/tts/generate',
      textLength: text.length,
      voice,
      language,
    });

    let audioResult: { audioUrl: string; duration: number };

    switch (provider) {
      case 'elevenlabs':
        audioResult = await generateWithElevenLabs(text, voice, speed);
        break;

      case 'azure':
        audioResult = await generateAzureTTS(text, voice, speed, pitch, format, language);
        break;

      case 'google':
        audioResult = await generateGoogleTTS(text, voice, speed, pitch, format, language);
        break;

      default:
        return NextResponse.json(
          { error: `Provider '${provider}' inválido. Use: elevenlabs, azure ou google` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      audioUrl: audioResult.audioUrl,
      duration: audioResult.duration,
      provider,
      settings: {
        voice,
        speed,
        pitch,
        format,
        language,
      },
      metadata: {
        textLength: text.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    logger.error('❌ Erro na API TTS', error as Error);

    const statusCode =
      errorMessage.includes('não configurada') ||
      errorMessage.includes('not configured')
        ? 503
        : 500;

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * Gera TTS usando ElevenLabs
 */
async function generateWithElevenLabs(text: string, voice?: string, speed?: number) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ElevenLabs API key não configurada');
  }

  try {
    const elevenLabs = new ElevenLabsService({ apiKey });

    const result = await elevenLabs.generateSpeech({
      text,
      voiceId: voice,
      speed,
    });

    if (!result.success || !result.audioBuffer) {
      throw new Error(result.error || 'Falha ao gerar áudio com ElevenLabs');
    }

    const estimatedDuration =
      result.duration || Math.ceil((text.split(' ').length / 150) * 60);
    const inlineAudioUrl = `data:audio/mpeg;base64,${result.audioBuffer.toString(
      'base64',
    )}`;

    try {
      const storage = new SupabaseStorageService();
      const filename = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 11)}.mp3`;
      const uploadResult = await storage.uploadAudio(result.audioBuffer, filename);

      if (!uploadResult.error && uploadResult.url) {
        return {
          audioUrl: uploadResult.url,
          duration: estimatedDuration,
        };
      }

      logger.warn('Upload TTS falhou; retornando áudio inline', {
        component: 'API: v1/tts/generate',
        error: uploadResult.error || 'unknown',
      });
    } catch (storageError) {
      logger.warn('Storage indisponível para upload TTS; retornando áudio inline', {
        component: 'API: v1/tts/generate',
        error: storageError instanceof Error ? storageError.message : String(storageError),
      });
    }

    return {
      audioUrl: inlineAudioUrl,
      duration: estimatedDuration,
    };
  } catch (error) {
    logger.error('❌ Erro ElevenLabs', error as Error);
    throw error;
  }
}

async function generateAzureTTS(
  text: string,
  voice?: string,
  speed?: number,
  pitch?: number,
  format?: string,
  language?: string,
) {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    throw new Error('Azure Speech credentials não configuradas');
  }

  const voiceName = voice || 'pt-BR-FranciscaNeural';
  const speedRate = speed ? `${speed}x` : '1.0x';
  const pitchValue = pitch ? `${pitch > 0 ? '+' : ''}${pitch}Hz` : '+0Hz';

  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language || 'pt-BR'}">
      <voice name="${voiceName}">
        <prosody rate="${speedRate}" pitch="${pitchValue}">
          ${text}
        </prosody>
      </voice>
    </speak>
  `;

  try {
    const response = await fetch(
      `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
        },
        body: ssml,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure TTS API error: ${response.status} - ${errorText}`);
    }

    // Converter audio para base64
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Estimar duração
    const wordCount = text.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60; // em segundos

    return {
      audioUrl,
      duration: estimatedDuration,
    };
  } catch (error) {
    logger.error('Azure TTS Error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: v1/tts/generate',
    });
    throw error;
  }
}

async function generateGoogleTTS(
  text: string,
  voice?: string,
  speed?: number,
  pitch?: number,
  format?: string,
  language?: string,
) {
  // Implementação simplificada do Google TTS
  // Em produção, usaria a biblioteca @google-cloud/text-to-speech

  const apiKey = process.env.GOOGLE_TTS_API_KEY;

  if (!apiKey) {
    throw new Error('Google TTS API key não configurada');
  }

  const payload = {
    input: { text },
    voice: {
      languageCode: language || 'pt-BR',
      name: voice || 'pt-BR-Standard-A',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: format === 'wav' ? 'LINEAR16' : 'MP3',
      speakingRate: speed || 1.0,
      pitch: pitch || 0.0,
    },
  };

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const audioUrl = `data:audio/mpeg;base64,${result.audioContent}`;

    // Estimar duração
    const wordCount = text.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;

    return {
      audioUrl,
      duration: estimatedDuration,
    };
  } catch (error) {
    logger.error('Google TTS Error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: v1/tts/generate',
    });
    throw error;
  }
}

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'v1-tts-generate-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  return NextResponse.json({
    providers: ['elevenlabs', 'azure', 'google'],
    voices: {
      elevenlabs: [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (English)' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (English)' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (English)' },
      ],
      azure: [
        { id: 'pt-BR-FranciscaNeural', name: 'Francisca (Português)' },
        { id: 'pt-BR-AntonioNeural', name: 'Antonio (Português)' },
        { id: 'en-US-JennyNeural', name: 'Jenny (English)' },
        { id: 'en-US-GuyNeural', name: 'Guy (English)' },
      ],
      google: [
        { id: 'pt-BR-Standard-A', name: 'Português Feminina' },
        { id: 'pt-BR-Standard-B', name: 'Português Masculina' },
        { id: 'en-US-Standard-C', name: 'English Female' },
        { id: 'en-US-Standard-D', name: 'English Male' },
      ],
    },
    formats: ['mp3', 'wav', 'ogg'],
    languages: ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE'],
  });
}
