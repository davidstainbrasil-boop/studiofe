'use client'

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pencil,
  Highlighter,
  Type,
  Square,
  Circle,
  ArrowRight,
  Eraser,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Palette,
  Move,
  MousePointer2,
  StickyNote,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// =============================================================================
// Types
// =============================================================================

type AnnotationTool = 
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'sticky'
  | 'eraser'

interface Point {
  x: number
  y: number
}

interface BaseAnnotation {
  id: string
  type: AnnotationTool
  slideIndex: number
  color: string
  opacity: number
  authorId: string
  createdAt: Date
  updatedAt?: Date
}

interface PathAnnotation extends BaseAnnotation {
  type: 'pen' | 'highlighter' | 'eraser'
  points: Point[]
  strokeWidth: number
}

interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  position: Point
  text: string
  fontSize: number
  fontFamily: string
  bold?: boolean
  italic?: boolean
}

interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'ellipse' | 'arrow'
  start: Point
  end: Point
  strokeWidth: number
  fill?: string
  fillOpacity?: number
}

interface StickyAnnotation extends BaseAnnotation {
  type: 'sticky'
  position: Point
  width: number
  height: number
  text: string
  backgroundColor: string
}

type Annotation = PathAnnotation | TextAnnotation | ShapeAnnotation | StickyAnnotation

interface AnnotationState {
  annotations: Annotation[]
  selectedId: string | null
  history: Annotation[][]
  historyIndex: number
}

interface UseAnnotationsOptions {
  slideIndex: number
  userId: string
  onAnnotationChange?: (annotations: Annotation[]) => void
}

// =============================================================================
// Constants
// =============================================================================

const COLORS = [
  '#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
]

const HIGHLIGHTER_COLORS = [
  'rgba(255, 255, 0, 0.5)',
  'rgba(0, 255, 255, 0.5)',
  'rgba(255, 0, 255, 0.5)',
  'rgba(0, 255, 0, 0.5)',
  'rgba(255, 165, 0, 0.5)',
]

const STICKY_COLORS = [
  '#FEF08A', // yellow
  '#FBCFE8', // pink
  '#BBF7D0', // green
  '#BAE6FD', // blue
  '#DDD6FE', // purple
]

const DEFAULT_STROKE_WIDTH = 3
const HIGHLIGHTER_STROKE_WIDTH = 20

// =============================================================================
// Hook: useAnnotations
// =============================================================================

export function useAnnotations(options: UseAnnotationsOptions) {
  const { slideIndex, userId, onAnnotationChange } = options

  const [state, setState] = useState<AnnotationState>({
    annotations: [],
    selectedId: null,
    history: [[]],
    historyIndex: 0,
  })

  const slideAnnotations = useMemo(
    () => state.annotations.filter((a) => a.slideIndex === slideIndex),
    [state.annotations, slideIndex]
  )

  const pushHistory = useCallback((newAnnotations: Annotation[]) => {
    setState((prev) => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1)
      newHistory.push(newAnnotations)
      return {
        ...prev,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  }, [])

  const addAnnotation = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (annotation: Record<string, any>): string => {
      const newAnnotation = {
        ...annotation,
        id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        authorId: userId,
        createdAt: new Date(),
      } as Annotation

      const newAnnotations = [...state.annotations, newAnnotation]
      pushHistory(newAnnotations)
      onAnnotationChange?.(newAnnotations)
      return newAnnotation.id
    },
    [state.annotations, userId, pushHistory, onAnnotationChange]
  )

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      const newAnnotations = state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
      ) as Annotation[]
      pushHistory(newAnnotations)
      onAnnotationChange?.(newAnnotations)
    },
    [state.annotations, pushHistory, onAnnotationChange]
  )

  const deleteAnnotation = useCallback(
    (id: string) => {
      const newAnnotations = state.annotations.filter((a) => a.id !== id)
      pushHistory(newAnnotations)
      onAnnotationChange?.(newAnnotations)
      if (state.selectedId === id) {
        setState((prev) => ({ ...prev, selectedId: null }))
      }
    },
    [state.annotations, state.selectedId, pushHistory, onAnnotationChange]
  )

  const selectAnnotation = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedId: id }))
  }, [])

  const clearSlideAnnotations = useCallback(() => {
    const newAnnotations = state.annotations.filter(
      (a) => a.slideIndex !== slideIndex
    )
    pushHistory(newAnnotations)
    onAnnotationChange?.(newAnnotations)
  }, [state.annotations, slideIndex, pushHistory, onAnnotationChange])

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev
      const newIndex = prev.historyIndex - 1
      return {
        ...prev,
        annotations: prev.history[newIndex],
        historyIndex: newIndex,
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex >= prev.history.length - 1) return prev
      const newIndex = prev.historyIndex + 1
      return {
        ...prev,
        annotations: prev.history[newIndex],
        historyIndex: newIndex,
      }
    })
  }, [])

  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1

  return {
    annotations: slideAnnotations,
    allAnnotations: state.annotations,
    selectedId: state.selectedId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    clearSlideAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}

