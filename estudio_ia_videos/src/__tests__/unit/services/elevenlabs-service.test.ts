/**
 * Unit tests for ElevenLabsService
 *
 * Tests cover:
 *   - Constructor validation
 *   - synthesize (POST /v1/text-to-speech/{voiceId})
 *   - synthesizeLong (chunking)
 *   - fetchVoices, fetchUser, fetchModels
 *   - TTSProvider interface (getAvailableVoices, generateSpeech, estimateCost)
 *   - Retry with exponential backoff
 *   - Circuit breaker
 *   - Rate limit awareness
 *   - Error mapping (401, 402, 429, 500)
 *   - validateApiKey, getSubscriptionInfo
 *   - Singleton factory
 */

import {
  ElevenLabsService,
  createElevenLabsService,
  getElevenLabsService,
  _resetSingleton,
} from '@/services/elevenlabs-service';
import type { ElevenLabsConfig } from '@/services/elevenlabs-service';
import {
  TTSError,
  RateLimitError,
  InsufficientCreditsError,
  VoiceNotFoundError,
} from '@/lib/tts/tts-provider-abstraction';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// We mock global fetch
const mockFetch = jest.fn();
beforeAll(() => {
  (global as Record<string, unknown>).fetch = mockFetch;
});

afterEach(() => {
  mockFetch.mockReset();
  _resetSingleton();
  jest.restoreAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_CONFIG: ElevenLabsConfig = {
  apiKey: 'test-api-key-123',
  modelId: 'eleven_multilingual_v2',
  maxRetries: 2,
  timeoutMs: 5000,
};

function makeAudioBuffer(size = 1024): Buffer {
  return Buffer.alloc(size, 0x42);
}

function mockSuccessResponse(body: unknown, headers?: Record<string, string>): Response {
  const headersObj = new Headers(headers ?? {});
  return {
    ok: true,
    status: 200,
    headers: headersObj,
    json: jest.fn().mockResolvedValue(body),
    arrayBuffer: jest.fn().mockResolvedValue(
      body instanceof ArrayBuffer
        ? body
        : new Uint8Array(makeAudioBuffer()).buffer,
    ),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

function mockErrorResponse(
  status: number,
  body: Record<string, unknown> = {},
  headers?: Record<string, string>,
): Response {
  const headersObj = new Headers(headers ?? {});
  return {
    ok: false,
    status,
    headers: headersObj,
    json: jest.fn().mockResolvedValue(body),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

const MOCK_VOICES_RESPONSE = {
  voices: [
    {
      voice_id: 'voice-1',
      name: 'Rachel',
      description: 'A clear female voice',
      category: 'premade',
      preview_url: 'https://example.com/preview.mp3',
      labels: { language: 'english', gender: 'female', accent: 'american' },
      settings: null,
    },
    {
      voice_id: 'voice-2',
      name: 'Carlos',
      description: 'A Brazilian male voice',
      category: 'cloned',
      preview_url: null,
      labels: { language: 'portuguese', gender: 'male' },
      settings: null,
    },
  ],
};

const MOCK_USER_RESPONSE = {
  subscription: {
    tier: 'pro',
    character_count: 5000,
    character_limit: 100000,
    can_extend_character_limit: true,
    next_character_count_reset_unix: Math.floor(Date.now() / 1000) + 86400,
    status: 'active',
  },
  is_new_user: false,
};

const MOCK_MODELS_RESPONSE = [
  {
    model_id: 'eleven_multilingual_v2',
    name: 'Multilingual v2',
    description: 'Best for multilingual',
    can_do_text_to_speech: true,
    can_do_voice_conversion: false,
    token_cost_factor: 1.0,
    languages: [
      { language_id: 'en', name: 'English' },
      { language_id: 'pt', name: 'Portuguese' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('ElevenLabsService', () => {
  // ─── Constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates service with valid config', () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      expect(service.name).toBe('elevenlabs');
    });

    it('throws TTSError when apiKey is empty', () => {
      expect(() => new ElevenLabsService({ apiKey: '' })).toThrow(TTSError);
    });

    it('uses default values for optional config', () => {
      const service = new ElevenLabsService({ apiKey: 'key' });
      expect(service.name).toBe('elevenlabs');
      // No throw = defaults applied
    });

    it('trims trailing slash from baseUrl', () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        baseUrl: 'https://custom.api.com/',
      });
      // We test indirectly via synthesize URL
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));
      service.synthesize({ text: 'hi', voiceId: 'v1' }).catch(() => {});
      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/text-to-speech/v1',
        expect.anything(),
      );
    });
  });

  // ─── synthesize ──────────────────────────────────────────────────────────

  describe('synthesize', () => {
    let service: ElevenLabsService;

    beforeEach(() => {
      service = new ElevenLabsService(TEST_CONFIG);
    });

    it('makes correct POST to /v1/text-to-speech/{voiceId}', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      await service.synthesize({ text: 'Hello world', voiceId: 'voice-123' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://api.elevenlabs.io/v1/text-to-speech/voice-123',
      );
      expect(opts.method).toBe('POST');
    });

    it('sends correct headers', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      await service.synthesize({ text: 'Test', voiceId: 'v1' });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['xi-api-key']).toBe('test-api-key-123');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('sends correct body with default voice settings', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      await service.synthesize({ text: 'Teste', voiceId: 'v1' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toBe('Teste');
      expect(body.model_id).toBe('eleven_multilingual_v2');
      expect(body.voice_settings.stability).toBe(0.5);
      expect(body.voice_settings.similarity_boost).toBe(0.75);
    });

    it('returns audio buffer on success', async () => {
      const audioBuffer = makeAudioBuffer(2048);
      const response = mockSuccessResponse({});
      (response.arrayBuffer as jest.Mock).mockResolvedValueOnce(
        new Uint8Array(audioBuffer).buffer,
      );
      mockFetch.mockResolvedValueOnce(response);

      const result = await service.synthesize({
        text: 'Hello',
        voiceId: 'v1',
      });

      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.audio.length).toBe(2048);
      expect(result.characterCount).toBe(5);
      expect(result.contentType).toBeTruthy();
    });

    it('retries on 500 error then succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(
          mockErrorResponse(500, {
            detail: { message: 'Server error' },
          }),
        )
        .mockResolvedValueOnce(mockSuccessResponse({}));

      const result = await service.synthesize({
        text: 'retry me',
        voiceId: 'v1',
      });

      expect(result.audio).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on network error then succeeds', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce(mockSuccessResponse({}));

      const result = await service.synthesize({
        text: 'retry net',
        voiceId: 'v1',
      });

      expect(result.audio).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws RateLimitError on 429', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(429, {
          detail: { message: 'Too many requests', retry_after: 30 },
        }),
      );

      await expect(
        service.synthesize({ text: 'rate', voiceId: 'v1' }),
      ).rejects.toThrow(RateLimitError);
    });

    it('throws InsufficientCreditsError on 402', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(402, { detail: 'No credits' }),
      );

      await expect(
        service.synthesize({ text: 'pay', voiceId: 'v1' }),
      ).rejects.toThrow(InsufficientCreditsError);
    });

    it('throws TTSError on 401 (auth)', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(401, { detail: 'Invalid key' }),
      );

      await expect(
        service.synthesize({ text: 'auth', voiceId: 'v1' }),
      ).rejects.toThrow(TTSError);
      await expect(
        service.synthesize({ text: 'auth', voiceId: 'v1' }),
      ).rejects.toThrow(/Invalid API key/);
    });

    it('applies custom voice settings', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      await service.synthesize({
        text: 'custom',
        voiceId: 'v1',
        voiceSettings: { stability: 0.9, style: 0.5 },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.voice_settings.stability).toBe(0.9);
      expect(body.voice_settings.style).toBe(0.5);
      // Defaults still applied for unset
      expect(body.voice_settings.similarity_boost).toBe(0.75);
    });

    it('uses custom modelId from request', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      await service.synthesize({
        text: 'model',
        voiceId: 'v1',
        modelId: 'eleven_turbo_v2',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model_id).toBe('eleven_turbo_v2');
    });
  });

  // ─── Circuit Breaker ────────────────────────────────────────────────────

  describe('circuit breaker', () => {
    it('opens after threshold consecutive failures', async () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        maxRetries: 0, // No retry so each call = 1 failure
      });

      // Each call → 500 → failure recorded
      mockFetch.mockResolvedValue(
        mockErrorResponse(500, { detail: 'err' }),
      );

      // 5 failures = threshold
      for (let i = 0; i < 5; i++) {
        await service
          .synthesize({ text: 'fail', voiceId: 'v1' })
          .catch(() => {});
      }

      // 6th call should get circuit breaker error
      await expect(
        service.synthesize({ text: 'blocked', voiceId: 'v1' }),
      ).rejects.toThrow(/Circuit breaker open/);
    });

    it('resets after cooldown period', async () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        maxRetries: 0,
      });

      mockFetch.mockResolvedValue(
        mockErrorResponse(500, { detail: 'err' }),
      );

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await service
          .synthesize({ text: 'fail', voiceId: 'v1' })
          .catch(() => {});
      }

      // Simulate time passing beyond reset threshold
      service._circuitBreaker.lastFailure =
        Date.now() - 61_000; // 61s ago

      // Should no longer throw circuit breaker error — will try again
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));
      const result = await service.synthesize({
        text: 'recovered',
        voiceId: 'v1',
      });
      expect(result.audio).toBeInstanceOf(Buffer);
    });

    it('resets failures on success', async () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        maxRetries: 0,
      });

      // 3 failures then success
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse(500, { detail: 'err' }))
        .mockResolvedValueOnce(mockErrorResponse(500, { detail: 'err' }))
        .mockResolvedValueOnce(mockErrorResponse(500, { detail: 'err' }))
        .mockResolvedValueOnce(mockSuccessResponse({}));

      for (let i = 0; i < 3; i++) {
        await service
          .synthesize({ text: 'fail', voiceId: 'v1' })
          .catch(() => {});
      }

      expect(service._circuitBreaker.failures).toBe(3);

      await service.synthesize({ text: 'ok', voiceId: 'v1' });

      expect(service._circuitBreaker.failures).toBe(0);
      expect(service._circuitBreaker.isOpen).toBe(false);
    });
  });

  // ─── Rate Limiting ──────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('updates rate limit info from response headers', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);

      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({}, {
          'xi-ratelimit-limit-requests': '100',
          'xi-ratelimit-remaining-requests': '95',
          'xi-ratelimit-reset-requests': '60000',
        }),
      );

      await service.synthesize({ text: 'hello', voiceId: 'v1' });

      expect(service._rateLimitInfo).toEqual({
        limit: 100,
        remaining: 95,
        resetMs: 60000,
      });
    });

    it('throws RateLimitError when proactively rate limited', async () => {
      const service = new ElevenLabsService({
        ...TEST_CONFIG,
        rateLimitMargin: 10,
      });

      // Set rate limit info to low remaining
      service._rateLimitInfo = { limit: 100, remaining: 5, resetMs: 60000 };

      await expect(
        service.synthesize({ text: 'limited', voiceId: 'v1' }),
      ).rejects.toThrow(RateLimitError);
      // Should not have made any fetch call
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ─── synthesizeLong ─────────────────────────────────────────────────────

  describe('synthesizeLong', () => {
    it('splits text into chunks and concatenates audio', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);

      // Two chunks expected
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({}))
        .mockResolvedValueOnce(mockSuccessResponse({}));

      const longText = 'A'.repeat(3000) + '. ' + 'B'.repeat(3000) + '.';

      const result = await service.synthesizeLong({
        text: longText,
        voiceId: 'v1',
      });

      expect(result.audioChunks.length).toBe(2);
      // totalCharacters may differ slightly from input due to trim in chunking
      expect(result.totalCharacters).toBeGreaterThanOrEqual(longText.length - 2);
      expect(result.totalCharacters).toBeLessThanOrEqual(longText.length);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns single chunk for short text', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const result = await service.synthesizeLong({
        text: 'short text',
        voiceId: 'v1',
      });

      expect(result.audioChunks.length).toBe(1);
    });
  });

  // ─── splitTextIntoChunks ────────────────────────────────────────────────

  describe('splitTextIntoChunks', () => {
    let service: ElevenLabsService;

    beforeEach(() => {
      service = new ElevenLabsService(TEST_CONFIG);
    });

    it('returns single chunk for text shorter than max', () => {
      const chunks = service.splitTextIntoChunks('Short text.', 100);
      expect(chunks).toEqual(['Short text.']);
    });

    it('splits on sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = service.splitTextIntoChunks(text, 35);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      // Each chunk should end with a period
      chunks.forEach((chunk) => {
        expect(chunk).toMatch(/[.!?]$/);
      });
    });

    it('handles text with no sentence boundaries', () => {
      const text = 'A '.repeat(100).trim();
      const chunks = service.splitTextIntoChunks(text, 50);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(50);
      }
    });

    it('returns empty array items filtered out', () => {
      const chunks = service.splitTextIntoChunks('A.', 10);
      expect(chunks.every((c) => c.length > 0)).toBe(true);
    });
  });

  // ─── fetchVoices ────────────────────────────────────────────────────────

  describe('fetchVoices', () => {
    it('returns voices response', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(MOCK_VOICES_RESPONSE),
      );

      const result = await service.fetchVoices();

      expect(result.voices.length).toBe(2);
      expect(result.voices[0].voice_id).toBe('voice-1');
    });

    it('calls correct endpoint', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(MOCK_VOICES_RESPONSE),
      );

      await service.fetchVoices();

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.elevenlabs.io/v1/voices',
      );
    });
  });

  // ─── getAvailableVoices (TTSProvider) ───────────────────────────────────

  describe('getAvailableVoices', () => {
    it('maps API voices to TTSVoice format', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(MOCK_VOICES_RESPONSE),
      );

      const voices = await service.getAvailableVoices();

      expect(voices).toHaveLength(2);

      expect(voices[0]).toEqual({
        id: 'voice-1',
        name: 'Rachel',
        language: 'english',
        gender: 'female',
        preview_url: 'https://example.com/preview.mp3',
      });

      expect(voices[1]).toEqual({
        id: 'voice-2',
        name: 'Carlos',
        language: 'portuguese',
        gender: 'male',
        preview_url: undefined,
      });
    });

    it('infers language from accent label when language missing', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          voices: [
            {
              voice_id: 'v3',
              name: 'Test',
              description: null,
              category: 'premade',
              preview_url: null,
              labels: { accent: 'brazilian' },
              settings: null,
            },
          ],
        }),
      );

      const voices = await service.getAvailableVoices();
      expect(voices[0].language).toBe('brazilian');
    });

    it('defaults to neutral gender when not specified', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          voices: [
            {
              voice_id: 'v4',
              name: 'NoGender',
              description: null,
              category: 'premade',
              preview_url: null,
              labels: {},
              settings: null,
            },
          ],
        }),
      );

      const voices = await service.getAvailableVoices();
      expect(voices[0].gender).toBe('neutral');
      expect(voices[0].language).toBe('en');
    });
  });

  // ─── generateSpeech (TTSProvider) ───────────────────────────────────────

  describe('generateSpeech', () => {
    it('returns success response with audio', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      const result = await service.generateSpeech({
        text: 'Hello world speech',
        voiceId: 'voice-123',
      });

      expect(result.success).toBe(true);
      expect(result.audioBuffer).toBeInstanceOf(Buffer);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.metadata?.provider).toBe('elevenlabs');
      expect(result.metadata?.voiceId).toBe('voice-123');
      expect(result.metadata?.textLength).toBe(18);
    });

    it('returns error for empty text', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);

      const result = await service.generateSpeech({ text: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Text is required');
    });

    it('returns error for whitespace-only text', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);

      const result = await service.generateSpeech({ text: '   ' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Text is required');
    });

    it('uses default voice when voiceId not provided', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({}));

      await service.generateSpeech({ text: 'default voice' });

      const url = mockFetch.mock.calls[0][0] as string;
      // Should use default voice ID
      expect(url).toContain('/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL');
    });

    it('handles long text by chunking', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({}))
        .mockResolvedValueOnce(mockSuccessResponse({}));

      const longText = 'A'.repeat(3000) + '. ' + 'B'.repeat(3000) + '.';
      const result = await service.generateSpeech({
        text: longText,
        voiceId: 'v1',
      });

      expect(result.success).toBe(true);
      expect(result.audioBuffer).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws TTSError when API returns non-retryable error', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValue(
        mockErrorResponse(401, { detail: 'Bad key' }),
      );

      await expect(
        service.generateSpeech({ text: 'auth error', voiceId: 'v1' }),
      ).rejects.toThrow(TTSError);
    });
  });

  // ─── estimateCost ───────────────────────────────────────────────────────

  describe('estimateCost', () => {
    it('calculates correctly for short text', () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      // 100 chars → 100/1000 * 0.30 = 0.03
      const cost = service.estimateCost('A'.repeat(100));
      expect(cost).toBeCloseTo(0.03);
    });

    it('calculates correctly for 1000 chars', () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      const cost = service.estimateCost('A'.repeat(1000));
      expect(cost).toBeCloseTo(0.30);
    });

    it('returns 0 for empty text', () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      expect(service.estimateCost('')).toBe(0);
    });
  });

  // ─── validateApiKey ─────────────────────────────────────────────────────

  describe('validateApiKey', () => {
    it('returns true for valid key', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(MOCK_USER_RESPONSE),
      );

      const valid = await service.validateApiKey();
      expect(valid).toBe(true);
    });

    it('returns false for invalid key', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValue(
        mockErrorResponse(401, { detail: 'Invalid key' }),
      );

      const valid = await service.validateApiKey();
      expect(valid).toBe(false);
    });

    it('returns false on network error', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const valid = await service.validateApiKey();
      expect(valid).toBe(false);
    });
  });

  // ─── getSubscriptionInfo ────────────────────────────────────────────────

  describe('getSubscriptionInfo', () => {
    it('returns mapped subscription data', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(MOCK_USER_RESPONSE),
      );

      const info = await service.getSubscriptionInfo();

      expect(info.tier).toBe('pro');
      expect(info.used).toBe(5000);
      expect(info.limit).toBe(100000);
      expect(info.remaining).toBe(95000);
      expect(info.canExtend).toBe(true);
      expect(info.resetsAt).toBeInstanceOf(Date);
    });
  });

  // ─── fetchUser ──────────────────────────────────────────────────────────

  describe('fetchUser', () => {
    it('calls GET /v1/user', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(MOCK_USER_RESPONSE),
      );

      const user = await service.fetchUser();

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.elevenlabs.io/v1/user',
      );
      expect(user.subscription.tier).toBe('pro');
    });
  });

  // ─── fetchModels ────────────────────────────────────────────────────────

  describe('fetchModels', () => {
    it('returns models array', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(MOCK_MODELS_RESPONSE),
      );

      const models = await service.fetchModels();

      expect(models).toHaveLength(1);
      expect(models[0].model_id).toBe('eleven_multilingual_v2');
      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.elevenlabs.io/v1/models',
      );
    });
  });

  // ─── Retry Behavior ────────────────────────────────────────────────────

  describe('retry behavior', () => {
    it('retries up to maxRetries times', async () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        maxRetries: 2,
      });

      // 3 failures (initial + 2 retries) then gives up
      mockFetch.mockResolvedValue(
        mockErrorResponse(500, { detail: 'Server error' }),
      );

      await expect(
        service.synthesize({ text: 'fail', voiceId: 'v1' }),
      ).rejects.toThrow(TTSError);

      // initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does not retry non-retryable errors (401)', async () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        maxRetries: 3,
      });

      mockFetch.mockResolvedValue(
        mockErrorResponse(401, { detail: 'Invalid key' }),
      );

      await expect(
        service.synthesize({ text: 'auth', voiceId: 'v1' }),
      ).rejects.toThrow(/Invalid API key/);

      // Should not retry on 401
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry 402 (insufficient credits)', async () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        maxRetries: 3,
      });

      mockFetch.mockResolvedValue(
        mockErrorResponse(402, { detail: 'No credits' }),
      );

      await expect(
        service.synthesize({ text: 'x', voiceId: 'v1' }),
      ).rejects.toThrow(InsufficientCreditsError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Singleton Factory ─────────────────────────────────────────────────

  describe('factory functions', () => {
    it('getElevenLabsService throws if env var not set', () => {
      delete process.env.ELEVENLABS_API_KEY;
      _resetSingleton();

      expect(() => getElevenLabsService()).toThrow(TTSError);
      expect(() => getElevenLabsService()).toThrow(/ELEVENLABS_API_KEY/);
    });

    it('getElevenLabsService returns singleton', () => {
      process.env.ELEVENLABS_API_KEY = 'test-key-singleton';
      _resetSingleton();

      const s1 = getElevenLabsService();
      const s2 = getElevenLabsService();
      expect(s1).toBe(s2);
    });

    it('createElevenLabsService creates new instance', () => {
      const s1 = createElevenLabsService({ apiKey: 'a' });
      const s2 = createElevenLabsService({ apiKey: 'b' });
      expect(s1).not.toBe(s2);
    });

    afterEach(() => {
      delete process.env.ELEVENLABS_API_KEY;
    });
  });

  // ─── Error Mapping ─────────────────────────────────────────────────────

  describe('error mapping', () => {
    it('maps 404 to VoiceNotFoundError', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValue(
        mockErrorResponse(404, { detail: 'voice-xyz' }),
      );

      await expect(
        service.synthesize({ text: 'not found', voiceId: 'v1' }),
      ).rejects.toThrow(VoiceNotFoundError);
    });

    it('maps 422 to TTSError with VALIDATION code', async () => {
      const service = new ElevenLabsService(TEST_CONFIG);
      mockFetch.mockResolvedValue(
        mockErrorResponse(422, {
          detail: { message: 'text too long' },
        }),
      );

      try {
        await service.synthesize({ text: 'validation', voiceId: 'v1' });
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TTSError);
        expect((err as TTSError).code).toBe('VALIDATION');
      }
    });

    it('treats 5xx as retryable', async () => {
      const service = new ElevenLabsService({
        apiKey: 'key',
        maxRetries: 1,
      });

      mockFetch.mockResolvedValue(
        mockErrorResponse(503, { detail: 'Unavailable' }),
      );

      try {
        await service.synthesize({ text: 'retry5xx', voiceId: 'v1' });
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TTSError);
        // Should have retried: initial + 1 retry = 2
        expect(mockFetch).toHaveBeenCalledTimes(2);
      }
    });
  });
});
