'use client'

/**
 * 🖐️ Touch Gestures Hook
 * 
 * Provides touch gesture support for video editor interactions:
 * - Pinch to zoom (preview, timeline)
 * - Swipe navigation (panels, slides)
 * - Long press (context menu, selection)
 * - Drag and drop (timeline items)
 * - Double tap (play/pause, zoom reset)
 * - Pan/scroll (timeline scrubbing)
 * 
 * Uses pointer events for unified mouse/touch handling
 */

import { useState, useRef, useCallback, useEffect, useMemo, RefObject } from 'react'

// ============================================
// Types
// ============================================

export interface Point {
  x: number
  y: number
}

export interface TouchState {
  touches: Point[]
  center: Point
  distance: number
  scale: number
  rotation: number
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null
  distance: number
  velocity: number
}

export interface PinchState {
  scale: number
  center: Point
  initialDistance: number
  currentDistance: number
}

export interface LongPressState {
  isLongPress: boolean
  position: Point
  duration: number
}

export interface DragState {
  isDragging: boolean
  startPosition: Point
  currentPosition: Point
  delta: Point
  totalDelta: Point
}

export interface GestureConfig {
  swipeThreshold?: number
  swipeVelocityThreshold?: number
  longPressDuration?: number
  pinchThreshold?: number
  doubleTapDelay?: number
  dragThreshold?: number
}

export interface GestureHandlers {
  onSwipe?: (direction: SwipeDirection) => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinchStart?: (state: PinchState) => void
  onPinch?: (state: PinchState) => void
  onPinchEnd?: (state: PinchState) => void
  onLongPress?: (state: LongPressState) => void
  onDoubleTap?: (position: Point) => void
  onTap?: (position: Point) => void
  onDragStart?: (state: DragState) => void
  onDrag?: (state: DragState) => void
  onDragEnd?: (state: DragState) => void
  onPan?: (delta: Point, velocity: Point) => void
}

// ============================================
// Constants
// ============================================

const DEFAULT_CONFIG: Required<GestureConfig> = {
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
  longPressDuration: 500,
  pinchThreshold: 10,
  doubleTapDelay: 300,
  dragThreshold: 5
}

// ============================================
// Utility Functions
// ============================================

function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

function getCenter(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  )
  
  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  }
}

function getAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
}

function getTouchPoints(event: TouchEvent): Point[] {
  return Array.from(event.touches).map(touch => ({
    x: touch.clientX,
    y: touch.clientY
  }))
}

function getPointerPoint(event: PointerEvent | MouseEvent | Touch): Point {
  return {
    x: event.clientX,
    y: event.clientY
  }
}

// ============================================
// Main Hook
// ============================================

