/**
 * PPTX to Scenes Converter
 * Converte apresentações PPTX em Scene records estruturados
 * Com wizard de progresso e sanitização de dados
 */

import { prisma } from '@lib/prisma'
import { PPTXRealParser, ParsedPresentation, ParsedSlide } from '@lib/pptx-real-parser'
import { logger } from '@lib/logger'

// ============================================================================
// TYPES
// ============================================================================

export interface ConversionProgress {
  phase: 'parsing' | 'sanitizing' | 'creating' | 'optimizing' | 'completed'
  percentage: number
  message: string
  currentSlide?: number
  totalSlides?: number
  errors?: string[]
}

export interface ConversionOptions {
  projectId: string
  defaultDuration?: number // ms per scene
  avatarId?: string
  avatarProvider?: 'did' | 'heygen' | 'rpm'
  voiceId?: string
  generateSubtitles?: boolean
  autoTransitions?: boolean
  musicUrl?: string
  musicVolume?: number
  onProgress?: (progress: ConversionProgress) => void
}

export interface ConversionResult {
  success: boolean
  projectId: string
  scenesCreated: number
  errors: string[]
  scenes: Array<{
    id: string
    name: string
    orderIndex: number
  }>
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_SCENE_DURATION = 5000 // 5 seconds
const DEFAULT_TRANSITION_DURATION = 500 // 500ms
const DEFAULT_MUSIC_VOLUME = 0.3
const DEFAULT_AVATAR_POSITION = { x: 75, y: 50, scale: 0.8, rotation: 0 }

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

class DataSanitizer {
  /**
   * Sanitiza string, converte null/undefined para string vazia
   */
  static sanitizeString(value: any, fallback: string = ''): string {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'string') return value.trim()
    return String(value).trim()
  }

  /**
   * Sanitiza número, converte null/undefined para valor padrão
   */
  static sanitizeNumber(value: any, fallback: number = 0): number {
    if (value === null || value === undefined) return fallback
    const num = Number(value)
    return isNaN(num) ? fallback : num
  }

  /**
   * Sanitiza array, garante que seja array válido
   */
  static sanitizeArray<T>(value: any, fallback: T[] = []): T[] {
    if (value === null || value === undefined) return fallback
    if (Array.isArray(value)) return value
    return fallback
  }

  /**
   * Sanitiza JSON object
   */
  static sanitizeJSON(value: any, fallback: any = {}): any {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'object') return value
    try {
      return JSON.parse(String(value))
    } catch {
      return fallback
    }
  }

  /**
   * Extrai texto limpo de um slide
   */
  static extractCleanText(slide: ParsedSlide): string {
    const parts: string[] = []

    // Title
    if (slide.title) {
      parts.push(this.sanitizeString(slide.title))
    }

    // Content
    if (slide.text) {
      parts.push(this.sanitizeString(slide.text))
    }

    // Notes
    if (slide.notes) {
      parts.push(this.sanitizeString(slide.notes))
    }

    return parts
      .filter(Boolean)
      .join('. ')
      .substring(0, 5000) // Limitar a 5000 chars
  }

  /**
   * Gera nome para a cena baseado no conteúdo
   */
  static generateSceneName(slide: ParsedSlide, index: number): string {
    const title = this.sanitizeString(slide.title)

    if (title) {
      return title.substring(0, 100) // Max 100 chars
    }

    const text = this.sanitizeString(slide.text)
    if (text) {
      const firstLine = text.split('\n')[0]
      return firstLine.substring(0, 100)
    }

    return `Cena ${index + 1}`
  }
}

// ============================================================================
// MAIN CONVERTER
// ============================================================================

export class PPTXToScenesConverter {
  private parser: PPTXRealParser

  constructor() {
    this.parser = new PPTXRealParser()
  }

  /**
   * Converte arquivo PPTX em Scenes
   */
  async convertFile(
    filePath: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const buffer = await require('fs/promises').readFile(filePath)
    return this.convertBuffer(buffer, options)
  }

