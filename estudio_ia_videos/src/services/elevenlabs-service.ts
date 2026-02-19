/**
 * ElevenLabs TTS Service — Consolidated, Production-Ready
 *
 * Replaces the two duplicate providers:
 *   - src/lib/tts/providers/elevenlabs.ts (standalone, correct URL, no retry)
 *   - src/lib/tts/elevenlabs-provider-real.ts (TTSProvider iface, buggy URL, uses `any`)
 *
 * Features:
 *   ✅ Implements TTSProvider interface from tts-provider-abstraction
 *   ✅ Correct URL: POST /v1/text-to-speech/{voiceId}
 *   ✅ Retry with exponential backoff (configurable, default 3)
 *   ✅ Rate limit awareness via xi-ratelimit-* headers
 *   ✅ Circuit breaker pattern
 *   ✅ Long text chunking (max 5000 chars, sentence-aware)
 *   ✅ Cost estimation
 *   ✅ Zero `any` — fully typed
 *   ✅ Proper error mapping (401→auth, 402→credits, 429→rate limit)
 */

import {
  TTSProvider,
  TTSRequest as BaseTTSRequest,
  TTSResponse as BaseTTSResponse,
  TTSVoice,
  TTSProviderType,
  TTSError,
  RateLimitError,
  InsufficientCreditsError,
  VoiceNotFoundError,
} from '@/lib/tts/tts-provider-abstraction';
import { logger } from '@/lib/logger';

// ─── ElevenLabs-specific types ───────────────────────────────────────────────

export interface ElevenLabsConfig {
  apiKey: string;
  modelId?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeoutMs?: number;
  /** Stop sending when remaining requests < this margin (default 5) */
  rateLimitMargin?: number;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface ElevenLabsTTSRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: Partial<VoiceSettings>;
  outputFormat?: 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_22050' | 'pcm_44100';
}

export interface ElevenLabsTTSResult {
  audio: Buffer;
  contentType: string;
  characterCount: number;
  requestId: string | null;
}

export interface ElevenLabsLongTTSResult {
  audioChunks: Buffer[];
  totalCharacters: number;
}

export interface ElevenLabsSubscriptionInfo {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  canExtend: boolean;
}

// ─── API response shapes (typed, zero `any`) ────────────────────────────────

interface ElevenLabsApiVoice {
  voice_id: string;
  name: string;
  description: string | null;
  category: string;
  preview_url: string | null;
  labels: Record<string, string>;
  settings: VoiceSettings | null;
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsApiVoice[];
}

interface ElevenLabsUserResponse {
  subscription: {
    tier: string;
    character_count: number;
    character_limit: number;
    can_extend_character_limit: boolean;
    next_character_count_reset_unix: number;
    status: string;
  };
  is_new_user: boolean;
}

interface ElevenLabsModelResponse {
  model_id: string;
  name: string;
  description: string;
  can_do_text_to_speech: boolean;
  can_do_voice_conversion: boolean;
  token_cost_factor: number;
  languages: Array<{ language_id: string; name: string }>;
}

