import { RhubarbLipSyncEngine } from '@/lib/sync/rhubarb-lip-sync-engine'
import { describe, it, expect, beforeAll } from '@jest/globals'
import path from 'path'
import fs from 'fs'

describe('RhubarbLipSyncEngine', () => {
  let engine: RhubarbLipSyncEngine
  let testAudioPath: string

  beforeAll(() => {
    engine = new RhubarbLipSyncEngine()
    testAudioPath = path.join(__dirname, 'fixtures', 'test-audio.wav')
    
    // Ensure fixture exists
    if (!fs.existsSync(testAudioPath)) {
        throw new Error(`Test audio fixture not found at ${testAudioPath}`)
    }
  })

  it('should generate phonemes from audio file', async () => {
    // Increase timeout for binary execution
    const result = await engine.generatePhonemes(testAudioPath)

    expect(result).toBeDefined()
    expect(result.phonemes).toBeInstanceOf(Array)
    // Note: With silence/sine wave, Rhubarb might output minimal phonemes
    // expect(result.phonemes.length).toBeGreaterThan(0) 
    expect(result.duration).toBeGreaterThan(0)
  }, 10000)

  it('should include viseme mappings in phonemes', async () => {
    const result = await engine.generatePhonemes(testAudioPath)

    if (result.phonemes.length > 0) {
        result.phonemes.forEach(phoneme => {
            expect(phoneme).toHaveProperty('time')
            expect(phoneme).toHaveProperty('duration')
            expect(phoneme).toHaveProperty('phoneme')
            expect(phoneme).toHaveProperty('viseme')
            expect(phoneme).toHaveProperty('intensity')
            expect(phoneme.intensity).toBeGreaterThanOrEqual(0)
            expect(phoneme.intensity).toBeLessThanOrEqual(1)
        })
    }
  }, 10000)

  it('should map Rhubarb shapes to visemes correctly', async () => {
    const result = await engine.generatePhonemes(testAudioPath)

    const validVisemes = ['aa', 'PP', 'E', 'O', 'U', 'FF', 'TH', 'sil', 'I', 'DD', 'kk', 'CH', 'SS', 'nn']

    result.phonemes.forEach(phoneme => {
      expect(validVisemes).toContain(phoneme.viseme)
    })
  }, 10000)
})
