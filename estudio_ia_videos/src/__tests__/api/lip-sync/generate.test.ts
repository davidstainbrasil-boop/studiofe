/**
 * @jest-environment node
 */
import { POST } from '@/app/api/lip-sync/generate/route'
import { NextRequest } from 'next/server'
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals'

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
        data: { user: { id: 'test-user' } },
        error: null
      })
    }
  }),
  getSupabaseForRequest: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })
    }
  })
}})

// Mock Orchestrator
jest.mock('@/lib/sync/lip-sync-orchestrator', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals')
  return {
    LipSyncOrchestrator: jest.fn().mockImplementation(() => ({
      generateLipSync: jest.fn().mockResolvedValue({
        result: {
          phonemes: [],
          duration: 10,
          metadata: { mouthCueCount: 0, recognizer: 'test' }
        },
        provider: 'rhubarb',
        cached: false
      })
    }))
  }
})

describe('POST /api/lip-sync/generate', () => {
  it('should return 400 if no text or audioUrl provided', async () => {
    const req = new NextRequest('http://localhost/api/lip-sync/generate', {
      method: 'POST',
      body: JSON.stringify({})
    })
    
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid request")
  })

  it('should return 200 with valid text input', async () => {
    const req = new NextRequest('http://localhost/api/lip-sync/generate', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello world'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.metadata.provider).toBe('rhubarb')
  })
})
