'use client'

/**
 * Scene Canvas Editor - Editable Scene/Slide System
 *
 * Features:
 * - Drag-and-drop elements within canvas
 * - Drop zone for external media (photos, videos, avatars)
 * - Auto-fit and auto-load scenes
 * - Real-time preview
 * - Selection sync with timeline
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Button } from '@components/ui/button'
import { toast } from 'react-hot-toast'
import { cn } from '@lib/utils'
import {
  Square, Circle, Type, Image as ImageIcon,
  Trash2, MousePointer2, Video, User,
  Upload, ZoomIn, ZoomOut, RotateCcw,
  Move, Grid3X3, Magnet, Layers,
  Plus, Copy, Lock, Unlock, Eye, EyeOff
} from 'lucide-react'
import { FabricManager, useFabric } from '@lib/fabric-singleton'
import type * as Fabric from 'fabric'
import { FlexibleElement } from '../editor/properties-panel'
import { Slider } from '@components/ui/slider'
import { Badge } from '@components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@components/ui/tooltip'

let fabric: typeof Fabric | null = null

// Extended Fabric Object with custom properties
interface ExtendedFabricObject extends Fabric.Object {
  id?: string
  name?: string
  elementType?: 'image' | 'video' | 'avatar' | 'text' | 'shape'
  sourceUrl?: string
}

// Scene Element for the editor
export interface SceneElement {
  id: string
  type: 'image' | 'video' | 'avatar' | 'text' | 'shape'
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  zIndex: number
  sourceUrl?: string
  content?: string
  style?: Record<string, unknown>
}

// Scene data structure
export interface SceneData {
  id: string
  name: string
  duration: number
  backgroundColor: string
  backgroundImage?: string
  elements: SceneElement[]
  thumbnail?: string
}

interface SceneCanvasEditorProps {
  width?: number
  height?: number
  sceneData?: SceneData
  onSceneUpdate?: (scene: SceneData) => void
  onSelectionChange?: (element: FlexibleElement | null) => void
  selectedElement?: FlexibleElement | null
  readOnly?: boolean
}

// Drop indicator component
const DropIndicator: React.FC<{
  active: boolean
  type: 'media' | 'element'
}> = ({ active, type }) => {
  if (!active) return null

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      <div className={cn(
        "absolute inset-4 border-2 border-dashed rounded-xl transition-all duration-300",
        type === 'media'
          ? "border-blue-400 bg-blue-400/10"
          : "border-green-400 bg-green-400/10"
      )}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "px-6 py-3 rounded-lg text-white text-sm font-medium",
            type === 'media' ? "bg-blue-500/90" : "bg-green-500/90"
          )}>
            {type === 'media'
              ? "Solte para adicionar ao canvas"
              : "Solte para reposicionar"}
          </div>
        </div>
      </div>
    </div>
  )
}

// Floating toolbar for canvas
const CanvasToolbar: React.FC<{
  selectedTool: string
  onToolSelect: (tool: string) => void
  onDelete: () => void
  hasSelection: boolean
  onDuplicate: () => void
  onBringForward: () => void
  onSendBackward: () => void
}> = ({
  selectedTool,
  onToolSelect,
  onDelete,
  hasSelection,
  onDuplicate,
  onBringForward,
  onSendBackward
}) => {
  const tools = [
    { id: 'select', label: 'Selecionar', icon: MousePointer2 },
    { id: 'rect', label: 'Retangulo', icon: Square },
    { id: 'circle', label: 'Circulo', icon: Circle },
    { id: 'text', label: 'Texto', icon: Type },
  ]

  return (
    <TooltipProvider delayDuration={100}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#1c1f26] border border-white/10 p-1.5 rounded-xl shadow-2xl">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTool === tool.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onToolSelect(tool.id)}
                  className={cn(
                    "h-9 w-9 p-0 rounded-lg transition-all",
                    selectedTool === tool.id
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Add Media Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-xs">Adicionar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="bg-[#1c1f26] border-white/10">
            <DropdownMenuItem onClick={() => onToolSelect('image')} className="text-white hover:bg-white/10">
              <ImageIcon className="h-4 w-4 mr-2" />
              Imagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToolSelect('video')} className="text-white hover:bg-white/10">
              <Video className="h-4 w-4 mr-2" />
              Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToolSelect('avatar')} className="text-white hover:bg-white/10">
              <User className="h-4 w-4 mr-2" />
              Avatar IA
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => onToolSelect('text')} className="text-white hover:bg-white/10">
              <Type className="h-4 w-4 mr-2" />
              Texto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Selection Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicate}
              disabled={!hasSelection}
              className="h-9 w-9 p-0 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Duplicar (Ctrl+D)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={!hasSelection}
              className="h-9 w-9 p-0 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Excluir (Del)</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Layer Controls */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasSelection}
              className="h-9 w-9 p-0 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1c1f26] border-white/10">
            <DropdownMenuItem onClick={onBringForward} className="text-white hover:bg-white/10">
              Trazer para frente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSendBackward} className="text-white hover:bg-white/10">
              Enviar para tras
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}

