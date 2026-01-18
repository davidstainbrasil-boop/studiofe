/**
 * Scene Composer
 * Componente de cenas para renderização multicamada
 * Integra Visual, Avatar, Text e Audio tracks
 */

import { prisma } from '@lib/prisma'
import { logger } from '@lib/logger'
import type { CanvasElement, CanvasScene } from '@components/studio-unified/InteractiveCanvas'

// ============================================================================
// TYPES
// ============================================================================

export interface ComposedScene {
  id: string
  name: string
  duration: number
  startTime: number

  // Layers (ordered by z-index)
  layers: {
    background: BackgroundLayer
    visual: VisualLayer
    avatar: AvatarLayer
    text: TextLayer
    audio: AudioLayer
  }

  // Transitions
  transitionIn: Transition
  transitionOut: Transition
}

export interface BackgroundLayer {
  type: 'color' | 'image' | 'video'
  color?: string
  imageUrl?: string
  videoUrl?: string
}

export interface VisualLayer {
  elements: CanvasElement[]
}

export interface AvatarLayer {
  avatarId?: string
  provider?: 'did' | 'heygen' | 'rpm'
  position: { x: number; y: number; scale: number; rotation: number }
  script?: string
  emotion?: string
  videoUrl?: string // Generated avatar video
}

export interface TextLayer {
  elements: Array<{
    id: string
    type: 'title' | 'subtitle' | 'caption'
    text: string
    position: { x: number; y: number }
    style: {
      fontSize: number
      fontFamily: string
      color: string
      backgroundColor?: string
      textAlign: 'left' | 'center' | 'right'
    }
    animation?: {
      type: string
      duration: number
    }
  }>
}

export interface AudioLayer {
  voiceAudio?: string // TTS or recorded
  backgroundMusic?: string
  musicVolume: number
  ducking: boolean
  soundEffects: Array<{
    id: string
    url: string
    startTime: number
    volume: number
  }>
}

export interface Transition {
  type: string
  duration: number
  properties?: Record<string, any>
}

// ============================================================================
// SCENE COMPOSER
// ============================================================================

