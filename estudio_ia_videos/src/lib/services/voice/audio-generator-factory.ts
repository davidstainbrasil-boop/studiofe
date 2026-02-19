import { ElevenLabsService } from './elevenlabs-service'
import { AzureVisemeEngine } from '@/lib/sync/azure-viseme-engine' // Reusing Azure from Phase 1
import { logger } from '@/lib/logger'

export enum AudioProvider {
  AZURE = 'azure',
  ELEVENLABS = 'elevenlabs'
}

export interface AudioGenerationParams {
  text: string
  voiceId: string // e.g. "pt-BR-FranciscaNeural" or ElevenLabs ID
  provider: AudioProvider
}

interface VoiceListItem {
  id: string
  name: string
  category: string
  provider: AudioProvider
  locale?: string
  gender?: string
}

export class AudioGeneratorFactory {
  private elevenLabs: ElevenLabsService
  private azure: AzureVisemeEngine

  constructor() {
    this.elevenLabs = new ElevenLabsService()
    this.azure = new AzureVisemeEngine()
  }

  async generateAudio(params: AudioGenerationParams): Promise<Buffer> {
    if (params.provider === AudioProvider.ELEVENLABS) {
      return await this.elevenLabs.generateAudio({
        text: params.text,
        voiceId: params.voiceId
      })
    } else {
      // Azure
      // Logic from Phase 1: AzureVisemeEngine usually returns visemes too.
      // We might need to adapt it just for Audio if we only want audio here.
      // But AzureVisemeEngine.synthesizeWithVisemes returns audioData buffer.
      const result = await this.azure.synthesizeWithVisemes(params.text, params.voiceId)
      return result.audioData
    }
  }

  /**
   * Get available voices from all providers
   * Uses real provider APIs
   */
  async getAvailableVoices() {
    const [elevenLabsVoices, azureVoices] = await Promise.all([
      this.elevenLabs.getVoices(),
      this.getAzureVoices(),
    ])

    return {
      elevenLabs: elevenLabsVoices.map((voice) => ({
        ...voice,
        provider: AudioProvider.ELEVENLABS,
      })),
      azure: azureVoices,
    }
  }

  private async getAzureVoices(): Promise<VoiceListItem[]> {
    const key = process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY
    const region = process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION || process.env.AZURE_REGION

    if (!key || !region) {
      logger.warn('Azure voice listing skipped: missing credentials')
      return []
    }

    try {
      const response = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': key,
          },
          cache: 'no-store',
        }
      )

      if (!response.ok) {
        const details = await response.text()
        throw new Error(`Azure voices list failed: HTTP ${response.status} - ${details.slice(0, 200)}`)
      }

      const voices = await response.json() as Array<{
        ShortName?: string
        DisplayName?: string
        Locale?: string
        Gender?: string
        VoiceType?: string
      }>

      const prioritized = voices
        .filter((voice) => typeof voice.ShortName === 'string' && typeof voice.DisplayName === 'string')
        .filter((voice) => {
          const locale = voice.Locale || ''
          return locale.startsWith('pt-BR') || locale.startsWith('pt-PT') || locale.startsWith('en-US')
        })
        .slice(0, 120)
        .map((voice) => ({
          id: voice.ShortName as string,
          name: voice.DisplayName as string,
          category: voice.VoiceType || 'standard',
          provider: AudioProvider.AZURE,
          locale: voice.Locale,
          gender: voice.Gender,
        }))

      return prioritized
    } catch (error) {
      logger.error('Failed to fetch Azure voices', error as Error)
      return []
    }
  }
}
