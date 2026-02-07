/**
 * Unified Avatar Provider
 *
 * Aggregates avatars from multiple providers:
 * - D-ID (realistic talking heads)
 * - HeyGen (AI avatars)
 * - Ready Player Me (3D avatars)
 * - Synthesia (corporate avatars)
 */

import { Logger } from '@lib/logger';

const logger = new Logger('unified-avatar-provider');

// =============================================================================
// Types
// =============================================================================

export type AvatarProvider = 'did' | 'heygen' | 'rpm' | 'synthesia' | 'local';

export interface UnifiedAvatar {
  id: string;
  name: string;
  provider: AvatarProvider;
  thumbnailUrl: string;
  previewUrl?: string;
  gender: 'male' | 'female' | 'neutral';
  languages: string[];
  style: 'realistic' | '3d' | 'cartoon' | 'professional';
  isPremium: boolean;
  capabilities: {
    lipSync: boolean;
    expressions: boolean;
    gestures: boolean;
    customBackground: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface AvatarRenderRequest {
  avatarId: string;
  provider: AvatarProvider;
  audioUrl: string;
  text?: string;
  backgroundUrl?: string;
  outputFormat?: 'mp4' | 'webm';
  resolution?: '720p' | '1080p' | '4k';
}

export interface AvatarRenderResult {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  cost?: number;
  error?: string;
}

// =============================================================================
// Provider Configurations
// =============================================================================

interface ProviderConfig {
  name: string;
  apiKeyEnv: string;
  baseUrl: string;
  enabled: boolean;
}

const PROVIDER_CONFIGS: Record<AvatarProvider, ProviderConfig> = {
  did: {
    name: 'D-ID',
    apiKeyEnv: 'DID_API_KEY',
    baseUrl: 'https://api.d-id.com',
    enabled: true,
  },
  heygen: {
    name: 'HeyGen',
    apiKeyEnv: 'HEYGEN_API_KEY',
    baseUrl: 'https://api.heygen.com',
    enabled: true,
  },
  rpm: {
    name: 'Ready Player Me',
    apiKeyEnv: 'RPM_API_KEY',
    baseUrl: 'https://api.readyplayer.me',
    enabled: true,
  },
  synthesia: {
    name: 'Synthesia',
    apiKeyEnv: 'SYNTHESIA_API_KEY',
    baseUrl: 'https://api.synthesia.io',
    enabled: true,
  },
  local: {
    name: 'Local Avatars',
    apiKeyEnv: '',
    baseUrl: '',
    enabled: true,
  },
};

// =============================================================================
// Default Local Avatars
// =============================================================================

const LOCAL_AVATARS: UnifiedAvatar[] = [
  {
    id: 'local-instructor-male',
    name: 'Instrutor Carlos',
    provider: 'local',
    thumbnailUrl: '/avatars/instructor-male.jpg',
    gender: 'male',
    languages: ['pt-BR', 'en-US'],
    style: 'professional',
    isPremium: false,
    capabilities: {
      lipSync: false,
      expressions: false,
      gestures: false,
      customBackground: true,
    },
  },
  {
    id: 'local-instructor-female',
    name: 'Instrutora Ana',
    provider: 'local',
    thumbnailUrl: '/avatars/instructor-female.jpg',
    gender: 'female',
    languages: ['pt-BR', 'en-US'],
    style: 'professional',
    isPremium: false,
    capabilities: {
      lipSync: false,
      expressions: false,
      gestures: false,
      customBackground: true,
    },
  },
];

// =============================================================================
// Provider Base Class
// =============================================================================

abstract class BaseAvatarProvider {
  protected apiKey: string | undefined;
  protected baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = process.env[config.apiKeyEnv];
    this.baseUrl = config.baseUrl;
  }

  abstract listAvatars(): Promise<UnifiedAvatar[]>;
  abstract renderVideo(request: AvatarRenderRequest): Promise<AvatarRenderResult>;
  abstract checkStatus(jobId: string): Promise<{ status: string; videoUrl?: string }>;

  get isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// =============================================================================
// D-ID Provider
// =============================================================================

class DIDProvider extends BaseAvatarProvider {
  constructor() {
    super(PROVIDER_CONFIGS.did);
  }

  async listAvatars(): Promise<UnifiedAvatar[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await fetch(`${this.baseUrl}/presenters`, {
        headers: {
          Authorization: `Basic ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`D-ID API error: ${response.status}`);
      }

      const data = await response.json();

      return (data.presenters || []).map((presenter: {
        id: string;
        name: string;
        gender: string;
        thumbnail_url: string;
        preview_url?: string;
      }) => ({
        id: `did-${presenter.id}`,
        name: presenter.name,
        provider: 'did' as const,
        thumbnailUrl: presenter.thumbnail_url,
        previewUrl: presenter.preview_url,
        gender: presenter.gender === 'male' ? 'male' : 'female',
        languages: ['pt-BR', 'en-US', 'es-ES'],
        style: 'realistic' as const,
        isPremium: true,
        capabilities: {
          lipSync: true,
          expressions: true,
          gestures: true,
          customBackground: true,
        },
      }));
    } catch (error) {
      logger.error('Failed to fetch D-ID avatars', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async renderVideo(request: AvatarRenderRequest): Promise<AvatarRenderResult> {
    if (!this.isConfigured) {
      return { success: false, error: 'D-ID not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/talks`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_url: request.avatarId.replace('did-', ''),
          script: {
            type: 'audio',
            audio_url: request.audioUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`D-ID render error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        videoUrl: data.result_url,
        duration: data.duration,
        cost: 0.02, // Estimated cost per second
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'D-ID render failed',
      };
    }
  }

  async checkStatus(jobId: string): Promise<{ status: string; videoUrl?: string }> {
    if (!this.isConfigured) {
      return { status: 'error' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/talks/${jobId}`, {
        headers: {
          Authorization: `Basic ${this.apiKey}`,
        },
      });

      const data = await response.json();

      return {
        status: data.status,
        videoUrl: data.result_url,
      };
    } catch {
      return { status: 'error' };
    }
  }
}

// =============================================================================
// HeyGen Provider
// =============================================================================

class HeyGenProvider extends BaseAvatarProvider {
  constructor() {
    super(PROVIDER_CONFIGS.heygen);
  }

  async listAvatars(): Promise<UnifiedAvatar[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await fetch(`${this.baseUrl}/v2/avatars`, {
        headers: {
          'X-Api-Key': this.apiKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const data = await response.json();

      return (data.data?.avatars || []).map((avatar: {
        avatar_id: string;
        avatar_name: string;
        gender: string;
        preview_image_url: string;
        preview_video_url?: string;
      }) => ({
        id: `heygen-${avatar.avatar_id}`,
        name: avatar.avatar_name,
        provider: 'heygen' as const,
        thumbnailUrl: avatar.preview_image_url,
        previewUrl: avatar.preview_video_url,
        gender: avatar.gender === 'male' ? 'male' : 'female',
        languages: ['pt-BR', 'en-US', 'es-ES', 'de-DE', 'fr-FR'],
        style: 'realistic' as const,
        isPremium: true,
        capabilities: {
          lipSync: true,
          expressions: true,
          gestures: true,
          customBackground: true,
        },
      }));
    } catch (error) {
      logger.error('Failed to fetch HeyGen avatars', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async renderVideo(request: AvatarRenderRequest): Promise<AvatarRenderResult> {
    if (!this.isConfigured) {
      return { success: false, error: 'HeyGen not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v2/video/generate`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: request.avatarId.replace('heygen-', ''),
              },
              voice: {
                type: 'audio',
                audio_url: request.audioUrl,
              },
              background: request.backgroundUrl
                ? { type: 'image', url: request.backgroundUrl }
                : undefined,
            },
          ],
          dimension: {
            width: request.resolution === '4k' ? 3840 : request.resolution === '1080p' ? 1920 : 1280,
            height: request.resolution === '4k' ? 2160 : request.resolution === '1080p' ? 1080 : 720,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HeyGen render error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        videoUrl: data.data?.video_url,
        duration: data.data?.duration,
        cost: 0.01, // Estimated cost per second
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HeyGen render failed',
      };
    }
  }

  async checkStatus(jobId: string): Promise<{ status: string; videoUrl?: string }> {
    if (!this.isConfigured) {
      return { status: 'error' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/video_status.get?video_id=${jobId}`, {
        headers: {
          'X-Api-Key': this.apiKey!,
        },
      });

      const data = await response.json();

      return {
        status: data.data?.status,
        videoUrl: data.data?.video_url,
      };
    } catch {
      return { status: 'error' };
    }
  }
}

// =============================================================================
// Unified Avatar Provider
// =============================================================================

export class UnifiedAvatarProvider {
  private providers: Map<AvatarProvider, BaseAvatarProvider>;
  private cachedAvatars: Map<string, UnifiedAvatar> = new Map();
  private lastFetch: number = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.providers = new Map();

    // Initialize providers
    this.providers.set('did', new DIDProvider());
    this.providers.set('heygen', new HeyGenProvider());
    // RPM and Synthesia can be added similarly
  }

  /**
   * Get all available avatars from all providers
   */
  async listAllAvatars(options?: {
    forceRefresh?: boolean;
    language?: string;
    gender?: 'male' | 'female' | 'neutral';
    style?: UnifiedAvatar['style'];
  }): Promise<UnifiedAvatar[]> {
    const now = Date.now();

    // Return cached if valid
    if (
      !options?.forceRefresh &&
      this.cachedAvatars.size > 0 &&
      now - this.lastFetch < this.cacheTimeout
    ) {
      return this.filterAvatars(Array.from(this.cachedAvatars.values()), options);
    }

    // Fetch from all providers in parallel
    const results = await Promise.allSettled([
      ...Array.from(this.providers.values()).map((p) => p.listAvatars()),
      Promise.resolve(LOCAL_AVATARS), // Add local avatars
    ]);

    // Collect all avatars
    const allAvatars: UnifiedAvatar[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAvatars.push(...result.value);
      }
    }

    // Cache results
    this.cachedAvatars.clear();
    for (const avatar of allAvatars) {
      this.cachedAvatars.set(avatar.id, avatar);
    }
    this.lastFetch = now;

    logger.info(`Loaded ${allAvatars.length} avatars from all providers`);

    return this.filterAvatars(allAvatars, options);
  }

  /**
   * Get avatar by ID
   */
  async getAvatar(id: string): Promise<UnifiedAvatar | null> {
    // Check cache first
    if (this.cachedAvatars.has(id)) {
      return this.cachedAvatars.get(id)!;
    }

    // Refresh cache and try again
    await this.listAllAvatars({ forceRefresh: true });
    return this.cachedAvatars.get(id) || null;
  }

  /**
   * Render video with avatar
   */
  async renderVideo(request: AvatarRenderRequest): Promise<AvatarRenderResult> {
    const provider = this.providers.get(request.provider);

    if (!provider) {
      return {
        success: false,
        error: `Provider ${request.provider} not available`,
      };
    }

    return provider.renderVideo(request);
  }

  /**
   * Check render job status
   */
  async checkRenderStatus(
    provider: AvatarProvider,
    jobId: string
  ): Promise<{ status: string; videoUrl?: string }> {
    const avatarProvider = this.providers.get(provider);

    if (!avatarProvider) {
      return { status: 'error' };
    }

    return avatarProvider.checkStatus(jobId);
  }

  /**
   * Get configured providers
   */
  getConfiguredProviders(): AvatarProvider[] {
    const configured: AvatarProvider[] = ['local']; // Local is always available

    for (const [provider] of this.providers) {
      const config = PROVIDER_CONFIGS[provider];
      if (process.env[config.apiKeyEnv]) {
        configured.push(provider);
      }
    }

    return configured;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private filterAvatars(
    avatars: UnifiedAvatar[],
    options?: {
      language?: string;
      gender?: 'male' | 'female' | 'neutral';
      style?: UnifiedAvatar['style'];
    }
  ): UnifiedAvatar[] {
    if (!options) return avatars;

    return avatars.filter((avatar) => {
      if (options.gender && avatar.gender !== options.gender) return false;
      if (options.style && avatar.style !== options.style) return false;
      if (options.language && !avatar.languages.includes(options.language)) return false;
      return true;
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let providerInstance: UnifiedAvatarProvider | null = null;

export function getUnifiedAvatarProvider(): UnifiedAvatarProvider {
  if (!providerInstance) {
    providerInstance = new UnifiedAvatarProvider();
  }
  return providerInstance;
}

export default UnifiedAvatarProvider;
