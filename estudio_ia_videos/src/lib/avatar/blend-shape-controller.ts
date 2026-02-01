/**
 * Controlador de Blend Shapes ARKit compatível
 * 52 blend shapes padrão do ARKit para animação facial realista
 */

export interface BlendShapeFrame {
  time: number
  weights: BlendShapeWeights
}

export interface BlendShapeAnimation {
  frames: BlendShapeFrame[]
  duration: number
}

export interface BlendShapeWeights {
  // Jaw (mandíbula)
  jawOpen: number
  jawForward: number
  jawLeft: number
  jawRight: number

  // Mouth (boca)
  mouthClose: number
  mouthFunnel: number
  mouthPucker: number
  mouthLeft: number
  mouthRight: number
  mouthSmileLeft: number
  mouthSmileRight: number
  mouthFrownLeft: number
  mouthFrownRight: number
  mouthDimpleLeft: number
  mouthDimpleRight: number
  mouthStretchLeft: number
  mouthStretchRight: number
  mouthRollLower: number
  mouthRollUpper: number
  mouthShrugLower: number
  mouthShrugUpper: number
  mouthPressLeft: number
  mouthPressRight: number
  mouthLowerDownLeft: number
  mouthLowerDownRight: number
  mouthUpperUpLeft: number
  mouthUpperUpRight: number

  // Cheeks (bochechas)
  cheekPuff: number
  cheekSquintLeft: number
  cheekSquintRight: number

  // Nose (nariz)
  noseSneerLeft: number
  noseSneerRight: number

  // Tongue (língua)
  tongueOut: number

  // Eyes (olhos) - para expressões adicionais
  eyeBlinkLeft?: number
  eyeBlinkRight?: number
  eyeLookDownLeft?: number
  eyeLookDownRight?: number
  eyeLookInLeft?: number
  eyeLookInRight?: number
  eyeLookOutLeft?: number
  eyeLookOutRight?: number
  eyeLookUpLeft?: number
  eyeLookUpRight?: number
  eyeSquintLeft?: number
  eyeSquintRight?: number
  eyeWideLeft?: number
  eyeWideRight?: number

  // Eyebrows (sobrancelhas)
  browDownLeft?: number
  browDownRight?: number
  browInnerUp?: number
  browOuterUpLeft?: number
  browOuterUpRight?: number
}

export class BlendShapeController {
  private weights: BlendShapeWeights

  constructor() {
    this.weights = this.createNeutralWeights()
  }

  /**
   * Cria pesos neutros (todos em 0)
   */
  private createNeutralWeights(): BlendShapeWeights {
    return {
      jawOpen: 0, jawForward: 0, jawLeft: 0, jawRight: 0,
      mouthClose: 0, mouthFunnel: 0, mouthPucker: 0,
      mouthLeft: 0, mouthRight: 0,
      mouthSmileLeft: 0, mouthSmileRight: 0,
      mouthFrownLeft: 0, mouthFrownRight: 0,
      mouthDimpleLeft: 0, mouthDimpleRight: 0,
      mouthStretchLeft: 0, mouthStretchRight: 0,
      mouthRollLower: 0, mouthRollUpper: 0,
      mouthShrugLower: 0, mouthShrugUpper: 0,
      mouthPressLeft: 0, mouthPressRight: 0,
      mouthLowerDownLeft: 0, mouthLowerDownRight: 0,
      mouthUpperUpLeft: 0, mouthUpperUpRight: 0,
      cheekPuff: 0, cheekSquintLeft: 0, cheekSquintRight: 0,
      noseSneerLeft: 0, noseSneerRight: 0,
      tongueOut: 0
    }
  }

  /**
   * Aplica viseme aos blend shapes
   */
  applyViseme(viseme: string, intensity: number = 1.0): void {
    // Reset primeiro
    this.weights = this.createNeutralWeights()

    // Mapear viseme para blend shapes
    const mapping = this.getVisemeBlendShapeMapping(viseme)

    for (const [shapeName, weight] of Object.entries(mapping) as [keyof BlendShapeWeights, number | undefined][]) {
      if (typeof weight === 'number') {
        this.weights[shapeName] = weight * intensity
      }
    }
  }

