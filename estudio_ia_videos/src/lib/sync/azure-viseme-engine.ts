import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { logger } from '@/lib/logger'
import { Phoneme } from './types/phoneme.types'
import { Buffer } from 'buffer'

export interface AzureVisemeResult {
  audioData: Buffer
  visemes: AzureViseme[]
  duration: number
}

export interface AzureViseme {
  time: number          // Offset em ms
  visemeId: number      // ID do viseme (0-21)
  animation: string     // JSON com blend shapes
}

export class AzureVisemeEngine {
  private subscriptionKey: string
  private region: string

  constructor() {
    this.subscriptionKey = process.env.AZURE_SPEECH_KEY!
    this.region = process.env.AZURE_SPEECH_REGION || 'eastus'

    if (!this.subscriptionKey) {
      // Don't throw in constructor to allow mock/dev mode, but log warning
      logger.warn('AZURE_SPEECH_KEY not configured')
    }
  }

  /**
   * Sintetiza voz COM visemes usando Azure
   */
  async synthesizeWithVisemes(
    text: string,
    voice: string = 'pt-BR-FranciscaNeural'
  ): Promise<AzureVisemeResult> {
    if (!this.subscriptionKey) throw new Error('AZURE_SPEECH_KEY not configured');

    return new Promise((resolve, reject) => {
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.subscriptionKey,
        this.region
      )

      speechConfig.speechSynthesisVoiceName = voice
      speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

      // Use null synthesizer to prevent auto-playback (if supported) or just memory stream
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined)
      const visemes: AzureViseme[] = []

      // Capturar eventos de viseme
      synthesizer.visemeReceived = (s, e) => {
        visemes.push({
          time: e.audioOffset / 10000, // Converter de 100ns para ms
          visemeId: e.visemeId,
          animation: e.animation
        })
      }

      // Sintetizar
      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            // duration is in ticks (100ns)
            const duration = result.audioDuration / 10000 // ms

            resolve({
              audioData: Buffer.from(result.audioData),
              visemes,
              duration
            })
          } else {
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`))
          }

          synthesizer.close()
        },
        error => {
          synthesizer.close()
          reject(error)
        }
      )
    })
  }

  /**
   * Converte visemes Azure (0-21) para nosso formato unificado
   */
  convertAzureVisemes(azureVisemes: AzureViseme[]): Phoneme[] {
    return azureVisemes.map((viseme, index) => {
      const nextViseme = azureVisemes[index + 1]
      const duration = nextViseme
        ? (nextViseme.time - viseme.time) / 1000
        : 0.1

      return {
        time: viseme.time / 1000, // ms para segundos
        duration,
        phoneme: this.visemeIdToPhoneme(viseme.visemeId),
        viseme: this.visemeIdToVisemeName(viseme.visemeId),
        intensity: this.calculateVisemeIntensity(viseme.visemeId)
      }
    })
  }

  /**
   * Mapeia ID de viseme Azure (0-21) para phonema
   */
  private visemeIdToPhoneme(id: number): string {
    const mapping = [
      'sil', 'ae', 'aa', 'ao', 'eh', 'er', 'ih', 'iy',
      'uh', 'uw', 'b', 'ch', 'd', 'dh', 'f', 'g',
      'hh', 'jh', 'k', 'l', 'm', 'n'
    ]
    return mapping[id] || 'sil'
  }

  /**
   * Mapeia ID de viseme Azure para nome de viseme 3D
   */
  private visemeIdToVisemeName(id: number): string {
    const mapping = [
      'sil', 'aa', 'aa', 'O', 'E', 'er', 'ih', 'E',
      'U', 'U', 'PP', 'CH', 'DD', 'TH', 'FF', 'kk',
      'I', 'CH', 'kk', 'I', 'PP', 'nn'
    ]
    return mapping[id] || 'sil'
  }

  private calculateVisemeIntensity(id: number): number {
    // Visemes de boca aberta = maior intensidade
    const openMouthVisemes = [1, 2, 3, 4, 8, 9]
    return openMouthVisemes.includes(id) ? 0.9 : 0.5
  }
}
