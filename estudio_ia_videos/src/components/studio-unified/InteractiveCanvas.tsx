'use client'

/**
 * Interactive Canvas
 * Canvas interativo com Konva.js para edição visual
 * Drag & Drop, Resize, Rotate de elementos
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Stage, Layer, Image, Rect, Text, Transformer, Group } from 'react-konva'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Slider } from '@components/ui/slider'
import {
  ZoomIn, ZoomOut, Maximize2, Grid3x3, Eye, EyeOff,
  Lock, Unlock, Layers, AlignCenter, AlignLeft, AlignRight,
  Move, Trash2, Copy, RotateCw
} from 'lucide-react'
import { cn } from '@lib/utils'
import { toast } from 'sonner'
import Konva from 'konva'

// ============================================================================
// TYPES
// ============================================================================

export interface CanvasElement {
  id: string
  type: 'image' | 'video' | 'text' | 'avatar' | 'shape'
  name: string

  // Position & Transform
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number

  // Content
  src?: string // for images/videos/avatars
  text?: string // for text elements
  fill?: string // for shapes/text

  // State
  locked: boolean
  visible: boolean
  draggable: boolean

  // Layer
  zIndex: number
}

export interface CanvasScene {
  id: string
  name: string
  elements: CanvasElement[]
  backgroundColor: string
  backgroundImage?: string
  width: number
  height: number
}

// ============================================================================
// CANVAS ELEMENT COMPONENT
// ============================================================================

interface CanvasElementNodeProps {
  element: CanvasElement
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<CanvasElement>) => void
  onDelete: () => void
}

const CanvasElementNode: React.FC<CanvasElementNodeProps> = ({
  element,
  isSelected,
  onSelect,
  onChange,
  onDelete
}) => {
  const shapeRef = useRef<any>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  // Load image if element has src
  useEffect(() => {
    if (element.src && (element.type === 'image' || element.type === 'avatar')) {
      const img = new window.Image()
      img.src = element.src
      img.onload = () => {
        setImage(img)
      }
    }
  }, [element.src, element.type])

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const handleDragEnd = (e: any) => {
    onChange({
      x: e.target.x(),
      y: e.target.y()
    })
  }

  const handleTransformEnd = () => {
    const node = shapeRef.current
    if (!node) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Reset scale and apply to width/height
    node.scaleX(1)
    node.scaleY(1)

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation()
    })
  }

  const commonProps = {
    onClick: onSelect,
    onTap: onSelect,
    ref: shapeRef,
    draggable: !element.locked && element.draggable,
    visible: element.visible,
    opacity: element.opacity,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd
  }

  return (
    <>
      {/* Render based on type */}
      {element.type === 'image' || element.type === 'avatar' ? (
        image && (
          <Image
            {...commonProps}
            image={image}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rotation={element.rotation}
          />
        )
      ) : element.type === 'text' ? (
        <Text
          {...commonProps}
          text={element.text || ''}
          x={element.x}
          y={element.y}
          width={element.width}
          fontSize={20}
          fill={element.fill || '#000000'}
          rotation={element.rotation}
        />
      ) : element.type === 'shape' ? (
        <Rect
          {...commonProps}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill={element.fill || '#cccccc'}
          rotation={element.rotation}
        />
      ) : null}

      {/* Transformer for selected element */}
      {isSelected && !element.locked && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox
            }
            return newBox
          }}
          rotateEnabled={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'middle-left',
            'middle-right'
          ]}
        />
      )}
    </>
  )
}

// ============================================================================
// MAIN INTERACTIVE CANVAS
// ============================================================================

