'use client'

/**
 * Professional Studio - Página Principal
 * Editor profissional e intuitivo com Timeline multicamada
 * Integra todos os componentes: Avatar Library, Properties Panel, Asset Library, etc.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@components/ui/button'
import { Separator } from '@components/ui/separator'
import { ScrollArea } from '@components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@components/ui/resizable'
import {
  Play, Pause, Square, Save, Download, Upload, Settings,
  Layers, User, Image, Music, Type, Sparkles, Eye,
  Layout, Maximize, Minimize, ChevronLeft, ChevronRight,
  Home, FileVideo, Folder, Clock, Zap
} from 'lucide-react'
import { cn } from '@lib/utils'
import { toast } from 'sonner'

// Components
import { ProfessionalStudioTimeline } from '@components/studio-unified/ProfessionalStudioTimeline'
import { AvatarLibraryPanel } from '@components/studio-unified/AvatarLibraryPanel'
import { PropertiesPanel, ElementProperties } from '@components/studio-unified/PropertiesPanel'
import { InteractiveCanvas, CanvasElement, CanvasScene } from '@components/studio-unified/InteractiveCanvas'

// ============================================================================
// TYPES
// ============================================================================

export type StudioTab = 'avatars' | 'media' | 'text' | 'music' | 'effects'

export interface Project {
  id: string
  name: string
  duration: number
  scenes: any[]
  settings: any
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StudioProPage() {
  // State
  const [project, setProject] = useState<Project | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedElement, setSelectedElement] = useState<ElementProperties | null>(null)
  const [activeTab, setActiveTab] = useState<StudioTab>('avatars')
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  // Canvas State
  const [canvasScene, setCanvasScene] = useState<CanvasScene>({
    id: 'default',
    name: 'Default Scene',
    elements: [],
    backgroundColor: '#1a1a1a',
    width: 1920,
    height: 1080
  })
  const [selectedCanvasElementId, setSelectedCanvasElementId] = useState<string | null>(null)

  // Handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(!isPlaying)
    toast.success(isPlaying ? 'Paused' : 'Playing')
  }, [isPlaying])

  const handleSave = useCallback(async () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: 'Saving project...',
        success: 'Project saved successfully',
        error: 'Failed to save project'
      }
    )
  }, [])

  const handleExport = useCallback(async () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Exporting video...',
        success: 'Video exported successfully',
        error: 'Failed to export video'
      }
    )
  }, [])

  const handleSelectAvatar = useCallback((avatar: any) => {
    // Add avatar to canvas
    const newElement: CanvasElement = {
      id: `avatar-${Date.now()}`,
      type: 'avatar',
      name: avatar.name,
      x: 960 - 200, // Center horizontally (1920/2 - width/2)
      y: 540 - 300, // Center vertically (1080/2 - height/2)
      width: 400,
      height: 600,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      src: avatar.thumbnailUrl,
      locked: false,
      visible: true,
      draggable: true,
      zIndex: 20
    }

    setCanvasScene(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))

    toast.success(`Avatar "${avatar.name}" added to scene`)
  }, [])

  const handleUpdateElement = useCallback((updates: Partial<ElementProperties>) => {
    if (!selectedElement) return
    setSelectedElement({ ...selectedElement, ...updates })
  }, [selectedElement])

  // Canvas Handlers
  const handleSelectCanvasElement = useCallback((id: string | null) => {
    setSelectedCanvasElementId(id)
    // TODO: Sync with PropertiesPanel
  }, [])

  const handleUpdateCanvasElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setCanvasScene(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      )
    }))
  }, [])

  const handleDeleteCanvasElement = useCallback((id: string) => {
    setCanvasScene(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }))
    setSelectedCanvasElementId(null)
  }, [])

  const handleAddCanvasElement = useCallback((element: Omit<CanvasElement, 'id'>) => {
    const newElement: CanvasElement = {
      ...element,
      id: `element-${Date.now()}`
    }

    setCanvasScene(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h1 className="text-lg font-bold">Studio Pro</h1>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {project?.name || 'Untitled Project'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="default" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Asset Library */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible
          collapsedSize={0}
          onCollapse={() => setLeftPanelCollapsed(true)}
          onExpand={() => setLeftPanelCollapsed(false)}
        >
          <div className="h-full flex flex-col bg-muted/30">
            {/* Panel Header */}
            <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
              <h2 className="text-sm font-semibold">Assets</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLeftPanelCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StudioTab)} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-5 m-2">
                <TabsTrigger value="avatars" className="text-xs">
                  <User className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="media" className="text-xs">
                  <Image className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <Type className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="music" className="text-xs">
                  <Music className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="effects" className="text-xs">
                  <Zap className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="avatars" className="flex-1 m-0">
                <AvatarLibraryPanel
                  onSelectAvatar={handleSelectAvatar}
                  className="h-full"
                />
              </TabsContent>

              <TabsContent value="media" className="flex-1 m-0">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Image className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Media Library</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="text" className="flex-1 m-0">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Type className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Text Templates</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="music" className="flex-1 m-0">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Music className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Music Library</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="effects" className="flex-1 m-0">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Zap className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Effects & Transitions</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        {leftPanelCollapsed && (
          <div className="w-12 border-r flex flex-col items-center py-2 gap-2 bg-background">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftPanelCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ResizableHandle />

        {/* Center Panel - Canvas & Timeline */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            {/* Canvas */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full flex flex-col bg-muted/50">
                {/* Canvas Toolbar */}
                <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePlay}>
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Square className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <span className="text-xs font-mono tabular-nums">
                      {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Maximize className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Interactive Canvas */}
                <InteractiveCanvas
                  scene={canvasScene}
                  selectedElementId={selectedCanvasElementId}
                  onSelectElement={handleSelectCanvasElement}
                  onUpdateElement={handleUpdateCanvasElement}
                  onDeleteElement={handleDeleteCanvasElement}
                  onAddElement={handleAddCanvasElement}
                  className="flex-1"
                />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Timeline */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full bg-background">
                <ProfessionalStudioTimeline />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Panel - Properties */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible
          collapsedSize={0}
          onCollapse={() => setRightPanelCollapsed(true)}
          onExpand={() => setRightPanelCollapsed(false)}
        >
          <div className="h-full flex flex-col bg-muted/30">
            {/* Panel Header */}
            <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
              <h2 className="text-sm font-semibold">Properties</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setRightPanelCollapsed(true)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Properties Content */}
            <PropertiesPanel
              element={selectedElement}
              onUpdate={handleUpdateElement}
              className="flex-1"
            />
          </div>
        </ResizablePanel>

        {rightPanelCollapsed && (
          <div className="w-12 border-l flex flex-col items-center py-2 gap-2 bg-background">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanelCollapsed(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </ResizablePanelGroup>

      {/* Status Bar */}
      <div className="h-8 border-t flex items-center justify-between px-4 text-xs text-muted-foreground bg-background">
        <div className="flex items-center gap-4">
          <span>Ready</span>
          <Separator orientation="vertical" className="h-4" />
          <span>1920x1080 @ 30fps</span>
        </div>
        <div className="flex items-center gap-4">
          <span>100% zoom</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Auto-save enabled</span>
        </div>
      </div>
    </div>
  )
}
