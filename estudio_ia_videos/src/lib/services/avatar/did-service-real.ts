import axios, { AxiosInstance } from 'axios'
import { logger } from '@/lib/logger' // Fixed path from plan to match project structure

export interface DIDTalkConfig {
  sourceImage: string      // URL da imagem do avatar
  text?: string           // Texto para falar
  audioUrl?: string       // Ou URL de áudio customizado
  voice?: string          // ID da voz (ex: pt-BR-FranciscaNeural)
  settings?: {
    fluent?: boolean      // Smooth transitions
    padAudio?: number     // Padding em segundos
    stitch?: boolean      // Stitch gaps
    crop?: {
      type: 'wide' | 'square' | 'vertical'
    }
  }
  webhookUrl?: string
}

export interface DIDTalkStatus {
  id: string
  status: 'created' | 'processing' | 'done' | 'error'
  resultUrl?: string
  error?: string
  createdAt: string
  duration?: number
}

export class DIDServiceReal {
  private client: AxiosInstance
  private baseURL = 'https://api.d-id.com'

  constructor() {
    const apiKey = process.env.DID_API_KEY

    // Allow internal usage without key validation for testing/mocks, 
    // but log warning if missing
    if (!apiKey) {
      logger.warn('DID_API_KEY not configured')
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  /**
   * Cria um novo avatar falante
   */
  async createTalk(config: DIDTalkConfig): Promise<string> {
    try {
      logger.info('Creating D-ID talk', { sourceImage: config.sourceImage })

      const payload: any = {
        source_url: config.sourceImage,
        config: {
          fluent: config.settings?.fluent ?? true,
          pad_audio: config.settings?.padAudio ?? 0,
          stitch: config.settings?.stitch ?? true,
          result_format: 'mp4'
        }
      }

      // Script de áudio ou texto
      if (config.audioUrl) {
        payload.script = {
          type: 'audio',
          audio_url: config.audioUrl
        }
      } else if (config.text) {
        payload.script = {
          type: 'text',
          input: config.text,
          provider: {
            type: 'microsoft',
            voice_id: config.voice || 'pt-BR-FranciscaNeural'
          }
        }
      } else {
        throw new Error('Either text or audioUrl must be provided')
      }

      // Webhook callback
      if (config.webhookUrl) {
        payload.webhook = config.webhookUrl
      }

      const response = await this.client.post('/talks', payload)

      logger.info('D-ID talk created', {
        talkId: response.data.id,
        status: response.data.status
      })

      return response.data.id

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('D-ID API error', new Error(error.message), {
          status: error.response?.status,
          data: error.response?.data
        })
        throw new Error(`D-ID API error: ${JSON.stringify(error.response?.data?.error) || error.message}`)
      }
      throw error
    }
  }

  /**
   * Verifica status do talk
   */
  async getTalkStatus(talkId: string): Promise<DIDTalkStatus> {
    try {
      const response = await this.client.get(`/talks/${talkId}`)

      return {
        id: response.data.id,
        status: response.data.status,
        resultUrl: response.data.result_url,
        error: response.data.error,
        createdAt: response.data.created_at,
        duration: response.data.duration
      }

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Failed to get talk status: ${JSON.stringify(error.response?.data?.error) || error.message}`)
      }
      throw error
    }
  }

  /**
   * Aguarda conclusão do talk (com polling)
   */
  async waitForTalkCompletion(
    talkId: string,
    options: {
      maxWaitTime?: number    // ms (default: 5 min)
      pollInterval?: number    // ms (default: 2s)
      onProgress?: (status: DIDTalkStatus) => void
    } = {}
  ): Promise<DIDTalkStatus> {

    const maxWaitTime = options.maxWaitTime || 300000 // 5 minutos
    const pollInterval = options.pollInterval || 2000  // 2 segundos
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTalkStatus(talkId)

      if (options.onProgress) {
        options.onProgress(status)
      }

      if (status.status === 'done') {
        return status
      }

      if (status.status === 'error') {
        throw new Error(`D-ID talk failed: ${JSON.stringify(status.error)}`)
      }

      // Aguardar antes do próximo poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error('D-ID talk timeout: exceeded maximum wait time')
  }

  /**
   * Deleta um talk
   */
  async deleteTalk(talkId: string): Promise<void> {
    try {
      await this.client.delete(`/talks/${talkId}`)
      logger.info('D-ID talk deleted', { talkId })
    } catch (error) {
       // Just warn, don't throw for deletion failure
      logger.warn('Failed to delete D-ID talk', { talkId, error })
    }
  }

  /**
   * Lista voices disponíveis
   */
  async listVoices(language?: string): Promise<Array<{
    id: string
    name: string
    language: string
    gender: 'Male' | 'Female'
  }>> {
    try {
      const response = await this.client.get('/voices', {
        params: { language }
      })

      return response.data.voices
    } catch (error) {
      logger.error('Failed to list D-ID voices', error as Error)
      return []
    }
  }

  /**
   * Upload de imagem customizada
   */
  async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
    try {
      // Note: D-ID upload endpoint usually requires form-data
      // This implementation assumes axios handles FormData if passed correctly, 
      // but in Node environment we might need 'form-data' package if not using Blob/File APIs standard
      // Let's use 'form-data' package if available or construct it manually.
      // Since package.json has 'form-data', we should import it.
      
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', imageBuffer, filename);

      const response = await this.client.post('/images', formData, {
        headers: {
          ...formData.getHeaders()
        }
      })

      return response.data.url

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Failed to upload image: ${JSON.stringify(error.response?.data?.error) || error.message}`)
      }
      throw error
    }
  }
}