  /**
   * Converte buffer PPTX em Scenes
   */
  async convertBuffer(
    buffer: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const errors: string[] = []
    const scenes: ConversionResult['scenes'] = []

    try {
      // PHASE 1: Parsing (0% → 30%)
      this.reportProgress(options, {
        phase: 'parsing',
        percentage: 0,
        message: 'Analisando apresentação PPTX...'
      })

      const presentation = await this.parser.parseBuffer(buffer, options.projectId)

      this.reportProgress(options, {
        phase: 'parsing',
        percentage: 30,
        message: `${presentation.totalSlides} slides encontrados`,
        totalSlides: presentation.totalSlides
      })

      // PHASE 2: Sanitizing (30% → 60%)
      this.reportProgress(options, {
        phase: 'sanitizing',
        percentage: 30,
        message: 'Sanitizando dados dos slides...',
        totalSlides: presentation.totalSlides
      })

      const sanitizedSlides = await this.sanitizeSlides(
        presentation.slides,
        options,
        (current) => {
          const percentage = 30 + (current / presentation.totalSlides) * 30
          this.reportProgress(options, {
            phase: 'sanitizing',
            percentage,
            message: `Processando slide ${current + 1}/${presentation.totalSlides}`,
            currentSlide: current,
            totalSlides: presentation.totalSlides
          })
        }
      )

      // PHASE 3: Creating Scenes (60% → 90%)
      this.reportProgress(options, {
        phase: 'creating',
        percentage: 60,
        message: 'Criando cenas no banco de dados...',
        totalSlides: presentation.totalSlides
      })

      for (let i = 0; i < sanitizedSlides.length; i++) {
        try {
          const sceneData = sanitizedSlides[i]
          const scene = await prisma.scenes.create({
            data: sceneData
          })

          scenes.push({
            id: scene.id,
            name: scene.name,
            orderIndex: scene.orderIndex
          })

          const percentage = 60 + ((i + 1) / sanitizedSlides.length) * 30
          this.reportProgress(options, {
            phase: 'creating',
            percentage,
            message: `Cena ${i + 1}/${sanitizedSlides.length} criada`,
            currentSlide: i,
            totalSlides: sanitizedSlides.length
          })
        } catch (error) {
          const msg = `Erro ao criar cena ${i + 1}: ${error instanceof Error ? error.message : String(error)}`
          logger.error(msg, error instanceof Error ? error : new Error(msg))
          errors.push(msg)
        }
      }

      // PHASE 4: Optimizing (90% → 100%)
      this.reportProgress(options, {
        phase: 'optimizing',
        percentage: 90,
        message: 'Calculando durações e transições...'
      })

      await this.optimizeScenes(options.projectId, scenes)

      // PHASE 5: Completed
      this.reportProgress(options, {
        phase: 'completed',
        percentage: 100,
        message: `Conversão concluída! ${scenes.length} cenas criadas.`,
        errors: errors.length > 0 ? errors : undefined
      })

      return {
        success: true,
        projectId: options.projectId,
        scenesCreated: scenes.length,
        errors,
        scenes
      }
    } catch (error) {
      const msg = `Falha na conversão: ${error instanceof Error ? error.message : String(error)}`
      logger.error(msg, error instanceof Error ? error : new Error(msg))
      errors.push(msg)

      this.reportProgress(options, {
        phase: 'completed',
        percentage: 0,
        message: 'Conversão falhou',
        errors
      })

      return {
        success: false,
        projectId: options.projectId,
        scenesCreated: scenes.length,
        errors,
        scenes
      }
    }
  }

