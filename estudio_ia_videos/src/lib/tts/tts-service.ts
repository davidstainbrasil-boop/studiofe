/**
 * TTS Service - Text-to-Speech with fallback
 * Implementação REAL com ElevenLabs, Azure e edge-tts
 */

import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { withCircuitBreaker } from '@lib/resilience/circuit-breaker';
import { retryTTS } from '@lib/resilience/retry';
import { logger } from '@lib/logger';
import { getServiceRoleClient } from '@lib/supabase/service';

const execAsync = promisify(exec);

export type TTSAudioFormat = 'mp3' | 'wav' | 'ogg';

export interface TTSOptions {
  text: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  language?: string;
  emotion?: 'neutral' | 'energetic' | 'calm' | 'happy' | 'sad';
  format?: TTSAudioFormat;
  metadata?: Record<string, unknown>;
}

export interface TTSResult {
  fileUrl: string;
  duration: number;
  voiceId: string;
  format?: string;
  provider?: string;
}

/**
 * Generate audio using edge-tts (free fallback)
 */
async function generateWithEdgeTTS(text: string, voice: string, outputPath: string): Promise<Buffer> {
  const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ').trim();
  const command = `edge-tts --voice "${voice}" --text "${escapedText}" --write-media "${outputPath}"`;
  
  await execAsync(command);
  
  // Read generated file
  const fs = await import('fs/promises');
  return await fs.readFile(outputPath);
}

/**
 * Generate audio using ElevenLabs
 */
async function generateWithElevenLabs(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate audio using Azure TTS
 */
async function generateWithAzure(text: string, voice: string, language: string): Promise<Buffer> {
  const apiKey = process.env.AZURE_TTS_KEY || process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_TTS_REGION || process.env.AZURE_SPEECH_REGION;

  if (!apiKey || !region) {
    throw new Error('Azure TTS credentials not configured');
  }

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
    <voice name="${voice}">${text}</voice>
  </speak>`;

  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure TTS error ${response.status}: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload audio buffer to Supabase Storage
 */
async function uploadAudioToStorage(buffer: Buffer, fileName: string): Promise<string> {
  const supabase = getServiceRoleClient();
  const storagePath = `tts/${fileName}`;

  const { error } = await supabase.storage
    .from('assets')
    .upload(storagePath, buffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'audio/mpeg',
    });

  if (error) {
    logger.error('Failed to upload to Supabase Storage', error);
    throw error;
  }

  const { data } = supabase.storage
    .from('assets')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Internal TTS generation function - REAL implementation
 */
async function generateTTSInternal(options: TTSOptions): Promise<TTSResult> {
  if (!options.text || typeof options.text !== 'string' || options.text.trim().length === 0) {
    throw new Error('Text is required and must be a string');
  }

  const text = options.text.trim();
  const provider = process.env.TTS_PROVIDER || 'edge-tts';
  const voiceId = options.voiceId || process.env.TTS_DEFAULT_VOICE || 'pt-BR-FranciscaNeural';
  const language = options.language || 'pt-BR';
  const format = options.format || 'mp3';
  const fileName = `${randomUUID()}.${format}`;

  logger.info('Generating TTS audio with REAL provider', {
    provider,
    textLength: text.length,
    voiceId,
    format,
  });

  let audioBuffer: Buffer;
  let usedProvider = provider;

  try {
    // Try primary provider
    if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      audioBuffer = await generateWithElevenLabs(text, voiceId);
      usedProvider = 'elevenlabs';
    } else if (provider === 'azure' && process.env.AZURE_TTS_KEY) {
      audioBuffer = await generateWithAzure(text, voiceId, language);
      usedProvider = 'azure';
    } else {
      // Fallback to edge-tts (free)
      const tempPath = join(process.env.TEMP_PATH || '/tmp', fileName);
      await mkdir(join(process.env.TEMP_PATH || '/tmp'), { recursive: true });
      audioBuffer = await generateWithEdgeTTS(text, voiceId, tempPath);
      usedProvider = 'edge-tts';
    }
  } catch (primaryError) {
    logger.warn('Primary TTS provider failed, falling back to edge-tts', { error: primaryError });
    
    // Fallback to edge-tts
    const tempPath = join(process.env.TEMP_PATH || '/tmp', fileName);
    await mkdir(join(process.env.TEMP_PATH || '/tmp'), { recursive: true });
    audioBuffer = await generateWithEdgeTTS(text, voiceId, tempPath);
    usedProvider = 'edge-tts';
  }

  // Upload to storage
  const fileUrl = await uploadAudioToStorage(audioBuffer, fileName);

  // Estimate duration (150 words/minute)
  const words = text.split(/\s+/).length;
  const duration = Math.max(1, Math.round((words / 150) * 60));

  logger.info('TTS audio generated successfully', {
    fileUrl,
    duration,
    voiceId,
    provider: usedProvider,
    size: audioBuffer.length,
  });

  return {
    fileUrl,
    duration,
    voiceId,
    format,
    provider: usedProvider,
  };
}

/**
 * Synthesize text to audio file with retry and circuit breaker
 */
export const synthesizeToFile = async (options: TTSOptions): Promise<TTSResult> => {
  // Wrap TTS generation with retry logic and circuit breaker
  return retryTTS(
    async () => {
      return withCircuitBreaker(
        'TTS_SERVICE',
        async () => generateTTSInternal(options),
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 30000,
          resetTimeout: 60000
        },
        // Fallback: Throw error if circuit is open (no fake URLs in production!)
        async () => {
          const error = new Error('TTS service unavailable - circuit breaker open');
          logger.error('Circuit breaker open for TTS, no fallback available', error, {
            text: options.text.substring(0, 50)
          });
          throw error;
        }
      );
    },
    {
      maxAttempts: 3,
      initialDelay: 2000,
      maxDelay: 30000,
      onRetry: (attempt, error, delay) => {
        logger.warn('Retrying TTS generation', {
          attempt,
          error: error.message,
          delay,
          text: options.text.substring(0, 50)
        });
      }
    }
  );
};

export const listVoices = async (): Promise<Array<{ id: string; name: string; language: string }>> => {
  // Retorna lista de vozes disponíveis
  return [
    { id: 'pt-BR-Neural2-A', name: 'Brazilian Portuguese Female', language: 'pt-BR' },
    { id: 'pt-BR-Neural2-B', name: 'Brazilian Portuguese Male', language: 'pt-BR' },
    { id: 'en-US-Neural2-A', name: 'US English Female', language: 'en-US' },
    { id: 'en-US-Neural2-C', name: 'US English Male', language: 'en-US' },
  ];
};

export const TTSService = {
  synthesize: synthesizeToFile,
  listVoices,
};