export function useTouchGestures<T extends HTMLElement = HTMLElement>(
  handlers: GestureHandlers,
  config: GestureConfig = {}
): {
  ref: RefObject<T>
  bind: () => {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: React.MouseEvent) => void
    onMouseUp: (e: React.MouseEvent) => void
  }
  state: {
    isDragging: boolean
    isPinching: boolean
    isLongPressing: boolean
  }
} {
  const elementRef = useRef<T>(null)
  
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  
  // State refs (use refs to avoid re-renders)
  const touchStartRef = useRef<Point[]>([])
  const touchStartTimeRef = useRef<number>(0)
  const lastTapTimeRef = useRef<number>(0)
  const lastTapPositionRef = useRef<Point>({ x: 0, y: 0 })
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialPinchDistanceRef = useRef<number>(0)
  const lastPinchScaleRef = useRef<number>(1)
  
  // Exposed state
  const [isDragging, setIsDragging] = useState(false)
  const [isPinching, setIsPinching] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  
  // Track drag state
  const dragStartRef = useRef<Point>({ x: 0, y: 0 })
  const lastDragPositionRef = useRef<Point>({ x: 0, y: 0 })
  const lastMoveTimeRef = useRef<number>(0)
  const velocityRef = useRef<Point>({ x: 0, y: 0 })

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = getTouchPoints(e.nativeEvent)
    touchStartRef.current = touches
    touchStartTimeRef.current = Date.now()
    
    if (touches.length === 1) {
      const point = touches[0]
      dragStartRef.current = point
      lastDragPositionRef.current = point
      lastMoveTimeRef.current = Date.now()
      
      // Set up long press timer
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true)
        handlers.onLongPress?.({
          isLongPress: true,
          position: point,
          duration: mergedConfig.longPressDuration
        })
      }, mergedConfig.longPressDuration)
    } else if (touches.length === 2) {
      // Pinch start
      clearLongPressTimer()
      setIsPinching(true)
      initialPinchDistanceRef.current = getDistance(touches[0], touches[1])
      lastPinchScaleRef.current = 1
      
      handlers.onPinchStart?.({
        scale: 1,
        center: getCenter(touches),
        initialDistance: initialPinchDistanceRef.current,
        currentDistance: initialPinchDistanceRef.current
      })
    }
  }, [handlers, mergedConfig.longPressDuration, clearLongPressTimer])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = getTouchPoints(e.nativeEvent)
    const now = Date.now()
    
    if (touches.length === 1) {
      const point = touches[0]
      const delta = {
        x: point.x - lastDragPositionRef.current.x,
        y: point.y - lastDragPositionRef.current.y
      }
      const totalDelta = {
        x: point.x - dragStartRef.current.x,
        y: point.y - dragStartRef.current.y
      }
      
      // Calculate velocity
      const timeDelta = now - lastMoveTimeRef.current
      if (timeDelta > 0) {
        velocityRef.current = {
          x: delta.x / timeDelta,
          y: delta.y / timeDelta
        }
      }
      
      // Check if moved enough to cancel long press
      if (Math.abs(totalDelta.x) > mergedConfig.dragThreshold || 
          Math.abs(totalDelta.y) > mergedConfig.dragThreshold) {
        clearLongPressTimer()
        
        if (!isDragging) {
          setIsDragging(true)
          handlers.onDragStart?.({
            isDragging: true,
            startPosition: dragStartRef.current,
            currentPosition: point,
            delta,
            totalDelta
          })
        } else {
          handlers.onDrag?.({
            isDragging: true,
            startPosition: dragStartRef.current,
            currentPosition: point,
            delta,
            totalDelta
          })
        }
        
        // Pan event
        handlers.onPan?.(delta, velocityRef.current)
      }
      
      lastDragPositionRef.current = point
      lastMoveTimeRef.current = now
    } else if (touches.length === 2 && isPinching) {
      // Pinch move
      const currentDistance = getDistance(touches[0], touches[1])
      const scale = currentDistance / initialPinchDistanceRef.current
      const center = getCenter(touches)
      
      if (Math.abs(currentDistance - initialPinchDistanceRef.current) > mergedConfig.pinchThreshold) {
        handlers.onPinch?.({
          scale,
          center,
          initialDistance: initialPinchDistanceRef.current,
          currentDistance
        })
        lastPinchScaleRef.current = scale
      }
    }
  }, [handlers, mergedConfig, isPinching, isDragging, clearLongPressTimer])

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now()
    const duration = now - touchStartTimeRef.current
    
    clearLongPressTimer()
    
    if (isPinching) {
      setIsPinching(false)
      handlers.onPinchEnd?.({
        scale: lastPinchScaleRef.current,
        center: getCenter(touchStartRef.current),
        initialDistance: initialPinchDistanceRef.current,
        currentDistance: initialPinchDistanceRef.current * lastPinchScaleRef.current
      })
      return
    }
    
    if (isDragging) {
      const point = lastDragPositionRef.current
      const totalDelta = {
        x: point.x - dragStartRef.current.x,
        y: point.y - dragStartRef.current.y
      }
      
      setIsDragging(false)
      
      handlers.onDragEnd?.({
        isDragging: false,
        startPosition: dragStartRef.current,
        currentPosition: point,
        delta: { x: 0, y: 0 },
        totalDelta
      })
      
      // Check for swipe
      const velocity = Math.sqrt(
        velocityRef.current.x * velocityRef.current.x + 
        velocityRef.current.y * velocityRef.current.y
      )
      
      const distance = Math.sqrt(
        totalDelta.x * totalDelta.x + 
        totalDelta.y * totalDelta.y
      )
      
      if (distance > mergedConfig.swipeThreshold || velocity > mergedConfig.swipeVelocityThreshold) {
        let direction: 'left' | 'right' | 'up' | 'down' | null = null
        
        if (Math.abs(totalDelta.x) > Math.abs(totalDelta.y)) {
          direction = totalDelta.x > 0 ? 'right' : 'left'
        } else {
          direction = totalDelta.y > 0 ? 'down' : 'up'
        }
        
        const swipeState: SwipeDirection = { direction, distance, velocity }
        handlers.onSwipe?.(swipeState)
        
        if (direction === 'left') handlers.onSwipeLeft?.()
        if (direction === 'right') handlers.onSwipeRight?.()
        if (direction === 'up') handlers.onSwipeUp?.()
        if (direction === 'down') handlers.onSwipeDown?.()
      }
      
      return
    }
    
    // Tap detection
    const startPoint = touchStartRef.current[0]
    if (!startPoint) return
    
    // Double tap detection
    if (
      now - lastTapTimeRef.current < mergedConfig.doubleTapDelay &&
      getDistance(startPoint, lastTapPositionRef.current) < 30
    ) {
      handlers.onDoubleTap?.(startPoint)
      lastTapTimeRef.current = 0 // Reset to prevent triple tap
    } else if (duration < mergedConfig.longPressDuration) {
      // Single tap
      handlers.onTap?.(startPoint)
      lastTapTimeRef.current = now
      lastTapPositionRef.current = startPoint
    }
  }, [handlers, mergedConfig, isPinching, isDragging, clearLongPressTimer])

  // Mouse event handlers (for non-touch devices)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getPointerPoint(e.nativeEvent)
    touchStartRef.current = [point]
    touchStartTimeRef.current = Date.now()
    dragStartRef.current = point
    lastDragPositionRef.current = point
    lastMoveTimeRef.current = Date.now()
    
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      handlers.onLongPress?.({
        isLongPress: true,
        position: point,
        duration: mergedConfig.longPressDuration
      })
    }, mergedConfig.longPressDuration)
  }, [handlers, mergedConfig.longPressDuration])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (touchStartRef.current.length === 0) return
    
    const point = getPointerPoint(e.nativeEvent)
    const now = Date.now()
    
    const delta = {
      x: point.x - lastDragPositionRef.current.x,
      y: point.y - lastDragPositionRef.current.y
    }
    const totalDelta = {
      x: point.x - dragStartRef.current.x,
      y: point.y - dragStartRef.current.y
    }
    
    // Calculate velocity
    const timeDelta = now - lastMoveTimeRef.current
    if (timeDelta > 0) {
      velocityRef.current = {
        x: delta.x / timeDelta,
        y: delta.y / timeDelta
      }
    }
    
    if (Math.abs(totalDelta.x) > mergedConfig.dragThreshold || 
        Math.abs(totalDelta.y) > mergedConfig.dragThreshold) {
      clearLongPressTimer()
      
      if (!isDragging) {
        setIsDragging(true)
        handlers.onDragStart?.({
          isDragging: true,
          startPosition: dragStartRef.current,
          currentPosition: point,
          delta,
          totalDelta
        })
      } else {
        handlers.onDrag?.({
          isDragging: true,
          startPosition: dragStartRef.current,
          currentPosition: point,
          delta,
          totalDelta
        })
      }
      
      handlers.onPan?.(delta, velocityRef.current)
    }
    
    lastDragPositionRef.current = point
    lastMoveTimeRef.current = now
  }, [handlers, mergedConfig.dragThreshold, isDragging, clearLongPressTimer])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    
    clearLongPressTimer()
    
    if (isDragging) {
      const point = lastDragPositionRef.current
      const totalDelta = {
        x: point.x - dragStartRef.current.x,
        y: point.y - dragStartRef.current.y
      }
      
      setIsDragging(false)
      
      handlers.onDragEnd?.({
        isDragging: false,
        startPosition: dragStartRef.current,
        currentPosition: point,
        delta: { x: 0, y: 0 },
        totalDelta
      })
    } else {
      const startPoint = touchStartRef.current[0]
      if (startPoint) {
        // Double tap detection
        if (
          now - lastTapTimeRef.current < mergedConfig.doubleTapDelay &&
          getDistance(startPoint, lastTapPositionRef.current) < 30
        ) {
          handlers.onDoubleTap?.(startPoint)
          lastTapTimeRef.current = 0
        } else {
          handlers.onTap?.(startPoint)
          lastTapTimeRef.current = now
          lastTapPositionRef.current = startPoint
        }
      }
    }
    
    touchStartRef.current = []
  }, [handlers, mergedConfig.doubleTapDelay, isDragging, clearLongPressTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer()
    }
  }, [clearLongPressTimer])

  const bind = useCallback(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp
  }), [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp])

  return {
    ref: elementRef,
    bind,
    state: {
      isDragging,
      isPinching,
      isLongPressing
    }
  }
}