  /**
   * Sanitiza slides e converte para formato Scene
   */
  private async sanitizeSlides(
    slides: ParsedSlide[],
    options: ConversionOptions,
    onProgress?: (index: number) => void
  ): Promise<any[]> {
    const defaultDuration = options.defaultDuration || DEFAULT_SCENE_DURATION
    let cumulativeTime = 0

    return slides.map((slide, index) => {
      onProgress?.(index)

      // Extract and sanitize data
      const name = DataSanitizer.generateSceneName(slide, index)
      const script = DataSanitizer.extractCleanText(slide)
      const images = DataSanitizer.sanitizeArray(slide.images)
      const duration = DataSanitizer.sanitizeNumber(slide.duration, defaultDuration)

      // Background handling
      const backgroundImage = images.length > 0 ? images[0] : null
      const backgroundType = backgroundImage ? 'image' : 'color'

      // Visual elements from images
      const visualElements = images.slice(1).map((imgUrl, idx) => ({
        id: `img-${index}-${idx}`,
        type: 'image',
        url: imgUrl,
        position: { x: 50, y: 50 },
        scale: 1
      }))

      // Auto transitions
      const transitionIn = options.autoTransitions ? {
        type: 'fade',
        duration: DEFAULT_TRANSITION_DURATION
      } : { type: 'fade', duration: 0 }

      const transitionOut = options.autoTransitions ? {
        type: 'fade',
        duration: DEFAULT_TRANSITION_DURATION
      } : { type: 'fade', duration: 0 }

      // Scene data
      const sceneData = {
        projectId: options.projectId,
        orderIndex: index,
        name,
        duration,
        startTime: cumulativeTime,

        // Visual Track
        backgroundType,
        backgroundColor: '#1a1a1a',
        backgroundImage,
        backgroundVideo: null,
        visualElements,

        // Avatar Track
        avatarId: options.avatarId || null,
        avatarProvider: options.avatarProvider || null,
        avatarPosition: options.avatarId ? DEFAULT_AVATAR_POSITION : null,
        avatarScript: script || null,
        avatarEmotion: 'neutral',
        avatarSettings: {},

        // Text Track
        textElements: options.generateSubtitles ? [{
          id: `subtitle-${index}`,
          type: 'subtitle',
          text: script,
          position: { x: 50, y: 85 },
          style: {
            fontSize: 24,
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            textAlign: 'center'
          }
        }] : [],
        subtitles: {},

        // Audio Track
        voiceConfig: options.voiceId ? {
          voiceId: options.voiceId,
          stability: 0.5,
          similarity: 0.75
        } : {},
        backgroundMusic: options.musicUrl || null,
        musicVolume: options.musicVolume || DEFAULT_MUSIC_VOLUME,
        ducking: true,
        soundEffects: [],

        // Transitions
        transitionIn,
        transitionOut,
        animations: [],

        // Metadata
        thumbnailUrl: backgroundImage,
        notes: DataSanitizer.sanitizeString(slide.notes),
        locked: false,
        version: 1
      }

      cumulativeTime += duration

      return sceneData
    })
  }

  /**
   * Otimiza cenas após criação
   */
  private async optimizeScenes(
    projectId: string,
    scenes: ConversionResult['scenes']
  ): Promise<void> {
    // Calcular duração total do projeto
    const totalDuration = await prisma.scenes.aggregate({
      where: { projectId },
      _sum: { duration: true }
    })

    // Atualizar projeto com duração total
    if (totalDuration._sum.duration) {
      await prisma.projects.update({
        where: { id: projectId },
        data: {
          metadata: {
            totalDuration: totalDuration._sum.duration,
            scenesCount: scenes.length
          }
        }
      })
    }
  }

  /**
   * Reporta progresso
   */
  private reportProgress(
    options: ConversionOptions,
    progress: ConversionProgress
  ): void {
    if (options.onProgress) {
      options.onProgress(progress)
    }

    logger.info('Conversion progress', {
      component: 'PPTXToScenesConverter',
      ...progress
    })
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let converterInstance: PPTXToScenesConverter | null = null

export function getPPTXConverter(): PPTXToScenesConverter {
  if (!converterInstance) {
    converterInstance = new PPTXToScenesConverter()
  }
  return converterInstance
}

export default PPTXToScenesConverter
