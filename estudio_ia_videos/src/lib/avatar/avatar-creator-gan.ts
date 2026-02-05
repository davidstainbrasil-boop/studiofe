import { z } from 'zod';

/**
 * Dynamic Avatar Creator with GAN + Diffusion Models
 * Creates unique, photorealistic avatars on-demand
 */

// Avatar Creation Request Schema
export const AvatarCreationRequestSchema = z.object({
  // Text description of desired avatar
  prompt: z.string().min(10).max(500),

  // Base characteristics
  gender: z.enum(['male', 'female', 'non_binary']),
  age: z.number().min(18).max(80),
  ethnicity: z.enum([
    'white',
    'black',
    'asian',
    'hispanic',
    'middle_eastern',
    'south_asian',
    'mixed',
  ]),

  // Style preferences
  style: z.enum(['professional', 'casual', 'creative', 'technical', 'academic', 'corporate']),
  hairStyle: z.string().optional(),
  eyeColor: z.enum(['blue', 'brown', 'green', 'hazel', 'gray', 'amber']).optional(),

  // Technical settings
  quality: z.enum(['fast', 'standard', 'high', 'ultra']),
  resolution: z.tuple([z.number(), z.number()]).default([1024, 1024]),
  numberOfVariations: z.number().min(1).max(4).default(1),

  // Advanced options
  includeFullBody: z.boolean().default(false),
  background: z.enum(['transparent', 'studio', 'office', 'outdoor', 'custom']).default('studio'),
  customBackgroundPrompt: z.string().optional(),
});

export type AvatarCreationRequest = z.infer<typeof AvatarCreationRequestSchema>;

// Generated Avatar Schema
export const GeneratedAvatarSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  generationTime: z.number(),
  createdAt: z.string().datetime(),

  // Generated assets
  assets: z.object({
    faceTexture: z.string().url(),
    fullBodyTexture: z.string().url().optional(),
    normalMap: z.string().url(),
    displacementMap: z.string().url(),
    alphaMask: z.string().url(),

    // Thumbnails
    thumbnail: z.string().url(),
    preview: z.string().url(),

    // 3D model files
    glbModel: z.string().url(),
    objModel: z.string().url().optional(),
    fbxModel: z.string().url().optional(),
  }),

  // Avatar metadata
  metadata: z.object({
    estimatedAge: z.number(),
    detectedGender: z.enum(['male', 'female', 'non_binary']),
    detectedEthnicity: z.string(),
    quality: z.number().min(0).max(1),
    uniqueness: z.number().min(0).max(1),
    photorealism: z.number().min(0).max(1),
  }),

  // Animation compatibility
  rigging: z.object({
    facialBlendShapes: z.number(),
    bodyRigging: z.boolean(),
    eyeTracking: z.boolean(),
    lipSyncReady: z.boolean(),
    compatibleEngines: z.array(z.enum(['unreal', 'unity', 'threejs', 'blender'])),
  }),

  // Style variations
  variations: z.array(
    z.object({
      id: z.string(),
      variationType: z.enum(['age', 'expression', 'lighting', 'angle']),
      imageUrl: z.string().url(),
      score: z.number().min(0).max(1),
    }),
  ),
});

export type GeneratedAvatar = z.infer<typeof GeneratedAvatarSchema>;

/**
 * Avatar Creation Pipeline
 */
export class AvatarCreationPipeline {
  private readonly DIFFUSION_MODEL_URL = process.env.DIFFUSION_API_URL;
  private readonly GAN_MODEL_URL = process.env.GAN_API_URL;
  private readonly STABLE_DIFFUSION_KEY = process.env.STABLE_DIFFUSION_KEY;

  constructor() {
    if (!this.DIFFUSION_MODEL_URL || !this.GAN_MODEL_URL) {
      throw new Error('Avatar creation API endpoints not configured');
    }
  }