  /**
   * Mapeia visemes para combinações de blend shapes
   */
  private getVisemeBlendShapeMapping(viseme: string): Partial<BlendShapeWeights> {
    const mappings: Record<string, Partial<BlendShapeWeights>> = {
      // Vogais
      'aa': { // "father", "palm"
        jawOpen: 0.7,
        // Removed invalid 'mouthOpen'
        mouthFunnel: 0.3
      },
      'E': { // "see", "feet"
        jawOpen: 0.2,
        mouthStretchLeft: 0.6,
        mouthStretchRight: 0.6,
        mouthSmileLeft: 0.4,
        mouthSmileRight: 0.4
      },
      'I': { // "sit", "fill"
        jawOpen: 0.3,
        mouthStretchLeft: 0.4,
        mouthStretchRight: 0.4
      },
      'O': { // "though", "show"
        jawOpen: 0.5,
        mouthFunnel: 0.7,
        mouthPucker: 0.5
      },
      'U': { // "you", "new"
        jawOpen: 0.3,
        mouthFunnel: 0.9,
        mouthPucker: 0.8
      },

      // Consoantes
      'PP': { // "people", "maybe" - lábios fechados
        jawOpen: 0.0,
        mouthClose: 1.0,
        mouthPressLeft: 0.6,
        mouthPressRight: 0.6
      },
      'FF': { // "off", "photo" - dentes no lábio
        jawOpen: 0.1,
        mouthLowerDownLeft: 0.5,
        mouthLowerDownRight: 0.5,
        mouthUpperUpLeft: 0.3,
        mouthUpperUpRight: 0.3
      },
      'TH': { // "think", "bath" - língua entre dentes
        jawOpen: 0.2,
        tongueOut: 0.4,
        mouthStretchLeft: 0.3,
        mouthStretchRight: 0.3
      },
      'DD': { // "day", "made"
        jawOpen: 0.4,
        tongueOut: 0.2
      },
      'kk': { // "cat", "quick"
        jawOpen: 0.3,
        mouthClose: 0.2
      },
      'CH': { // "chair", "nature"
        jawOpen: 0.2,
        mouthFunnel: 0.4,
        mouthPucker: 0.3
      },
      'SS': { // "see", "pass"
        jawOpen: 0.1,
        mouthStretchLeft: 0.5,
        mouthStretchRight: 0.5
      },
      'nn': { // "no", "many"
        jawOpen: 0.2,
        mouthClose: 0.3
      },

      // Silêncio
      'sil': {
        jawOpen: 0.0,
        mouthClose: 0.1
      }
    }

    return mappings[viseme] || mappings['sil']
  }

  /**
   * Interpola suavemente entre dois estados de blend shapes
   */
  interpolate(
    targetWeights: BlendShapeWeights,
    factor: number // 0-1
  ): BlendShapeWeights {
    const result: any = {}

    Object.keys(this.weights).forEach(key => {
      const currentValue = this.weights[key as keyof BlendShapeWeights] || 0
      const targetValue = targetWeights[key as keyof BlendShapeWeights] || 0
      result[key] = currentValue + (targetValue - currentValue) * factor
    })

    return result as BlendShapeWeights
  }

  /**
   * Adiciona movimento de respiração sutil
   */
  applyBreathing(time: number, intensity: number = 0.1): void {
    const breathCycle = Math.sin(time * 0.3) * intensity
    this.weights.mouthClose += breathCycle * 0.5
    this.weights.jawOpen += breathCycle * 0.2
  }

  /**
   * Adiciona piscadas aleatórias
   */
  applyBlink(time: number, blinkDuration: number = 0.15): void {
    // Piscada a cada ~3-5 segundos
    const blinkFrequency = 4.0
    const blinkPhase = (time * blinkFrequency) % 1.0

    if (blinkPhase < blinkDuration) {
      const blinkProgress = blinkPhase / blinkDuration
      const blinkCurve = Math.sin(blinkProgress * Math.PI)

      this.weights.eyeBlinkLeft = blinkCurve
      this.weights.eyeBlinkRight = blinkCurve
    }
  }

