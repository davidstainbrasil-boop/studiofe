import { GET, POST } from '../../api/lip-sync/route';
import * as service from '@lib/services/lip-sync-integration';
import { NextRequest } from 'next/server';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => {
      return {
        status: init?.status ?? 200,
        json: async () => data,
      }
    }
  },
  NextRequest: jest.fn()
}));

// Mock do serviço
jest.mock('@/lib/services/lip-sync-integration', () => ({
  generateLipSyncVideo: jest.fn(),
  validateLipSyncResources: jest.fn(),
}));

// Mock do middleware withPlanGuard para bypass de autenticação em testes
jest.mock('@/middleware/with-plan-guard', () => ({
  withPlanGuard: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

function createMockRequest(url: string, options: { method?: string, body?: unknown } = {}) {
  const headers = new Map<string, string>([
    ['authorization', 'Bearer test-token'],
    ['content-type', 'application/json'],
  ]);
  
  return {
    url,
    method: options.method || 'GET',
    json: async () => options.body || {},
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) || null,
      has: (key: string) => headers.has(key.toLowerCase()),
    },
  } as unknown as NextRequest;
}

describe('Lip Sync API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /validate', () => {
    it('should return validation result', async () => {
      const mockValidation = { valid: true, errors: [] };
      (service.validateLipSyncResources as jest.Mock).mockResolvedValue(mockValidation);

      const req = createMockRequest('http://localhost:3000/api/lip-sync/validate');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockValidation);
    });
  });

  describe('POST', () => {
    it('should return 500 if resources are invalid', async () => {
      (service.validateLipSyncResources as jest.Mock).mockResolvedValue({ valid: false, errors: ['Missing API Key'] });

      const req = createMockRequest('http://localhost:3000/api/lip-sync', {
        method: 'POST',
        body: { text: 'Hello', avatarImageUrl: 'url' }
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Recursos não configurados');
    });

    it('should return 400 if missing required fields', async () => {
      (service.validateLipSyncResources as jest.Mock).mockResolvedValue({ valid: true, errors: [] });

      const req = createMockRequest('http://localhost:3000/api/lip-sync', {
        method: 'POST',
        body: { text: 'Hello' } // Missing avatarImageUrl
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('should return 500 if generation fails', async () => {
      (service.validateLipSyncResources as jest.Mock).mockResolvedValue({ valid: true, errors: [] });
      (service.generateLipSyncVideo as jest.Mock).mockResolvedValue({ status: 'failed' });

      const req = createMockRequest('http://localhost:3000/api/lip-sync', {
        method: 'POST',
        body: { text: 'Hello', avatarImageUrl: 'url' }
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });

    it('should return success result', async () => {
      (service.validateLipSyncResources as jest.Mock).mockResolvedValue({ valid: true, errors: [] });
      const mockResult = { status: 'completed', videoUrl: 'video.mp4' };
      (service.generateLipSyncVideo as jest.Mock).mockResolvedValue(mockResult);

      const req = createMockRequest('http://localhost:3000/api/lip-sync', {
        method: 'POST',
        body: { text: 'Hello', avatarImageUrl: 'url' }
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockResult);
    });
  });
});
