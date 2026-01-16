/**
 * @jest-environment node
 */
import { POST, GET } from '@/app/api/voice/generate/route'
import { NextRequest } from 'next/server'
import { describe, it, expect, jest } from '@jest/globals'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals')
  return {
    createClient: () => ({
        auth: {
        getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-voice' } },
            error: null
        })
        }
    })
}})

// Mock ElevenLabs Service to avoid API calls / Key requirement
jest.mock('@/lib/services/voice/elevenlabs-service', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { jest } = require('@jest/globals')
    return {
        ElevenLabsService: jest.fn().mockImplementation(() => ({
            getVoices: jest.fn().mockResolvedValue([{ id: 'mock-voice', name: 'Mock' }]),
            generateAudio: jest.fn().mockResolvedValue(Buffer.from('mock-audio-content'))
        }))
    }
})

// Mock Azure Engine
jest.mock('@/lib/sync/azure-viseme-engine', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { jest } = require('@jest/globals')
    return {
        AzureVisemeEngine: jest.fn().mockImplementation(() => ({
            synthesizeWithVisemes: jest.fn().mockResolvedValue({ audioData: Buffer.from('mock-azure-audio') })
        }))
    }
})

describe('Integration: Voice Generation API', () => {
    it('should list voices (GET)', async () => {
        const req = new NextRequest('http://localhost/api/voice/generate')
        const res = await GET(req)
        const json = await res.json()
        
        expect(res.status).toBe(200)
        expect(json.data.elevenLabs).toHaveLength(1)
        expect(json.data.azure).toHaveLength(2)
    })

    it('should generate audio (POST) via ElevenLabs', async () => {
        const req = new NextRequest('http://localhost/api/voice/generate', {
            method: 'POST',
            body: JSON.stringify({
                text: 'Hello',
                voiceId: 'mock-voice',
                provider: 'elevenlabs'
            })
        })
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.audioBase64).toBeDefined()
        expect(json.data.contentType).toBe('audio/mpeg')
    })
})