interface ElevenLabsApiErrorDetail {
  detail?: {
    message?: string;
    status?: string;
    retry_after?: number;
  } | string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetMs: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'eleven_multilingual_v2';
const DEFAULT_BASE_URL = 'https://api.elevenlabs.io';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const MAX_CHARS_PER_REQUEST = 5000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const COST_PER_1000_CHARS = 0.30;
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Bella — good for PT-BR

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class ElevenLabsService implements TTSProvider {
  readonly name = TTSProviderType.ELEVENLABS;

  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly rateLimitMargin: number;

  /** Exposed for testing only — do not rely on externally. */
  _rateLimitInfo: RateLimitInfo | null = null;
  _circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  constructor(config: ElevenLabsConfig) {
    if (!config.apiKey) {
      throw new TTSError(
        'ElevenLabs API key is required',
        'elevenlabs',
        'MISSING_API_KEY',
      );
    }
    this.apiKey = config.apiKey;
    this.modelId = config.modelId ?? DEFAULT_MODEL;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.rateLimitMargin = config.rateLimitMargin ?? 5;
  }

  // ═══ TTSProvider interface ════════════════════════════════════════════════

  async getAvailableVoices(): Promise<TTSVoice[]> {
    const data = await this.fetchVoices();
    return data.voices.map((v) => this.mapApiVoiceToTTSVoice(v));
  }

  async generateSpeech(request: BaseTTSRequest): Promise<BaseTTSResponse> {
    const startTime = Date.now();

    if (!request.text?.trim()) {
      return { success: false, error: 'Text is required and cannot be empty' };
    }

    const voiceId = request.voiceId ?? DEFAULT_VOICE_ID;
    const text = request.text.trim();

    try {
      let audioBuffer: Buffer;

      if (text.length > MAX_CHARS_PER_REQUEST) {
        const result = await this.synthesizeLong({ text, voiceId });
        audioBuffer = Buffer.concat(result.audioChunks);
      } else {
        const result = await this.synthesize({ text, voiceId });
        audioBuffer = result.audio;
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        audioBuffer,
        duration: this.estimateDuration(text),
        size: audioBuffer.length,
        cost: this.estimateCost(text),
        metadata: {
          provider: 'elevenlabs',
          voiceId,
          textLength: text.length,
          processingTime,
        },
      };
    } catch (error: unknown) {
      if (error instanceof TTSError) throw error;
      const message =
        error instanceof Error ? error.message : 'Unknown ElevenLabs error';
      return { success: false, error: message };
    }
  }

  estimateCost(text: string, _voiceId?: string): number {
    return Math.round((text.length / 1000) * COST_PER_1000_CHARS * 100) / 100;
  }

  // ═══ ElevenLabs-specific public methods ═══════════════════════════════════

  /**
   * Synthesize short text (≤ 5 000 chars).
   * POST /v1/text-to-speech/{voiceId}
   */
  async synthesize(request: ElevenLabsTTSRequest): Promise<ElevenLabsTTSResult> {
    const voiceSettings: VoiceSettings = {
      ...DEFAULT_VOICE_SETTINGS,
      ...request.voiceSettings,
    };

    const url = `${this.baseUrl}/v1/text-to-speech/${request.voiceId}`;

    const body = JSON.stringify({
      text: request.text,
      model_id: request.modelId ?? this.modelId,
      voice_settings: voiceSettings,
    });

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
        Accept: request.outputFormat
          ? `audio/${request.outputFormat}`
          : 'audio/mpeg',
      },
      body,
    });

    const arrayBuffer = await response.arrayBuffer();

    return {
      audio: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') ?? 'audio/mpeg',
      characterCount: request.text.length,
      requestId: response.headers.get('request-id'),
    };
  }

  /**
   * Synthesize long text by splitting into ≤ 5 000-char chunks.
   */
  async synthesizeLong(
    request: Omit<ElevenLabsTTSRequest, 'outputFormat'> & {
      chunkSize?: number;
    },
  ): Promise<ElevenLabsLongTTSResult> {
    const maxLen = request.chunkSize ?? MAX_CHARS_PER_REQUEST;
    const chunks = this.splitTextIntoChunks(request.text, maxLen);
    const audioChunks: Buffer[] = [];
    let totalCharacters = 0;

    for (const chunk of chunks) {
      const result = await this.synthesize({
        ...request,
        text: chunk,
      });
      audioChunks.push(result.audio);
      totalCharacters += result.characterCount;
    }

    return { audioChunks, totalCharacters };
  }

  /** GET /v1/voices */
  async fetchVoices(): Promise<ElevenLabsVoicesResponse> {
    const url = `${this.baseUrl}/v1/voices`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
    return (await response.json()) as ElevenLabsVoicesResponse;
  }

  /** GET /v1/user */
  async fetchUser(): Promise<ElevenLabsUserResponse> {
    const url = `${this.baseUrl}/v1/user`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
    return (await response.json()) as ElevenLabsUserResponse;
  }

  /** GET /v1/models */
  async fetchModels(): Promise<ElevenLabsModelResponse[]> {
    const url = `${this.baseUrl}/v1/models`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
    return (await response.json()) as ElevenLabsModelResponse[];
  }

  /** Validate the API key by calling GET /v1/user. */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.fetchUser();
      return true;
    } catch {
      return false;
    }
  }

  /** Subscription info mapped to a friendly shape. */
  async getSubscriptionInfo(): Promise<ElevenLabsSubscriptionInfo> {
    const user = await this.fetchUser();
    const sub = user.subscription;
    return {
      tier: sub.tier,
      used: sub.character_count,
      limit: sub.character_limit,
      remaining: sub.character_limit - sub.character_count,
      resetsAt: new Date(sub.next_character_count_reset_unix * 1000),
      canExtend: sub.can_extend_character_limit,
    };
  }

  // ═══ Private helpers ══════════════════════════════════════════════════════

  /**
   * fetch() wrapper with exponential-backoff retry, circuit breaker, timeout
   * and rate-limit awareness.
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    this.checkCircuitBreaker();

    if (this.isRateLimited()) {
      throw new RateLimitError(
        'Proactively rate-limited — remaining requests below safety margin',
        'elevenlabs',
        this._rateLimitInfo?.resetMs
          ? Math.ceil(this._rateLimitInfo.resetMs / 1000)
          : 60,
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.timeoutMs,
        );

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        this.updateRateLimitInfo(response.headers);

        if (response.ok) {
          this.recordSuccess();
          return response;
        }

        // Handle specific HTTP errors
        const errorBody = await response
          .json()
          .catch(() => ({}) as ElevenLabsApiErrorDetail) as ElevenLabsApiErrorDetail;
        const ttsError = this.parseApiError(response.status, errorBody);

        // Non-retryable errors — throw immediately
        if (!ttsError.retryable) {
          this.recordFailure();
          throw ttsError;
        }

        lastError = ttsError;
        logger.warn('ElevenLabs API retryable error', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          status: response.status,
          error: ttsError.message,
        });
      } catch (error: unknown) {
        if (error instanceof TTSError && !error.retryable) {
          throw error;
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new TTSError(
            `Request timed out after ${this.timeoutMs}ms`,
            'elevenlabs',
            'TIMEOUT',
            true,
          );
        } else if (!(error instanceof TTSError)) {
          lastError =
            error instanceof Error
              ? error
              : new Error(String(error));
        } else {
          lastError = error;
        }

        logger.warn('ElevenLabs fetch error', {
          attempt: attempt + 1,
          error: lastError.message,
        });
      }

      // Exponential backoff: 1s, 2s, 4s, …
      if (attempt < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10_000);
        await this.sleep(delay);
      }
    }

    this.recordFailure();

    if (lastError instanceof TTSError) {
      throw lastError;
    }
    throw new TTSError(
      lastError?.message ?? 'Max retries exceeded',
      'elevenlabs',
      'MAX_RETRIES',
      false,
    );
  }

  private checkCircuitBreaker(): void {
    if (!this._circuitBreaker.isOpen) return;

    const elapsed = Date.now() - this._circuitBreaker.lastFailure;
    if (elapsed >= CIRCUIT_BREAKER_RESET_MS) {
      // Half-open: reset and allow a trial request
      this._circuitBreaker = { failures: 0, lastFailure: 0, isOpen: false };
      logger.info('ElevenLabs circuit breaker reset (half-open)');
      return;
    }

    throw new TTSError(
      'Circuit breaker open — ElevenLabs API unavailable',
      'elevenlabs',
      'CIRCUIT_OPEN',
      true,
    );
  }

  private recordFailure(): void {
    this._circuitBreaker.failures += 1;
    this._circuitBreaker.lastFailure = Date.now();
    if (this._circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this._circuitBreaker.isOpen = true;
      logger.error('ElevenLabs circuit breaker OPEN', {
        failures: this._circuitBreaker.failures,
      });
    }
  }

  private recordSuccess(): void {
    if (this._circuitBreaker.failures > 0) {
      this._circuitBreaker = { failures: 0, lastFailure: 0, isOpen: false };
    }
  }

  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('xi-ratelimit-limit-requests');
    const remaining = headers.get('xi-ratelimit-remaining-requests');
    const reset = headers.get('xi-ratelimit-reset-requests');

    if (limit && remaining) {
      this._rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetMs: reset ? parseInt(reset, 10) : 0,
      };
    }
  }

  private isRateLimited(): boolean {
    if (!this._rateLimitInfo) return false;
    return this._rateLimitInfo.remaining < this.rateLimitMargin;
  }

  private parseApiError(
    status: number,
    body: ElevenLabsApiErrorDetail,
  ): TTSError {
    const detailMsg =
      typeof body.detail === 'string'
        ? body.detail
        : body.detail?.message ?? `HTTP ${status}`;

    switch (status) {
      case 401:
        return new TTSError(
          `Invalid API key: ${detailMsg}`,
          'elevenlabs',
          'INVALID_API_KEY',
          false,
        );
      case 402:
        return new InsufficientCreditsError('elevenlabs', 0);
      case 404:
        return new VoiceNotFoundError(detailMsg, 'elevenlabs');
      case 422:
        return new TTSError(
          `Validation error: ${detailMsg}`,
          'elevenlabs',
          'VALIDATION',
          false,
        );
      case 429: {
        const retryAfter =
          typeof body.detail === 'object'
            ? body.detail?.retry_after ?? 60
            : 60;
        return new RateLimitError(
          `Rate limit exceeded: ${detailMsg}`,
          'elevenlabs',
          retryAfter,
        );
      }
      default:
        // 5xx or unknown → retryable
        return new TTSError(
          `ElevenLabs API error (${status}): ${detailMsg}`,
          'elevenlabs',
          status.toString(),
          status >= 500,
        );
    }
  }

  /**
   * Smart text splitting: sentence boundaries → comma → space → forced.
   */
  splitTextIntoChunks(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());

        // If a single sentence is too long, split further
        if (sentence.length > maxLength) {
          const subChunks = this.splitLongSegment(sentence, maxLength);
          // All but last go straight to chunks
          for (let i = 0; i < subChunks.length - 1; i++) {
            chunks.push(subChunks[i].trim());
          }
          currentChunk = subChunks[subChunks.length - 1];
        } else {
          currentChunk = sentence;
        }
      }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks.filter((c) => c.length > 0);
  }

  private splitLongSegment(text: string, maxLength: number): string[] {
    const parts: string[] = [];
    let remaining = text;

    while (remaining.length > maxLength) {
      // Try comma first, then space, then force
      let splitIdx = remaining.lastIndexOf(',', maxLength);
      if (splitIdx <= 0) splitIdx = remaining.lastIndexOf(' ', maxLength);
      if (splitIdx <= 0) splitIdx = maxLength;

      parts.push(remaining.substring(0, splitIdx).trim());
      remaining = remaining.substring(splitIdx).replace(/^[,\s]+/, '');
    }

    if (remaining.trim()) parts.push(remaining.trim());
    return parts;
  }

  private estimateDuration(text: string): number {
    // ~150 words / minute → seconds
    const words = text.trim().split(/\s+/).length;
    return Math.round(((words / 150) * 60) * 100) / 100;
  }

  private mapApiVoiceToTTSVoice(v: ElevenLabsApiVoice): TTSVoice {
    return {
      id: v.voice_id,
      name: v.name,
      language: this.inferLanguage(v.labels),
      gender: this.inferGender(v.labels),
      preview_url: v.preview_url ?? undefined,
    };
  }

  private inferLanguage(labels: Record<string, string>): string {
    const langKeys = ['language', 'accent', 'locale'];
    for (const key of langKeys) {
      if (labels[key]) return labels[key].toLowerCase();
    }
    return 'en';
  }

  private inferGender(
    labels: Record<string, string>,
  ): 'male' | 'female' | 'neutral' {
    const gender = (labels['gender'] ?? '').toLowerCase();
    if (gender === 'male') return 'male';
    if (gender === 'female') return 'female';
    return 'neutral';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Factory / Singleton ─────────────────────────────────────────────────────

let instance: ElevenLabsService | null = null;

/**
 * Get a singleton ElevenLabsService using ELEVENLABS_API_KEY env var.
 */
export function getElevenLabsService(): ElevenLabsService {
  if (!instance) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new TTSError(
        'ELEVENLABS_API_KEY environment variable is not set',
        'elevenlabs',
        'MISSING_ENV',
      );
    }
    instance = new ElevenLabsService({ apiKey });
  }
  return instance;
}

/**
 * Create a new ElevenLabsService with explicit config.
 * Useful for testing or multi-tenant scenarios.
 */
export function createElevenLabsService(
  config: ElevenLabsConfig,
): ElevenLabsService {
  return new ElevenLabsService(config);
}

/**
 * Reset the singleton — only for tests.
 * @internal
 */
export function _resetSingleton(): void {
  instance = null;
}
