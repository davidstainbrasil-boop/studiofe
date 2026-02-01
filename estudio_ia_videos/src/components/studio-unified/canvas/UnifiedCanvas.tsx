/**
 * 🎨 Unified Canvas
 * Canvas de preview com layers, seleção e cursores de colaboração
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid3X3,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Move,
  MousePointer2,
  Hand,
  Type,
  Image,
  Square,
  Circle,
  ChevronDown,
  Settings,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedStudioStore } from '@/lib/stores/unified-studio-store';

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'avatar' | 'shape';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  content?: string;
  src?: string;
  style?: Record<string, unknown>;
}

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
  isActive: boolean;
}

interface UnifiedCanvasProps {
  className?: string;
  onElementSelect?: (ids: string[]) => void;
  onElementUpdate?: (id: string, updates: Partial<CanvasElement>) => void;
}

type Tool = 'select' | 'hand' | 'text' | 'image' | 'shape';

const TOOLS = [
  { id: 'select' as Tool, icon: MousePointer2, label: 'Selecionar (V)' },
  { id: 'hand' as Tool, icon: Hand, label: 'Mover (H)' },
  { id: 'text' as Tool, icon: Type, label: 'Texto (T)' },
  { id: 'image' as Tool, icon: Image, label: 'Imagem (I)' },
  { id: 'shape' as Tool, icon: Square, label: 'Forma (S)' },
];

// Mock collaborators
const MOCK_COLLABORATORS: Collaborator[] = [
  { id: 'user-1', name: 'Maria', color: '#3B82F6', cursorX: 200, cursorY: 150, isActive: true },
  { id: 'user-2', name: 'João', color: '#10B981', cursorX: 400, cursorY: 300, isActive: true },
];

// Mock canvas elements
const MOCK_ELEMENTS: CanvasElement[] = [
  {
    id: 'el-1',
    type: 'text',
    name: 'Título Principal',
    x: 100,
    y: 80,
    width: 600,
    height: 60,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 2,
    content: 'Segurança no Trabalho',
    style: { fontSize: 48, fontWeight: 'bold', color: '#ffffff' },
  },
  {
    id: 'el-2',
    type: 'text',
    name: 'Subtítulo',
    x: 100,
    y: 160,
    width: 600,
    height: 30,
    rotation: 0,
    opacity: 0.8,
    visible: true,
    locked: false,
    zIndex: 1,
    content: 'Treinamento NR-12 - Segurança em Máquinas',
    style: { fontSize: 24, color: '#e5e5e5' },
  },
  {
    id: 'el-3',
    type: 'shape',
    name: 'Background',
    x: 0,
    y: 0,
    width: 800,
    height: 450,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: true,
    zIndex: 0,
    style: { background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)' },
  },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function UnifiedCanvas({
  className,
  onElementSelect,
  onElementUpdate,
}: UnifiedCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [elements, setElements] = useState<CanvasElement[]>(MOCK_ELEMENTS);
  const [collaborators] = useState<Collaborator[]>(MOCK_COLLABORATORS);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const {
    currentTime,
    duration,
    setCurrentTime,
    selectedElementIds,
    selectElements,
  } = useUnifiedStudioStore((state) => ({
    currentTime: state.currentTime,
    duration: state.duration,
    setCurrentTime: state.setCurrentTime,
    selectedElementIds: state.selectedElementIds,
    selectElements: state.selectElements,
  }));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('hand');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'i':
          setActiveTool('image');
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) setActiveTool('shape');
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'delete':
        case 'backspace':
          if (selectedIds.length > 0) {
            setElements((els) => els.filter((el) => !selectedIds.includes(el.id)));
            setSelectedIds([]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedIds]);

  const handleElementClick = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation();
      
      if (activeTool !== 'select') return;

      const element = elements.find((el) => el.id === elementId);
      if (element?.locked) return;

      if (e.shiftKey) {
        // Multi-select
        setSelectedIds((prev) =>
          prev.includes(elementId)
            ? prev.filter((id) => id !== elementId)
            : [...prev, elementId]
        );
      } else {
        setSelectedIds([elementId]);
      }

      selectElements([elementId]);
      onElementSelect?.([elementId]);
    },
    [activeTool, elements, selectElements, onElementSelect]
  );

  const handleCanvasClick = useCallback(() => {
    if (activeTool === 'select') {
      setSelectedIds([]);
      selectElements([]);
      onElementSelect?.([]);
    }
  }, [activeTool, selectElements, onElementSelect]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      if (activeTool !== 'select') return;

      const element = elements.find((el) => el.id === elementId);
      if (element?.locked) return;

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [activeTool, elements]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || selectedIds.length === 0) return;

      const dx = (e.clientX - dragStart.x) / (zoom / 100);
      const dy = (e.clientY - dragStart.y) / (zoom / 100);

      setElements((els) =>
        els.map((el) =>
          selectedIds.includes(el.id) && !el.locked
            ? { ...el, x: el.x + dx, y: el.y + dy }
            : el
        )
      );

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, selectedIds, dragStart, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(200, Math.max(25, z + delta)));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(100);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Sort elements by zIndex for rendering
  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements]
  );

  return (
    <div
      className={cn('flex flex-col h-full bg-neutral-900', className)}
      ref={canvasRef}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-neutral-800 bg-neutral-950">
        {/* Tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              title={tool.label}
              onClick={() => setActiveTool(tool.id)}
            >
              <tool.icon className="h-4 w-4" />
            </Button>
          ))}

          <div className="w-px h-6 bg-neutral-700 mx-2" />

          <Button
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            title="Mostrar Grid"
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Layers className="h-4 w-4 mr-1" />
                <span className="text-xs">{elements.length}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {sortedElements.map((el) => (
                <DropdownMenuItem
                  key={el.id}
                  className="flex items-center justify-between"
                  onClick={() => {
                    setSelectedIds([el.id]);
                    selectElements([el.id]);
                  }}
                >
                  <span className="text-xs truncate">{el.name}</span>
                  <div className="flex items-center gap-1">
                    {el.locked && <Lock className="h-3 w-3 text-yellow-500" />}
                    {!el.visible && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center - Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleZoom(-10)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 min-w-[60px]"
            onClick={handleResetZoom}
          >
            <span className="text-xs">{zoom}%</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleZoom(10)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Right - Collaboration & Settings */}
        <div className="flex items-center gap-2">
          {/* Collaborators */}
          {showCollaborators && collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-2">
                <Users className="h-3 w-3 mr-1" />
                {collaborators.filter((c) => c.isActive).length} online
              </Badge>
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map((collab) => (
                  <div
                    key={collab.id}
                    className="h-6 w-6 rounded-full border-2 border-neutral-900 flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ backgroundColor: collab.color }}
                    title={collab.name}
                  >
                    {collab.name[0]}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowCollaborators(!showCollaborators)}
          >
            {showCollaborators ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="flex-1 relative overflow-hidden bg-neutral-800"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Canvas Wrapper (for zoom) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Canvas (16:9 aspect ratio) */}
          <div
            className="relative bg-black shadow-2xl"
            style={{
              width: 800,
              height: 450,
            }}
          >
            {/* Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                  backgroundSize: '50px 50px',
                }}
              />
            )}

            {/* Elements */}
            {sortedElements.map(
              (element) =>
                element.visible && (
                  <div
                    key={element.id}
                    className={cn(
                      'absolute cursor-move transition-shadow',
                      selectedIds.includes(element.id) &&
                        'ring-2 ring-primary ring-offset-2 ring-offset-black',
                      element.locked && 'cursor-not-allowed'
                    )}
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      transform: `rotate(${element.rotation}deg)`,
                      opacity: element.opacity,
                      zIndex: element.zIndex,
                      ...(element.style as React.CSSProperties),
                    }}
                    onClick={(e) => handleElementClick(e, element.id)}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                  >
                    {element.type === 'text' && (
                      <div
                        className="w-full h-full flex items-center"
                        style={element.style as React.CSSProperties}
                      >
                        {element.content}
                      </div>
                    )}

                    {/* Selection handles */}
                    {selectedIds.includes(element.id) && !element.locked && (
                      <>
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full cursor-nw-resize" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full cursor-ne-resize" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary rounded-full cursor-sw-resize" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary rounded-full cursor-se-resize" />
                      </>
                    )}
                  </div>
                )
            )}

            {/* Collaborator Cursors */}
            {showCollaborators &&
              collaborators
                .filter((c) => c.isActive)
                .map((collab) => (
                  <div
                    key={collab.id}
                    className="absolute pointer-events-none transition-all duration-100"
                    style={{
                      left: collab.cursorX,
                      top: collab.cursorY,
                      zIndex: 1000,
                    }}
                  >
                    <MousePointer2
                      className="h-4 w-4"
                      style={{ color: collab.color, fill: collab.color }}
                    />
                    <div
                      className="mt-1 px-1.5 py-0.5 rounded text-[10px] text-white whitespace-nowrap"
                      style={{ backgroundColor: collab.color }}
                    >
                      {collab.name}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between p-2 border-t border-neutral-800 bg-neutral-950">
        {/* Left - Time */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <span className="text-xs text-neutral-400 font-mono">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-neutral-600">/</span>
          <span className="text-xs text-neutral-400 font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* Center - Playback */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentTime(0)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentTime(duration)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Right - Volume */}
        <div className="flex items-center gap-2 min-w-[100px] justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : 100]}
            onValueChange={([v]) => setIsMuted(v === 0)}
            max={100}
            step={1}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}

export default UnifiedCanvas;
