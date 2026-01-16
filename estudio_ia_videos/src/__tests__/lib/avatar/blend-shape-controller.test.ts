import { BlendShapeController } from '@/lib/avatar/blend-shape-controller'
import { describe, it, expect, beforeEach } from '@jest/globals'

describe('BlendShapeController', () => {
  let controller: BlendShapeController

  beforeEach(() => {
    controller = new BlendShapeController()
  })

  it('should initialize with neutral weights', () => {
    const weights = controller.getWeights()
    Object.values(weights).forEach(val => {
      expect(val).toBe(0)
    })
  })

  it('should apply viseme correctly', () => {
    controller.applyViseme('aa', 1.0)
    const weights = controller.getWeights()

    // 'aa' should open jaw
    expect(weights.jawOpen).toBe(0.7)
    // Should NOT have mouthOpen (it was removed)
    expect((weights as any).mouthOpen).toBeUndefined()
  })

  it('should apply intensity correctly', () => {
    controller.applyViseme('aa', 0.5)
    const weights = controller.getWeights()

    expect(weights.jawOpen).toBe(0.35) // 0.7 * 0.5
  })

  it('should interpolate between states', () => {
    // Start at neutral
    const start = controller.getWeights()
    
    // Target state (aa)
    controller.applyViseme('aa', 1.0)
    const target = controller.getWeights()

    // Reset to neutral for interpolation test
    controller.reset()
    
    const halfway = controller.interpolate(target, 0.5)

    expect(halfway.jawOpen).toBe(0.35)
  })

  it('should apply blinking', () => {
    // Time 0 -> blink phase 0 -> blink
    controller.applyBlink(0)
    const weights = controller.getWeights()
    
    // Should be blinking (non-zero) or closed depending on phase function
    // sin(0) is 0, wait. 
    // blinkPhase = (0 * 4) % 1.0 = 0.
    // 0 < 0.15 (duration).
    // progress = 0.
    // curve = sin(0) = 0.
    
    // Let's try time where it should preserve close
    // blinkPhase = 0.075 (halfway)
    // progress = 0.5
    // curve = sin(PI/2) = 1.
    const timeForMidBlink = 0.075 / 4.0 
    
    controller.applyBlink(timeForMidBlink)
    const blinkedWeights = controller.getWeights()
    
    expect(blinkedWeights.eyeBlinkLeft).toBeCloseTo(1.0)
    expect(blinkedWeights.eyeBlinkRight).toBeCloseTo(1.0)
  })
})
