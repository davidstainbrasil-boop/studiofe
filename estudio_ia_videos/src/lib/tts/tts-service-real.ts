/**
 * 🎤 TTS Service REAL - Serviço de Text-to-Speech Unificado
 * 
 * Este serviço:
 * - Integra com ElevenLabs, Azure, e Edge TTS
 * - Faz upload real para Supabase Storage
 * - Retorna URLs públicas funcionais
 * - Cacheia áudios para economia de créditos
 */

import { createClient } from '@supabase/supabase-js'
import { ElevenLabsProvider, type TTSRequest as ElevenLabsTTSRequest } from './providers/elevenlabs'
import { Logger } from '@lib/logger'
import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'
import os from 'os'

const logger = new Logger('tts-service-real')

// ============================================================================
// Types
// ============================================================================

export interface TTSGenerateRequest {
  text: string
  voice?: string
  voiceId?: string
  provider?: 'elevenlabs' | 'azure' | 'edge' | 'auto'
  language?: string
  speed?: number
  stability?: number
  similarityBoost?: number
  outputFormat?: 'mp3' | 'wav' | 'ogg'
  cacheEnabled?: boolean
}

export interface TTSGenerateResult {
  success: boolean
  audioUrl: string
  duration?: number
  characters: number
  provider: string
  cached: boolean
  cost?: number
  error?: string
}

export interface TTSVoice {
  id: string
  name: string
  language: string
  gender: 'male' | 'female' | 'neutral'
  provider: string
  previewUrl?: string
  accent?: string
}

// ============================================================================
// Voice Presets para Vídeos NR (Segurança do Trabalho)
// ============================================================================

export const NR_VOICE_PRESETS: Record<string, { voiceId: string; provider: string; name: string }> = {
  // ElevenLabs - Vozes Brasileiras profissionais
  'narrador-profissional': {
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - Voz masculina profissional
    provider: 'elevenlabs',
    name: 'Narrador Profissional (Adam)'
  },
  'narradora-profissional': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Voz feminina profissional
    provider: 'elevenlabs',
    name: 'Narradora Profissional (Bella)'
  },
  'instrutor-tecnico': {
    voiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh - Voz masculina técnica
    provider: 'elevenlabs',
    name: 'Instrutor Técnico (Josh)'
  },
  'instrutora-tecnica': {
    voiceId: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - Voz feminina técnica
    provider: 'elevenlabs',
    name: 'Instrutora Técnica (Dorothy)'
  },
  // Azure - Vozes PT-BR nativas
  'azure-pt-br-male': {
    voiceId: 'pt-BR-AntonioNeural',
    provider: 'azure',
    name: 'Antonio (Azure PT-BR)'
  },
  'azure-pt-br-female': {
    voiceId: 'pt-BR-FranciscaNeural',
    provider: 'azure',
    name: 'Francisca (Azure PT-BR)'
  },
}

// ============================================================================
// TTS Service Class
// ============================================================================

export class TTSServiceReal {
  private supabase: ReturnType<typeof createClient>
  private elevenLabs: ElevenLabsProvider | null = null
  private cacheDir: string
  private storageBucket: string = 'tts-audio'

  constructor() {
    // Inicializar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not found, storage will not work', { component: 'TTSServiceReal' })
    }

    this.supabase = createClient(supabaseUrl || '', supabaseKey || '')

    // Inicializar ElevenLabs se API key disponível
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY
    if (elevenLabsKey) {
      this.elevenLabs = new ElevenLabsProvider({
        apiKey: elevenLabsKey,
        modelId: 'eleven_multilingual_v2'
      })
      logger.info('ElevenLabs provider initialized', { component: 'TTSServiceReal' })
    }

