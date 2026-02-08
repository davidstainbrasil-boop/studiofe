import { logger } from '@/lib/logger';
/**
 * Multi-Language Support System - Fase 5: Integrações Premium
 * Sistema completo de suporte a múltiplos idiomas com TTS e tradução automática
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Language {
  code: string // ISO 639-1 (e.g., 'en', 'pt', 'es')
  name: string
  nativeName: string
  direction: 'ltr' | 'rtl'
  voices: Voice[]
  supported: {
    tts: boolean
    translation: boolean
    lipSync: boolean
    subtitles: boolean
  }
}

export interface Voice {
  id: string
  name: string
  gender: 'male' | 'female' | 'neutral'
  age: 'child' | 'young' | 'adult' | 'senior'
  style: 'neutral' | 'friendly' | 'professional' | 'calm' | 'energetic'
  provider: 'azure' | 'elevenlabs' | 'google' | 'amazon'
  quality: 'standard' | 'premium' | 'neural'
  sampleRate: number
  preview?: string // URL to voice preview
}

export interface TranslationRequest {
  text: string
  fromLanguage: string
  toLanguage: string
  preserveFormatting?: boolean
  glossary?: Record<string, string> // Custom term translations
}

export interface TranslationResult {
  translatedText: string
  fromLanguage: string
  toLanguage: string
  confidence: number
  detectedLanguage?: string
  alternatives?: string[]
  provider: string
}

export interface MultiLanguageVideoRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguages: string[]
  voicePreferences?: Record<string, string> // language -> voiceId
  generateSubtitles?: boolean
  syncLipSync?: boolean
}

export interface MultiLanguageVideoResult {
  videos: Array<{
    language: string
    videoUrl: string
    audioUrl: string
    subtitlesUrl?: string
    duration: number
  }>
  metadata: {
    sourceLanguage: string
    translationProvider: string
    ttsProvider: string
    processingTime: number
  }
}

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    direction: 'ltr',
    voices: [
      {
        id: 'pt-BR-FranciscaNeural',
        name: 'Francisca',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      },
      {
        id: 'pt-BR-AntonioNeural',
        name: 'Antonio',
        gender: 'male',
        age: 'adult',
        style: 'professional',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English (US)',
    direction: 'ltr',
    voices: [
      {
        id: 'en-US-JennyNeural',
        name: 'Jenny',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      },
      {
        id: 'en-US-GuyNeural',
        name: 'Guy',
        gender: 'male',
        age: 'adult',
        style: 'professional',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'es-ES',
    name: 'Spanish (Spain)',
    nativeName: 'Español (España)',
    direction: 'ltr',
    voices: [
      {
        id: 'es-ES-ElviraNeural',
        name: 'Elvira',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'fr-FR',
    name: 'French (France)',
    nativeName: 'Français (France)',
    direction: 'ltr',
    voices: [
      {
        id: 'fr-FR-DeniseNeural',
        name: 'Denise',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'de-DE',
    name: 'German (Germany)',
    nativeName: 'Deutsch (Deutschland)',
    direction: 'ltr',
    voices: [
      {
        id: 'de-DE-KatjaNeural',
        name: 'Katja',
        gender: 'female',
        age: 'adult',
        style: 'professional',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'it-IT',
    name: 'Italian (Italy)',
    nativeName: 'Italiano (Italia)',
    direction: 'ltr',
    voices: [
      {
        id: 'it-IT-ElsaNeural',
        name: 'Elsa',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'ja-JP',
    name: 'Japanese (Japan)',
    nativeName: '日本語 (日本)',
    direction: 'ltr',
    voices: [
      {
        id: 'ja-JP-NanamiNeural',
        name: 'Nanami',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '中文 (简体)',
    direction: 'ltr',
    voices: [
      {
        id: 'zh-CN-XiaoxiaoNeural',
        name: 'Xiaoxiao',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'ko-KR',
    name: 'Korean (South Korea)',
    nativeName: '한국어 (대한민국)',
    direction: 'ltr',
    voices: [
      {
        id: 'ko-KR-SunHiNeural',
        name: 'SunHi',
        gender: 'female',
        age: 'adult',
        style: 'friendly',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  },
  {
    code: 'ar-SA',
    name: 'Arabic (Saudi Arabia)',
    nativeName: 'العربية (المملكة العربية السعودية)',
    direction: 'rtl',
    voices: [
      {
        id: 'ar-SA-ZariyahNeural',
        name: 'Zariyah',
        gender: 'female',
        age: 'adult',
        style: 'professional',
        provider: 'azure',
        quality: 'neural',
        sampleRate: 24000
      }
    ],
    supported: {
      tts: true,
      translation: true,
      lipSync: true,
      subtitles: true
    }
  }
]

// ============================================================================
// MULTI-LANGUAGE SYSTEM
// ============================================================================

export class MultiLanguageSystem {
  private translationProvider: 'azure' | 'google' | 'deepl'
  private ttsProvider: 'azure' | 'elevenlabs' | 'google'

  constructor(config?: {
    translationProvider?: 'azure' | 'google' | 'deepl'
    ttsProvider?: 'azure' | 'elevenlabs' | 'google'
  }) {
    this.translationProvider = config?.translationProvider || 'azure'
    this.ttsProvider = config?.ttsProvider || 'azure'
  }

  // ============================================================================
  // LANGUAGE MANAGEMENT
  // ============================================================================

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): Language[] {
    return SUPPORTED_LANGUAGES
  }

  /**
   * Get language by code
   */
  getLanguage(code: string): Language | undefined {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code)
  }

  /**
   * Get voices for language
   */
  getVoicesForLanguage(languageCode: string): Voice[] {
    const language = this.getLanguage(languageCode)
    return language?.voices || []
  }

  /**
   * Detect language from text
   */
  async detectLanguage(text: string): Promise<{
    language: string
    confidence: number
  }> {
    try {
      const response = await fetch('/api/i18n/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error('Language detection failed')
      }

      return await response.json()
    } catch (error) {
      logger.error('[MultiLanguageSystem] Language detection failed:', error instanceof Error ? error : new Error(String(error)))
      return { language: 'en-US', confidence: 0 }
    }
  }

  // ============================================================================
  // TRANSLATION
  // ============================================================================

  /**
   * Translate text
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    try {
      const response = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          provider: this.translationProvider
        })
      })

      if (!response.ok) {
        throw new Error('Translation failed')
      }

      return await response.json()
    } catch (error) {
      logger.error('[MultiLanguageSystem] Translation failed:', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Batch translate to multiple languages
   */
  async batchTranslate(
    text: string,
    fromLanguage: string,
    toLanguages: string[]
  ): Promise<Record<string, TranslationResult>> {
    const translations = await Promise.all(
      toLanguages.map(async (toLang) => {
        const result = await this.translate({
          text,
          fromLanguage,
          toLanguage: toLang
        })
        return [toLang, result] as [string, TranslationResult]
      })
    )

    return Object.fromEntries(translations)
  }

  // ============================================================================
  // MULTI-LANGUAGE VIDEO GENERATION
  // ============================================================================

  /**
   * Generate videos in multiple languages
   */
  async generateMultiLanguageVideos(
    request: MultiLanguageVideoRequest
  ): Promise<MultiLanguageVideoResult> {
    const startTime = Date.now()

    try {
      // 1. Translate to all target languages
      const translations = await this.batchTranslate(
        request.sourceText,
        request.sourceLanguage,
        request.targetLanguages
      )

      // 2. Generate video for each language
      const videos = await Promise.all(
        request.targetLanguages.map(async (lang) => {
          const translation = translations[lang]

          // Get voice for this language
          const voice = request.voicePreferences?.[lang] ||
            this.getDefaultVoiceForLanguage(lang)

          // Generate TTS
          const audioUrl = await this.generateTTS(
            translation.translatedText,
            voice,
            lang
          )

          // Generate video with lip-sync (if enabled)
          let videoUrl: string
          if (request.syncLipSync) {
            videoUrl = await this.generateVideoWithLipSync(
              translation.translatedText,
              audioUrl,
              lang
            )
          } else {
            videoUrl = audioUrl // Audio-only for now
          }

          // Generate subtitles (if enabled)
          let subtitlesUrl: string | undefined
          if (request.generateSubtitles) {
            subtitlesUrl = await this.generateSubtitles(
              translation.translatedText,
              lang
            )
          }

          return {
            language: lang,
            videoUrl,
            audioUrl,
            subtitlesUrl,
            duration: 0 // TODO: Calculate from audio
          }
        })
      )

      const processingTime = (Date.now() - startTime) / 1000

      return {
        videos,
        metadata: {
          sourceLanguage: request.sourceLanguage,
          translationProvider: this.translationProvider,
          ttsProvider: this.ttsProvider,
          processingTime
        }
      }
    } catch (error) {
      logger.error('[MultiLanguageSystem] Multi-language generation failed:', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Get default voice for language
   */
  private getDefaultVoiceForLanguage(languageCode: string): string {
    const language = this.getLanguage(languageCode)
    if (!language || language.voices.length === 0) {
      throw new Error(`No voices available for language: ${languageCode}`)
    }

    // Return first neural voice
    const neuralVoice = language.voices.find(v => v.quality === 'neural')
    return neuralVoice?.id || language.voices[0].id
  }

  /**
   * Generate TTS audio
   */
  private async generateTTS(
    text: string,
    voiceId: string,
    language: string
  ): Promise<string> {
    const response = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId,
        language,
        provider: this.ttsProvider
      })
    })

    if (!response.ok) {
      throw new Error('TTS generation failed')
    }

    const data = await response.json()
    return data.audioUrl
  }

  /**
   * Generate video with lip-sync
   */
  private async generateVideoWithLipSync(
    text: string,
    audioUrl: string,
    language: string
  ): Promise<string> {
    const response = await fetch('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        audioUrl,
        language,
        type: 'avatar'
      })
    })

    if (!response.ok) {
      throw new Error('Video generation failed')
    }

    const data = await response.json()
    return data.videoUrl
  }

  /**
   * Generate subtitles
   */
  private async generateSubtitles(text: string, language: string): Promise<string> {
    const response = await fetch('/api/subtitles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
        format: 'vtt'
      })
    })

    if (!response.ok) {
      throw new Error('Subtitle generation failed')
    }

    const data = await response.json()
    return data.subtitlesUrl
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get language statistics
   */
  getLanguageStats() {
    return {
      totalLanguages: SUPPORTED_LANGUAGES.length,
      totalVoices: SUPPORTED_LANGUAGES.reduce((sum, lang) => sum + lang.voices.length, 0),
      byProvider: this.getVoicesByProvider(),
      byQuality: this.getVoicesByQuality(),
      rtlLanguages: SUPPORTED_LANGUAGES.filter(lang => lang.direction === 'rtl').length
    }
  }

  /**
   * Get voices grouped by provider
   */
  private getVoicesByProvider(): Record<string, number> {
    const counts: Record<string, number> = {}

    SUPPORTED_LANGUAGES.forEach(lang => {
      lang.voices.forEach(voice => {
        counts[voice.provider] = (counts[voice.provider] || 0) + 1
      })
    })

    return counts
  }

  /**
   * Get voices grouped by quality
   */
  private getVoicesByQuality(): Record<string, number> {
    const counts: Record<string, number> = {}

    SUPPORTED_LANGUAGES.forEach(lang => {
      lang.voices.forEach(voice => {
        counts[voice.quality] = (counts[voice.quality] || 0) + 1
      })
    })

    return counts
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const multiLanguageSystem = new MultiLanguageSystem()
