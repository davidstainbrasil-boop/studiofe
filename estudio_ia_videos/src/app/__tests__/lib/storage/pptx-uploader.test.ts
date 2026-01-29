import { PptxUploader } from '@/lib/storage/pptx-uploader'
import { ValidationError } from '@/lib/error-handling'
import fs from 'fs/promises'
import path from 'path'

describe('PptxUploader', () => {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'pptx')

  beforeEach(() => {
    process.env.STORAGE_TYPE = 'local'
  })

  afterEach(async () => {
    const prefix = 'test-project_'
    try {
      const entries = await fs.readdir(uploadsDir)
      await Promise.all(
        entries
          .filter((name) => name.startsWith(prefix))
          .map((name) => fs.unlink(path.join(uploadsDir, name)).catch(() => undefined)),
      )
    } catch {
    }
  })

  it('accepts .pptx when browser sends empty file.type', async () => {
    const uploader = new PptxUploader()
    const file = new File([new Uint8Array([1, 2, 3])], 'teste.pptx', { type: '' })

    const result = await uploader.upload({ file, userId: 'user-1', projectId: 'test-project' })

    expect(result.fileName).toBe('teste.pptx')
    expect(result.fileSize).toBeGreaterThan(0)
  })

  it('accepts .pptx when browser sends application/octet-stream', async () => {
    const uploader = new PptxUploader()
    const file = new File([new Uint8Array([1, 2, 3])], 'teste.pptx', { type: 'application/octet-stream' })

    const result = await uploader.upload({ file, userId: 'user-1', projectId: 'test-project' })

    expect(result.fileName).toBe('teste.pptx')
  })

  it('rejects non-pptx files', async () => {
    const uploader = new PptxUploader()
    const file = new File([new Uint8Array([1, 2, 3])], 'teste.png', { type: 'image/png' })

    await expect(uploader.upload({ file, userId: 'user-1', projectId: 'test-project' })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
})