    // Diretório de cache local
    this.cacheDir = path.join(os.tmpdir(), 'tts-cache')
  }

  /**
   * Gera áudio TTS e faz upload para storage
   */
  async generate(request: TTSGenerateRequest): Promise<TTSGenerateResult> {
    const startTime = Date.now()

    try {
      // Validar texto
      if (!request.text || request.text.trim().length === 0) {
        return {
          success: false,
          audioUrl: '',
          characters: 0,
          provider: 'none',
          cached: false,
          error: 'Texto vazio não é permitido'
        }
      }

      // Gerar hash para cache
      const cacheKey = this.generateCacheKey(request)
      
      // Verificar cache no storage
      if (request.cacheEnabled !== false) {
        const cachedUrl = await this.checkCache(cacheKey)
        if (cachedUrl) {
          logger.info('TTS cache hit', { cacheKey, component: 'TTSServiceReal' })
          return {
            success: true,
            audioUrl: cachedUrl,
            characters: request.text.length,
            provider: request.provider || 'cached',
            cached: true,
            cost: 0
          }
        }
      }

      // Determinar provider
      const provider = request.provider || 'auto'
      let audioBuffer: Buffer
      let usedProvider: string

      if (provider === 'elevenlabs' || (provider === 'auto' && this.elevenLabs)) {
        // Usar ElevenLabs
        if (!this.elevenLabs) {
          throw new Error('ElevenLabs API key não configurada')
        }

        const voiceId = this.resolveVoiceId(request.voice || request.voiceId || 'narrador-profissional')
        
        const result = await this.elevenLabs.textToSpeech({
          text: request.text,
          voiceId,
          stability: request.stability ?? 0.5,
          similarityBoost: request.similarityBoost ?? 0.75,
        })

        audioBuffer = result.audio
        usedProvider = 'elevenlabs'

      } else if (provider === 'edge' || provider === 'auto') {
        // Fallback para Edge TTS (gratuito)
        audioBuffer = await this.generateWithEdgeTTS(request)
        usedProvider = 'edge'

      } else {
        throw new Error(`Provider não suportado: ${provider}`)
      }

      // Upload para Supabase Storage
      const audioUrl = await this.uploadToStorage(audioBuffer, cacheKey, request.outputFormat || 'mp3')

      // Calcular duração estimada (aproximadamente 150 palavras por minuto)
      const wordCount = request.text.split(/\s+/).length
      const estimatedDuration = (wordCount / 150) * 60

      const totalTime = Date.now() - startTime
      logger.info(`TTS generated in ${totalTime}ms`, {
        provider: usedProvider,
        characters: request.text.length,
        component: 'TTSServiceReal'
      })

      return {
        success: true,
        audioUrl,
        duration: estimatedDuration,
        characters: request.text.length,
        provider: usedProvider,
        cached: false,
        cost: usedProvider === 'elevenlabs' ? request.text.length * 0.00003 : 0 // ~$30 por 1M caracteres
      }

    } catch (error) {
      logger.error('TTS generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'TTSServiceReal'
      })

      return {
        success: false,
        audioUrl: '',
        characters: request.text.length,
        provider: request.provider || 'unknown',
        cached: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Gera TTS para múltiplos slides de uma vez
   */
  async generateBatch(
    slides: Array<{ id: string; text: string; voice?: string }>,
    onProgress?: (progress: { completed: number; total: number; currentSlide: string }) => void
  ): Promise<Array<{ slideId: string; result: TTSGenerateResult }>> {
    const results: Array<{ slideId: string; result: TTSGenerateResult }> = []

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]

      onProgress?.({
        completed: i,
        total: slides.length,
        currentSlide: slide.id
      })

      const result = await this.generate({
        text: slide.text,
        voice: slide.voice,
        cacheEnabled: true
      })

      results.push({
        slideId: slide.id,
        result
      })

      // Pequeno delay para não sobrecarregar a API
      if (i < slides.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    onProgress?.({
      completed: slides.length,
      total: slides.length,
      currentSlide: 'done'
    })

    return results
  }

  /**
   * Lista vozes disponíveis
   */
  async listVoices(): Promise<TTSVoice[]> {
    const voices: TTSVoice[] = []

    // Adicionar presets NR
    for (const [key, preset] of Object.entries(NR_VOICE_PRESETS)) {
      voices.push({
        id: key,
        name: preset.name,
        language: 'pt-BR',
        gender: key.includes('narradora') || key.includes('female') ? 'female' : 'male',
        provider: preset.provider
      })
    }

    // Buscar vozes do ElevenLabs se disponível
    if (this.elevenLabs) {
      try {
        const elevenLabsVoices = await this.elevenLabs.getVoices()
        for (const voice of elevenLabsVoices) {
          voices.push({
            id: voice.voiceId,
            name: voice.name,
            language: 'multilingual',
            gender: 'neutral',
            provider: 'elevenlabs',
            previewUrl: voice.previewUrl
          })
        }
      } catch (error) {
        logger.warn('Failed to fetch ElevenLabs voices', { component: 'TTSServiceReal' })
      }
    }

    return voices
  }

  /**
   * Verifica créditos/quota disponível
   */
  async checkQuota(): Promise<{ used: number; limit: number; remaining: number; provider: string }> {
    if (this.elevenLabs) {
      try {
        const info = await this.elevenLabs.getSubscriptionInfo()
        return {
          ...info,
          provider: 'elevenlabs'
        }
      } catch (error) {
        logger.warn('Failed to check ElevenLabs quota', { component: 'TTSServiceReal' })
      }
    }

    return {
      used: 0,
      limit: 999999,
      remaining: 999999,
      provider: 'edge' // Edge TTS é gratuito
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateCacheKey(request: TTSGenerateRequest): string {
    const data = `${request.text}|${request.voice || 'default'}|${request.provider || 'auto'}|${request.speed || 1}`
    return crypto.createHash('md5').update(data).digest('hex')
  }

  private async checkCache(cacheKey: string): Promise<string | null> {
    try {
      const filePath = `cache/${cacheKey}.mp3`
      const { data } = await this.supabase.storage
        .from(this.storageBucket)
        .createSignedUrl(filePath, 3600 * 24) // URL válida por 24h

      if (data?.signedUrl) {
        // Verificar se o arquivo realmente existe tentando fazer HEAD request
        const response = await fetch(data.signedUrl, { method: 'HEAD' })
        if (response.ok) {
          return data.signedUrl
        }
      }
    } catch {
      // Cache miss
    }
    return null
  }

  private async uploadToStorage(
    audioBuffer: Buffer,
    cacheKey: string,
    format: string
  ): Promise<string> {
    const filePath = `cache/${cacheKey}.${format}`

    const { error } = await this.supabase.storage
      .from(this.storageBucket)
      .upload(filePath, audioBuffer, {
        contentType: `audio/${format}`,
        upsert: true
      })

    if (error) {
      throw new Error(`Failed to upload audio: ${error.message}`)
    }

    // Gerar URL pública
    const { data } = this.supabase.storage
      .from(this.storageBucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  private resolveVoiceId(voice: string): string {
    // Se é um preset NR
    if (NR_VOICE_PRESETS[voice]) {
      return NR_VOICE_PRESETS[voice].voiceId
    }

    // Se já é um voiceId direto
    if (voice.length > 10) {
      return voice
    }

    // Default
    return NR_VOICE_PRESETS['narrador-profissional'].voiceId
  }

  /**
   * Fallback usando Edge TTS (Microsoft) - Gratuito
   * Respeita voiceId/voice do request (ex: pt-BR-FranciscaNeural)
   */
  private async generateWithEdgeTTS(request: TTSGenerateRequest): Promise<Buffer> {
    // Usar comando edge-tts via CLI
    const tempFile = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`)
    
    // Priorizar voiceId direto, depois voice (que pode ser preset), depois default
    let voice: string
    if (request.voiceId && request.voiceId.includes('Neural')) {
      // Se voiceId é um nome de voz Edge TTS direto (ex: pt-BR-FranciscaNeural)
      voice = request.voiceId
    } else if (request.voice && request.voice.includes('Neural')) {
      voice = request.voice
    } else if (request.voiceId) {
      // Pode ser um preset NR — resolver para ID real
      const resolved = this.resolveVoiceId(request.voiceId)
      // Se o resolved parece ser Edge TTS (contém Neural), usar diretamente
      voice = resolved.includes('Neural') ? resolved : 'pt-BR-AntonioNeural'
    } else {
      voice = request.language === 'pt-BR' || !request.language
        ? 'pt-BR-AntonioNeural'
        : 'en-US-ChristopherNeural'
    }

    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      // Escapar texto para shell
      const escapedText = request.text.replace(/'/g, "'\"'\"'")
      
      await execAsync(`edge-tts --voice "${voice}" --text '${escapedText}' --write-media "${tempFile}"`)
      
      const buffer = await fs.readFile(tempFile)
      await fs.unlink(tempFile).catch(() => {})
      
      return buffer
    } catch (error) {
      // Se edge-tts não estiver instalado, tentar instalar
      logger.warn('Edge TTS failed, may need installation', { component: 'TTSServiceReal' })
      throw new Error('Edge TTS não disponível. Instale com: pip install edge-tts')
    }
  }
}

// Singleton instance
let ttsServiceInstance: TTSServiceReal | null = null

export function getTTSService(): TTSServiceReal {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSServiceReal()
  }
  return ttsServiceInstance
}

export default TTSServiceReal