  /**
   * Create a unique avatar from text prompt
   */
  async createAvatar(request: AvatarCreationRequest): Promise<GeneratedAvatar> {
    const startTime = Date.now();
    const validatedRequest = AvatarCreationRequestSchema.parse(request);

    try {
      // Step 1: Generate base face with diffusion model
      const faceTexture = await this.generateFaceTexture(validatedRequest);

      // Step 2: Enhance with GAN for photorealism
      const enhancedFace = await this.enhanceWithGAN(faceTexture, validatedRequest);

      // Step 3: Generate 3D model
      const model3D = await this.generate3DModel(enhancedFace, validatedRequest);

      // Step 4: Create rigging and blend shapes
      const rigging = await this.createRigging(model3D, validatedRequest);

      // Step 5: Generate variations
      const variations = await this.generateVariations(enhancedFace, validatedRequest);

      // Step 6: Assemble final avatar
      const avatar: GeneratedAvatar = {
        id: `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        prompt: validatedRequest.prompt,
        generationTime: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        assets: {
          faceTexture: enhancedFace.faceUrl,
          fullBodyTexture: enhancedFace.fullBodyUrl,
          normalMap: enhancedFace.normalMapUrl,
          displacementMap: enhancedFace.displacementMapUrl,
          alphaMask: enhancedFace.alphaMaskUrl,
          thumbnail: enhancedFace.thumbnailUrl,
          preview: enhancedFace.previewUrl,
          glbModel: model3D.glbUrl,
          objModel: model3D.objUrl,
          fbxModel: model3D.fbxUrl,
        },
        metadata: {
          estimatedAge: enhancedFace.estimatedAge,
          detectedGender: enhancedFace.detectedGender,
          detectedEthnicity: enhancedFace.detectedEthnicity,
          quality: enhancedFace.quality,
          uniqueness: enhancedFace.uniqueness,
          photorealism: enhancedFace.photorealism,
        },
        rigging,
        variations,
      };

      return avatar;
    } catch (error) {
      console.error('Avatar creation failed:', error);
      throw new Error(
        `Failed to create avatar: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate base face texture using diffusion models
   */
  private async generateFaceTexture(request: AvatarCreationRequest): Promise<{
    faceUrl: string;
    confidence: number;
  }> {
    const prompt = this.buildDiffusionPrompt(request);

    const response = await fetch(`${this.DIFFUSION_MODEL_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.STABLE_DIFFUSION_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt:
          'cartoon, anime, painting, drawing, illustration, 3d render, blurry, low quality, distorted, deformed',
        width: request.resolution[0],
        height: request.resolution[1],
        num_images: 1,
        guidance_scale: 7.5,
        num_inference_steps:
          request.quality === 'ultra' ? 100 : request.quality === 'high' ? 75 : 50,
        seed: -1, // Random seed for uniqueness
        scheduler: 'DPMSolverMultistepScheduler',
        model: request.quality === 'ultra' ? 'realistic-vision-v5.1' : 'realistic-vision-v4.0',
      }),
    });

    if (!response.ok) {
      throw new Error(`Diffusion model error: ${response.status}`);
    }

    const result = await response.json();
    return {
      faceUrl: result.images[0].url,
      confidence: result.images[0].confidence || 0.8,
    };
  }

  /**
   * Enhance face texture with GAN for photorealism
   */
  private async enhanceWithGAN(
    faceTexture: { faceUrl: string; confidence: number },
    request: AvatarCreationRequest,
  ): Promise<{
    faceUrl: string;
    fullBodyUrl?: string;
    normalMapUrl: string;
    displacementMapUrl: string;
    alphaMaskUrl: string;
    thumbnailUrl: string;
    previewUrl: string;
    estimatedAge: number;
    detectedGender: 'male' | 'female' | 'non_binary';
    detectedEthnicity: string;
    quality: number;
    uniqueness: number;
    photorealism: number;
  }> {
    const response = await fetch(`${this.GAN_MODEL_URL}/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: faceTexture.faceUrl,
        targetResolution: request.resolution,
        enhanceLevel: request.quality,
        generateFullBody: request.includeFullBody,
        generateMaps: true,
        analyzeFeatures: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`GAN enhancement error: ${response.status}`);
    }

    const result = await response.json();
    return {
      faceUrl: result.enhancedFace.url,
      fullBodyUrl: result.fullBody?.url,
      normalMapUrl: result.normalMap.url,
      displacementMapUrl: result.displacementMap.url,
      alphaMaskUrl: result.alphaMask.url,
      thumbnailUrl: result.thumbnail.url,
      previewUrl: result.preview.url,
      estimatedAge: result.analysis.estimatedAge,
      detectedGender: result.analysis.gender,
      detectedEthnicity: result.analysis.ethnicity,
      quality: result.quality,
      uniqueness: result.uniqueness,
      photorealism: result.photorealism,
    };
  }

  /**
   * Generate 3D model from enhanced face
   */
  private async generate3DModel(
    enhancedFace: any,
    request: AvatarCreationRequest,
  ): Promise<{
    glbUrl: string;
    objUrl?: string;
    fbxUrl?: string;
  }> {
    const response = await fetch(`${this.GAN_MODEL_URL}/generate-3d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faceTextureUrl: enhancedFace.faceUrl,
        normalMapUrl: enhancedFace.normalMapUrl,
        displacementMapUrl: enhancedFace.displacementMapUrl,
        alphaMaskUrl: enhancedFace.alphaMaskUrl,
        quality: request.quality,
        includeFullBody: request.includeFullBody,
        optimizeFor: ['webgl', 'unreal', 'unity'],
      }),
    });

    if (!response.ok) {
      throw new Error(`3D model generation error: ${response.status}`);
    }

    const result = await response.json();
    return {
      glbUrl: result.models.glb.url,
      objUrl: result.models.obj?.url,
      fbxUrl: result.models.fbx?.url,
    };
  }

  /**
   * Create rigging and blend shapes for animation
   */
  private async createRigging(
    model3D: any,
    request: AvatarCreationRequest,
  ): Promise<GeneratedAvatar['rigging']> {
    const response = await fetch(`${this.GAN_MODEL_URL}/rig`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelUrl: model3D.glbUrl,
        riggingType: 'advanced',
        includeFaceRigging: true,
        includeBodyRigging: request.includeFullBody,
        blendShapeCount: request.quality === 'ultra' ? 52 : 32,
      }),
    });

    if (!response.ok) {
      throw new Error(`Rigging creation error: ${response.status}`);
    }

    const result = await response.json();
    return {
      facialBlendShapes: result.facialBlendShapes.count,
      bodyRigging: result.bodyRigging.enabled,
      eyeTracking: result.eyeTracking.enabled,
      lipSyncReady: result.lipSyncReady,
      compatibleEngines: result.compatibleEngines,
    };
  }

  /**
   * Generate variations of the avatar
   */
  private async generateVariations(
    enhancedFace: any,
    request: AvatarCreationRequest,
  ): Promise<GeneratedAvatar['variations']> {
    if (request.numberOfVariations <= 1) {
      return [];
    }

    const response = await fetch(`${this.DIFFUSION_MODEL_URL}/variations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.STABLE_DIFFUSION_KEY}`,
      },
      body: JSON.stringify({
        imageUrl: enhancedFace.faceUrl,
        numberOfVariations: request.numberOfVariations - 1,
        variationStrength: 0.15,
        variationTypes: ['age', 'expression', 'lighting', 'angle'],
        preserveIdentity: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Variations generation error: ${response.status}`);
    }

    const result = await response.json();
    return result.variations.map((variation: any, index: number) => ({
      id: `var_${Date.now()}_${index}`,
      variationType: variation.type,
      imageUrl: variation.url,
      score: variation.score,
    }));
  }

