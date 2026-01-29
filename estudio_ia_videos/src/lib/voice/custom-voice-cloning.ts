/**
 * Custom Voice Cloning System - Fase 5: Integrações Premium
 * Sistema completo de clonagem de voz usando ElevenLabs e outras plataformas
 */

import { logger } from '@lib/logger';
import { getRequiredEnv, getOptionalEnv } from '@lib/env';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface VoiceCloneRequest {
  name: string;
  description?: string;
  audioSamples: string[]; // URLs or file paths
  labels?: Record<string, string>; // Metadata tags
  category?: 'professional' | 'casual' | 'narration' | 'character';
  language?: string;
}

export interface VoiceClone {
  id: string;
  name: string;
  description: string;
  voiceId: string; // Provider voice ID
  provider: 'elevenlabs' | 'resemble' | 'descript';
  status: 'training' | 'ready' | 'failed';
  quality: number; // 0-100
  similarity: number; // 0-100 (similarity to original samples)
  labels: Record<string, string>;
  category: string;
  language: string;
  sampleCount: number;
  createdAt: Date;
  trainedAt?: Date;
  previewUrl?: string;
  metadata: {
    trainingTime?: number;
    modelSize?: number;
    sampleRate: number;
  };
}

export interface VoiceSynthesisRequest {
  text: string;
  voiceId: string;
  stability?: number; // 0-1
  similarityBoost?: number; // 0-1
  style?: number; // 0-1
  speakerBoost?: boolean;
  outputFormat?: 'mp3' | 'wav' | 'pcm';
}

export interface VoiceSynthesisResult {
  audioUrl: string;
  duration: number;
  characters: number;
  cost: number; // Credits used
  metadata: {
    voiceId: string;
    provider: string;
    quality: string;
    sampleRate: number;
  };
}

// ============================================================================
// VOICE CLONING SYSTEM
// ============================================================================

export class CustomVoiceCloningSystem {
  private provider: 'elevenlabs' | 'resemble' | 'descript';
  private apiKey: string;
  private apiEndpoint: string;
  private supabase: SupabaseClient;