// ============================================
// Specialized Hooks
// ============================================

/**
 * Hook for timeline scrubbing with touch support
 */
export function useTimelineScrub(
  onScrub: (progress: number) => void,
  config?: {
    min?: number
    max?: number
    step?: number
  }
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [progress, setProgress] = useState(0)
  
  const { min = 0, max = 100, step = 1 } = config || {}

  const calculateProgress = useCallback((clientX: number) => {
    if (!containerRef.current) return 0
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const value = min + percentage * (max - min)
    
    // Round to step
    const stepped = Math.round(value / step) * step
    return Math.max(min, Math.min(max, stepped))
  }, [min, max, step])

  const handlers = useMemo(() => ({
    onDragStart: (state: DragState) => {
      setIsScrubbing(true)
      const newProgress = calculateProgress(state.currentPosition.x)
      setProgress(newProgress)
      onScrub(newProgress)
    },
    onDrag: (state: DragState) => {
      const newProgress = calculateProgress(state.currentPosition.x)
      setProgress(newProgress)
      onScrub(newProgress)
    },
    onDragEnd: () => {
      setIsScrubbing(false)
    },
    onTap: (position: Point) => {
      const newProgress = calculateProgress(position.x)
      setProgress(newProgress)
      onScrub(newProgress)
    }
  }), [calculateProgress, onScrub])

  const { bind } = useTouchGestures<HTMLDivElement>(handlers)

  return {
    ref: containerRef,
    bind,
    isScrubbing,
    progress
  }
}