// =============================================================================
// AnnotationToolbar
// =============================================================================

interface AnnotationToolbarProps {
  activeTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  color: string
  onColorChange: (color: string) => void
  strokeWidth: number
  onStrokeWidthChange: (width: number) => void
  opacity: number
  onOpacityChange: (opacity: number) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onExport?: () => void
  className?: string
}

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  opacity,
  onOpacityChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExport,
  className,
}: AnnotationToolbarProps) {
  const tools: { tool: AnnotationTool; icon: React.ReactNode; label: string }[] = [
    { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Selecionar' },
    { tool: 'pen', icon: <Pencil className="h-4 w-4" />, label: 'Caneta' },
    { tool: 'highlighter', icon: <Highlighter className="h-4 w-4" />, label: 'Marcador' },
    { tool: 'text', icon: <Type className="h-4 w-4" />, label: 'Texto' },
    { tool: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Retângulo' },
    { tool: 'ellipse', icon: <Circle className="h-4 w-4" />, label: 'Elipse' },
    { tool: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Seta' },
    { tool: 'sticky', icon: <StickyNote className="h-4 w-4" />, label: 'Nota adesiva' },
    { tool: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Borracha' },
  ]

  const colorPalette = activeTool === 'highlighter' ? HIGHLIGHTER_COLORS : COLORS

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg bg-background/95 p-1.5 shadow-lg backdrop-blur-sm border',
          className
        )}
      >
        {/* Tools */}
        <div className="flex items-center gap-0.5">
          {tools.map(({ tool, icon, label }) => (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToolChange(tool)}
                >
                  {icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Color picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div
                className="h-5 w-5 rounded-full border-2 border-background shadow"
                style={{ backgroundColor: color }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => onColorChange(c)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Stroke width */}
        {['pen', 'rectangle', 'ellipse', 'arrow', 'eraser'].includes(activeTool) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                <div
                  className="rounded-full bg-foreground"
                  style={{ width: Math.min(strokeWidth, 12), height: Math.min(strokeWidth, 12) }}
                />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Espessura</span>
                  <span>{strokeWidth}px</span>
                </div>
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={[strokeWidth]}
                  onValueChange={([v]) => onStrokeWidthChange(v)}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Opacity */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <Palette className="h-4 w-4" />
              <span className="text-xs">{Math.round(opacity * 100)}%</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Opacidade</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <Slider
                min={0.1}
                max={1}
                step={0.1}
                value={[opacity]}
                onValueChange={([v]) => onOpacityChange(v)}
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* History */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Desfazer (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Refazer (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={onClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Limpar anotações</TooltipContent>
        </Tooltip>

        {onExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Exportar com anotações</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

// =============================================================================
// AnnotationCanvas
// =============================================================================

interface AnnotationCanvasProps {
  width: number
  height: number
  annotations: Annotation[]
  activeTool: AnnotationTool
  color: string
  strokeWidth: number
  opacity: number
  selectedId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddAnnotation: (annotation: Record<string, any>) => string
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void
  onSelectAnnotation: (id: string | null) => void
  slideIndex: number
  className?: string
}

export function AnnotationCanvas({
  width,
  height,
  annotations,
  activeTool,
  color,
  strokeWidth,
  opacity,
  selectedId,
  onAddAnnotation,
  onUpdateAnnotation,
  onSelectAnnotation,
  slideIndex,
  className,
}: AnnotationCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [shapeStart, setShapeStart] = useState<Point | null>(null)
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState<Point | null>(null)

  const getMousePosition = useCallback(
    (e: React.MouseEvent): Point => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }

      const rect = svg.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
      }
    },
    [width, height]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePosition(e)

      if (activeTool === 'select') {
        // Find clicked annotation
        const clicked = annotations.find((a) => {
          if (a.type === 'text' || a.type === 'sticky') {
            const annot = a as TextAnnotation | StickyAnnotation
            return (
              pos.x >= annot.position.x &&
              pos.x <= annot.position.x + (a.type === 'sticky' ? (a as StickyAnnotation).width : 100) &&
              pos.y >= annot.position.y &&
              pos.y <= annot.position.y + (a.type === 'sticky' ? (a as StickyAnnotation).height : 30)
            )
          }
          return false
        })
        onSelectAnnotation(clicked?.id || null)
        return
      }

      if (activeTool === 'text') {
        setTextPosition(pos)
        setTextInput('')
        return
      }

      if (activeTool === 'sticky') {
        onAddAnnotation({
          type: 'sticky',
          slideIndex,
          position: pos,
          width: 200,
          height: 150,
          text: 'Nova nota...',
          color,
          backgroundColor: STICKY_COLORS[0],
          opacity,
        })
        return
      }

      if (['pen', 'highlighter', 'eraser'].includes(activeTool)) {
        setIsDrawing(true)
        setCurrentPath([pos])
        return
      }

      if (['rectangle', 'ellipse', 'arrow'].includes(activeTool)) {
        setIsDrawing(true)
        setShapeStart(pos)
        setShapeEnd(pos)
      }
    },
    [activeTool, annotations, getMousePosition, onSelectAnnotation, onAddAnnotation, slideIndex, color, opacity]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return

      const pos = getMousePosition(e)

      if (['pen', 'highlighter', 'eraser'].includes(activeTool)) {
        setCurrentPath((prev) => [...prev, pos])
        return
      }

      if (['rectangle', 'ellipse', 'arrow'].includes(activeTool)) {
        setShapeEnd(pos)
      }
    },
    [isDrawing, activeTool, getMousePosition]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return

    if (['pen', 'highlighter', 'eraser'].includes(activeTool) && currentPath.length > 1) {
      onAddAnnotation({
        type: activeTool as 'pen' | 'highlighter' | 'eraser',
        slideIndex,
        points: currentPath,
        color: activeTool === 'eraser' ? '#FFFFFF' : color,
        strokeWidth: activeTool === 'highlighter' ? HIGHLIGHTER_STROKE_WIDTH : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.5 : opacity,
      })
    }

    if (['rectangle', 'ellipse', 'arrow'].includes(activeTool) && shapeStart && shapeEnd) {
      onAddAnnotation({
        type: activeTool as 'rectangle' | 'ellipse' | 'arrow',
        slideIndex,
        start: shapeStart,
        end: shapeEnd,
        color,
        strokeWidth,
        opacity,
      })
    }

    setIsDrawing(false)
    setCurrentPath([])
    setShapeStart(null)
    setShapeEnd(null)
  }, [
    isDrawing,
    activeTool,
    currentPath,
    shapeStart,
    shapeEnd,
    slideIndex,
    color,
    strokeWidth,
    opacity,
    onAddAnnotation,
  ])

  const handleTextSubmit = useCallback(() => {
    if (!textPosition || !textInput.trim()) {
      setTextPosition(null)
      setTextInput('')
      return
    }

    onAddAnnotation({
      type: 'text',
      slideIndex,
      position: textPosition,
      text: textInput,
      color,
      fontSize: 16,
      fontFamily: 'Inter, sans-serif',
      opacity,
    })

    setTextPosition(null)
    setTextInput('')
  }, [textPosition, textInput, slideIndex, color, opacity, onAddAnnotation])

  // Render path annotation
  const renderPath = (points: Point[], pathColor: string, pathOpacity: number, pathStrokeWidth: number) => {
    if (points.length < 2) return null

    const d = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`
      return `${acc} L ${point.x} ${point.y}`
    }, '')

    return (
      <path
        d={d}
        fill="none"
        stroke={pathColor}
        strokeWidth={pathStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={pathOpacity}
      />
    )
  }

  // Render shape preview
  const renderShapePreview = () => {
    if (!shapeStart || !shapeEnd) return null

    const minX = Math.min(shapeStart.x, shapeEnd.x)
    const minY = Math.min(shapeStart.y, shapeEnd.y)
    const w = Math.abs(shapeEnd.x - shapeStart.x)
    const h = Math.abs(shapeEnd.y - shapeStart.y)

    if (activeTool === 'rectangle') {
      return (
        <rect
          x={minX}
          y={minY}
          width={w}
          height={h}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          strokeDasharray="4 4"
        />
      )
    }

    if (activeTool === 'ellipse') {
      return (
        <ellipse
          cx={minX + w / 2}
          cy={minY + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          strokeDasharray="4 4"
        />
      )
    }

    if (activeTool === 'arrow') {
      const angle = Math.atan2(shapeEnd.y - shapeStart.y, shapeEnd.x - shapeStart.x)
      const arrowSize = 12
      return (
        <g opacity={opacity}>
          <line
            x1={shapeStart.x}
            y1={shapeStart.y}
            x2={shapeEnd.x}
            y2={shapeEnd.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray="4 4"
          />
          <polygon
            points={`
              ${shapeEnd.x},${shapeEnd.y}
              ${shapeEnd.x - arrowSize * Math.cos(angle - Math.PI / 6)},${shapeEnd.y - arrowSize * Math.sin(angle - Math.PI / 6)}
              ${shapeEnd.x - arrowSize * Math.cos(angle + Math.PI / 6)},${shapeEnd.y - arrowSize * Math.sin(angle + Math.PI / 6)}
            `}
            fill={color}
          />
        </g>
      )
    }

    return null
  }

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Existing annotations */}
        {annotations.map((annotation) => {
          if (annotation.type === 'pen' || annotation.type === 'highlighter' || annotation.type === 'eraser') {
            const pathAnnot = annotation as PathAnnotation
            return (
              <g key={annotation.id}>
                {renderPath(
                  pathAnnot.points,
                  pathAnnot.color,
                  pathAnnot.opacity,
                  pathAnnot.strokeWidth
                )}
              </g>
            )
          }

          if (annotation.type === 'rectangle') {
            const shapeAnnot = annotation as ShapeAnnotation
            const minX = Math.min(shapeAnnot.start.x, shapeAnnot.end.x)
            const minY = Math.min(shapeAnnot.start.y, shapeAnnot.end.y)
            const w = Math.abs(shapeAnnot.end.x - shapeAnnot.start.x)
            const h = Math.abs(shapeAnnot.end.y - shapeAnnot.start.y)
            return (
              <rect
                key={annotation.id}
                x={minX}
                y={minY}
                width={w}
                height={h}
                fill={shapeAnnot.fill || 'none'}
                fillOpacity={shapeAnnot.fillOpacity || 0}
                stroke={shapeAnnot.color}
                strokeWidth={shapeAnnot.strokeWidth}
                opacity={shapeAnnot.opacity}
                className={cn(
                  selectedId === annotation.id && 'stroke-primary'
                )}
              />
            )
          }

          if (annotation.type === 'ellipse') {
            const shapeAnnot = annotation as ShapeAnnotation
            const minX = Math.min(shapeAnnot.start.x, shapeAnnot.end.x)
            const minY = Math.min(shapeAnnot.start.y, shapeAnnot.end.y)
            const w = Math.abs(shapeAnnot.end.x - shapeAnnot.start.x)
            const h = Math.abs(shapeAnnot.end.y - shapeAnnot.start.y)
            return (
              <ellipse
                key={annotation.id}
                cx={minX + w / 2}
                cy={minY + h / 2}
                rx={w / 2}
                ry={h / 2}
                fill={shapeAnnot.fill || 'none'}
                fillOpacity={shapeAnnot.fillOpacity || 0}
                stroke={shapeAnnot.color}
                strokeWidth={shapeAnnot.strokeWidth}
                opacity={shapeAnnot.opacity}
              />
            )
          }

          if (annotation.type === 'arrow') {
            const shapeAnnot = annotation as ShapeAnnotation
            const angle = Math.atan2(
              shapeAnnot.end.y - shapeAnnot.start.y,
              shapeAnnot.end.x - shapeAnnot.start.x
            )
            const arrowSize = 12
            return (
              <g key={annotation.id} opacity={shapeAnnot.opacity}>
                <line
                  x1={shapeAnnot.start.x}
                  y1={shapeAnnot.start.y}
                  x2={shapeAnnot.end.x}
                  y2={shapeAnnot.end.y}
                  stroke={shapeAnnot.color}
                  strokeWidth={shapeAnnot.strokeWidth}
                />
                <polygon
                  points={`
                    ${shapeAnnot.end.x},${shapeAnnot.end.y}
                    ${shapeAnnot.end.x - arrowSize * Math.cos(angle - Math.PI / 6)},${shapeAnnot.end.y - arrowSize * Math.sin(angle - Math.PI / 6)}
                    ${shapeAnnot.end.x - arrowSize * Math.cos(angle + Math.PI / 6)},${shapeAnnot.end.y - arrowSize * Math.sin(angle + Math.PI / 6)}
                  `}
                  fill={shapeAnnot.color}
                />
              </g>
            )
          }

          if (annotation.type === 'text') {
            const textAnnot = annotation as TextAnnotation
            return (
              <text
                key={annotation.id}
                x={textAnnot.position.x}
                y={textAnnot.position.y}
                fill={textAnnot.color}
                fontSize={textAnnot.fontSize}
                fontFamily={textAnnot.fontFamily}
                fontWeight={textAnnot.bold ? 'bold' : 'normal'}
                fontStyle={textAnnot.italic ? 'italic' : 'normal'}
                opacity={textAnnot.opacity}
              >
                {textAnnot.text}
              </text>
            )
          }

          return null
        })}

        {/* Current drawing */}
        {isDrawing && currentPath.length > 0 && renderPath(
          currentPath,
          activeTool === 'eraser' ? '#FFFFFF' : color,
          activeTool === 'highlighter' ? 0.5 : opacity,
          activeTool === 'highlighter' ? HIGHLIGHTER_STROKE_WIDTH : strokeWidth
        )}

        {/* Shape preview */}
        {isDrawing && renderShapePreview()}
      </svg>

      {/* Text input overlay */}
      {textPosition && (
        <div
          className="absolute z-10"
          style={{ left: textPosition.x, top: textPosition.y }}
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit()
              if (e.key === 'Escape') {
                setTextPosition(null)
                setTextInput('')
              }
            }}
            className="border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
            style={{ color }}
            autoFocus
            placeholder="Digite aqui..."
          />
        </div>
      )}

      {/* Sticky notes */}
      <AnimatePresence>
        {annotations
          .filter((a): a is StickyAnnotation => a.type === 'sticky')
          .map((sticky) => (
            <StickyNoteAnnotation
              key={sticky.id}
              annotation={sticky}
              isSelected={selectedId === sticky.id}
              onUpdate={(updates) => onUpdateAnnotation(sticky.id, updates)}
              onSelect={() => onSelectAnnotation(sticky.id)}
            />
          ))}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// StickyNoteAnnotation
// =============================================================================

interface StickyNoteAnnotationProps {
  annotation: StickyAnnotation
  isSelected: boolean
  onUpdate: (updates: Partial<StickyAnnotation>) => void
  onSelect: () => void
}

function StickyNoteAnnotation({
  annotation,
  isSelected,
  onUpdate,
  onSelect,
}: StickyNoteAnnotationProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localText, setLocalText] = useState(annotation.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (localText !== annotation.text) {
      onUpdate({ text: localText })
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={cn(
        'absolute cursor-move rounded-sm shadow-md',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        left: annotation.position.x,
        top: annotation.position.y,
        width: annotation.width,
        height: annotation.height,
        backgroundColor: annotation.backgroundColor,
      }}
      onClick={onSelect}
      onDoubleClick={() => setIsEditing(true)}
    >
      <div className="h-6 cursor-move bg-black/5" />
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleBlur}
          className="h-[calc(100%-24px)] w-full resize-none bg-transparent p-2 text-sm outline-none"
        />
      ) : (
        <div className="h-[calc(100%-24px)] overflow-auto p-2 text-sm">
          {annotation.text}
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export {
  type Annotation,
  type AnnotationTool,
  type PathAnnotation,
  type TextAnnotation,
  type ShapeAnnotation,
  type StickyAnnotation,
  type Point,
  type AnnotationState,
  type UseAnnotationsOptions,
}
