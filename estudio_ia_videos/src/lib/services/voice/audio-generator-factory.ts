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
   * Merges Azure static list (stubbed) and ElevenLabs dynamic list
   */
  async getAvailableVoices() {
    const elevenLabsVoices = await this.elevenLabs.getVoices()
    
    // Azure voices (simplified list for now)
    const azureVoices = [
        { id: 'pt-BR-FranciscaNeural', name: 'Francisca (Azure)', category: 'standard', provider: 'azure' },
        { id: 'pt-BR-AntonioNeural', name: 'Antonio (Azure)', category: 'standard', provider: 'azure' }
    ]

    return {
        elevenLabs: elevenLabsVoices,
        azure: azureVoices
    }
  }
}
