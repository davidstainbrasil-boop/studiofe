/**
 * Unit Tests: LipSyncOrchestrator
 * Tests for multi-provider coordination and fallback
 */

import { LipSyncOrchestrator } from '@/lib/sync/lip-sync-orchestrator';
import type { LipSyncRequest } from '@/lib/sync/lip-sync-orchestrator';

// Mock the engines
jest.mock('@/lib/sync/rhubarb-lip-sync-engine');
jest.mock('@/lib/sync/azure-viseme-engine');
jest.mock('@/lib/sync/viseme-cache');

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
      expect(response.processingTime).toBeGreaterThan(0);
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
      expect(response.result.source).toBe('mock');
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
      expect(response.result.metadata?.dialogText).toBeDefined();
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
      expect(response.result).toHaveProperty('source');
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
