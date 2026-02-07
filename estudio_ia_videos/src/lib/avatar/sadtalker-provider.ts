/**
 * SadTalker Provider - Stylized Audio-Driven Talking Face Animation
 *
 * Open-source talking head from single image:
 * - CVPR 2023 paper
 * - Realistic 3D motion coefficients
 * - Works with any portrait photo
 *
 * Options:
 * 1. Local installation (free, requires GPU)
 * 2. Replicate API (~$0.05/video)
 * 3. Hugging Face Spaces (free but slower)
 *
 * @see https://github.com/OpenTalker/SadTalker
 */

import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

export interface SadTalkerConfig {
  provider: 'local' | 'replicate' | 'huggingface';
  apiKey?: string;
  localEndpoint?: string;
}

export interface SadTalkerInput {
  sourceImage: string;  // URL or base64 of face image
  audioUrl: string;     // URL of audio file
  preprocess?: 'crop' | 'resize' | 'full';
  stillMode?: boolean;  // Less head motion
  enhancer?: 'gfpgan' | 'RestoreFormer' | null;
  batchSize?: number;
  poseStyle?: number;   // 0-45, controls pose variation
  expressionScale?: number; // 0-3, controls expression intensity
}

export interface SadTalkerResult {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  error?: string;
}

// =============================================================================
// SadTalker Provider Implementation
// =============================================================================

export class SadTalkerProvider {
  private config: SadTalkerConfig;

  constructor(config?: Partial<SadTalkerConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey || process.env.REPLICATE_API_TOKEN,
      localEndpoint: config?.localEndpoint || process.env.SADTALKER_LOCAL_ENDPOINT || 'http://localhost:7860',
    };
  }

  private detectProvider(): 'local' | 'replicate' | 'huggingface' {
    if (process.env.SADTALKER_LOCAL_ENDPOINT) return 'local';
    if (process.env.REPLICATE_API_TOKEN) return 'replicate';
    return 'huggingface'; // Free fallback
  }

  /**
   * Generate talking head video
   */
  async generate(input: SadTalkerInput): Promise<SadTalkerResult> {
    logger.info('SadTalker: Starting generation', {
      provider: this.config.provider,
      preprocess: input.preprocess || 'crop',
    });

    try {
      switch (this.config.provider) {
        case 'local':
          return await this.generateLocal(input);
        case 'replicate':
          return await this.generateReplicate(input);
        case 'huggingface':
          return await this.generateHuggingFace(input);
        default:
          return { success: false, error: 'No provider configured' };
      }
    } catch (error) {
      logger.error('SadTalker generation failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Local Gradio installation
   */
  private async generateLocal(input: SadTalkerInput): Promise<SadTalkerResult> {
    // Gradio API format
    const response = await fetch(`${this.config.localEndpoint}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          input.sourceImage,
          input.audioUrl,
          input.preprocess || 'crop',
          input.stillMode ?? false,
          input.enhancer === 'gfpgan',
          input.batchSize || 2,
          input.poseStyle || 0,
          input.expressionScale || 1.0,
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Local SadTalker error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      videoUrl: data.data?.[0],
    };
  }

  /**
   * Replicate API (~$0.05/video)
   * @see https://replicate.com/cjwbw/sadtalker
   */
  private async generateReplicate(input: SadTalkerInput): Promise<SadTalkerResult> {
    if (!this.config.apiKey) {
      return { success: false, error: 'REPLICATE_API_TOKEN not configured' };
    }

    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'cjwbw/sadtalker:latest',
        input: {
          source_image: input.sourceImage,
          driven_audio: input.audioUrl,
          preprocess: input.preprocess || 'crop',
          still_mode: input.stillMode ?? false,
          enhancer: input.enhancer || null,
          batch_size: input.batchSize || 2,
          pose_style: input.poseStyle || 0,
          expression_scale: input.expressionScale || 1.0,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Replicate error: ${error.detail || createResponse.status}`);
    }

    const prediction = await createResponse.json();
    const result = await this.pollReplicatePrediction(prediction.id);

    return {
      success: true,
      videoUrl: result.output,
      duration: result.metrics?.predict_time,
    };
  }

  private async pollReplicatePrediction(id: string, maxAttempts = 120): Promise<{
    output: string;
    metrics?: { predict_time: number };
  }> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { 'Authorization': `Token ${this.config.apiKey}` },
      });

      const data = await response.json();

      if (data.status === 'succeeded') {
        return data;
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Prediction failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Prediction timeout');
  }

  /**
   * Hugging Face Spaces (free but slower)
   * @see https://huggingface.co/spaces/vinthony/SadTalker
   */
  private async generateHuggingFace(input: SadTalkerInput): Promise<SadTalkerResult> {
    const response = await fetch('https://vinthony-sadtalker.hf.space/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          input.sourceImage,
          input.audioUrl,
          input.preprocess || 'crop',
          input.stillMode ?? false,
          false, // enhancer
          2, // batch_size
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      videoUrl: data.data?.[0],
    };
  }

  isAvailable(): boolean {
    return true; // HuggingFace is always available as fallback
  }

  getProviderInfo(): {
    name: string;
    provider: string;
    isConfigured: boolean;
    estimatedCost: string;
  } {
    return {
      name: 'SadTalker',
      provider: this.config.provider,
      isConfigured: true,
      estimatedCost: this.config.provider === 'huggingface' ? 'Free' : '~$0.05/video',
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: SadTalkerProvider | null = null;

export function getSadTalkerProvider(): SadTalkerProvider {
  if (!instance) {
    instance = new SadTalkerProvider();
  }
  return instance;
}

export default SadTalkerProvider;
