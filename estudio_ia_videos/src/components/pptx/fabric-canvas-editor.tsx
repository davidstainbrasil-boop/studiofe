
'use client'

/**
 * 🎨 Fabric.js Canvas Editor - Professional Grade
 * Advanced canvas editing with layers, snap-to-grid, and export
 * Sprint 2 - Production Ready Implementation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@components/ui/button'
import { Slider } from '@components/ui/slider'
import { toast } from 'react-hot-toast'
import { cn } from '@lib/utils'
import { Square, Circle, Type, Image as ImageIcon, Trash2, MousePointer2 } from 'lucide-react'

// Import do novo sistema Fabric singleton
import { FabricManager, useFabric } from '@lib/fabric-singleton'
import type * as Fabric from 'fabric'
import { FlexibleElement } from '../editor/properties-panel'

// Fabric.js reference
let fabric: typeof Fabric | null = null

// Extended Fabric.Object with custom properties
interface ExtendedFabricObject extends Fabric.Object {
  id?: string
  name?: string
}

interface CanvasObject {
  id: string
  type: string
  name: string
  visible: boolean
  locked: boolean
  fabricObject: Fabric.Object
}

// Main Component Props
interface FabricCanvasEditorProps {
  width?: number
  height?: number
  onCanvasUpdate?: (data: Record<string, unknown>) => void
  initialData?: Record<string, unknown>
  projectName?: string
  // Phase 4 - Selection Sync
  onSelectionChange?: (element: FlexibleElement | null) => void
  selectedElement?: FlexibleElement | null
}

export function FabricCanvasEditor({
  width = 800,
  height = 600,
  onCanvasUpdate,
  initialData,
  projectName: _projectName = "Projeto Canvas",
  onSelectionChange,
  selectedElement
}: FabricCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<Fabric.Canvas | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State management
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [canvasObjects, setCanvasObjects] = useState<CanvasObject[]>([])
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])
  const [zoom, setZoom] = useState<number[]>([100])
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize] = useState(20)
  const { fabric: fabricInstance } = useFabric()
  const fabricLoading = false
  const fabricError = null

  // Tools configuration
  const tools = [
    { id: 'select', label: 'Selecionar', icon: MousePointer2 },
    { id: 'rect', label: 'Retângulo', icon: Square },
    { id: 'circle', label: 'Círculo', icon: Circle },
    { id: 'text', label: 'Texto', icon: Type },
    { id: 'image', label: 'Imagem', icon: ImageIcon },
  ]

  // Atualizar referência global quando Fabric carregar
  useEffect(() => {
    if (fabricInstance) {
      fabric = fabricInstance
    }
  }, [fabricInstance])

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!fabricInstance || !canvasRef.current || fabricCanvasRef.current || !fabric) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    fabricCanvasRef.current = canvas

    // Selection events
    canvas.on('selection:created', () => updateObjectsList(canvas))
    canvas.on('selection:updated', () => updateObjectsList(canvas))
    canvas.on('selection:cleared', () => updateObjectsList(canvas))
    canvas.on('object:added', () => updateObjectsList(canvas))
    canvas.on('object:removed', () => updateObjectsList(canvas))

    // Load initial data
    if (initialData) {
      canvas.loadFromJSON(initialData, () => {
        canvas.renderAll()
        updateObjectsList(canvas)
      })
    }

    updateObjectsList(canvas)

    return () => {
      canvas.dispose()
    }
  }, [width, height, initialData, fabricInstance])

  // Phase 4: Bi-directional Sync - Update Fabric object when props change
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !selectedElement) return

    const activeObject = canvas.getActiveObject() as ExtendedFabricObject

    // Only update if we have a selected element and it matches the active object directly
    // or if we find the object by ID (though usually it should be selected)
    if (activeObject && activeObject.id === selectedElement.id) {
      let needsRender = false

      // Helper to update if changed
      const updateIfChanged = (key: keyof Fabric.Object | string, value: any) => {
        // @ts-ignore
        if (activeObject.get(key) !== value && activeObject[key] !== value) {
          // Special handling for some properties
          if (key === 'fill' && typeof value === 'string') {
            activeObject.set('fill', value)
            needsRender = true
          } else if (key === 'text' && 'text' in activeObject) {
            (activeObject as any).set('text', value)
            needsRender = true
          } else {
            // @ts-ignore
            activeObject.set(key, value)
            needsRender = true
          }
        }
      }

      // Sync properties
      // Position & Size
      if (selectedElement.x !== undefined && Math.abs(activeObject.left! - selectedElement.x) > 1) {
        activeObject.set('left', selectedElement.x)
        needsRender = true
      }
      if (selectedElement.y !== undefined && Math.abs(activeObject.top! - selectedElement.y) > 1) {
        activeObject.set('top', selectedElement.y)
        needsRender = true
      }

      // Scaling (approximate from width/height)
      // Note: This is tricky because width/height in Fabric are static, scale changes
      // simplified: we assume width/height in selectedElement includes scale
      if (selectedElement.width !== undefined) {
        const newScaleX = selectedElement.width / (activeObject.width || 1)
        if (Math.abs((activeObject.scaleX || 1) - newScaleX) > 0.01) {
          activeObject.set('scaleX', newScaleX)
          needsRender = true
        }
      }
      if (selectedElement.height !== undefined) {
        const newScaleY = selectedElement.height / (activeObject.height || 1)
        if (Math.abs((activeObject.scaleY || 1) - newScaleY) > 0.01) {
          activeObject.set('scaleY', newScaleY)
          needsRender = true
        }
      }

      // Rotation
      if (selectedElement.rotation !== undefined && Math.abs(activeObject.angle! - selectedElement.rotation) > 1) {
        activeObject.set('angle', selectedElement.rotation)
        needsRender = true
      }

      // Opacity
      if (selectedElement.opacity !== undefined && Math.abs(activeObject.opacity! - selectedElement.opacity) > 0.01) {
        activeObject.set('opacity', selectedElement.opacity)
        needsRender = true
      }

      // Visibility & Lock
      if (selectedElement.visible !== undefined && activeObject.visible !== selectedElement.visible) {
        activeObject.set('visible', selectedElement.visible)
        needsRender = true
      }
      if (selectedElement.locked !== undefined && activeObject.selectable === selectedElement.locked) {
        // Locked means selectable = false
        activeObject.set('selectable', !selectedElement.locked)
        activeObject.set('evented', !selectedElement.locked)
        needsRender = true
      }

      // Content (Text)
      if (selectedElement.content !== undefined && 'text' in activeObject) {
        if ((activeObject as any).text !== selectedElement.content) {
          (activeObject as any).set('text', selectedElement.content)
          needsRender = true
        }
      }

      // Styles
      if (selectedElement.style) {
        if (selectedElement.style.backgroundColor && activeObject.fill !== selectedElement.style.backgroundColor) {
          activeObject.set('fill', selectedElement.style.backgroundColor as string)
          needsRender = true
        }
        if (selectedElement.style.color && (activeObject as any).fill !== selectedElement.style.color) { // For text
          activeObject.set('fill', selectedElement.style.color as string)
          needsRender = true
        }
        if (selectedElement.style.borderWidth !== undefined && activeObject.strokeWidth !== selectedElement.style.borderWidth) {
          activeObject.set('strokeWidth', Number(selectedElement.style.borderWidth))
          needsRender = true
        }
        if (selectedElement.style.borderColor && activeObject.stroke !== selectedElement.style.borderColor) {
          activeObject.set('stroke', selectedElement.style.borderColor as string)
          needsRender = true
        }

        // Font styles
        if (selectedElement.style.fontSize !== undefined && (activeObject as any).fontSize !== selectedElement.style.fontSize) {
          (activeObject as any).set('fontSize', Number(selectedElement.style.fontSize))
          needsRender = true
        }
        if (selectedElement.style.fontWeight !== undefined && (activeObject as any).fontWeight !== selectedElement.style.fontWeight) {
          (activeObject as any).set('fontWeight', selectedElement.style.fontWeight)
          needsRender = true
        }
        if (selectedElement.style.fontStyle !== undefined && (activeObject as any).fontStyle !== selectedElement.style.fontStyle) {
          (activeObject as any).set('fontStyle', selectedElement.style.fontStyle)
          needsRender = true
        }
        if (selectedElement.style.textDecoration !== undefined) {
          const isUnderline = selectedElement.style.textDecoration === 'underline';
          if ((activeObject as any).underline !== isUnderline) {
            (activeObject as any).set('underline', isUnderline)
            needsRender = true
          }
        }
        if (selectedElement.style.textAlign !== undefined && (activeObject as any).textAlign !== selectedElement.style.textAlign) {
          (activeObject as any).set('textAlign', selectedElement.style.textAlign)
          needsRender = true
        }
      }

      if (needsRender) {
        canvas.renderAll()
        // We do NOT call updateObjectsList here to avoid circular updates 
        // because updateObjectsList triggers onSelectionChange which updates selectedElement
      }
    }
  }, [selectedElement])

  // Update objects list
  const updateObjectsList = (canvas: Fabric.Canvas) => {
    const objects = canvas.getObjects().map((obj: Fabric.Object, index: number) => {
      const extObj = obj as ExtendedFabricObject
      return {
        id: extObj.id || `object-${index}`,
        type: obj.type || 'unknown',
        name: extObj.name || `${obj.type || 'Object'} ${index + 1}`,
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        fabricObject: obj
      }
    })
    setCanvasObjects(objects)

    // Phase 4 - Selection Sync
    if (onSelectionChange) {
      const activeObject = canvas.getActiveObject() as ExtendedFabricObject
      if (activeObject) {
        onSelectionChange({
          id: activeObject.id || 'unknown',
          name: activeObject.name || activeObject.type || 'Element',
          type: activeObject.type || 'object',
          x: activeObject.left,
          y: activeObject.top,
          width: activeObject.width! * (activeObject.scaleX || 1),
          height: activeObject.height! * (activeObject.scaleY || 1),
          rotation: activeObject.angle,
          opacity: activeObject.opacity,
          visible: activeObject.visible,
          locked: !activeObject.selectable,
          style: {
            backgroundColor: activeObject.fill as string,
            borderColor: activeObject.stroke as string,
            borderWidth: activeObject.strokeWidth,
            color: (activeObject as any).fill as string,
            fontSize: (activeObject as any).fontSize,
            fontFamily: (activeObject as any).fontFamily,
            fontWeight: (activeObject as any).fontWeight
          },
          content: (activeObject as any).text
        })
      } else {
        onSelectionChange(null)
      }
    }

    if (onCanvasUpdate) {
      onCanvasUpdate(canvas.toJSON())
    }
  }

  // Tool functions
  const addRectangle = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric) return

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      // @ts-ignore
      id: `rect-${Date.now()}`
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    updateObjectsList(canvas)
    toast.success('Retângulo adicionado!')
  }

  const addCircle = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric) return

    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      radius: 50,
      fill: '#10b981',
      stroke: '#059669',
      strokeWidth: 2,
      // @ts-ignore
      id: `circle-${Date.now()}`
    })

    canvas.add(circle)
    canvas.setActiveObject(circle)
    updateObjectsList(canvas)
    toast.success('Círculo adicionado!')
  }

  const addText = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !fabric) return

    const text = new fabric.Text('Novo Texto', {
      left: 200,
      top: 200,
      fontSize: 24,
      fill: '#1f2937',
      fontFamily: 'Arial',
      // @ts-ignore
      id: `text-${Date.now()}`
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    updateObjectsList(canvas)
    toast.success('Texto adicionado!')
  }

  const addImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !fabricCanvasRef.current || !fabric) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string
      fabric!.Image.fromURL(imgUrl).then((img: Fabric.Image) => {
        const canvas = fabricCanvasRef.current!

        // Scale image to fit canvas
        const maxWidth = (canvas.width || 800) * 0.5
        const maxHeight = (canvas.height || 600) * 0.5
        const scale = Math.min(maxWidth / (img.width || 1), maxHeight / (img.height || 1))

        img.set({
          left: 100,
          top: 100,
          scaleX: scale,
          scaleY: scale,
          // @ts-ignore
          id: `image-${Date.now()}`
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        updateObjectsList(canvas)
        toast.success('Imagem adicionada!')
      })
    }
    reader.readAsDataURL(file)
  }

  // Object manipulation
  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length > 0) {
      canvas.remove(...activeObjects)
      canvas.discardActiveObject()
      updateObjectsList(canvas)
      toast.success(`${activeObjects.length} objeto(s) removido(s)`)
    }
  }

  // Layer management
  const toggleObjectVisibility = (objectId: string) => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const obj = canvas.getObjects().find((o: Fabric.Object) => {
      const extObj = o as ExtendedFabricObject
      return extObj.id === objectId
    })
    if (obj) {
      obj.visible = !obj.visible
      canvas.renderAll()
      updateObjectsList(canvas)
    }
  }

  const toggleObjectLock = (objectId: string) => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const obj = canvas.getObjects().find((o: Fabric.Object) => {
      const extObj = o as ExtendedFabricObject
      return extObj.id === objectId
    })
    if (obj) {
      obj.selectable = !obj.selectable
      obj.evented = obj.selectable
      canvas.renderAll()
      updateObjectsList(canvas)
    }
  }

  // Zoom functions
  const handleZoomChange = (value: number[]) => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const zoomLevel = value[0] / 100
    setZoom(value)
    canvas.setZoom(zoomLevel)
    canvas.renderAll()
  }

  // Export functions
  const exportCanvas = (format: 'png' | 'jpg' | 'json') => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    switch (format) {
      case 'png':
        const pngUrl = canvas.toDataURL({ multiplier: 1, format: 'png', quality: 1 })
        downloadFile(pngUrl, `${projectName}.png`)
        break
      case 'jpg':
        const jpgUrl = canvas.toDataURL({ multiplier: 1, format: 'jpeg', quality: 0.9 })
        downloadFile(jpgUrl, `${projectName}.jpg`)
        break
      case 'json':
        const jsonData = JSON.stringify(canvas.toJSON(), null, 2)
        downloadFile(`data:application/json;charset=utf-8,${encodeURIComponent(jsonData)}`, `${projectName}.json`)
        break
    }
  }

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    toast.success(`${filename} exportado com sucesso!`)
  }

  // Handle tool selection
  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId)

    switch (toolId) {
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
        addImage()
        break
    }
  }

  // Loading state
  if (fabricLoading || !fabricInstance) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold">Carregando Canvas Editor...</h2>
          <p className="text-muted-foreground">Inicializando Fabric.js</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-[#0f1115] relative overflow-hidden">

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#1c1f26] border border-white/5 p-1 rounded-xl shadow-2xl flex items-center gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleToolSelect(tool.id)}
              className={cn(
                "h-9 w-9 p-0 rounded-lg",
                selectedTool === tool.id ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
              title={tool.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
        <div className="w-px h-6 bg-white/10 mx-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={deleteSelected}
          disabled={selectedObjects.length === 0}
          className="h-9 w-9 p-0 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#1c1f26] border border-white/5 p-2 rounded-xl shadow-2xl flex items-center gap-2">
        <span className="text-xs text-gray-500 font-mono px-2">{Math.round(zoom[0])}%</span>
        <Slider
          value={zoom}
          onValueChange={handleZoomChange}
          min={10}
          max={500}
          step={10}
          className="w-24"
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Toolbar */}
        {/* Top Toolbar - HIDDEN in new layout (moved to floating) */}
        {/* <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4"> */}

        {/* Canvas Container */}
        {/* Canvas Container */}
        <div className="flex-1 overflow-auto bg-[#0f1115] p-8 relative flex items-center justify-center">
          <div className="flex justify-center">
            <div className="relative bg-white shadow-lg">
              <canvas
                ref={canvasRef}
                className="border border-white/5"
              />

              {/* Grid overlay when enabled */}
              {snapToGrid && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize}px ${gridSize}px`
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  )
}
