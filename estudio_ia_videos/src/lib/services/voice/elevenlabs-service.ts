import { logger } from '@/lib/logger'

export interface Voice {
  id: string
  name: string
  category: string
  previewUrl?: string
}

export interface TTSConfig {
  text: string
  voiceId: string
  modelId?: string // 'eleven_multilingual_v2'
  stability?: number
  similarityBoost?: number
}

export class ElevenLabsService {
  private apiKey: string
  private baseUrl = 'https://api.elevenlabs.io/v1'

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || ''
    if (!this.apiKey) {
      logger.warn('ELEVENLABS_API_KEY is not set')
    }
  }

  /**
   * List available voices
   */
  async getVoices(): Promise<Voice[]> {
    if (!this.apiKey) return []

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: { 'xi-api-key': this.apiKey }
      })

      if (!response.ok) throw new Error(`ElevenLabs API Error: ${response.statusText}`)

      const data = await response.json()
      return data.voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        previewUrl: v.preview_url
      }))
    } catch (error) {
      logger.error('Failed to fetch ElevenLabs voices', error as Error)
      return []
    }
  }

  /**
   * Generate Audio from Text
   */
  async generateAudio(config: TTSConfig): Promise<Buffer> {
    if (!this.apiKey) throw new Error('ELEVENLABS_API_KEY missing')

    try {
      const modelId = config.modelId || 'eleven_multilingual_v2'
      const voiceId = config.voiceId

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: config.text,
          model_id: modelId,
          voice_settings: {
            stability: config.stability ?? 0.5,
            similarity_boost: config.similarityBoost ?? 0.75
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs TTS Failed: ${errorText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      logger.error('ElevenLabs TTS Generation Failed', error as Error)
      throw error
    }
  }

  /**
   * Clone a Voice (Instant Cloning)
   */
  async cloneVoice(name: string, audioFiles: Blob[]): Promise<string> {
    if (!this.apiKey) throw new Error('ELEVENLABS_API_KEY missing')

    try {
      const formData = new FormData()
      formData.append('name', name)
      audioFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Voice Cloning Failed: ${errorText}`)
      }

      const data = await response.json()
      return data.voice_id
    } catch (error) {
      logger.error('Voice Cloning Failed', error as Error)
      throw error
    }
  }
}