export class SceneComposer {
  /**
   * Load scene from database and compose for canvas
   */
  async loadScene(sceneId: string): Promise<ComposedScene> {
    logger.info('Loading scene', { component: 'SceneComposer', sceneId })

    const scene = await prisma.scenes.findUnique({
      where: { id: sceneId }
    })

    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`)
    }

    return this.composeScene(scene)
  }

  /**
   * Load all scenes for a project
   */
  async loadProjectScenes(projectId: string): Promise<ComposedScene[]> {
    logger.info('Loading project scenes', { component: 'SceneComposer', projectId })

    const scenes = await prisma.scenes.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' }
    })

    return Promise.all(scenes.map(scene => this.composeScene(scene)))
  }

  /**
   * Compose scene from database record
   */
  private composeScene(sceneRecord: any): ComposedScene {
    // Parse JSON fields safely
    const visualElements = this.parseJSON(sceneRecord.visualElements, [])
    const textElements = this.parseJSON(sceneRecord.textElements, [])
    const avatarPosition = this.parseJSON(sceneRecord.avatarPosition, { x: 50, y: 50, scale: 1, rotation: 0 })
    const soundEffects = this.parseJSON(sceneRecord.soundEffects, [])
    const transitionIn = this.parseJSON(sceneRecord.transitionIn, { type: 'fade', duration: 500 })
    const transitionOut = this.parseJSON(sceneRecord.transitionOut, { type: 'fade', duration: 500 })

    // Compose layers
    return {
      id: sceneRecord.id,
      name: sceneRecord.name,
      duration: sceneRecord.duration,
      startTime: sceneRecord.startTime,

      layers: {
        // Background Layer
        background: {
          type: sceneRecord.backgroundType || 'color',
          color: sceneRecord.backgroundColor || '#1a1a1a',
          imageUrl: sceneRecord.backgroundImage || undefined,
          videoUrl: sceneRecord.backgroundVideo || undefined
        },

        // Visual Layer (images, shapes, etc.)
        visual: {
          elements: visualElements.map((el: any, idx: number) => ({
            id: el.id || `visual-${idx}`,
            type: el.type || 'image',
            name: el.name || `Visual ${idx + 1}`,
            x: el.position?.x || 0,
            y: el.position?.y || 0,
            width: el.width || 100,
            height: el.height || 100,
            rotation: el.rotation || 0,
            scaleX: el.scale || 1,
            scaleY: el.scale || 1,
            opacity: el.opacity || 1,
            src: el.url || undefined,
            locked: false,
            visible: true,
            draggable: true,
            zIndex: 10 + idx
          }))
        },

        // Avatar Layer
        avatar: {
          avatarId: sceneRecord.avatarId || undefined,
          provider: sceneRecord.avatarProvider || undefined,
          position: avatarPosition,
          script: sceneRecord.avatarScript || undefined,
          emotion: sceneRecord.avatarEmotion || 'neutral',
          videoUrl: undefined // To be populated by avatar generation
        },

        // Text Layer (subtitles, titles, etc.)
        text: {
          elements: textElements.map((el: any) => ({
            id: el.id,
            type: el.type || 'subtitle',
            text: el.text || '',
            position: el.position || { x: 50, y: 85 },
            style: {
              fontSize: el.style?.fontSize || 24,
              fontFamily: el.style?.fontFamily || 'Inter',
              color: el.style?.color || '#ffffff',
              backgroundColor: el.style?.backgroundColor,
              textAlign: el.style?.textAlign || 'center'
            },
            animation: el.animation
          }))
        },

        // Audio Layer
        audio: {
          voiceAudio: undefined, // To be populated by TTS
          backgroundMusic: sceneRecord.backgroundMusic || undefined,
          musicVolume: sceneRecord.musicVolume || 0.3,
          ducking: sceneRecord.ducking !== false,
          soundEffects: soundEffects.map((sfx: any) => ({
            id: sfx.id,
            url: sfx.url,
            startTime: sfx.startTime || 0,
            volume: sfx.volume || 1
          }))
        }
      },

      transitionIn,
      transitionOut
    }
  }

  /**
   * Convert ComposedScene to CanvasScene for rendering
   */
  toCanvasScene(composed: ComposedScene): CanvasScene {
    const elements: CanvasElement[] = []

    // Add visual elements
    elements.push(...composed.layers.visual.elements)

    // Add avatar as element if present
    if (composed.layers.avatar.avatarId) {
      elements.push({
        id: `avatar-${composed.id}`,
        type: 'avatar',
        name: 'Avatar',
        x: composed.layers.avatar.position.x * 19.2, // Convert % to px (1920px)
        y: composed.layers.avatar.position.y * 10.8, // Convert % to px (1080px)
        width: 400,
        height: 600,
        rotation: composed.layers.avatar.position.rotation,
        scaleX: composed.layers.avatar.position.scale,
        scaleY: composed.layers.avatar.position.scale,
        opacity: 1,
        src: composed.layers.avatar.videoUrl, // Avatar video URL
        locked: false,
        visible: true,
        draggable: true,
        zIndex: 20
      })
    }

    // Add text elements
    composed.layers.text.elements.forEach((textEl, idx) => {
      elements.push({
        id: textEl.id,
        type: 'text',
        name: textEl.type,
        x: textEl.position.x * 19.2,
        y: textEl.position.y * 10.8,
        width: 1600, // Default text width
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        text: textEl.text,
        fill: textEl.style.color,
        locked: false,
        visible: true,
        draggable: true,
        zIndex: 30 + idx
      })
    })

    return {
      id: composed.id,
      name: composed.name,
      elements,
      backgroundColor: composed.layers.background.color || '#1a1a1a',
      backgroundImage: composed.layers.background.imageUrl,
      width: 1920,
      height: 1080
    }
  }

  /**
   * Save canvas scene back to database
   */
  async saveCanvasScene(sceneId: string, canvasScene: CanvasScene): Promise<void> {
    logger.info('Saving canvas scene', { component: 'SceneComposer', sceneId })

    // Extract different element types
    const visualElements: any[] = []
    const textElements: any[] = []
    let avatarElement: CanvasElement | undefined

    canvasScene.elements.forEach(el => {
      if (el.type === 'avatar') {
        avatarElement = el
      } else if (el.type === 'text') {
        textElements.push({
          id: el.id,
          type: 'subtitle',
          text: el.text,
          position: {
            x: (el.x / 1920) * 100,
            y: (el.y / 1080) * 100
          },
          style: {
            fontSize: 24,
            fontFamily: 'Inter',
            color: el.fill || '#ffffff',
            textAlign: 'center'
          }
        })
      } else {
        visualElements.push({
          id: el.id,
          type: el.type,
          name: el.name,
          url: el.src,
          position: {
            x: el.x,
            y: el.y
          },
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          scale: el.scaleX,
          opacity: el.opacity
        })
      }
    })

    // Update database
    await prisma.scenes.update({
      where: { id: sceneId },
      data: {
        backgroundColor: canvasScene.backgroundColor,
        backgroundImage: canvasScene.backgroundImage || null,
        visualElements: visualElements,
        textElements: textElements,
        ...(avatarElement && {
          avatarPosition: {
            x: (avatarElement.x / 1920) * 100,
            y: (avatarElement.y / 1080) * 100,
            scale: avatarElement.scaleX,
            rotation: avatarElement.rotation
          }
        })
      }
    })

    logger.info('Canvas scene saved', { component: 'SceneComposer', sceneId })
  }

  /**
   * Safe JSON parse with fallback
   */
  private parseJSON<T>(value: any, fallback: T): T {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'object') return value as T

    try {
      return JSON.parse(String(value)) as T
    } catch {
      return fallback
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let composerInstance: SceneComposer | null = null

export function getSceneComposer(): SceneComposer {
  if (!composerInstance) {
    composerInstance = new SceneComposer()
  }
  return composerInstance
}

export default SceneComposer
