import { AzureVisemeEngine } from '@/lib/sync/azure-viseme-engine'
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals'

// Mocking the Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jest } = require('@jest/globals')
  return {
    SpeechConfig: {
      fromSubscription: jest.fn(() => ({
        speechSynthesisVoiceName: '',
        speechSynthesisOutputFormat: ''
      }))
    },
    SpeechSynthesizer: jest.fn().mockImplementation(() => ({
      speakTextAsync: jest.fn((text: string, cb: (result: any) => void) => {
        // Simulate success
        cb({
          reason: 0, // ResultReason.SynthesizingAudioCompleted (mocked value)
          audioDuration: 10000000, // 1 second in ticks
          audioData: new ArrayBuffer(1024),
          errorDetails: null
        })
      }),
      close: jest.fn(),
      visemeReceived: null // Will be assigned by consumers
    })),
    ResultReason: {
      SynthesizingAudioCompleted: 0
    },
    SpeechSynthesisOutputFormat: {
      Audio16Khz32KBitRateMonoMp3: 0
    }
  }
})

describe('AzureVisemeEngine', () => {
  let engine: AzureVisemeEngine
  const originalEnv = process.env

  beforeAll(() => {
    process.env.AZURE_SPEECH_KEY = 'mock-key'
    process.env.AZURE_SPEECH_REGION = 'mock-region'
    engine = new AzureVisemeEngine()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should convert Azure visemes to unified Phonemes', () => {
    const azureVisemes = [
      { time: 0, visemeId: 0, animation: '' },     // sil
      { time: 100, visemeId: 1, animation: '' },   // ae -> aa
      { time: 200, visemeId: 21, animation: '' }   // n -> nn
    ]

    const phonemes = engine.convertAzureVisemes(azureVisemes)

    expect(phonemes).toHaveLength(3)
    
    // Check conversions
    expect(phonemes[0].viseme).toBe('sil')
    expect(phonemes[1].viseme).toBe('aa')
    expect(phonemes[2].viseme).toBe('nn')

    // Check timing
    expect(phonemes[0].time).toBe(0)
    expect(phonemes[0].duration).toBeCloseTo(0.1) // 100ms
  })

  it('should calculate intensity correctly', () => {
    // ID 1 (ae) is open mouth -> high intensity
    // ID 21 (n) is closed/narrow -> low intensity
    const azureVisemes = [
      { time: 0, visemeId: 1, animation: '' },
      { time: 100, visemeId: 21, animation: '' }
    ]

    const phonemes = engine.convertAzureVisemes(azureVisemes)

    expect(phonemes[0].intensity).toBe(0.9)
    expect(phonemes[1].intensity).toBe(0.5)
  })
})
