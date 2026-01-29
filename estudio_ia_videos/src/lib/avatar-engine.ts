/**
 * Avatar Engine
 * Orquestrador de rendering de avatares (escolhe engine apropriado)
 */

import { UE5AvatarEngine, UE5AvatarOptions } from './engines/ue5-avatar-engine';
import { logger } from '@lib/logger';
import { LocalAvatarRenderer, AvatarConfig } from './local-avatar-renderer';
import { HeyGenAvatarEngine, HeyGenAvatarOptions } from './engines/heygen-avatar-engine';
import { LipSyncFrame, audio2FaceService } from './services/audio2face-service';
import { avatarRegistry, AvatarDefinition } from './avatars/avatar-registry';
import fs from 'fs/promises';

export type { LipSyncFrame };

export interface Avatar3DModel extends AvatarDefinition {
  modelUrl?: string;
  lipSyncAccuracy?: number;
  ageRange?: string;
}

export type AvatarEngineType = 'ue5' | 'local' | 'heygen' | 'auto';

export interface RenderRequest {
  engine?: AvatarEngineType;
  duration: number;
  config: Partial<UE5AvatarOptions> & Partial<AvatarConfig> & Partial<HeyGenAvatarOptions>;
}

export type AvatarRenderResult = 
  | { type: 'frames', frames: Buffer[] }
  | { type: 'video', jobId: string, status: string, url?: string };

export interface ThreeMesh {
  morphTargetDictionary?: Record<string, number>;
  morphTargetInfluences?: number[];
}

export class AvatarEngine {
  private static instance: AvatarEngine;
  private ue5 = new UE5AvatarEngine();
  // Local renderer is considered a placeholder/fallback, so we might want to avoid it in strict production
  // unless explicitly requested for simple 2D generation.
  private local = new LocalAvatarRenderer();
  private heygen = new HeyGenAvatarEngine();
  
  static getInstance(): AvatarEngine {
    if (!AvatarEngine.instance) {
      AvatarEngine.instance = new AvatarEngine();
    }
    return AvatarEngine.instance;
  }
  
  getAllAvatars() {
    return avatarRegistry.getAll();
  }

  getAvatar(id: string): Avatar3DModel | undefined {
    const avatar = avatarRegistry.getById(id);
    if (!avatar) return undefined;
    
    const metadata = (avatar.metadata as Record<string, unknown>) || {};
    return {
      ...avatar,
      modelUrl: metadata.modelUrl as string | undefined,
      lipSyncAccuracy: (metadata.lipSyncAccuracy as number) || 95,
      ageRange: metadata.age_range as string | undefined
    };
  }
  
  async render(request: RenderRequest): Promise<AvatarRenderResult> {
    const engine = await this.selectEngine(request.engine);
    
    switch (engine) {
      case 'heygen':
        const heyGenResult = await this.heygen.render(request.config as HeyGenAvatarOptions);
        return { 
          type: 'video', 
          jobId: heyGenResult.jobId, 
          status: heyGenResult.status, 
          url: heyGenResult.videoUrl 
        };

      case 'ue5':
        const ue5Result = await this.ue5.render(request.config as UE5AvatarOptions, request.duration);
        return { type: 'frames', frames: ue5Result.frames };
        
      case 'local':
        // If explicitly requested, we allow it, but we warn it might be basic.
        // For 'REAL' production, this should ideally be a real renderer (e.g. ffmpeg based or similar).
        // Since LocalAvatarRenderer is just drawing circles, we should probably throw if strict mode is on.
        // However, if the user wants "Real" and we don't have UE5/HeyGen, failing is better than fake circles.
        if (process.env.STRICT_REAL_MODE === 'true') {
             throw new Error('Local placeholder renderer is disabled in strict real mode.');
        }
        const fps = 30;
        const totalFrames = Math.floor(request.duration * fps);
        const frames = await this.local.renderSequence(request.config as AvatarConfig, totalFrames);
        return { type: 'frames', frames };
        
      default:
        throw new Error(`Unsupported engine: ${engine}`);
    }
  }
  
  private async selectEngine(preferred?: AvatarEngineType): Promise<AvatarEngineType> {
    if (preferred === 'heygen') return 'heygen';

    if (preferred === 'ue5') {
      const available = await this.ue5.isAvailable();
      if (available) return 'ue5';
      // Fail if preferred engine is not available
      throw new Error('UE5 Engine requested but not available');
    }
    
    if (preferred === 'local') return 'local';
    
    // Auto selection logic
    // 1. Try UE5
    const ue5Available = await this.ue5.isAvailable();
    if (ue5Available) return 'ue5';

    // 2. Try HeyGen (needs config check usually, but assuming available if configured)
    // We don't default to HeyGen usually due to cost, unless specifically configured.
    
    // 3. Fail instead of falling back to 'local' (placeholder)
    throw new Error('No suitable Avatar Engine available (UE5 missing, Local disabled for auto)');
  }