/**
 * Hook for pinch-to-zoom on preview or canvas
 */
export function usePinchZoom(config?: {
  minScale?: number
  maxScale?: number
  initialScale?: number
  onZoomChange?: (scale: number) => void
}) {
  const { minScale = 0.5, maxScale = 3, initialScale = 1, onZoomChange } = config || {}
  
  const [scale, setScale] = useState(initialScale)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  
  const handlers = useMemo(() => ({
    onPinch: (state: PinchState) => {
      const newScale = Math.max(minScale, Math.min(maxScale, state.scale))
      setScale(newScale)
      onZoomChange?.(newScale)
    },
    onDoubleTap: () => {
      // Reset zoom on double tap
      if (scale !== 1) {
        setScale(1)
        setOffset({ x: 0, y: 0 })
        onZoomChange?.(1)
      } else {
        setScale(2)
        onZoomChange?.(2)
      }
    },
    onPan: (delta: Point) => {
      if (scale > 1) {
        setOffset(prev => ({
          x: prev.x + delta.x,
          y: prev.y + delta.y
        }))
      }
    }
  }), [scale, minScale, maxScale, onZoomChange])

  const { ref, bind, state } = useTouchGestures(handlers)

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    onZoomChange?.(1)
  }, [onZoomChange])

  const zoomIn = useCallback(() => {
    setScale(prev => {
      const newScale = Math.min(maxScale, prev * 1.2)
      onZoomChange?.(newScale)
      return newScale
    })
  }, [maxScale, onZoomChange])

  const zoomOut = useCallback(() => {
    setScale(prev => {
      const newScale = Math.max(minScale, prev / 1.2)
      onZoomChange?.(newScale)
      return newScale
    })
  }, [minScale, onZoomChange])

  return {
    ref,
    bind,
    scale,
    offset,
    isPinching: state.isPinching,
    resetZoom,
    zoomIn,
    zoomOut,
    transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`
  }
}

/**
 * Hook for swipe navigation between panels/slides
 */
export function useSwipeNavigation<T>(
  items: T[],
  config?: {
    initialIndex?: number
    loop?: boolean
    onChange?: (index: number, item: T) => void
  }
) {
  const { initialIndex = 0, loop = false, onChange } = config || {}
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  
  const goTo = useCallback((index: number) => {
    let newIndex = index
    
    if (loop) {
      if (index < 0) newIndex = items.length - 1
      else if (index >= items.length) newIndex = 0
    } else {
      newIndex = Math.max(0, Math.min(items.length - 1, index))
    }
    
    setCurrentIndex(newIndex)
    onChange?.(newIndex, items[newIndex])
  }, [items, loop, onChange])

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])

  const handlers = useMemo(() => ({
    onSwipeLeft: next,
    onSwipeRight: prev
  }), [next, prev])

  const { ref, bind } = useTouchGestures(handlers)

  return {
    ref,
    bind,
    currentIndex,
    currentItem: items[currentIndex],
    goTo,
    next,
    prev,
    isFirst: currentIndex === 0,
    isLast: currentIndex === items.length - 1
  }
}

export default useTouchGestures
