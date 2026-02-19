/**
 * @jest-environment node
 */
import { POST, GET } from '@/app/api/voice/generate/route';
import { NextRequest } from 'next/server';
import { describe, it, expect, jest } from '@jest/globals';

// Mock the AudioGeneratorFactory directly so getAvailableVoices returns controlled data
jest.mock('@/lib/services/voice/audio-generator-factory', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals');
  return {
    AudioGeneratorFactory: jest.fn().mockImplementation(() => ({
      getAvailableVoices: jest.fn().mockResolvedValue({
        elevenLabs: [{ id: 'mock-voice', name: 'Mock', provider: 'elevenlabs' }],
        azure: [
          { id: 'pt-BR-FranciscaNeural', name: 'Francisca', provider: 'azure', category: 'Neural' },
          { id: 'pt-BR-AntonioNeural', name: 'Antonio', provider: 'azure', category: 'Neural' },
        ],
      }),
      generateAudio: jest.fn().mockResolvedValue(Buffer.from('mock-audio-content')),
    })),
    AudioProvider: { AZURE: 'azure', ELEVENLABS: 'elevenlabs' },
  };
});

// Mock Supabase
jest.mock('@/lib/supabase/server', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals');
  return {
    createClient: () => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-voice' } },
          error: null,
        }),
      },
    }),
  };
});

// Mock CreditManager to avoid DB calls
jest.mock('@/lib/billing/credit-manager', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals');
  return {
    CreditManager: jest.fn().mockImplementation(() => ({
      deductCredits: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock rate-limit
jest.mock('@/lib/rate-limit', () => ({
  applyRateLimit: jest.fn().mockResolvedValue(null),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('Integration: Voice Generation API', () => {
  it('should list voices (GET)', async () => {
    const req = new NextRequest('http://localhost/api/voice/generate');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.elevenLabs).toHaveLength(1);
    expect(json.data.azure).toHaveLength(2);
  });

  it('should generate audio (POST) via ElevenLabs', async () => {
    const req = new NextRequest('http://localhost/api/voice/generate', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello',
        voiceId: 'mock-voice',
        provider: 'elevenlabs',
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.audioBase64).toBeDefined();
    expect(json.data.contentType).toBe('audio/mpeg');
  });
});
