
import { logger } from '@lib/logger';
import { getRequiredEnv } from '@lib/env';
import fs from 'fs/promises';

export interface LipSyncFrame {
  timestampMs: number;
  jawOpen: number;
  mouthClose: number;
  mouthFunnel: number;
  mouthPucker: number;
  mouthLeft: number;
  mouthRight: number;
  mouthRollLower: number;
  mouthSmile: number;
  mouthShrugUpper: number;
  tongueOut: number;
}

export interface Audio2FaceResult {
  success: boolean;
  lipSyncData: LipSyncFrame[];
  error?: string;
  metrics?: {
    processingTimeMs: number;
    audioDurationMs: number;
  };
}

export class Audio2FaceService {
  private static instance: Audio2FaceService;
  private serverUrl: string;

  constructor() {
    // If AUDIO2FACE_URL is not set, we cannot function in Real mode.
    // In dev we might have warned, but now we fail or require it.
    // Default to localhost:50051 for standard Omniverse A2F headless container
    this.serverUrl = process.env.AUDIO2FACE_URL || 'http://localhost:50051';
  }

  static getInstance(): Audio2FaceService {
    if (!Audio2FaceService.instance) {
      Audio2FaceService.instance = new Audio2FaceService();
    }
    return Audio2FaceService.instance;
  }

  async createSession(): Promise<string> {
    // Check if service is reachable
    try {
        // Real implementation would make a gRPC or HTTP call to A2F instance
        // For now, assuming REST wrapper or similar availability check
        const response = await fetch(`${this.serverUrl}/status`);
        if (!response.ok) throw new Error('A2F Service Unreachable');
        
        return 'session-' + Date.now();
    } catch (error) {
        if (process.env.STRICT_REAL_MODE === 'true') {
             throw new Error(`Audio2Face Service unreachable at ${this.serverUrl}`);
        }
        logger.warn('Audio2Face unreachable, lip-sync will be skipped', { url: this.serverUrl });
        return 'mock-session';
    }
  }

  async processAudio(
    sessionId: string,
    audioBuffer: Buffer,
    options: { audioLengthMs?: number; includeMetrics?: boolean } = {}
  ): Promise<Audio2FaceResult> {
    
    if (sessionId === 'mock-session') {
        if (process.env.STRICT_REAL_MODE === 'true') {
            throw new Error('Cannot process audio with mock session in strict mode');
        }
        return { success: false, lipSyncData: [], error: 'Audio2Face service unavailable' };
    }

    const startTime = Date.now();
    logger.info('Processing audio for lip-sync', { size: audioBuffer.length });

    try {
      // 1. Prepare Audio for A2F (e.g. WAV conversion if needed, or sending raw bytes)
      // Convert Buffer to Uint8Array for fetch compatibility
      const bodyData = new Uint8Array(audioBuffer);
      
      const response = await fetch(`${this.serverUrl}/a2f/audio-stream`, {
          method: 'POST',
          headers: {
              'Content-Type': 'audio/wav', // Assuming input is wav or handled
              'X-Session-ID': sessionId
          },
          body: bodyData
      });

      if (!response.ok) {
          throw new Error(`A2F Processing Failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 2. Parse BS weights
      // Expected format: { time_codes: [], blendshapes: [] }
      const lipSyncData: LipSyncFrame[] = this.parseA2FResponse(result);

      return {
        success: true,
        lipSyncData,
        metrics: {
            processingTimeMs: Date.now() - startTime,
            audioDurationMs: options.audioLengthMs || 0
        }
      };

    } catch (error) {
       logger.error('Audio2Face Processing Error', error instanceof Error ? error : new Error(String(error)));
       return { success: false, lipSyncData: [], error: String(error) };
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    // Cleanup if needed
  }
  
  private parseA2FResponse(data: any): LipSyncFrame[] {
      // Implementation depends on specific A2F version output
      // Minimal mapping
      if (!data || !data.blendshapes) return [];
      
      return data.blendshapes.map((frame: any, idx: number) => ({
          timestampMs: (data.time_codes ? data.time_codes[idx] : idx / 60) * 1000,
          jawOpen: frame['jawOpen'] || 0,
          mouthClose: frame['mouthClose'] || 0,
          mouthFunnel: frame['mouthFunnel'] || 0,
          mouthPucker: frame['mouthPucker'] || 0,
          mouthLeft: frame['mouthLeft'] || 0,
          mouthRight: frame['mouthRight'] || 0,
          mouthRollLower: frame['mouthRollLower'] || 0,
          mouthSmile: frame['mouthSmile'] || 0,
          mouthShrugUpper: frame['mouthShrugUpper'] || 0,
          tongueOut: frame['tongueOut'] || 0
      }));
  }
}

export const audio2FaceService = new Audio2FaceService();
