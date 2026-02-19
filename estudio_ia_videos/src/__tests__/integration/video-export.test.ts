/**
 * @jest-environment node
 */
import { POST } from '@/app/api/video/export/route'
import { NextRequest } from 'next/server'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock rate limiter — outer route (video/export)
jest.mock('@/lib/rate-limit', () => ({
  applyRateLimit: jest.fn().mockResolvedValue(null), // null = não bloqueado
  globalRateLimiter: { check: jest.fn().mockReturnValue({ success: true }) },
}));

// Mock logger
jest.mock('@lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock direto da rota export-real — evita toda a cadeia de dependências internas
// (auth, prisma, ffmpeg, etc.) e garante resposta determinística no teste de integração
jest.mock('@/app/api/v1/video/export-real/route', () => ({
  POST: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, jobId: 'new-job-id', status: 'queued' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
  ),
}));

describe('Integration: Video Export API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply após clearAllMocks
    const rateLimitMod = jest.requireMock('@/lib/rate-limit') as { applyRateLimit: jest.Mock };
    rateLimitMod.applyRateLimit.mockResolvedValue(null);

    const exportRealMod = jest.requireMock('@/app/api/v1/video/export-real/route') as { POST: jest.Mock };
    exportRealMod.POST.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, jobId: 'new-job-id', status: 'queued' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
  });

  it('should create a render job (POST)', async () => {
    const req = new NextRequest('http://localhost/api/video/export', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'test-project-id',
        settings: { format: 'mp4', resolution: '1080p' },
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.jobId).toBe('new-job-id');
    expect(json.data.status).toBe('queued');
  });

  it('should fail without projectId', async () => {
    const req = new NextRequest('http://localhost/api/video/export', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing projectId');
  });
})
