/**
 * @jest-environment node
 */
import { POST } from '@/app/api/avatar/generate/route'
import { NextRequest } from 'next/server'
import { describe, it, expect, jest } from '@jest/globals'
import { AvatarQuality } from '@/lib/avatar/quality-tier-system'

// Mock do middleware withPlanGuard para bypass de autenticação em testes
jest.mock('@/middleware/with-plan-guard', () => {
  return {
    withPlanGuard: (handler: (req: Request) => Promise<Response>) => handler,
  }
})

// Mock Supabase
jest.mock('@/lib/supabase/server', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals')
  return {
    createClient: () => ({
        auth: {
        getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-integration' } },
            error: null
        })
        }
    }),
    getSupabaseForRequest: () => ({
        auth: {
        getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-integration' } },
            error: null
        })
        }
    })
}})

// Mock Negotiator to avoid network calls
jest.mock('@/lib/avatar/avatar-quality-negotiator', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { jest } = require('@jest/globals')
    const { AvatarQuality } = require('@/lib/avatar/quality-tier-system')
    
    return {
        AvatarQualityNegotiator: jest.fn().mockImplementation(() => ({
            selectBestQuality: jest.fn().mockResolvedValue({
                quality: AvatarQuality.STANDARD, 
                reason: 'mocked',
                fallbackChain: []
            })
        }))
    }
})

// Mock DID Service to avoid real API calls
jest.mock('@/lib/services/avatar/did-service-real', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals')
  return {
    DIDServiceReal: jest.fn().mockImplementation(() => ({
      createTalk: jest.fn().mockResolvedValue('mock-did-id'),
      getTalkStatus: jest.fn().mockResolvedValue({ status: 'done', resultUrl: 'http://video.mp4' })
    }))
  }
})

describe('Integration: Avatar Generation API', () => {
    
    it('should successfully handle STANDARD quality request', async () => {
        const req = new NextRequest('http://localhost/api/avatar/generate', {
            method: 'POST',
            body: JSON.stringify({
                text: 'Test standard',
                sourceImageUrl: 'http://image.jpg',
                quality: AvatarQuality.STANDARD
            })
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.jobId).toBe('mock-did-id')
        expect(json.data.cost).toBe(1)
        expect(json.negotiation.actual).toBe(AvatarQuality.STANDARD)
    })

    it('should validate inputs (missing image for standard)', async () => {
        const req = new NextRequest('http://localhost/api/avatar/generate', {
            method: 'POST',
            body: JSON.stringify({
                text: 'Test fail',
                quality: AvatarQuality.STANDARD
                // No sourceImage
            })
        })

        const res = await POST(req)
        expect(res.status).toBe(400)
    })
})