export function SceneCanvasEditor({
  width = 1280,
  height = 720,
  sceneData,
  onSceneUpdate,
  onSelectionChange,
  selectedElement,
  readOnly = false
}: SceneCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<Fabric.Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // State
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [zoom, setZoom] = useState<number>(100)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [gridSize] = useState(20)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropType, setDropType] = useState<'media' | 'element'>('media')
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])
  const [canvasScale, setCanvasScale] = useState(1)

  const { fabric: fabricInstance } = useFabric()

  // Update fabric reference when loaded
  useEffect(() => {
    if (fabricInstance) {
      fabric = fabricInstance
    }
  }, [fabricInstance])

  // Calculate canvas scale to fit container
  const calculateScale = useCallback(() => {
    if (!containerRef.current) return 1

    const containerWidth = containerRef.current.clientWidth - 32
    const containerHeight = containerRef.current.clientHeight - 32

    const scaleX = containerWidth / width
    const scaleY = containerHeight / height

    return Math.min(scaleX, scaleY, 1) * (zoom / 100)
  }, [width, height, zoom])

  // Resize observer for auto-fit
  useEffect(() => {
    const updateScale = () => {
      const newScale = calculateScale()
      setCanvasScale(newScale)
    }

    updateScale()

    const resizeObserver = new ResizeObserver(updateScale)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [calculateScale])

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!fabricInstance || !canvasRef.current || fabricCanvasRef.current || !fabric) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: sceneData?.backgroundColor || '#ffffff',
      selection: !readOnly,
      preserveObjectStacking: true,
      controlsAboveOverlay: true,
    })

    fabricCanvasRef.current = canvas

    // Setup event handlers
    setupCanvasEvents(canvas)

    // Load scene data if available
    if (sceneData) {
      loadSceneData(canvas, sceneData)
    }

    return () => {
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [fabricInstance, width, height, readOnly])

  // Load scene data when it changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !sceneData) return

    loadSceneData(canvas, sceneData)
  }, [sceneData?.id])

  // Setup canvas event handlers
  const setupCanvasEvents = (canvas: Fabric.Canvas) => {
    // Selection events
    canvas.on('selection:created', () => handleSelectionUpdate(canvas))
    canvas.on('selection:updated', () => handleSelectionUpdate(canvas))
    canvas.on('selection:cleared', () => {
      setSelectedObjectIds([])
      onSelectionChange?.(null)
    })

    // Object modification events
    canvas.on('object:modified', () => emitSceneUpdate(canvas))
    canvas.on('object:added', () => emitSceneUpdate(canvas))
    canvas.on('object:removed', () => emitSceneUpdate(canvas))

    // Moving with snap-to-grid
    canvas.on('object:moving', (e) => {
      if (!snapToGrid || !e.target) return

      const obj = e.target
      obj.set({
        left: Math.round((obj.left || 0) / gridSize) * gridSize,
        top: Math.round((obj.top || 0) / gridSize) * gridSize
      })
    })
  }

  // Handle selection update
  const handleSelectionUpdate = (canvas: Fabric.Canvas) => {
    const activeObjects = canvas.getActiveObjects()
    const ids = activeObjects.map((obj) => {
      const extObj = obj as ExtendedFabricObject
      return extObj.id || 'unknown'
    })
    setSelectedObjectIds(ids)

    // Emit selection to parent
    if (activeObjects.length === 1 && onSelectionChange) {
      const obj = activeObjects[0] as ExtendedFabricObject
      onSelectionChange(fabricObjectToFlexible(obj))
    } else if (activeObjects.length === 0 && onSelectionChange) {
      onSelectionChange(null)
    }
  }

  // Convert Fabric object to FlexibleElement
  const fabricObjectToFlexible = (obj: ExtendedFabricObject): FlexibleElement => {
    return {
      id: obj.id || 'unknown',
      name: obj.name || obj.type || 'Element',
      type: obj.elementType || obj.type || 'shape',
      x: obj.left,
      y: obj.top,
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1),
      rotation: obj.angle,
      opacity: obj.opacity,
      visible: obj.visible,
      locked: !obj.selectable,
      content: (obj as any).text,
      src: obj.sourceUrl,
      style: {
        backgroundColor: obj.fill as string,
        borderColor: obj.stroke as string,
        borderWidth: obj.strokeWidth,
      }
    }
  }

  // Load scene data into canvas
  const loadSceneData = async (canvas: Fabric.Canvas, scene: SceneData) => {
    if (!fabric) return

    // Clear existing objects
    canvas.clear()
    canvas.backgroundColor = scene.backgroundColor || '#ffffff'

    // Load background image if exists
    if (scene.backgroundImage) {
      try {
        const img = await fabric.Image.fromURL(scene.backgroundImage)
        img.set({
          scaleX: width / (img.width || 1),
          scaleY: height / (img.height || 1),
          selectable: false,
          evented: false,
        })
        canvas.backgroundImage = img
        canvas.renderAll()
      } catch (error) {
        console.error('Failed to load background image:', error)
      }
    }

    // Add elements
    for (const element of scene.elements.sort((a, b) => a.zIndex - b.zIndex)) {
      await addElementToCanvas(canvas, element)
    }

    canvas.renderAll()
  }

  // Add element to canvas
  const addElementToCanvas = async (canvas: Fabric.Canvas, element: SceneElement) => {
    if (!fabric) return

    let fabricObj: Fabric.Object | null = null

    switch (element.type) {
      case 'image':
        if (element.sourceUrl) {
          try {
            fabricObj = await fabric.Image.fromURL(element.sourceUrl)
            ;(fabricObj as Fabric.Image).set({
              scaleX: element.width / (fabricObj.width || 1),
              scaleY: element.height / (fabricObj.height || 1),
            })
          } catch (e) {
            console.error('Failed to load image:', e)
            return
          }
        }
        break

      case 'video':
        // Video placeholder (Fabric doesn't support video directly, use image placeholder)
        fabricObj = new fabric.Rect({
          width: element.width,
          height: element.height,
          fill: '#1a1a2e',
          stroke: '#4361ee',
          strokeWidth: 2,
        })
        break

      case 'avatar':
        // Avatar placeholder
        fabricObj = new fabric.Circle({
          radius: Math.min(element.width, element.height) / 2,
          fill: '#6b5b95',
          stroke: '#8d7fc1',
          strokeWidth: 3,
        })
        break

      case 'text':
        fabricObj = new fabric.IText(element.content || 'Texto', {
          fontSize: element.style?.fontSize as number || 24,
          fill: element.style?.color as string || '#ffffff',
          fontFamily: element.style?.fontFamily as string || 'Arial',
          fontWeight: element.style?.fontWeight as string || 'normal',
        })
        break

      case 'shape':
        fabricObj = new fabric.Rect({
          width: element.width,
          height: element.height,
          fill: element.style?.backgroundColor as string || '#3b82f6',
          stroke: element.style?.borderColor as string || '#1e40af',
          strokeWidth: element.style?.borderWidth as number || 2,
          rx: element.style?.borderRadius as number || 0,
          ry: element.style?.borderRadius as number || 0,
        })
        break
    }

    if (fabricObj) {
      fabricObj.set({
        left: element.x,
        top: element.y,
        angle: element.rotation,
        opacity: element.opacity,
        visible: element.visible,
        selectable: !element.locked && !readOnly,
        evented: !element.locked && !readOnly,
      })

      // Store custom properties
      const extObj = fabricObj as ExtendedFabricObject
      extObj.id = element.id
      extObj.name = element.name
      extObj.elementType = element.type
      extObj.sourceUrl = element.sourceUrl

      canvas.add(fabricObj)
    }
  }

  // Emit scene update to parent
  const emitSceneUpdate = (canvas: Fabric.Canvas) => {
    if (!onSceneUpdate || !sceneData) return

    const elements: SceneElement[] = canvas.getObjects().map((obj, index) => {
      const extObj = obj as ExtendedFabricObject
      return {
        id: extObj.id || `element-${index}`,
        type: extObj.elementType || 'shape',
        name: extObj.name || `Element ${index + 1}`,
        x: obj.left || 0,
        y: obj.top || 0,
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
        rotation: obj.angle || 0,
        opacity: obj.opacity || 1,
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        zIndex: index,
        sourceUrl: extObj.sourceUrl,
        content: (obj as any).text,
        style: {
          backgroundColor: obj.fill,
          borderColor: obj.stroke,
          borderWidth: obj.strokeWidth,
        }
      }
    })

    onSceneUpdate({
      ...sceneData,
      elements
    })
  }

  // Tool handlers
  const handleToolSelect = useCallback((toolId: string) => {
    setSelectedTool(toolId)

    switch (toolId) {
      case 'select':
        // Default selection mode
        break
      case 'rect':
        addRectangle()
        break
      case 'circle':
        addCircle()
        break
      case 'text':
        addText()
        break
      case 'image':
        fileInputRef.current?.click()
        break
      case 'video':
        videoInputRef.current?.click()
        break
      case 'avatar':
        addAvatarPlaceholder()
        break
    }

    // Reset to select after adding
    if (toolId !== 'select') {
      setTimeout(() => setSelectedTool('select'), 100)
    }
  }, [])

  // Add rectangle
  const addRectangle = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric) return

    const rect = new fabric.Rect({
      left: width / 2 - 100,
      top: height / 2 - 50,
      width: 200,
      height: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      rx: 8,
      ry: 8,
    }) as ExtendedFabricObject

    rect.id = `rect-${Date.now()}`
    rect.name = 'Retangulo'
    rect.elementType = 'shape'

    canvas.add(rect)
    canvas.setActiveObject(rect)
    toast.success('Retangulo adicionado!')
  }

  // Add circle
  const addCircle = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric) return

    const circle = new fabric.Circle({
      left: width / 2 - 50,
      top: height / 2 - 50,
      radius: 50,
      fill: '#10b981',
      stroke: '#059669',
      strokeWidth: 2,
    }) as ExtendedFabricObject

    circle.id = `circle-${Date.now()}`
    circle.name = 'Circulo'
    circle.elementType = 'shape'

    canvas.add(circle)
    canvas.setActiveObject(circle)
    toast.success('Circulo adicionado!')
  }

  // Add text
  const addText = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric) return

    const text = new fabric.IText('Clique para editar', {
      left: width / 2 - 100,
      top: height / 2 - 20,
      fontSize: 32,
      fill: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
    }) as unknown as ExtendedFabricObject

    text.id = `text-${Date.now()}`
    text.name = 'Texto'
    text.elementType = 'text'

    canvas.add(text as unknown as Fabric.Object)
    canvas.setActiveObject(text as unknown as Fabric.Object)
    toast.success('Texto adicionado!')
  }

  // Add avatar placeholder
  const addAvatarPlaceholder = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric) return

    // Create avatar group
    const avatarSize = 150
    const circle = new fabric.Circle({
      radius: avatarSize / 2,
      fill: '#6b5b95',
      stroke: '#8d7fc1',
      strokeWidth: 4,
      originX: 'center',
      originY: 'center',
    })

    const icon = new fabric.Text('AI', {
      fontSize: 48,
      fill: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '700',
      originX: 'center',
      originY: 'center',
    })

    const group = new fabric.Group([circle, icon], {
      left: width / 2 - avatarSize / 2,
      top: height / 2 - avatarSize / 2,
    }) as ExtendedFabricObject

    group.id = `avatar-${Date.now()}`
    group.name = 'Avatar IA'
    group.elementType = 'avatar'

    canvas.add(group)
    canvas.setActiveObject(group)
    toast.success('Avatar adicionado! Configure a voz no painel lateral.')
  }

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !fabricCanvasRef.current || !fabric) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const imgUrl = e.target?.result as string
      try {
        const img = await fabric!.Image.fromURL(imgUrl)
        const canvas = fabricCanvasRef.current!

        // Scale image to fit canvas
        const maxWidth = width * 0.6
        const maxHeight = height * 0.6
        const scale = Math.min(maxWidth / (img.width || 1), maxHeight / (img.height || 1))

        const extImg = img as ExtendedFabricObject
        extImg.set({
          left: width / 2 - ((img.width || 0) * scale) / 2,
          top: height / 2 - ((img.height || 0) * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        })
        extImg.id = `image-${Date.now()}`
        extImg.name = file.name.split('.')[0] || 'Imagem'
        extImg.elementType = 'image'
        extImg.sourceUrl = imgUrl

        canvas.add(img)
        canvas.setActiveObject(img)
        toast.success('Imagem adicionada!')
      } catch (error) {
        toast.error('Erro ao carregar imagem')
      }
    }
    reader.readAsDataURL(file)
    event.target.value = '' // Reset input
  }

  // Handle video upload (placeholder)
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !fabricCanvasRef.current || !fabric) return

    // For now, create a placeholder rect for video
    const canvas = fabricCanvasRef.current
    const videoPlaceholder = new fabric.Rect({
      left: width / 2 - 160,
      top: height / 2 - 90,
      width: 320,
      height: 180,
      fill: '#1a1a2e',
      stroke: '#4361ee',
      strokeWidth: 3,
      rx: 8,
      ry: 8,
    }) as ExtendedFabricObject

    videoPlaceholder.id = `video-${Date.now()}`
    videoPlaceholder.name = file.name.split('.')[0] || 'Video'
    videoPlaceholder.elementType = 'video'
    videoPlaceholder.sourceUrl = URL.createObjectURL(file)

    canvas.add(videoPlaceholder)
    canvas.setActiveObject(videoPlaceholder)
    toast.success('Video adicionado! Preview disponivel na exportacao.')
    event.target.value = ''
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)

    // Detect drop type
    const types = e.dataTransfer.types
    if (types.includes('Files')) {
      setDropType('media')
    } else {
      setDropType('element')
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if leaving the container (not entering a child)
    if (e.currentTarget === e.target) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric || readOnly) return

    // Get drop position relative to canvas
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const dropX = (e.clientX - rect.left) / canvasScale
    const dropY = (e.clientY - rect.top) / canvasScale

    // Handle file drops
    const files = e.dataTransfer.files
    if (files.length > 0) {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = async (ev) => {
            const imgUrl = ev.target?.result as string
            try {
              const img = await fabric!.Image.fromURL(imgUrl)
              const maxSize = 300
              const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1))

              const extImg = img as ExtendedFabricObject
              extImg.set({
                left: dropX - ((img.width || 0) * scale) / 2,
                top: dropY - ((img.height || 0) * scale) / 2,
                scaleX: scale,
                scaleY: scale,
              })
              extImg.id = `image-${Date.now()}`
              extImg.name = file.name.split('.')[0] || 'Imagem'
              extImg.elementType = 'image'
              extImg.sourceUrl = imgUrl

              canvas.add(img)
              canvas.setActiveObject(img)
              toast.success(`${file.name} adicionado!`)
            } catch (error) {
              toast.error(`Erro ao carregar ${file.name}`)
            }
          }
          reader.readAsDataURL(file)
        } else if (file.type.startsWith('video/')) {
          // Video placeholder
          const videoPlaceholder = new fabric.Rect({
            left: dropX - 160,
            top: dropY - 90,
            width: 320,
            height: 180,
            fill: '#1a1a2e',
            stroke: '#4361ee',
            strokeWidth: 3,
            rx: 8,
            ry: 8,
          }) as ExtendedFabricObject

          videoPlaceholder.id = `video-${Date.now()}`
          videoPlaceholder.name = file.name.split('.')[0] || 'Video'
          videoPlaceholder.elementType = 'video'
          videoPlaceholder.sourceUrl = URL.createObjectURL(file)

          canvas.add(videoPlaceholder)
          canvas.setActiveObject(videoPlaceholder)
          toast.success(`${file.name} adicionado!`)
        }
      }
      return
    }

    // Handle text/data drops (from sidebar or external)
    const textData = e.dataTransfer.getData('text/plain')
    const jsonData = e.dataTransfer.getData('application/json')

    if (jsonData) {
      try {
        const data = JSON.parse(jsonData)
        if (data.type === 'media-library-item') {
          // Handle media library item drop
          if (data.mediaType === 'image' && data.url) {
            const img = await fabric.Image.fromURL(data.url)
            const maxSize = 300
            const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1))

            const extImg = img as ExtendedFabricObject
            extImg.set({
              left: dropX - ((img.width || 0) * scale) / 2,
              top: dropY - ((img.height || 0) * scale) / 2,
              scaleX: scale,
              scaleY: scale,
            })
            extImg.id = `image-${Date.now()}`
            extImg.name = data.name || 'Imagem'
            extImg.elementType = 'image'
            extImg.sourceUrl = data.url

            canvas.add(img)
            canvas.setActiveObject(img)
            toast.success('Midia adicionada!')
          }
        }
      } catch (err) {
        // Invalid JSON, ignore
      }
    }
  }, [canvasScale, readOnly, width, height])

  // Delete selected objects
  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length > 0) {
      canvas.remove(...activeObjects)
      canvas.discardActiveObject()
      toast.success(`${activeObjects.length} elemento(s) removido(s)`)
    }
  }, [])

  // Duplicate selected objects
  const duplicateSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    activeObject.clone().then((cloned: Fabric.Object) => {
      canvas.discardActiveObject()
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        evented: true,
      })

      const extCloned = cloned as ExtendedFabricObject
      extCloned.id = `${extCloned.elementType || 'element'}-${Date.now()}`

      if (cloned instanceof fabric!.ActiveSelection) {
        cloned.canvas = canvas
        cloned.forEachObject((obj: Fabric.Object) => {
          canvas.add(obj)
        })
        cloned.setCoords()
      } else {
        canvas.add(cloned)
      }
      canvas.setActiveObject(cloned)
      toast.success('Elemento duplicado!')
    })
  }, [])

  // Bring forward
  const bringForward = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.bringObjectForward(activeObject)
      toast.success('Elemento movido para frente')
    }
  }, [])

  // Send backward
  const sendBackward = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.sendObjectBackwards(activeObject)
      toast.success('Elemento movido para tras')
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (readOnly) return

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          deleteSelected()
          break
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            duplicateSelected()
          }
          break
        case 'Escape':
          fabricCanvasRef.current?.discardActiveObject()
          fabricCanvasRef.current?.renderAll()
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [deleteSelected, duplicateSelected, readOnly])

  // Sync from parent selection
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !selectedElement?.id) return

    const obj = canvas.getObjects().find((o) => {
      const extObj = o as ExtendedFabricObject
      return extObj.id === selectedElement.id
    })

    if (obj && canvas.getActiveObject() !== obj) {
      canvas.setActiveObject(obj)
      canvas.renderAll()
    }
  }, [selectedElement?.id])

  // Loading state
  if (!fabricInstance) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0f1115]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-400">Carregando editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[#0f1115] overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      {!readOnly && (
        <CanvasToolbar
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          onDelete={deleteSelected}
          hasSelection={selectedObjectIds.length > 0}
          onDuplicate={duplicateSelected}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
        />
      )}

      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="relative bg-white shadow-2xl rounded-lg overflow-hidden"
          style={{
            transform: `scale(${canvasScale})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas ref={canvasRef} />

          {/* Grid overlay */}
          {snapToGrid && !readOnly && (
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #6366f1 1px, transparent 1px),
                  linear-gradient(to bottom, #6366f1 1px, transparent 1px)
                `,
                backgroundSize: `${gridSize}px ${gridSize}px`
              }}
            />
          )}
        </div>
      </div>

      {/* Drop Indicator */}
      <DropIndicator active={isDragOver && !readOnly} type={dropType} />

      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#1c1f26] border border-white/10 p-2 rounded-xl shadow-2xl flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom(Math.max(25, zoom - 25))}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-gray-400 font-mono w-12 text-center">{zoom}%</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom(Math.min(200, zoom + 25))}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom(100)}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Snap to Grid Toggle */}
      {!readOnly && (
        <div className="absolute bottom-4 right-4 z-20 bg-[#1c1f26] border border-white/10 p-2 rounded-xl shadow-2xl flex items-center gap-2">
          <Button
            variant={snapToGrid ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={cn(
              "h-8 px-3 rounded-lg text-xs",
              snapToGrid
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "text-gray-400 hover:text-white"
            )}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
    </div>
  )
}

export default SceneCanvasEditor
