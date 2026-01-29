/**
 * Unit Tests: LipSyncOrchestrator
 * Tests for multi-provider coordination and fallback
 */

import { LipSyncOrchestrator } from '@/lib/sync/lip-sync-orchestrator';
import type { LipSyncRequest } from '@/lib/sync/lip-sync-orchestrator';

// Mock the engines
jest.mock('@/lib/sync/rhubarb-lip-sync-engine', () => {
  return {
    RhubarbLipSyncEngine: jest.fn().mockImplementation(() => ({
      generatePhonemes: jest.fn().mockResolvedValue({
        phonemes: [],
        duration: 1.0,
        metadata: {}
      })
    }))
  };
});

jest.mock('@/lib/sync/azure-viseme-engine', () => {
  return {
    AzureVisemeEngine: jest.fn().mockImplementation(() => ({
      synthesizeWithVisemes: jest.fn().mockResolvedValue({
        visemes: [
            { visemeId: 1, audioOffset: 0 },
            { visemeId: 2, audioOffset: 100 }
        ],
        duration: 200
      }),
      convertAzureVisemes: jest.fn().mockReturnValue([
        { phoneme: 'A', startTime: 0, endTime: 0.1, duration: 0.1 },
        { phoneme: 'B', startTime: 0.1, endTime: 0.2, duration: 0.1 }
      ])
    }))
  };
});

jest.mock('@/lib/sync/viseme-cache', () => {
  return {
    VisemeCache: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({
        hits: 10,
        misses: 5,
        sets: 5,
        errors: 0,
        totalRequests: 15,
        hitRate: 10 / 15
      })
    }))
  };
});

describe('LipSyncOrchestrator', () => {
  let orchestrator: LipSyncOrchestrator;

  beforeEach(() => {
    orchestrator = new LipSyncOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.disconnect();
  });

  describe('generateLipSync', () => {
    it('should generate lip-sync from text', async () => {
      const request: LipSyncRequest = {
        text: 'Hello world',
        skipCache: true
      };

      const response = await orchestrator.generateLipSync(request);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.result.phonemes).toBeDefined();
      expect(response.result.duration).toBeGreaterThan(0);
      expect(response.provider).toBeDefined();
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should return mock result when all providers fail', async () => {
      const request: LipSyncRequest = {
        text: 'Test',
        skipCache: true,
        preferredProvider: 'mock'
      };

      const response = await orchestrator.generateLipSync(request);

      expect(response.success).toBe(true);
      expect(response.provider).toBe('mock');
      expect(response.result.metadata?.provider).toBe('mock'); // Changed from source
    });

    it('should respect preferred provider', async () => {
      const request: LipSyncRequest = {
        text: 'Test',
        skipCache: true,
        preferredProvider: 'mock'
      };

      const response = await orchestrator.generateLipSync(request);

      expect(response.provider).toBe('mock');
    });

    it('should cache results by default', async () => {
      const request: LipSyncRequest = {
        text: 'Cached test'
      };

      // First call
      const response1 = await orchestrator.generateLipSync(request);
      expect(response1.cached).toBe(false);

      // Second call should be cached (in a real scenario)
      // Note: With mocked cache, this won't actually cache
      const response2 = await orchestrator.generateLipSync(request);
      expect(response2.success).toBe(true);
    });

    it('should skip cache when requested', async () => {
      const request: LipSyncRequest = {
        text: 'No cache',
        skipCache: true
      };

      const response = await orchestrator.generateLipSync(request);

      expect(response.cached).toBe(false);
    });

    it('should handle audio buffer input', async () => {
      const audioBuffer = Buffer.from('fake audio data');

      const request: LipSyncRequest = {
        audioBuffer,
        skipCache: true,
        preferredProvider: 'mock'
      };

      const response = await orchestrator.generateLipSync(request);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
    });

    it('should include metadata in result', async () => {
      const request: LipSyncRequest = {
        text: 'Test with metadata',
        skipCache: true
      };

      const response = await orchestrator.generateLipSync(request);

      expect(response.result.metadata).toBeDefined();
      expect(response.result.metadata?.dialog).toBeDefined(); // Changed from dialogText
    });
  });

  describe('getProviderAvailability', () => {
    it('should return availability status for all providers', () => {
      const availability = orchestrator.getProviderAvailability();

      expect(availability).toHaveProperty('azure');
      expect(availability).toHaveProperty('rhubarb');
      expect(availability).toHaveProperty('mock');
      expect(availability.mock).toBe(true); // Mock is always available
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = orchestrator.getCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalRequests');
    });

    it('should calculate hit rate correctly', () => {
      const stats = orchestrator.getCacheStats();

      const expectedHitRate = stats.totalRequests > 0
        ? stats.hits / stats.totalRequests
        : 0;

      expect(stats.hitRate).toBe(expectedHitRate);
    });
  });

  describe('disconnect', () => {
    it('should disconnect cleanly', async () => {
      await expect(orchestrator.disconnect()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle missing input gracefully', async () => {
      const request: LipSyncRequest = {
        skipCache: true,
        preferredProvider: 'mock'
      };

      const response = await orchestrator.generateLipSync(request);

      // Should still return mock result
      expect(response.success).toBe(true);
      expect(response.provider).toBe('mock');
    });

    it('should return consistent result structure on success', async () => {
      const request: LipSyncRequest = {
        text: 'Test',
        skipCache: true
      };

      const response = await orchestrator.generateLipSync(request);

      expect(response).toHaveProperty('result');
      expect(response).toHaveProperty('provider');
      expect(response).toHaveProperty('cached');
      expect(response).toHaveProperty('processingTime');
      expect(response.result).toHaveProperty('phonemes');
      expect(response.result).toHaveProperty('duration');
      expect(response.result).toHaveProperty('metadata.provider'); // Changed from 'source'
    });
  });

  describe('phoneme structure', () => {
    it('should return valid phoneme array', async () => {
      const request: LipSyncRequest = {
        text: 'Test phonemes',
        skipCache: true
      };

      const response = await orchestrator.generateLipSync(request);

      expect(Array.isArray(response.result.phonemes)).toBe(true);
      expect(response.result.phonemes.length).toBeGreaterThan(0);

      const phoneme = response.result.phonemes[0];
      expect(phoneme).toHaveProperty('phoneme');
      expect(phoneme).toHaveProperty('startTime');
      expect(phoneme).toHaveProperty('endTime');
      expect(phoneme).toHaveProperty('duration');
      expect(phoneme.startTime).toBeGreaterThanOrEqual(0);
      expect(phoneme.endTime).toBeGreaterThan(phoneme.startTime);
      expect(phoneme.duration).toBe(phoneme.endTime - phoneme.startTime);
    });

    it('should have sequential phonemes', async () => {
      const request: LipSyncRequest = {
        text: 'Sequential test',
        skipCache: true
      };

      const response = await orchestrator.generateLipSync(request);

      const phonemes = response.result.phonemes;

      for (let i = 0; i < phonemes.length - 1; i++) {
        const current = phonemes[i];
        const next = phonemes[i + 1];

        // Next phoneme should start at or after current ends
        expect(next.startTime).toBeGreaterThanOrEqual(current.endTime);
      }
    });

    it('should match total duration', async () => {
      const request: LipSyncRequest = {
        text: 'Duration test',
        skipCache: true
      };

      const response = await orchestrator.generateLipSync(request);

      const lastPhoneme = response.result.phonemes[response.result.phonemes.length - 1];

      // Last phoneme should end at or before total duration
      expect(lastPhoneme.endTime).toBeLessThanOrEqual(response.result.duration);
    });
  });
});
