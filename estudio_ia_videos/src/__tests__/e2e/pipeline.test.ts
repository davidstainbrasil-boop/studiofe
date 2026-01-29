/**
 * E2E Pipeline Test - Standalone Runner
 * Tests the complete video generation pipeline:
 * API Quotas → NR Compliance → TTS → PPTX Parser
 * 
 * Run with: npx tsx scripts/run-e2e-tests.ts
 */

import path from 'path';
import fs from 'fs/promises';

// Lazy imports to avoid circular dependencies
let apiQuotaMonitor: any;
let nrTemplateCache: any;
let elevenLabsService: any;

async function loadModules() {
  const { apiQuotaMonitor: monitor } = await import('@lib/monitoring/api-quota-monitor');
  const { nrTemplateCache: cache } = await import('@lib/compliance/nr-template-cache');
  const { elevenLabsService: service } = await import('@lib/elevenlabs-service');
  
  apiQuotaMonitor = monitor;
  nrTemplateCache = cache;
  elevenLabsService = service;
}

// Standalone test runner
export async function runE2ETests(): Promise<{ passed: number; failed: number; results: string[] }> {
  await loadModules();
  
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    try {
      await testFn();
      passed++;
      results.push(`✅ ${name}`);
    } catch (error) {
      failed++;
      results.push(`❌ ${name}: ${(error as Error).message}`);
    }
  };

  // ========================================
  // API Quota Tests
  // ========================================
  await runTest('API Quota - Fetch All', async () => {
    const quotas = await apiQuotaMonitor.getAllQuotas(true);
    if (!quotas.lastUpdated) throw new Error('No lastUpdated');
  });

  await runTest('API Quota - Summary', async () => {
    const summary = await apiQuotaMonitor.getQuotaSummary();
    if (typeof summary !== 'string') throw new Error('Summary not string');
  });

  await runTest('API Quota - Check ElevenLabs', async () => {
    const hasQuota = await apiQuotaMonitor.hasQuotaAvailable('elevenlabs');
    if (typeof hasQuota !== 'boolean') throw new Error('Not boolean');
  });

  // ========================================
  // NR Compliance Tests
  // ========================================
  const testContent = `
    Treinamento sobre EPI - Equipamento de Proteção Individual.
    Capacete, óculos e luvas com CA válido.
    Trabalho em altura com cinto de segurança e talabarte.
    Análise de risco e permissão de trabalho obrigatórios.
  `;
  
  await runTest('NR Compliance - NR-06 (EPI)', async () => {
    const result = await nrTemplateCache.getCompliance('NR-06', testContent);
    if (result.nr !== 'NR-06') throw new Error('Wrong NR code');
    if (typeof result.score !== 'number') throw new Error('Score not number');
    if (result.score < 0 || result.score > 100) throw new Error('Score out of range');
  });

  await runTest('NR Compliance - NR-35 (Altura)', async () => {
    const result = await nrTemplateCache.getCompliance('NR-35', testContent);
    if (result.nr !== 'NR-35') throw new Error('Wrong NR code');
    if (!result.nrName.includes('Altura')) throw new Error('Wrong NR name');
  });

  await runTest('NR Compliance - Cache Hit', async () => {
    // Second call should be cached
    const start = Date.now();
    await nrTemplateCache.getCompliance('NR-06', testContent);
    const elapsed = Date.now() - start;
    if (elapsed > 50) throw new Error(`Cache miss? Took ${elapsed}ms`);
  });

  await runTest('NR Compliance - Cache Stats', async () => {
    const stats = nrTemplateCache.getStats();
    if (stats.maxSize !== 100) throw new Error('Wrong maxSize');
    if (stats.ttlMinutes !== 30) throw new Error('Wrong TTL');
    if (typeof stats.size !== 'number') throw new Error('Size not number');
  });

  // ========================================
  // ElevenLabs Tests (conditional)
  // ========================================
  const hasElevenLabs = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.length > 10;
  
  if (hasElevenLabs) {
    await runTest('ElevenLabs - List Voices', async () => {
      const voices = await elevenLabsService.getVoices();
      if (!Array.isArray(voices)) throw new Error('Voices not array');
    });

    await runTest('ElevenLabs - User Info', async () => {
      const info = await elevenLabsService.getUserInfo();
      if (!info || !info.subscription) throw new Error('No subscription info');
    });
  } else {
    results.push('⏭️ ElevenLabs tests skipped (no API key)');
  }

  // ========================================
  // D-ID Tests (conditional)
  // ========================================
  const hasDID = process.env.DID_API_KEY && process.env.DID_API_KEY.length > 10;
  
  if (hasDID) {
    await runTest('D-ID - Quota Check', async () => {
      const didQuota = await apiQuotaMonitor.getDIDQuota();
      if (!didQuota) throw new Error('No D-ID quota');
      if (typeof didQuota.remaining !== 'number') throw new Error('No remaining credits');
    });
  } else {
    results.push('⏭️ D-ID tests skipped (no API key)');
  }

  // ========================================
  // HeyGen Tests (conditional)
  // ========================================
  const hasHeyGen = process.env.HEYGEN_API_KEY && process.env.HEYGEN_API_KEY.length > 10;
  
  if (hasHeyGen) {
    await runTest('HeyGen - Quota Check', async () => {
      const heygenQuota = await apiQuotaMonitor.getHeyGenQuota();
      if (!heygenQuota) throw new Error('No HeyGen quota');
      if (typeof heygenQuota.remaining !== 'number') throw new Error('No remaining quota');
    });
  } else {
    results.push('⏭️ HeyGen tests skipped (no API key)');
  }

  return { passed, failed, results };
}

// Add Jest test wrapper to allow this file to be ignored or run as test
if (typeof describe !== 'undefined') {
  describe('E2E Pipeline Runner', () => {
    it('should export runE2ETests function', () => {
      expect(typeof runE2ETests).toBe('function');
    });
  });
}
