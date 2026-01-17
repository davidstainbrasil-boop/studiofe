/**
 * Professional Color Grading Engine - Fase 3
 * Sistema completo de color grading com presets, LUTs e ajustes manuais
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ColorGradingPreset {
  id: string
  name: string
  category: 'cinematic' | 'vintage' | 'modern' | 'professional' | 'creative'
  thumbnail?: string
  adjustments: ColorAdjustments
}

export interface ColorAdjustments {
  // Basic Adjustments
  exposure: number        // -2 to +2
  contrast: number        // -100 to +100
  highlights: number      // -100 to +100
  shadows: number         // -100 to +100
  whites: number          // -100 to +100
  blacks: number          // -100 to +100

  // Color
  temperature: number     // -100 (cool) to +100 (warm)
  tint: number           // -100 (green) to +100 (magenta)
  vibrance: number       // -100 to +100
  saturation: number     // -100 to +100

  // Tone Curve (Lift, Gamma, Gain)
  lift: RGB              // Shadows
  gamma: RGB             // Midtones
  gain: RGB              // Highlights

  // Hue/Saturation/Luminance (HSL)
  hsl: {
    reds: HSL
    oranges: HSL
    yellows: HSL
    greens: HSL
    aquas: HSL
    blues: HSL
    purples: HSL
    magentas: HSL
  }

  // Vignette
  vignette: {
    enabled: boolean
    amount: number      // 0 to 100
    midpoint: number    // 0 to 100
    roundness: number   // 0 to 100
    feather: number     // 0 to 100
  }

  // Grain
  grain: {
    enabled: boolean
    amount: number      // 0 to 100
    size: number        // 0 to 100
  }

  // Sharpening
  sharpening: {
    enabled: boolean
    amount: number      // 0 to 100
    radius: number      // 0 to 3
  }
}

export interface RGB {
  r: number  // 0 to 1
  g: number  // 0 to 1
  b: number  // 0 to 1
}

export interface HSL {
  hue: number         // -180 to +180
  saturation: number  // -100 to +100
  luminance: number   // -100 to +100
}

export interface LUT {
  id: string
  name: string
  size: 32 | 64  // 32x32x32 or 64x64x64
  data: Float32Array
}

// ============================================================================
// COLOR GRADING ENGINE
// ============================================================================

export class ColorGradingEngine {
  // Default neutral adjustments
  static defaultAdjustments(): ColorAdjustments {
    return {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0,
      lift: { r: 0, g: 0, b: 0 },
      gamma: { r: 1, g: 1, b: 1 },
      gain: { r: 1, g: 1, b: 1 },
      hsl: {
        reds: { hue: 0, saturation: 0, luminance: 0 },
        oranges: { hue: 0, saturation: 0, luminance: 0 },
        yellows: { hue: 0, saturation: 0, luminance: 0 },
        greens: { hue: 0, saturation: 0, luminance: 0 },
        aquas: { hue: 0, saturation: 0, luminance: 0 },
        blues: { hue: 0, saturation: 0, luminance: 0 },
        purples: { hue: 0, saturation: 0, luminance: 0 },
        magentas: { hue: 0, saturation: 0, luminance: 0 }
      },
      vignette: {
        enabled: false,
        amount: 0,
        midpoint: 50,
        roundness: 50,
        feather: 50
      },
      grain: {
        enabled: false,
        amount: 0,
        size: 50
      },
      sharpening: {
        enabled: false,
        amount: 0,
        radius: 1
      }
    }
  }

  // Apply color grading to image data
  static applyGrading(
    imageData: ImageData,
    adjustments: ColorAdjustments,
    lut?: LUT
  ): ImageData {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255
      let g = data[i + 1] / 255
      let b = data[i + 2] / 255

      // 1. Apply exposure
      r *= Math.pow(2, adjustments.exposure)
      g *= Math.pow(2, adjustments.exposure)
      b *= Math.pow(2, adjustments.exposure)

      // 2. Apply lift, gamma, gain (shadows, midtones, highlights)
      r = this.applyLGG(r, adjustments.lift.r, adjustments.gamma.r, adjustments.gain.r)
      g = this.applyLGG(g, adjustments.lift.g, adjustments.gamma.g, adjustments.gain.g)
      b = this.applyLGG(b, adjustments.lift.b, adjustments.gamma.b, adjustments.gain.b)

      // 3. Apply contrast
      r = this.applyContrast(r, adjustments.contrast / 100)
      g = this.applyContrast(g, adjustments.contrast / 100)
      b = this.applyContrast(b, adjustments.contrast / 100)

      // 4. Apply temperature and tint
      const [tr, tg, tb] = this.applyTemperatureTint(r, g, b, adjustments.temperature, adjustments.tint)
      r = tr
      g = tg
      b = tb

      // 5. Apply saturation
      const [sr, sg, sb] = this.applySaturation(r, g, b, adjustments.saturation / 100)
      r = sr
      g = sg
      b = sb

      // 6. Apply LUT if provided
      if (lut) {
        const [lr, lg, lb] = this.applyLUT(r, g, b, lut)
        r = lr
        g = lg
        b = lb
      }

      // 7. Clamp values
      data[i] = Math.max(0, Math.min(255, r * 255))
      data[i + 1] = Math.max(0, Math.min(255, g * 255))
      data[i + 2] = Math.max(0, Math.min(255, b * 255))
    }

    // 8. Apply vignette
    if (adjustments.vignette.enabled) {
      this.applyVignette(imageData, adjustments.vignette)
    }

    // 9. Apply grain
    if (adjustments.grain.enabled) {
      this.applyGrain(imageData, adjustments.grain)
    }

    return imageData
  }

  // Lift, Gamma, Gain (LGG) color correction
  private static applyLGG(value: number, lift: number, gamma: number, gain: number): number {
    // Lift: affects shadows
    value += lift

    // Gamma: affects midtones
    if (gamma !== 1) {
      value = Math.pow(value, 1 / gamma)
    }

    // Gain: affects highlights
    value *= gain

    return value
  }

  // Apply contrast
  private static applyContrast(value: number, contrast: number): number {
    return ((value - 0.5) * (1 + contrast)) + 0.5
  }

  // Apply temperature and tint
  private static applyTemperatureTint(
    r: number,
    g: number,
    b: number,
    temperature: number,
    tint: number
  ): [number, number, number] {
    // Temperature: -100 (cool/blue) to +100 (warm/yellow)
    const tempFactor = temperature / 100
    r += tempFactor * 0.2
    b -= tempFactor * 0.2

    // Tint: -100 (green) to +100 (magenta)
    const tintFactor = tint / 100
    r += tintFactor * 0.1
    g -= tintFactor * 0.1
    b += tintFactor * 0.1

    return [r, g, b]
  }

  // Apply saturation
  private static applySaturation(
    r: number,
    g: number,
    b: number,
    saturation: number
  ): [number, number, number] {
    // Convert to HSL and adjust saturation
    const [h, s, l] = this.rgbToHsl(r, g, b)
    const newS = Math.max(0, Math.min(1, s * (1 + saturation)))
    return this.hslToRgb(h, newS, l)
  }

  // Apply 3D LUT
  private static applyLUT(
    r: number,
    g: number,
    b: number,
    lut: LUT
  ): [number, number, number] {
    const size = lut.size
    const scale = size - 1

    // Map RGB to LUT coordinates
    const rIndex = Math.floor(r * scale)
    const gIndex = Math.floor(g * scale)
    const bIndex = Math.floor(b * scale)

    // Trilinear interpolation
    const rFrac = (r * scale) - rIndex
    const gFrac = (g * scale) - gIndex
    const bFrac = (b * scale) - bIndex

    // Get 8 surrounding points in the LUT cube
    const c000 = this.getLUTValue(lut, rIndex, gIndex, bIndex)
    const c001 = this.getLUTValue(lut, rIndex, gIndex, bIndex + 1)
    const c010 = this.getLUTValue(lut, rIndex, gIndex + 1, bIndex)
    const c011 = this.getLUTValue(lut, rIndex, gIndex + 1, bIndex + 1)
    const c100 = this.getLUTValue(lut, rIndex + 1, gIndex, bIndex)
    const c101 = this.getLUTValue(lut, rIndex + 1, gIndex, bIndex + 1)
    const c110 = this.getLUTValue(lut, rIndex + 1, gIndex + 1, bIndex)
    const c111 = this.getLUTValue(lut, rIndex + 1, gIndex + 1, bIndex + 1)

    // Interpolate
    const c00 = this.lerp3(c000, c001, bFrac)
    const c01 = this.lerp3(c010, c011, bFrac)
    const c10 = this.lerp3(c100, c101, bFrac)
    const c11 = this.lerp3(c110, c111, bFrac)

    const c0 = this.lerp3(c00, c01, gFrac)
    const c1 = this.lerp3(c10, c11, gFrac)

    return this.lerp3(c0, c1, rFrac)
  }

  // Get value from LUT
  private static getLUTValue(lut: LUT, r: number, g: number, b: number): [number, number, number] {
    const size = lut.size
    r = Math.max(0, Math.min(size - 1, r))
    g = Math.max(0, Math.min(size - 1, g))
    b = Math.max(0, Math.min(size - 1, b))

    const index = (r * size * size + g * size + b) * 3
    return [
      lut.data[index],
      lut.data[index + 1],
      lut.data[index + 2]
    ]
  }

  // Linear interpolation for 3 values
  private static lerp3(
    a: [number, number, number],
    b: [number, number, number],
    t: number
  ): [number, number, number] {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ]
  }

  // Apply vignette effect
  private static applyVignette(
    imageData: ImageData,
    vignette: ColorAdjustments['vignette']
  ): void {
    const { width, height, data } = imageData
    const centerX = width / 2
    const centerY = height / 2
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Calculate vignette factor
        const normalizedDist = dist / maxDist
        const midpoint = vignette.midpoint / 100
        const feather = vignette.feather / 100

        let factor = 1
        if (normalizedDist > midpoint) {
          factor = 1 - ((normalizedDist - midpoint) / (1 - midpoint)) ** (1 / (feather + 0.1))
        }

        const vignetteAmount = vignette.amount / 100
        factor = 1 - (1 - factor) * vignetteAmount

        const i = (y * width + x) * 4
        data[i] *= factor
        data[i + 1] *= factor
        data[i + 2] *= factor
      }
    }
  }

  // Apply film grain
  private static applyGrain(
    imageData: ImageData,
    grain: ColorAdjustments['grain']
  ): void {
    const { width, height, data } = imageData
    const amount = grain.amount / 100

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount * 50
      data[i] = Math.max(0, Math.min(255, data[i] + noise))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
    }
  }

  // RGB to HSL conversion
  private static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2

    if (max === min) {
      return [0, 0, l]
    }

    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    let h = 0
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }

    return [h, s, l]
  }

  // HSL to RGB conversion
  private static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) {
      return [l, l, l]
    }

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    return [
      hue2rgb(p, q, h + 1 / 3),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1 / 3)
    ]
  }

  // Generate CSS filter string from adjustments
  static toCSSFilter(adjustments: ColorAdjustments): string {
    const filters: string[] = []

    if (adjustments.exposure !== 0) {
      filters.push(`brightness(${100 + adjustments.exposure * 50}%)`)
    }

    if (adjustments.contrast !== 0) {
      filters.push(`contrast(${100 + adjustments.contrast}%)`)
    }

    if (adjustments.saturation !== 0) {
      filters.push(`saturate(${100 + adjustments.saturation}%)`)
    }

    return filters.join(' ')
  }
}

// ============================================================================
// PRESET LIBRARY
// ============================================================================

export const COLOR_GRADING_PRESETS: ColorGradingPreset[] = [
  {
    id: 'cinematic-teal-orange',
    name: 'Cinematic Teal & Orange',
    category: 'cinematic',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      temperature: 10,
      tint: -5,
      saturation: 15,
      lift: { r: 0, g: 0.05, b: 0.1 },
      gamma: { r: 1, g: 1, b: 1 },
      gain: { r: 1.1, g: 0.95, b: 0.9 }
    }
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    category: 'vintage',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      exposure: -0.2,
      contrast: -10,
      temperature: 15,
      saturation: -20,
      grain: {
        enabled: true,
        amount: 30,
        size: 50
      },
      vignette: {
        enabled: true,
        amount: 40,
        midpoint: 50,
        roundness: 50,
        feather: 70
      }
    }
  },
  {
    id: 'modern-bright',
    name: 'Modern Bright',
    category: 'modern',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      exposure: 0.3,
      contrast: 10,
      highlights: -10,
      shadows: 20,
      saturation: 10,
      vibrance: 15
    }
  },
  {
    id: 'moody-dark',
    name: 'Moody Dark',
    category: 'cinematic',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      exposure: -0.5,
      contrast: 30,
      highlights: -30,
      shadows: -20,
      saturation: -10,
      lift: { r: 0, g: 0, b: 0.1 },
      vignette: {
        enabled: true,
        amount: 60,
        midpoint: 40,
        roundness: 50,
        feather: 50
      }
    }
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset',
    category: 'creative',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      temperature: 40,
      tint: 10,
      exposure: 0.2,
      saturation: 20,
      gain: { r: 1.2, g: 0.95, b: 0.8 }
    }
  },
  {
    id: 'cool-blue',
    name: 'Cool Blue',
    category: 'creative',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      temperature: -30,
      tint: -10,
      saturation: 10,
      lift: { r: 0, g: 0, b: 0.1 },
      gain: { r: 0.9, g: 0.95, b: 1.1 }
    }
  },
  {
    id: 'black-white',
    name: 'Black & White',
    category: 'professional',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      saturation: -100,
      contrast: 20,
      sharpening: {
        enabled: true,
        amount: 50,
        radius: 1
      }
    }
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    category: 'professional',
    adjustments: {
      ...ColorGradingEngine.defaultAdjustments(),
      contrast: 40,
      highlights: -20,
      shadows: -20,
      blacks: -30,
      whites: 30,
      sharpening: {
        enabled: true,
        amount: 30,
        radius: 1.5
      }
    }
  }
]
