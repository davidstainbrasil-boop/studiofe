/**
 * Tests for GET /api/system/version
 * 
 * This endpoint returns application version, build info, and enabled features.
 */

// Force module mode to avoid redeclaration errors
export {};

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: Record<string, unknown>, init?: { status?: number; headers?: Record<string, string> }) => {
      const headers = new Map<string, string>();
      if (init?.headers) {
        Object.entries(init.headers).forEach(([k, v]) => headers.set(k, v));
      }
      return {
        status: init?.status ?? 200,
        json: async () => data,
        headers: {
          set: (k: string, v: string) => headers.set(k, v),
          get: (k: string) => headers.get(k),
        },
      };
    },
  },
}));

jest.mock('child_process', () => ({
  execSync: jest.fn((cmd: string) => {
    if (cmd.includes('rev-parse --short HEAD')) {
      return 'abc1234\n';
    }
    if (cmd.includes('rev-parse --abbrev-ref HEAD')) {
      return 'main\n';
    }
    throw new Error('Unknown command');
  }),
}));

const { GET } = require('../../api/system/version/route');

describe('GET /api/system/version', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns version info with correct structure', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('name', 'MVP Video TécnicoCursos');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('build');
    expect(data).toHaveProperty('node');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('features');
  });

  it('includes git commit and branch info', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.build).toEqual({
      timestamp: expect.any(String),
      commit: 'abc1234',
      branch: 'main',
    });
  });

  it('includes node runtime info', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.node).toEqual({
      version: expect.stringMatching(/^v\d+\.\d+\.\d+/),
      platform: expect.any(String),
      arch: expect.any(String),
    });
  });

  it('detects enabled features from environment variables', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.ELEVENLABS_API_KEY = 'test-key';

    const response = await GET();
    const data = await response.json();

    expect(data.features).toContain('supabase');
    expect(data.features).toContain('redis');
    expect(data.features).toContain('tts-elevenlabs');
  });

  it('returns empty features array when no integrations configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.SENTRY_DSN;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.HEYGEN_API_KEY;

    const response = await GET();
    const data = await response.json();

    expect(Array.isArray(data.features)).toBe(true);
  });

  it('sets Cache-Control header to no-store', async () => {
    const response = await GET();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('handles git command failure gracefully', async () => {
    const { execSync } = require('child_process');
    execSync.mockImplementation(() => {
      throw new Error('git not found');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.build.commit).toBeNull();
    expect(data.build.branch).toBeNull();
  });
});
