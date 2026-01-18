'use client';

/**
 * Interactive Canvas
 * Canvas interativo com Konva.js para edição visual
 * Drag & Drop, Resize, Rotate de elementos
 */

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Rect, Text, Transformer } from 'react-konva';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3,
  Lock,
  Unlock,
  Layers,
  AlignCenter,
  Move,
  Trash2,
  Copy,
} from 'lucide-react';
import { cn } from '@lib/utils';
import { toast } from 'sonner';
import Konva from 'konva';
import { snapPosition, AlignmentGuide } from '@lib/canvas/snap-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface CanvasElement {
  id: string;
  type: 'image' | 'video' | 'text' | 'avatar' | 'shape';
  name: string;

  // Position & Transform
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;

  // Content
  src?: string; // for images/videos/avatars
  text?: string; // for text elements
  fill?: string; // for shapes/text

  // State
  locked: boolean;
  visible: boolean;
  draggable: boolean;

  // Layer
  zIndex: number;
}

export interface CanvasScene {
  id: string;
  name: string;
  elements: CanvasElement[];
  backgroundColor: string;
  backgroundImage?: string;
  width: number;
  height: number;
}

// ============================================================================
// CANVAS ELEMENT COMPONENT
// ============================================================================

interface CanvasElementNodeProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent | Konva.KonvaEventObject<MouseEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onDoubleClick?: () => void;
  snapConfig?: {
    snapToGrid: boolean;
    snapToElements: boolean;
    gridSize: number;
    canvasWidth: number;
    canvasHeight: number;
    otherElements: CanvasElement[];
  };
  onShowGuides?: (guides: AlignmentGuide[]) => void;
  onHideGuides?: () => void;
}

const CanvasElementNode: React.FC<CanvasElementNodeProps> = ({
  element,
  isSelected,
  onSelect,
  onChange,
  onDoubleClick,
  snapConfig,
  onShowGuides,
  onHideGuides,
}) => {
  const shapeRef = useRef<Konva.Shape | Konva.Text | Konva.Image | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Load image if element has src
  useEffect(() => {
    if (element.src && (element.type === 'image' || element.type === 'avatar')) {
      const img = new window.Image();
      img.src = element.src;
      img.onload = () => {
        setImage(img);
      };
    }
  }, [element.src, element.type]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    let x = e.target.x();
    let y = e.target.y();

    // Apply snapping if enabled
    if (snapConfig) {
      const snapResult = snapPosition(x, y, element.width, element.height, {
        snapToGrid: snapConfig.snapToGrid,
        snapToCenter: true,
        snapToElements: snapConfig.snapToElements,
        gridSize: snapConfig.gridSize,
        threshold: 10,
        canvasWidth: snapConfig.canvasWidth,
        canvasHeight: snapConfig.canvasHeight,
        otherElements: snapConfig.otherElements,
        currentElementId: element.id,
      });

      x = snapResult.result.x;
      y = snapResult.result.y;

      // Show guides briefly
      if (snapResult.guides.length > 0) {
        onShowGuides?.(snapResult.guides);
        setTimeout(() => onHideGuides?.(), 1000);
      }
    }

    onChange({ x, y });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  const commonProps = {
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: element.type === 'text' ? onDoubleClick : undefined,
    ref: shapeRef,
    draggable: !element.locked && element.draggable,
    visible: element.visible,
    opacity: element.opacity,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
  };

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
              return oldBox;
            }
            return newBox;
          }}
          rotateEnabled={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'middle-left',
            'middle-right',
          ]}
        />
      )}
    </>
  );
};

// ============================================================================
// MAIN INTERACTIVE CANVAS
// ============================================================================

