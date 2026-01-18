/**
 * Snap to Grid and Alignment Utilities
 * Provides snapping functionality for canvas elements
 */

export interface SnapConfig {
  enabled: boolean
  gridSize: number
  threshold: number // Distance threshold for snapping (in pixels)
}

export interface SnapResult {
  x: number
  y: number
  snappedX: boolean
  snappedY: boolean
}

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal'
  position: number
  color: string
  label?: string
}

/**
 * Snap a position to the nearest grid point
 */
export function snapToGrid(
  x: number,
  y: number,
  config: SnapConfig
): SnapResult {
  if (!config.enabled) {
    return { x, y, snappedX: false, snappedY: false }
  }

  const gridSize = config.gridSize

  const snappedX = Math.round(x / gridSize) * gridSize
  const snappedY = Math.round(y / gridSize) * gridSize

  const diffX = Math.abs(x - snappedX)
  const diffY = Math.abs(y - snappedY)

  return {
    x: diffX <= config.threshold ? snappedX : x,
    y: diffY <= config.threshold ? snappedY : y,
    snappedX: diffX <= config.threshold,
    snappedY: diffY <= config.threshold
  }
}

/**
 * Snap element to canvas center lines
 */
export function snapToCanvasCenter(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = 5
): { result: SnapResult; guides: AlignmentGuide[] } {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2

  const elementCenterX = x + width / 2
  const elementCenterY = y + height / 2

  let snappedX = x
  let snappedY = y
  let didSnapX = false
  let didSnapY = false
  const guides: AlignmentGuide[] = []

  // Snap to vertical center
  const diffX = Math.abs(elementCenterX - centerX)
  if (diffX <= threshold) {
    snappedX = centerX - width / 2
    didSnapX = true
    guides.push({
      type: 'vertical',
      position: centerX,
      color: '#8b5cf6',
      label: 'Center'
    })
  }

  // Snap to horizontal center
  const diffY = Math.abs(elementCenterY - centerY)
  if (diffY <= threshold) {
    snappedY = centerY - height / 2
    didSnapY = true
    guides.push({
      type: 'horizontal',
      position: centerY,
      color: '#8b5cf6',
      label: 'Middle'
    })
  }

  return {
    result: {
      x: snappedX,
      y: snappedY,
      snappedX: didSnapX,
      snappedY: didSnapY
    },
    guides
  }
}

/**
 * Snap element to other elements (smart guides)
 */
export interface Element {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export function snapToElements(
  element: Element,
  otherElements: Element[],
  threshold: number = 5
): { result: SnapResult; guides: AlignmentGuide[] } {
  let snappedX = element.x
  let snappedY = element.y
  let didSnapX = false
  let didSnapY = false
  const guides: AlignmentGuide[] = []

  const elementCenterX = element.x + element.width / 2
  const elementCenterY = element.y + element.height / 2
  const elementRight = element.x + element.width
  const elementBottom = element.y + element.height

  for (const other of otherElements) {
    if (other.id === element.id) continue

    const otherCenterX = other.x + other.width / 2
    const otherCenterY = other.y + other.height / 2
    const otherRight = other.x + other.width
    const otherBottom = other.y + other.height

    // Snap to left edge
    if (Math.abs(element.x - other.x) <= threshold) {
      snappedX = other.x
      didSnapX = true
      guides.push({
        type: 'vertical',
        position: other.x,
        color: '#ec4899'
      })
    }

    // Snap to right edge
    if (Math.abs(elementRight - otherRight) <= threshold) {
      snappedX = otherRight - element.width
      didSnapX = true
      guides.push({
        type: 'vertical',
        position: otherRight,
        color: '#ec4899'
      })
    }

    // Snap to center X
    if (Math.abs(elementCenterX - otherCenterX) <= threshold) {
      snappedX = otherCenterX - element.width / 2
      didSnapX = true
      guides.push({
        type: 'vertical',
        position: otherCenterX,
        color: '#ec4899'
      })
    }

    // Snap to top edge
    if (Math.abs(element.y - other.y) <= threshold) {
      snappedY = other.y
      didSnapY = true
      guides.push({
        type: 'horizontal',
        position: other.y,
        color: '#ec4899'
      })
    }

    // Snap to bottom edge
    if (Math.abs(elementBottom - otherBottom) <= threshold) {
      snappedY = otherBottom - element.height
      didSnapY = true
      guides.push({
        type: 'horizontal',
        position: otherBottom,
        color: '#ec4899'
      })
    }

    // Snap to center Y
    if (Math.abs(elementCenterY - otherCenterY) <= threshold) {
      snappedY = otherCenterY - element.height / 2
      didSnapY = true
      guides.push({
        type: 'horizontal',
        position: otherCenterY,
        color: '#ec4899'
      })
    }
  }

  return {
    result: {
      x: snappedX,
      y: snappedY,
      snappedX: didSnapX,
      snappedY: didSnapY
    },
    guides
  }
}

/**
 * Combined snapping function (grid + center + elements)
 */
export function snapPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  config: {
    snapToGrid: boolean
    snapToCenter: boolean
    snapToElements: boolean
    gridSize: number
    threshold: number
    canvasWidth: number
    canvasHeight: number
    otherElements: Element[]
    currentElementId: string
  }
): { result: SnapResult; guides: AlignmentGuide[] } {
  let finalX = x
  let finalY = y
  let guides: AlignmentGuide[] = []

  // Priority: Elements > Center > Grid

  // 1. Snap to other elements (highest priority)
  if (config.snapToElements) {
    const elementSnap = snapToElements(
      { id: config.currentElementId, x, y, width, height },
      config.otherElements.filter(e => e.id !== config.currentElementId),
      config.threshold
    )
    if (elementSnap.result.snappedX || elementSnap.result.snappedY) {
      finalX = elementSnap.result.x
      finalY = elementSnap.result.y
      guides = [...guides, ...elementSnap.guides]
      return { result: { x: finalX, y: finalY, snappedX: true, snappedY: true }, guides }
    }
  }

  // 2. Snap to canvas center
  if (config.snapToCenter) {
    const centerSnap = snapToCanvasCenter(
      x,
      y,
      width,
      height,
      config.canvasWidth,
      config.canvasHeight,
      config.threshold
    )
    if (centerSnap.result.snappedX || centerSnap.result.snappedY) {
      finalX = centerSnap.result.x
      finalY = centerSnap.result.y
      guides = [...guides, ...centerSnap.guides]
      return { result: { x: finalX, y: finalY, snappedX: true, snappedY: true }, guides }
    }
  }

  // 3. Snap to grid (lowest priority)
  if (config.snapToGrid) {
    const gridSnap = snapToGrid(x, y, {
      enabled: true,
      gridSize: config.gridSize,
      threshold: config.threshold
    })
    finalX = gridSnap.x
    finalY = gridSnap.y
  }

  return {
    result: {
      x: finalX,
      y: finalY,
      snappedX: finalX !== x,
      snappedY: finalY !== y
    },
    guides
  }
}

export default {
  snapToGrid,
  snapToCanvasCenter,
  snapToElements,
  snapPosition
}