  /**
   * Exporta para Three.js
   */
  exportToThreeJS(): Record<string, number> {
    return { ...this.weights }
  }

  /**
   * Exporta para Unreal Engine (formato FBX)
   */
  exportToUnrealEngine(): string {
    // Converter para formato de curva de animação FBX
    const curves = Object.entries(this.weights).map(([name, value]) => {
      return `    MorphTargetCurve: "${name}" {
        KeyTime: 0
        KeyValue: ${value.toFixed(6)}
      }`
    }).join('\n')

    return `AnimationCurveNode: {
${curves}
}`
  }

  /**
   * Exporta para formato USD (Pixar Universal Scene Description)
   */
  exportToUSD(): string {
    const blendShapes = Object.entries(this.weights)
      .map(([name, value]) => `    float ${name} = ${value.toFixed(6)}`)
      .join('\n')

    return `#usda 1.0
def Xform "BlendShapes" {
${blendShapes}
}`
  }

  getWeights(): BlendShapeWeights {
    return { ...this.weights }
  }

  setWeights(weights: Partial<BlendShapeWeights>): void {
    this.weights = { ...this.weights, ...weights }
  }

  reset(): void {
    this.weights = this.createNeutralWeights()
  }

  /**
   * Gera frames de animação a partir de visemes/fonemas
   */
  generateAnimation(
    phonemes: Array<{ time: number; duration: number; phoneme: string; viseme: string; intensity: number }>,
    fps: number = 30
  ): { frames: Array<{ time: number; weights: BlendShapeWeights }>; duration: number } {
    const frames: Array<{ time: number; weights: BlendShapeWeights }> = []

    // Calcular duração total
    const duration = phonemes.length > 0
      ? Math.max(...phonemes.map(p => p.time + p.duration))
      : 0

    // Gerar frames baseados no FPS
    const frameInterval = 1 / fps
    const totalFrames = Math.ceil(duration * fps)

    for (let i = 0; i < totalFrames; i++) {
      const currentTime = i * frameInterval

      // Encontrar fonema ativo no tempo atual
      const activePhoneme = phonemes.find(
        p => currentTime >= p.time && currentTime < (p.time + p.duration)
      )

      if (activePhoneme) {
        // Aplicar viseme do fonema ativo
        this.applyViseme(activePhoneme.viseme, activePhoneme.intensity)

        // Adicionar micro-animações procedurais
        this.applyBreathing(currentTime, 0.08)
        this.applyBlink(currentTime, 0.12)

        frames.push({
          time: currentTime,
          weights: this.getWeights()
        })
      } else {
        // Frame neutro (silêncio)
        this.reset()
        this.applyBreathing(currentTime, 0.05)

        frames.push({
          time: currentTime,
          weights: this.getWeights()
        })
      }
    }

    return { frames, duration }
  }

