import { createStorage } from '@/lib/storage'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Mock S3 Client
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({})
    })),
    PutObjectCommand: jest.fn()
  }
})

// Mock fs/promises and fs
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}))
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined)
}))

describe('Storage adapter', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('LocalStorage', () => {
    it('saves file locally when provider is local', async () => {
      process.env.STORAGE_PROVIDER = 'local'
      const storage = createStorage()
      const buffer = Buffer.from('test')
      const result = await storage.saveFile(buffer, 'pptx/test-file.pptx', 'application/octet-stream')
      
      expect(result.url.startsWith('/uploads/')).toBe(true)
      expect(require('fs').promises.mkdir).toHaveBeenCalled()
      expect(require('fs').promises.writeFile).toHaveBeenCalled()
    })
  })

  describe('S3Storage', () => {
    it('saves file to S3 when provider is s3', async () => {
      process.env.STORAGE_PROVIDER = 's3'
      process.env.AWS_S3_BUCKET = 'test-bucket'
      process.env.AWS_REGION = 'us-east-1'
      
      const storage = createStorage()
      const buffer = Buffer.from('test')
      const result = await storage.saveFile(buffer, 'test-key', 'text/plain')
      
      expect(S3Client).toHaveBeenCalled()
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-key',
        Body: buffer,
        ContentType: 'text/plain'
      })
      expect(result.url).toContain('test-bucket.s3.us-east-1.amazonaws.com/test-key')
    })

    it('throws error if bucket is not configured', async () => {
      process.env.STORAGE_PROVIDER = 's3'
      delete process.env.AWS_S3_BUCKET
      
      const storage = createStorage()
      const buffer = Buffer.from('test')
      
      await expect(storage.saveFile(buffer, 'key')).rejects.toThrow('AWS_S3_BUCKET not configured')
    })
  })
})