  async checkHeyGenStatus(jobId: string) {
    return this.heygen.checkStatus(jobId);
  }

  async generateLipSyncFrames(text: string, audioUrl: string, duration: number): Promise<LipSyncFrame[]> {
    try {
      // Create a session
      const sessionId = await audio2FaceService.createSession();
      
      // Fetch audio
      let audioBuffer: Buffer;
      if (audioUrl.startsWith('http')) {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      } else {
        // Read local file
        try {
            audioBuffer = await fs.readFile(audioUrl);
        } catch (e) {
            throw new Error(`Failed to read local audio file: ${audioUrl}`);
        }
      }

      const result = await audio2FaceService.processAudio(sessionId, audioBuffer, {
        audioLengthMs: duration * 1000,
        includeMetrics: true
      });

      await audio2FaceService.destroySession(sessionId);

      if (result.success) {
        return result.lipSyncData;
      } else {
        const errorMsg = 'error' in result ? result.error : 'Unknown error';
        logger.error('LipSync generation failed', new Error(String(errorMsg)), { component: 'AvatarEngine' });
        throw new Error(`LipSync generation failed: ${errorMsg}`);
      }
    } catch (error) {
      logger.error('Error generating lip sync frames', error instanceof Error ? error : new Error(String(error)), { component: 'AvatarEngine' });
      throw error; // Fail fast
    }
  }

  getLipSyncFrameAtTime(frames: LipSyncFrame[], time: number): LipSyncFrame | undefined {
    if (!frames || frames.length === 0) return undefined;
    const timeMs = time;
    return frames.reduce((prev, curr) => {
      return (Math.abs(curr.timestampMs - timeMs) < Math.abs(prev.timestampMs - timeMs) ? curr : prev);
    });
  }

  applyBlendShapes(mesh: ThreeMesh, frame: LipSyncFrame, emotion?: string, emotionIntensity: number = 1.0) {
    if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    // Apply Lip Sync
    const map: Record<string, number | undefined> = {
      jawOpen: frame.jawOpen,
      mouthClose: frame.mouthClose,
      mouthFunnel: frame.mouthFunnel,
      mouthPucker: frame.mouthPucker,
      mouthLeft: frame.mouthLeft,
      mouthRight: frame.mouthRight,
      mouthRollLower: frame.mouthRollLower,
      tongueOut: frame.tongueOut,
      mouthSmile: frame.mouthSmile,
      mouthShrugUpper: frame.mouthShrugUpper
    };

    Object.entries(map).forEach(([name, value]) => {
      if (value !== undefined) {
        const index = mesh.morphTargetDictionary![name];
        if (index !== undefined) {
          mesh.morphTargetInfluences![index] = value;
        }
      }
    });
    
    // Apply Emotion Overlay
    if (emotion && emotion !== 'neutral') {
      this.applyEmotion(mesh, emotion, emotionIntensity);
    }
  }

  private applyEmotion(mesh: ThreeMesh, emotion: string, intensity: number) {
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    // Standard ARKit blend shapes for basic emotions
    const emotionMap: Record<string, Record<string, number>> = {
      happy: {
        mouthSmileLeft: 0.7,
        mouthSmileRight: 0.7,
        cheekSquintLeft: 0.5,
        cheekSquintRight: 0.5,
        eyeSquintLeft: 0.3,
        eyeSquintRight: 0.3
      },
      sad: {
        mouthFrownLeft: 0.7,
        mouthFrownRight: 0.7,
        browInnerUp: 0.8,
        eyeSquintLeft: 0.2,
        eyeSquintRight: 0.2
      },
      angry: {
        browDownLeft: 0.9,
        browDownRight: 0.9,
        mouthFrownLeft: 0.5,
        mouthFrownRight: 0.5,
        noseSneerLeft: 0.7,
        noseSneerRight: 0.7
      },
      surprised: {
        browOuterUpLeft: 0.8,
        browOuterUpRight: 0.8,
        eyeWideLeft: 0.6,
        eyeWideRight: 0.6,
        jawOpen: 0.2
      },
      fear: {
        browInnerUp: 0.8,
        browOuterUpLeft: 0.3,
        browOuterUpRight: 0.3,
        eyeWideLeft: 0.7,
        eyeWideRight: 0.7,
        mouthStretchLeft: 0.4,
        mouthStretchRight: 0.4
      }
    };

    const shapes = emotionMap[emotion];
    if (shapes) {
      Object.entries(shapes).forEach(([shapeName, targetValue]) => {
        const index = mesh.morphTargetDictionary![shapeName];
        if (index !== undefined) {
          const existing = mesh.morphTargetInfluences![index];
          mesh.morphTargetInfluences![index] = Math.min(1.0, existing + (targetValue * intensity));
        }
      });
    }
  }
}

export const avatarEngine = new AvatarEngine();
