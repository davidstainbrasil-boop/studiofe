/**
 * TTS Provider Abstraction Layer
 * Supports multiple TTS providers with unified interface
 */

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  preview_url?: string;
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
  projectId?: string;
  slideId?: string;
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  audioBuffer?: Buffer;
  duration?: number;
  size?: number;
  voice?: TTSVoice;
  cost?: number;
  error?: string;
  metadata?: {
    provider: string;
    voiceId: string;
    textLength: number;
    processingTime: number;
  };
}

export interface TTSProvider {
  name: string;
  getAvailableVoices(): Promise<TTSVoice[]>;
  generateSpeech(request: TTSRequest): Promise<TTSResponse>;
  estimateCost(text: string, voiceId?: string): number;
}

export enum TTSProviderType {
  MOCK = 'mock',
  ELEVENLABS = 'elevenlabs',
  GOOGLE_CLOUD = 'google-cloud',
  AWS_POLLY = 'aws-polly',
  OPENAI = 'openai'
}

export interface TTSConfig {
  provider: TTSProviderType;
  elevenlabs?: {
    apiKey: string;
    model?: string;
  };
  googleCloud?: {
    credentials: {
      client_email: string;
      private_key: string;
    };
    projectId?: string;
  };
  awsPolly?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  openai?: {
    apiKey: string;
    model?: string;
  };
  fallback?: {
    enabled: boolean;
    provider: TTSProviderType;
  };
}

export class TTSError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TTSError';
  }
}

export class RateLimitError extends TTSError {
  retryAfter?: number;

  constructor(message: string, provider: string, retryAfter?: number) {
    super(message, provider, 'RATE_LIMIT', true);
    this.retryAfter = retryAfter;
  }
}

export class VoiceNotFoundError extends TTSError {
  constructor(voiceId: string, provider: string) {
    super(`Voice ${voiceId} not found`, provider, 'VOICE_NOT_FOUND', false);
  }
}

export class InsufficientCreditsError extends TTSError {
  constructor(provider: string, required: number) {
    super(`Insufficient credits. Required: ${required}`, provider, 'INSUFFICIENT_CREDITS', false);
  }
}

/**
 * TTS Factory
 */
export class TTSFactory {
  private static providers = new Map<TTSProviderType, TTSProvider>();

  static registerProvider(type: TTSProviderType, provider: TTSProvider): void {
    this.providers.set(type, provider);
  }

  static getProvider(config: TTSConfig): TTSProvider {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new TTSError(`Provider ${config.provider} not registered`, 'factory');
    }
    return provider;
  }

  static async createWithFallback(config: TTSConfig): Promise<{
    primary: TTSProvider;
    fallback?: TTSProvider;
  }> {
    const primary = this.getProvider(config);
    
    if (!config.fallback?.enabled) {
      return { primary };
    }

    const fallback = config.fallback?.provider 
      ? this.getProvider({ ...config, provider: config.fallback.provider })
      : undefined;

    return { primary, fallback };
  }
}

/**
 * Utility functions
 */
export class TTSUtils {
  static calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  static calculateEstimatedDuration(text: string, speed: number = 1.0): number {
    const baseDuration = this.calculateWordCount(text) * 0.6; // ~0.6s per word
    return baseDuration / speed;
  }

  static generateAudioFilename(
    provider: string,
    voiceId: string,
    slideId?: string,
    index?: number
  ): string {
    const timestamp = Date.now();
    const slidePart = slideId ? `-${slideId}` : '';
    const indexPart = index !== undefined ? `-${index.toString().padStart(3, '0')}` : '';
    
    return `tts/${provider}/${voiceId}${slidePart}${indexPart}-${timestamp}.mp3`;
  }

  static sanitizeText(text: string): string {
    return text
      .replace(/&/g, 'e')
      .replace(/</g, 'menor que')
      .replace(/>/g, 'maior que')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/\n\s*\n/g, '. ') // Replace multiple newlines with period
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  static extractTextForTTS(content: string, notes?: string): string {
    const slideContent = content || '';
    const slideNotes = notes || '';
    
    // Prioritize notes if available, otherwise use content
    if (slideNotes.trim()) {
      return this.sanitizeText(slideNotes);
    }
    
    return this.sanitizeText(slideContent);
  }
}