  /**
   * Build optimized diffusion prompt from request
   */
  private buildDiffusionPrompt(request: AvatarCreationRequest): string {
    const parts = [
      `professional headshot of a ${request.age}-year-old ${request.ethnicity} ${request.gender}`,
      request.style === 'professional'
        ? 'wearing business attire'
        : request.style === 'casual'
          ? 'wearing casual clothes'
          : request.style === 'creative'
            ? 'with artistic style'
            : request.style === 'technical'
              ? 'with technical appearance'
              : request.style === 'academic'
                ? 'with academic look'
                : request.style === 'corporate'
                  ? 'corporate executive style'
                  : '',
    ];

    if (request.hairStyle) {
      parts.push(`${request.hairStyle} hairstyle`);
    }

    if (request.eyeColor) {
      parts.push(`${request.eyeColor} eyes`);
    }

    parts.push('photorealistic, high detail, sharp focus, natural lighting');

    if (request.background !== 'transparent') {
      parts.push(
        request.background === 'studio'
          ? 'studio background'
          : request.background === 'office'
            ? 'office background'
            : request.background === 'outdoor'
              ? 'natural outdoor lighting'
              : request.customBackgroundPrompt || '',
      );
    }

    return parts.join(', ');
  }

  /**
   * Get avatar creation queue status
   */
  async getQueueStatus(): Promise<{
    queuedJobs: number;
    processingJobs: number;
    averageWaitTime: number;
    estimatedCapacity: number;
  }> {
    const response = await fetch(`${this.DIFFUSION_MODEL_URL}/queue/status`);
    return await response.json();
  }

  /**
   * Delete created avatar assets
   */
  async deleteAvatar(avatarId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.DIFFUSION_MODEL_URL}/avatar/${avatarId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to delete avatar ${avatarId}:`, error);
      return false;
    }
  }
}

/**
 * Avatar Creator Factory
 */
export function createAvatarCreator(): AvatarCreationPipeline {
  return new AvatarCreationPipeline();
}

/**
 * High-Performance Avatar Cache
 */
export class AvatarCache {
  private cache = new Map<string, { avatar: GeneratedAvatar; timestamp: number }>();
  private maxSize = 100;
  private ttl = 30 * 60 * 1000; // 30 minutes

  set(key: string, avatar: GeneratedAvatar): void {
    // Remove oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Set with expiration
    const item = { avatar, timestamp: Date.now() };
    this.cache.set(key, item);
  }

  get(key: string): GeneratedAvatar | null {
    const item = this.cache.get(key) as any;
    if (!item) return null;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.avatar;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const avatarCache = new AvatarCache();
