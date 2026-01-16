/**
 * @jest-environment node
 */
import { POST } from '@/app/api/video/export/route'
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
                data: { user: { id: 'test-user-export' } },
                error: null
            })
        },
        from: (table: string) => {
            if (table === 'projects') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: jest.fn().mockResolvedValue({
                                data: { id: 'test-project-id', name: 'Test Project' },
                                error: null
                            })
                        })
                    })
                }
            }
            if (table === 'render_jobs') {
                return {
                    insert: (data: any) => ({
                        select: () => ({
                            single: jest.fn().mockResolvedValue({
                                data: { id: 'new-job-id', status: 'queued', ...data },
                                error: null
                            })
                        })
                    })
                }
            }
            return {
                select: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
            }
        }
    })
}})

describe('Integration: Video Export API', () => {
    it('should create a render job (POST)', async () => {
        const req = new NextRequest('http://localhost/api/video/export', {
            method: 'POST',
            body: JSON.stringify({
                projectId: 'test-project-id',
                settings: { format: 'mp4', resolution: '1080p' }
            })
        })
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.jobId).toBe('new-job-id')
        expect(json.data.status).toBe('queued')
    })

    it('should fail without projectId', async () => {
        const req = new NextRequest('http://localhost/api/video/export', {
            method: 'POST',
            body: JSON.stringify({})
        })
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('Missing projectId')
    })
})
