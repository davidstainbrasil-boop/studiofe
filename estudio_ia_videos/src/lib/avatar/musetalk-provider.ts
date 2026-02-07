/**
 * MuseTalk Provider - Real-Time High Quality Lip Sync
 *
 * Open-source talking head generation:
 * - 30fps+ real-time lip sync
 * - MIT License (comercial OK)
 * - Supports multiple languages
 *
 * Options:
 * 1. Local Docker installation (free, requires GPU)
 * 2. Replicate API (~$0.42/video)
 * 3. fal.ai API
 *
 * @see https://github.com/TMElyralab/MuseTalk
 */

import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

export interface MuseTalkConfig {
  provider: 'local' | 'replicate' | 'fal';
  apiKey?: string;
  localEndpoint?: string;
}

export interface MuseTalkInput {
  sourceImage: string; // URL or base64 of the face image
  audioUrl: string;    // URL of the audio file
  fps?: number;        // Output FPS (default: 25)
  enhanceFace?: boolean; // Apply face enhancement
}

export interface MuseTalkResult {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  error?: string;
}

// =============================================================================
// MuseTalk Provider Implementation
// =============================================================================

export class MuseTalkProvider {
  private config: MuseTalkConfig;

  constructor(config?: Partial<MuseTalkConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey || process.env.REPLICATE_API_TOKEN || process.env.FAL_API_KEY,
      localEndpoint: config?.localEndpoint || process.env.MUSETALK_LOCAL_ENDPOINT || 'http://localhost:7866',
    };
  }

  /**
   * Detect best available provider
   */
  private detectProvider(): 'local' | 'replicate' | 'fal' {
    if (process.env.MUSETALK_LOCAL_ENDPOINT) return 'local';
    if (process.env.REPLICATE_API_TOKEN) return 'replicate';
    if (process.env.FAL_API_KEY) return 'fal';
    return 'replicate'; // Default
  }

  /**
   * Generate talking head video
   */
  async generate(input: MuseTalkInput): Promise<MuseTalkResult> {
    logger.info('MuseTalk: Starting generation', {
      provider: this.config.provider,
      hasAudio: !!input.audioUrl,
      hasImage: !!input.sourceImage,
    });

    try {
      switch (this.config.provider) {
        case 'local':
          return await this.generateLocal(input);
        case 'replicate':
          return await this.generateReplicate(input);
        case 'fal':
          return await this.generateFal(input);
        default:
          return { success: false, error: 'No provider configured' };
      }
    } catch (error) {
      logger.error('MuseTalk generation failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Local Docker MuseTalk
   */
  private async generateLocal(input: MuseTalkInput): Promise<MuseTalkResult> {
    const response = await fetch(`${this.config.localEndpoint}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_image: input.sourceImage,
        audio_url: input.audioUrl,
        fps: input.fps || 25,
        enhance_face: input.enhanceFace ?? true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local MuseTalk error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      videoUrl: data.video_url,
      duration: data.duration,
    };
  }

  /**
   * Replicate API (~$0.42/video)
   * @see https://replicate.com/douwantech/musetalk
   */
  private async generateReplicate(input: MuseTalkInput): Promise<MuseTalkResult> {
    if (!this.config.apiKey) {
      return { success: false, error: 'REPLICATE_API_TOKEN not configured' };
    }

    // Create prediction
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'latest', // Will use latest musetalk version
        input: {
          source_image: input.sourceImage,
          audio: input.audioUrl,
          fps: input.fps || 25,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Replicate error: ${error.detail || createResponse.status}`);
    }

    const prediction = await createResponse.json();

    // Poll for completion
    const result = await this.pollReplicatePrediction(prediction.id);

    return {
      success: true,
      videoUrl: result.output,
      duration: result.metrics?.predict_time,
    };
  }

  /**
   * Poll Replicate prediction until complete
   */
  private async pollReplicatePrediction(id: string, maxAttempts = 60): Promise<{
    output: string;
    metrics?: { predict_time: number };
  }> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
        },
      });

      const data = await response.json();

      if (data.status === 'succeeded') {
        return data;
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Prediction failed');
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Prediction timeout');
  }

  /**
   * fal.ai API
   * @see https://fal.ai/models/fal-ai/musetalk/api
   */
  private async generateFal(input: MuseTalkInput): Promise<MuseTalkResult> {
    if (!this.config.apiKey) {
      return { success: false, error: 'FAL_API_KEY not configured' };
    }

    const response = await fetch('https://fal.run/fal-ai/musetalk', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image_url: input.sourceImage,
        audio_url: input.audioUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`fal.ai error: ${error.message || response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      videoUrl: data.video?.url,
      duration: data.duration,
    };
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    switch (this.config.provider) {
      case 'local':
        return !!this.config.localEndpoint;
      case 'replicate':
        return !!process.env.REPLICATE_API_TOKEN;
      case 'fal':
        return !!process.env.FAL_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Get provider info
   */
  getProviderInfo(): {
    name: string;
    provider: string;
    isConfigured: boolean;
    estimatedCost: string;
  } {
    return {
      name: 'MuseTalk',
      provider: this.config.provider,
      isConfigured: this.isAvailable(),
      estimatedCost: this.config.provider === 'local' ? 'Free' : '~$0.42/video',
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: MuseTalkProvider | null = null;

export function getMuseTalkProvider(): MuseTalkProvider {
  if (!instance) {
    instance = new MuseTalkProvider();
  }
  return instance;
}

export default MuseTalkProvider;