export interface InteractiveCanvasProps {
  scene?: CanvasScene;
  selectedElementIds?: string[];
  onSelectElement?: (id: string | null, multiSelect?: boolean) => void;
  onUpdateElement?: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement?: (id: string) => void;
  onAddElement?: (element: Omit<CanvasElement, 'id'>) => void;
  onDoubleClickElement?: (id: string, element: CanvasElement) => void;
  className?: string;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  scene,
  selectedElementIds = [],
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onAddElement,
  onDoubleClickElement,
  className,
}) => {
  // State
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToElements] = useState(true);
  const [gridSize] = useState(20);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Calculate responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Maintain 16:9 aspect ratio
        const aspectRatio = 16 / 9;
        let width = containerWidth - 32; // padding
        let height = width / aspectRatio;

        if (height > containerHeight - 32) {
          height = containerHeight - 32;
          width = height * aspectRatio;
        }

        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Get current scene or use default
  const currentScene: CanvasScene = scene || {
    id: 'default',
    name: 'Default Scene',
    elements: [],
    backgroundColor: '#1a1a1a',
    width: 1920,
    height: 1080,
  };

  // Handlers
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deselect when clicking empty area
    if (e.target === e.target.getStage()) {
      onSelectElement?.(null);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.25));
  };

  const handleFitToScreen = () => {
    setZoom(1);
  };

  const handleDeleteSelected = () => {
    if (selectedElementIds.length > 0) {
      // Filter out locked elements
      const unlockedIds = selectedElementIds.filter((id) => {
        const element = currentScene.elements.find((e) => e.id === id);
        return element && !element.locked;
      });

      if (unlockedIds.length === 0) {
        toast.error('Cannot delete locked elements');
        return;
      }

      const lockedCount = selectedElementIds.length - unlockedIds.length;

      unlockedIds.forEach((id) => onDeleteElement?.(id));
      onSelectElement?.(null);

      if (lockedCount > 0) {
        toast.warning(
          `Deleted ${unlockedIds.length} element(s), ${lockedCount} locked element(s) skipped`,
        );
      } else {
        toast.success(`Deleted ${unlockedIds.length} element(s)`);
      }
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedElementIds.length > 0 && onAddElement) {
      // Filter out locked elements
      const unlockedElements = currentScene.elements.filter(
        (e) => selectedElementIds.includes(e.id) && !e.locked,
      );

      if (unlockedElements.length === 0) {
        toast.error('Cannot duplicate locked elements');
        return;
      }

      const lockedCount = selectedElementIds.length - unlockedElements.length;

      unlockedElements.forEach((element) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = element;
        onAddElement({
          ...rest,
          x: rest.x + 20,
          y: rest.y + 20,
          name: `${rest.name} (copy)`,
        });
      });

      if (lockedCount > 0) {
        toast.warning(
          `Duplicated ${unlockedElements.length} element(s), ${lockedCount} locked element(s) skipped`,
        );
      } else {
        toast.success(`Duplicated ${unlockedElements.length} element(s)`);
      }
    }
  };

  const handleAlignCenter = () => {
    if (selectedElementIds.length > 0 && onUpdateElement) {
      // Filter out locked elements
      const unlockedIds = selectedElementIds.filter((id) => {
        const element = currentScene.elements.find((e) => e.id === id);
        return element && !element.locked;
      });

      if (unlockedIds.length === 0) {
        toast.error('Cannot align locked elements');
        return;
      }

      unlockedIds.forEach((id) => {
        const element = currentScene.elements.find((e) => e.id === id);
        if (element) {
          onUpdateElement(id, {
            x: (1920 - element.width) / 2,
          });
        }
      });

      const lockedCount = selectedElementIds.length - unlockedIds.length;
      if (lockedCount > 0) {
        toast.warning(
          `Aligned ${unlockedIds.length} element(s), ${lockedCount} locked element(s) skipped`,
        );
      }
    }
  };

  const handleLockToggle = () => {
    if (selectedElementIds.length > 0 && onUpdateElement) {
      selectedElementIds.forEach((id) => {
        const element = currentScene.elements.find((e) => e.id === id);
        if (element) {
          onUpdateElement(id, {
            locked: !element.locked,
          });
        }
      });
      const element = currentScene.elements.find((e) => e.id === selectedElementIds[0]);
      toast.success(element?.locked ? 'Unlocked' : 'Locked');
    }
  };

  // Get first selected element for display
  const selectedElement =
    selectedElementIds.length > 0
      ? currentScene.elements.find((e) => e.id === selectedElementIds[0])
      : null;

  return (
    <div className={cn('flex flex-col h-full bg-muted/30', className)} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-background border-b">
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleFitToScreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid Toggle */}
          <Button
            size="sm"
            variant={showGrid ? 'default' : 'ghost'}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid (Ctrl+G)"
          >
            <Grid3x3 className="h-4 w-4 mr-1" />
            Grid
          </Button>

          {/* Snap to Grid Toggle */}
          <Button
            size="sm"
            variant={snapToGrid ? 'default' : 'ghost'}
            onClick={() => setSnapToGrid(!snapToGrid)}
            title="Snap to Grid"
          >
            <Move className="h-4 w-4 mr-1" />
            Snap
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
            height: canvasSize.height,
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
              <Rect x={0} y={0} width={1920} height={1080} fill={currentScene.backgroundColor} />

              {/* Grid */}
              {showGrid && (
                <>
                  {Array.from({ length: Math.ceil(1920 / gridSize) + 1 }).map((_, i) => (
                    <Rect
                      key={`grid-v-${i}`}
                      x={i * gridSize}
                      y={0}
                      width={1}
                      height={1080}
                      fill="#ffffff"
                      opacity={0.1}
                    />
                  ))}
                  {Array.from({ length: Math.ceil(1080 / gridSize) + 1 }).map((_, i) => (
                    <Rect
                      key={`grid-h-${i}`}
                      x={0}
                      y={i * gridSize}
                      width={1920}
                      height={1}
                      fill="#ffffff"
                      opacity={0.1}
                    />
                  ))}
                </>
              )}
            </Layer>

            {/* Elements Layer */}
            <Layer>
              {currentScene.elements
                .filter((element) => element.visible !== false) // Only render visible elements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((element) => (
                  <CanvasElementNode
                    key={element.id}
                    element={element}
                    isSelected={selectedElementIds.includes(element.id)}
                    onSelect={(e?: React.MouseEvent | Konva.KonvaEventObject<MouseEvent>) => {
                      // Support both Shift+Click and Ctrl+Click for multi-select
                      const isKonvaEvent = e && 'evt' in e;
                      const evt = isKonvaEvent
                        ? (e as Konva.KonvaEventObject<MouseEvent>).evt
                        : (e as React.MouseEvent | undefined);
                      const multiSelect = evt?.shiftKey || evt?.ctrlKey || evt?.metaKey || false;
                      onSelectElement?.(element.id, multiSelect);
                    }}
                    onChange={(updates) => onUpdateElement?.(element.id, updates)}
                    onDoubleClick={() => onDoubleClickElement?.(element.id, element)}
                    snapConfig={{
                      snapToGrid,
                      snapToElements,
                      gridSize,
                      canvasWidth: 1920,
                      canvasHeight: 1080,
                      otherElements: currentScene.elements,
                    }}
                    onShowGuides={setAlignmentGuides}
                    onHideGuides={() => setAlignmentGuides([])}
                  />
                ))}
            </Layer>

            {/* Alignment Guides Layer */}
            <Layer>
              {alignmentGuides.map((guide, idx) =>
                guide.type === 'vertical' ? (
                  <Rect
                    key={`guide-${idx}`}
                    x={guide.position}
                    y={0}
                    width={2}
                    height={1080}
                    fill={guide.color}
                    opacity={0.8}
                  />
                ) : (
                  <Rect
                    key={`guide-${idx}`}
                    x={0}
                    y={guide.position}
                    width={1920}
                    height={2}
                    fill={guide.color}
                    opacity={0.8}
                  />
                ),
              )}
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
                bottom: '5%',
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
          {selectedElementIds.length > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span>
                {selectedElementIds.length === 1 && selectedElement
                  ? `${selectedElement.name} (${Math.round(selectedElement.x)}, ${Math.round(selectedElement.y)})`
                  : `${selectedElementIds.length} elements selected`}
              </span>
            </>
          )}
        </div>
        <div className="text-muted-foreground">
          {showGrid ? 'Grid On' : 'Grid Off'} •{snapToGrid ? ' Snap On' : ' Snap Off'} • Grid:{' '}
          {gridSize}px • Zoom {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
};

export default InteractiveCanvas;