  /**
   * Adiciona overlay de emoção aos blend shapes
   */
  addEmotion(
    weights: BlendShapeWeights,
    emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'fear' | 'disgust',
    intensity: number = 0.5
  ): BlendShapeWeights {
    const emotionOverlays: Record<string, Partial<BlendShapeWeights>> = {
      neutral: {},
      happy: {
        mouthSmileLeft: 0.6,
        mouthSmileRight: 0.6,
        cheekSquintLeft: 0.3,
        cheekSquintRight: 0.3,
        browOuterUpLeft: 0.2,
        browOuterUpRight: 0.2
      },
      sad: {
        mouthFrownLeft: 0.5,
        mouthFrownRight: 0.5,
        browInnerUp: 0.6,
        browDownLeft: 0.3,
        browDownRight: 0.3,
        eyeSquintLeft: 0.2,
        eyeSquintRight: 0.2
      },
      angry: {
        browDownLeft: 0.8,
        browDownRight: 0.8,
        mouthFrownLeft: 0.4,
        mouthFrownRight: 0.4,
        noseSneerLeft: 0.5,
        noseSneerRight: 0.5,
        jawForward: 0.3
      },
      surprised: {
        browInnerUp: 0.9,
        browOuterUpLeft: 0.8,
        browOuterUpRight: 0.8,
        eyeWideLeft: 0.7,
        eyeWideRight: 0.7,
        jawOpen: 0.5,
        mouthFunnel: 0.3
      },
      fear: {
        browInnerUp: 0.8,
        eyeWideLeft: 0.9,
        eyeWideRight: 0.9,
        mouthStretchLeft: 0.4,
        mouthStretchRight: 0.4,
        jawOpen: 0.3
      },
      disgust: {
        noseSneerLeft: 0.8,
        noseSneerRight: 0.8,
        mouthFrownLeft: 0.6,
        mouthFrownRight: 0.6,
        mouthUpperUpLeft: 0.4,
        mouthUpperUpRight: 0.4,
        browDownLeft: 0.3,
        browDownRight: 0.3
      }
    }

    const overlay = emotionOverlays[emotion] || {}
    const result: Record<string, number> = { ...weights as unknown as Record<string, number> }

    // Aplicar overlay com intensidade
    for (const [key, value] of Object.entries(overlay) as [string, number][]) {
      const currentValue = result[key] || 0
      result[key] = Math.min(1.0, currentValue + value * intensity)
    }

    return result as unknown as BlendShapeWeights
  }

  /**
   * Adiciona piscar de olhos aos blend shapes
   * @param weights - Blend shapes atuais
   * @param blinkProgress - Progresso da piscada (0 = aberto, 1 = fechado)
   */
  addBlink(
    weights: BlendShapeWeights,
    blinkProgress: number
  ): BlendShapeWeights {
    // Curva de piscada suave (ease in-out)
    const blinkCurve = blinkProgress < 0.5
      ? 2 * blinkProgress * blinkProgress
      : 1 - Math.pow(-2 * blinkProgress + 2, 2) / 2

    const result: any = { ...weights }
    result.eyeBlinkLeft = Math.min(1.0, (result.eyeBlinkLeft || 0) + blinkCurve)
    result.eyeBlinkRight = Math.min(1.0, (result.eyeBlinkRight || 0) + blinkCurve)

    return result as BlendShapeWeights
  }

  /**
   * Retorna todos os nomes dos 52 blend shapes ARKit
   */
  getAllBlendShapeNames(): string[] {
    return [
      // Jaw (4)
      'jawOpen', 'jawForward', 'jawLeft', 'jawRight',

      // Mouth (24)
      'mouthClose', 'mouthFunnel', 'mouthPucker',
      'mouthLeft', 'mouthRight',
      'mouthSmileLeft', 'mouthSmileRight',
      'mouthFrownLeft', 'mouthFrownRight',
      'mouthDimpleLeft', 'mouthDimpleRight',
      'mouthStretchLeft', 'mouthStretchRight',
      'mouthRollLower', 'mouthRollUpper',
      'mouthShrugLower', 'mouthShrugUpper',
      'mouthPressLeft', 'mouthPressRight',
      'mouthLowerDownLeft', 'mouthLowerDownRight',
      'mouthUpperUpLeft', 'mouthUpperUpRight',

      // Cheeks (3)
      'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',

      // Nose (2)
      'noseSneerLeft', 'noseSneerRight',

      // Tongue (1)
      'tongueOut',

      // Eyes (14)
      'eyeBlinkLeft', 'eyeBlinkRight',
      'eyeLookDownLeft', 'eyeLookDownRight',
      'eyeLookInLeft', 'eyeLookInRight',
      'eyeLookOutLeft', 'eyeLookOutRight',
      'eyeLookUpLeft', 'eyeLookUpRight',
      'eyeSquintLeft', 'eyeSquintRight',
      'eyeWideLeft', 'eyeWideRight',

      // Eyebrows (5)
      'browDownLeft', 'browDownRight',
      'browInnerUp',
      'browOuterUpLeft', 'browOuterUpRight'
    ]
  }
}