  constructor(config?: {
    provider?: 'elevenlabs' | 'resemble' | 'descript';
    apiKey?: string;
  }) {
    this.provider = config?.provider || 'elevenlabs';
    this.apiKey = config?.apiKey || getOptionalEnv('ELEVENLABS_API_KEY') || '';
    
    if (!this.apiKey && process.env.STRICT_REAL_MODE === 'true') {
        throw new Error('ElevenLabs API Key is required for Real Mode');
    }

    this.apiEndpoint = this.getApiEndpoint();
    
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // VOICE CLONING
  // ============================================================================

  /**
   * Create custom voice clone from audio samples
   */
  async cloneVoice(request: VoiceCloneRequest): Promise<VoiceClone> {
    const startTime = Date.now();

    try {
      // 1. Validate audio samples
      await this.validateAudioSamples(request.audioSamples);

      // 2. Upload samples to Provider (ElevenLabs)
      const uploadedSamples = await this.uploadAudioSamples(request.audioSamples);

      // 3. Create voice clone
      const voiceId = await this.createVoiceClone({
        name: request.name,
        description: request.description || '',
        files: uploadedSamples,
        labels: request.labels
      });

      // 4. Wait for training completion
      const clone = await this.waitForTraining(voiceId);

      const trainingTime = (Date.now() - startTime) / 1000;

      return {
        ...clone,
        metadata: {
          ...clone.metadata,
          trainingTime
        }
      };
    } catch (error) {
      logger.error('[VoiceCloningSystem] Clone creation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validate audio samples meet requirements
   */
  private async validateAudioSamples(samples: string[]): Promise<void> {
    if (samples.length < 1) {
      throw new Error('At least 1 audio sample required');
    }

    if (samples.length > 25) {
      throw new Error('Maximum 25 audio samples allowed');
    }

    // Basic validation: Check if files exist and are audio
    for (const sample of samples) {
        if (!sample.toLowerCase().endsWith('.mp3') && !sample.toLowerCase().endsWith('.wav')) {
             // If strict, throw. For now, warn but allow if URL.
             // But usually local files are expected here for cloning.
        }
        
        try {
            // If local file
            if (!sample.startsWith('http')) {
                const stats = await fs.stat(sample);
                if (stats.size > 10 * 1024 * 1024) { // 10MB limit per sample
                    throw new Error(`Sample ${sample} too large`);
                }
            }
        } catch (e) {
             throw new Error(`Sample invalid or not found: ${sample}`);
        }
    }
  }

  /**
   * Upload audio samples to provider
   */
  private async uploadAudioSamples(samples: string[]): Promise<string[]> {
    // Note: For ElevenLabs /voices/add, we send files directly in FormData, 
    // NOT IDs of uploaded files (unless using a different endpoint).
    // The implementation in `createVoiceClone` sends `files` which implies paths or IDs.
    // ElevenLabs API v1/voices/add takes `files` as multipart form data.
    // So this method might be redundant if `createVoiceClone` handles it, 
    // OR this method returns paths/IDs if we upload to intermediate storage first.
    // But usually we send raw files.
    // Let's assume `createVoiceClone` will handle the actual upload to ElevenLabs.
    // So here we might just return the paths to be used there, or verify they are ready.
    return samples;
  }

  /**
   * Create voice clone with uploaded samples
   */
  private async createVoiceClone(params: {
    name: string;
    description: string;
    files: string[];
    labels?: Record<string, string>;
  }): Promise<string> {
    
    // We need to construct FormData with streams
    const { FormData } = await import('form-data'); // Ensure we use node form-data
    const formData = new FormData();
    
    formData.append('name', params.name);
    if (params.description) formData.append('description', params.description);
    if (params.labels) formData.append('labels', JSON.stringify(params.labels));

    for (const filePath of params.files) {
        const fileStream = await this.getAudioStream(filePath);
        formData.append('files', fileStream, path.basename(filePath));
    }

    // Using node-fetch or native fetch with form-data
    // Note: native fetch in Node 18+ might struggle with 'form-data' package streams unless headers are set correctly.
    // We'll use axios or ensure headers are correct.
    // Let's use the native fetch but careful with headers.
    
    // Actually, let's use the helper we used in BillingService or similar if available, or just fetch.
    const response = await fetch(`${this.apiEndpoint}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        // FormData headers (boundary) are crucial. 
        // If using 'form-data' package, we must get headers.
        ...(formData.getHeaders() as any)
      },
      body: formData as any
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Voice clone creation failed: ${response.status} ${txt}`);
    }

    const data = await response.json();
    return data.voice_id;
  }
  
  private async getAudioStream(filePath: string): Promise<any> {
      if (filePath.startsWith('http')) {
          const res = await fetch(filePath);
          if (!res.ok) throw new Error(`Failed to fetch ${filePath}`);
          // Buffer or stream? form-data likes Buffer or Stream.
          // res.body is a web stream, might need conversion for form-data package.
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
      } else {
          return fs.readFile(filePath); // Returns Buffer, which form-data handles
      }
  }

  /**
   * Wait for voice training to complete
   */
  private async waitForTraining(voiceId: string): Promise<VoiceClone> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes (5s intervals)

    while (attempts < maxAttempts) {
      const status = await this.getVoiceStatus(voiceId);

      if (status.status === 'ready') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error('Voice training failed');
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Voice training timed out');
  }

  /**
   * Get voice clone status
   */
  async getVoiceStatus(voiceId: string): Promise<VoiceClone> {
    const response = await fetch(`${this.apiEndpoint}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get voice status');
    }

    const data = await response.json();

    return {
      id: data.voice_id,
      name: data.name,
      description: data.description || '',
      voiceId: data.voice_id,
      provider: this.provider,
      status: this.mapProviderStatus(data.status),
      quality: data.quality_score || 0,
      similarity: data.similarity_score || 0,
      labels: data.labels || {},
      category: data.category || 'professional',
      language: data.language || 'en',
      sampleCount: data.samples?.length || 0,
      createdAt: new Date(data.created_at),
      trainedAt: data.trained_at ? new Date(data.trained_at) : undefined,
      previewUrl: data.preview_url,
      metadata: {
        modelSize: data.model_size,
        sampleRate: data.sample_rate || 24000
      }
    };
  }

  /**
   * List all voice clones
   */
  async listVoiceClones(): Promise<VoiceClone[]> {
    const response = await fetch(`${this.apiEndpoint}/voices`, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error('Failed to list voice clones');
    }

    const data = await response.json();

    return data.voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      description: voice.description || '',
      voiceId: voice.voice_id,
      provider: this.provider,
      status: 'ready', // ElevenLabs voices list usually contains ready voices or we check status? assuming ready.
      quality: voice.quality_score || 0,
      similarity: voice.similarity_score || 0,
      labels: voice.labels || {},
      category: voice.category || 'professional',
      language: voice.language || 'en',
      sampleCount: voice.samples?.length || 0,
      createdAt: new Date(voice.created_at),
      metadata: {
        sampleRate: voice.sample_rate || 24000
      }
    }));
  }

  /**
   * Delete voice clone
   */
  async deleteVoiceClone(voiceId: string): Promise<boolean> {
    const response = await fetch(`${this.apiEndpoint}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    return response.ok;
  }

  // ============================================================================
  // VOICE SYNTHESIS
  // ============================================================================

  /**
   * Synthesize speech with cloned voice
   */
  async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(
        `${this.apiEndpoint}/text-to-speech/${request.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          body: JSON.stringify({
            text: request.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: request.stability ?? 0.5,
              similarity_boost: request.similarityBoost ?? 0.75,
              style: request.style ?? 0,
              use_speaker_boost: request.speakerBoost ?? true
            },
            output_format: request.outputFormat || 'mp3_44100_128'
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Synthesis failed: ${response.statusText}`);
      }

      // Get audio blob
      const audioBuffer = await response.arrayBuffer();

      // Upload to Supabase Storage (Real)
      const audioUrl = await this.uploadAudio(Buffer.from(audioBuffer));

      // Calculate metrics (Real)
      const duration = await this.getAudioDuration(Buffer.from(audioBuffer));
      const characters = request.text.length;
      const cost = this.calculateCost(characters);

      return {
        audioUrl,
        duration,
        characters,
        cost,
        metadata: {
          voiceId: request.voiceId,
          provider: this.provider,
          quality: 'high',
          sampleRate: 44100
        }
      };
    } catch (error) {
      logger.error('[VoiceCloningSystem] Synthesis failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ... batchSynthesize, editVoice, addSamples (similar to original but using real logic if needed) ...

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getApiEndpoint(): string {
    const endpoints = {
      elevenlabs: 'https://api.elevenlabs.io/v1',
      resemble: 'https://api.resemble.ai/v2',
      descript: 'https://api.descript.com/v1'
    };

    return process.env.VOICE_CLONING_API_ENDPOINT || endpoints[this.provider];
  }

  private mapProviderStatus(providerStatus: string): VoiceClone['status'] {
    const statusMap: Record<string, VoiceClone['status']> = {
      'training': 'training',
      'ready': 'ready',
      'fine_tuning': 'training',
      'failed': 'failed',
      'available': 'ready'
    };

    return statusMap[providerStatus] || 'training';
  }

  /**
   * Upload audio to Supabase Storage
   */
  private async uploadAudio(audioBuffer: Buffer): Promise<string> {
    const fileName = `cloned-voices/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    
    const { data, error } = await this.supabase.storage
      .from('assets') // Using 'assets' bucket
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) {
      throw new Error(`Audio upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from('assets')
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  }

  /**
   * Get audio duration using FFmpeg
   */
  private async getAudioDuration(audioBuffer: Buffer): Promise<number> {
    // We need to write to temp file to use ffprobe usually, or pipe it.
    // Writing to temp is safer/easier.
    const tempPath = path.join(process.cwd(), 'temp', `probe-${Date.now()}.mp3`);
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, audioBuffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
            // Cleanup
            fs.unlink(tempPath).catch(() => {});
            
            if (err) {
                logger.warn('FFprobe failed', { error: err.message });
                resolve(0); // Fallback
                return;
            }
            resolve(metadata.format.duration || 0);
        });
    });
  }

  private calculateCost(characters: number): number {
    return Math.ceil(characters / 1000);
  }
}

export const customVoiceCloningSystem = new CustomVoiceCloningSystem();