export interface InteractiveCanvasProps {
  scene?: CanvasScene
  selectedElementId?: string
  onSelectElement?: (id: string | null) => void
  onUpdateElement?: (id: string, updates: Partial<CanvasElement>) => void
  onDeleteElement?: (id: string) => void
  onAddElement?: (element: Omit<CanvasElement, 'id'>) => void
  className?: string
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  scene,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onAddElement,
  className
}) => {
  // State
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 })
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)

  // Calculate responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight

        // Maintain 16:9 aspect ratio
        const aspectRatio = 16 / 9
        let width = containerWidth - 32 // padding
        let height = width / aspectRatio

        if (height > containerHeight - 32) {
          height = containerHeight - 32
          width = height * aspectRatio
        }

        setCanvasSize({ width, height })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Get current scene or use default
  const currentScene: CanvasScene = scene || {
    id: 'default',
    name: 'Default Scene',
    elements: [],
    backgroundColor: '#1a1a1a',
    width: 1920,
    height: 1080
  }

  // Handlers
  const handleStageClick = (e: any) => {
    // Deselect when clicking empty area
    if (e.target === e.target.getStage()) {
      onSelectElement?.(null)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.25))
  }

  const handleFitToScreen = () => {
    setZoom(1)
  }

  const handleDeleteSelected = () => {
    if (selectedElementId) {
      onDeleteElement?.(selectedElementId)
      onSelectElement?.(null)
      toast.success('Element deleted')
    }
  }

  const handleDuplicateSelected = () => {
    if (selectedElementId) {
      const element = currentScene.elements.find(e => e.id === selectedElementId)
      if (element && onAddElement) {
        const { id, ...rest } = element
        onAddElement({
          ...rest,
          x: rest.x + 20,
          y: rest.y + 20,
          name: `${rest.name} (copy)`
        })
        toast.success('Element duplicated')
      }
    }
  }

  const handleAlignCenter = () => {
    if (selectedElementId && onUpdateElement) {
      const element = currentScene.elements.find(e => e.id === selectedElementId)
      if (element) {
        onUpdateElement(selectedElementId, {
          x: (1920 - element.width) / 2
        })
      }
    }
  }

  const handleLockToggle = () => {
    if (selectedElementId && onUpdateElement) {
      const element = currentScene.elements.find(e => e.id === selectedElementId)
      if (element) {
        onUpdateElement(selectedElementId, {
          locked: !element.locked
        })
        toast.success(element.locked ? 'Unlocked' : 'Locked')
      }
    }
  }

  // Get selected element
  const selectedElement = currentScene.elements.find(e => e.id === selectedElementId)

  return (
    <div className={cn("flex flex-col h-full bg-muted/30", className)} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-background border-b">
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleFitToScreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid Toggle */}
          <Button
            size="sm"
            variant={showGrid ? "default" : "ghost"}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3x3 className="h-4 w-4 mr-1" />
            Grid
          </Button>

          {/* Element Count */}
          <Badge variant="secondary">
            <Layers className="h-3 w-3 mr-1" />
            {currentScene.elements.length} elements
          </Badge>
        </div>

        {/* Element Controls (shown when element selected) */}
        {selectedElement && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleAlignCenter}
              title="Center horizontally"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleLockToggle}
              title={selectedElement.locked ? 'Unlock' : 'Lock'}
            >
              {selectedElement.locked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleDuplicateSelected}
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleDeleteSelected}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="relative shadow-2xl"
          style={{
            width: canvasSize.width,
            height: canvasSize.height
          }}
        >
          {/* Konva Stage */}
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
            scaleX={zoom}
            scaleY={zoom}
            onClick={handleStageClick}
            onTap={handleStageClick}
          >
            {/* Background Layer */}
            <Layer>
              <Rect
                x={0}
                y={0}
                width={1920}
                height={1080}
                fill={currentScene.backgroundColor}
              />

              {/* Grid */}
              {showGrid && (
                <>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <React.Fragment key={`grid-${i}`}>
                      {/* Vertical lines */}
                      <Rect
                        x={(1920 / 20) * i}
                        y={0}
                        width={1}
                        height={1080}
                        fill="#ffffff"
                        opacity={0.1}
                      />
                      {/* Horizontal lines */}
                      <Rect
                        x={0}
                        y={(1080 / 20) * i}
                        width={1920}
                        height={1}
                        fill="#ffffff"
                        opacity={0.1}
                      />
                    </React.Fragment>
                  ))}
                </>
              )}
            </Layer>

            {/* Elements Layer */}
            <Layer>
              {currentScene.elements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((element) => (
                  <CanvasElementNode
                    key={element.id}
                    element={element}
                    isSelected={element.id === selectedElementId}
                    onSelect={() => onSelectElement?.(element.id)}
                    onChange={(updates) => onUpdateElement?.(element.id, updates)}
                    onDelete={() => onDeleteElement?.(element.id)}
                  />
                ))}
            </Layer>
          </Stage>

          {/* Safe Area Guides */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute border-2 border-blue-500 border-dashed opacity-30"
              style={{
                left: '5%',
                top: '5%',
                right: '5%',
                bottom: '5%'
              }}
            />
          </div>

          {/* Center Guides */}
          {selectedElement && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Vertical center line */}
              <div
                className="absolute w-px h-full bg-purple-500 opacity-50"
                style={{ left: '50%' }}
              />
              {/* Horizontal center line */}
              <div
                className="absolute w-full h-px bg-purple-500 opacity-50"
                style={{ top: '50%' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t bg-background flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Canvas: {currentScene.width} × {currentScene.height}
          </span>
          {selectedElement && (
            <>
              <span className="text-muted-foreground">•</span>
              <span>
                {selectedElement.name} ({Math.round(selectedElement.x)}, {Math.round(selectedElement.y)})
              </span>
            </>
          )}
        </div>
        <div className="text-muted-foreground">
          {showGrid ? 'Grid On' : 'Grid Off'} • Zoom {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  )
}

export default InteractiveCanvas
