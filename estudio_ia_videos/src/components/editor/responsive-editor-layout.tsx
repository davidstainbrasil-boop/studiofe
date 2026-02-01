'use client'

/**
 * 📱 Responsive Editor Layout
 * 
 * Adaptive layout for video editor that reorganizes panels and controls
 * based on device type and screen size.
 * 
 * - Desktop: Three-column layout (tools | preview | properties)
 * - Tablet: Two-column with collapsible panels
 * - Mobile: Single column with tab navigation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { cn } from '@lib/utils'
import { useIsMobile, useIsTablet, useIsDesktop, useWindowSize, useIsTouchDevice } from '@hooks/use-media-query'
import { Button } from '@components/ui/button'
import { ScrollArea } from '@components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { Sheet, SheetContent, SheetTrigger } from '@components/ui/sheet'
import { Badge } from '@components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Settings,
  Film,
  Type,
  Image,
  Music,
  Palette,
  Clock,
  Play,
  Pause,
  Square,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  GripVertical,
  X,
  Menu,
  Monitor,
  Tablet,
  Smartphone
} from 'lucide-react'

// ============================================
// Types
// ============================================

type EditorPanel = 'tools' | 'preview' | 'properties' | 'timeline'

interface PanelConfig {
  id: EditorPanel
  label: string
  icon: React.ReactNode
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  collapsible?: boolean
}

interface ResponsiveEditorLayoutProps {
  children?: React.ReactNode
  toolsPanel?: React.ReactNode
  previewPanel?: React.ReactNode
  propertiesPanel?: React.ReactNode
  timelinePanel?: React.ReactNode
  headerContent?: React.ReactNode
  footerContent?: React.ReactNode
  onLayoutChange?: (layout: 'desktop' | 'tablet' | 'mobile') => void
  className?: string
}

interface ResizablePanelProps {
  children: React.ReactNode
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  side: 'left' | 'right'
  collapsed?: boolean
  onCollapse?: () => void
  onResize?: (width: number) => void
  className?: string
}

// ============================================
// Panel Configuration
// ============================================

const PANEL_CONFIG: PanelConfig[] = [
  {
    id: 'tools',
    label: 'Ferramentas',
    icon: <Layers className="h-4 w-4" />,
    minWidth: 200,
    maxWidth: 400,
    defaultWidth: 280,
    collapsible: true
  },
  {
    id: 'preview',
    label: 'Preview',
    icon: <Film className="h-4 w-4" />,
    minWidth: 400,
    collapsible: false
  },
  {
    id: 'properties',
    label: 'Propriedades',
    icon: <Settings className="h-4 w-4" />,
    minWidth: 250,
    maxWidth: 400,
    defaultWidth: 320,
    collapsible: true
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: <Clock className="h-4 w-4" />,
    collapsible: true
  }
]

// Mobile tab configuration
const MOBILE_TABS = [
  { id: 'preview', label: 'Preview', icon: <Film className="h-4 w-4" /> },
  { id: 'tools', label: 'Ferramentas', icon: <Layers className="h-4 w-4" /> },
  { id: 'properties', label: 'Config', icon: <Settings className="h-4 w-4" /> }
] as const

// ============================================
// Sub Components
// ============================================

/**
 * Resizable Panel with drag handle
 */
function ResizablePanel({
  children,
  minWidth = 200,
  maxWidth = 500,
  defaultWidth = 280,
  side,
  collapsed = false,
  onCollapse,
  onResize,
  className
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startX.current = e.clientX
    startWidth.current = width

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === 'left' 
        ? e.clientX - startX.current 
        : startX.current - e.clientX
      
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + delta))
      setWidth(newWidth)
      onResize?.(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, minWidth, maxWidth, side, onResize])

  if (collapsed) {
    return (
      <motion.div
        initial={{ width: defaultWidth }}
        animate={{ width: 48 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex flex-col items-center py-4 bg-surface border-border",
          side === 'left' ? 'border-r' : 'border-l',
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="mb-4"
        >
          {side === 'left' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {PANEL_CONFIG.find(p => p.collapsible)?.icon}
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ width: defaultWidth }}
      animate={{ width }}
      transition={{ duration: isDragging ? 0 : 0.2 }}
      className={cn(
        "relative flex flex-col bg-surface border-border h-full",
        side === 'left' ? 'border-r' : 'border-l',
        className
      )}
      style={{ width }}
    >
      {/* Drag Handle */}
      <div
        className={cn(
          "absolute top-0 bottom-0 w-1 cursor-col-resize z-10 group",
          "hover:bg-primary/20 active:bg-primary/30 transition-colors",
          side === 'left' ? 'right-0' : 'left-0',
          isDragging && 'bg-primary/30'
        )}
        onMouseDown={handleMouseDown}
      >
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 flex items-center justify-center",
          "w-4 h-8 bg-border rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
          side === 'left' ? '-right-1.5' : '-left-1.5'
        )}>
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-sm font-medium text-foreground">
          {side === 'left' ? 'Ferramentas' : 'Propriedades'}
        </span>
        {onCollapse && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCollapse}>
            {side === 'left' ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>

      {/* Panel Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {children}
        </div>
      </ScrollArea>
    </motion.div>
  )
}

/**
 * Mobile Tab Bar at bottom
 */
function MobileTabBar({
  activeTab,
  onTabChange,
  timelineExpanded,
  onToggleTimeline
}: {
  activeTab: EditorPanel
  onTabChange: (tab: EditorPanel) => void
  timelineExpanded: boolean
  onToggleTimeline: () => void
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {MOBILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as EditorPanel)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full",
              "transition-colors touch-manipulation",
              activeTab === tab.id 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            <span className="text-[10px] mt-1">{tab.label}</span>
          </button>
        ))}
        
        {/* Timeline toggle */}
        <button
          onClick={onToggleTimeline}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full",
            "transition-colors touch-manipulation",
            timelineExpanded 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="h-4 w-4" />
          <span className="text-[10px] mt-1">Timeline</span>
        </button>
      </div>
    </div>
  )
}

/**
 * Swipeable Panel Container for touch devices
 */
function SwipeablePanel({
  children,
  direction,
  isOpen,
  onClose,
  width = 300
}: {
  children: React.ReactNode
  direction: 'left' | 'right'
  isOpen: boolean
  onClose: () => void
  width?: number
}) {
  const x = useMotionValue(direction === 'left' ? -width : width)
  const opacity = useTransform(
    x, 
    direction === 'left' ? [-width, 0] : [0, width], 
    [0.5, 1]
  )

  useEffect(() => {
    x.set(isOpen ? 0 : (direction === 'left' ? -width : width))
  }, [isOpen, direction, width, x])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = width * 0.3
    const shouldClose = direction === 'left' 
      ? info.offset.x < -threshold || info.velocity.x < -100
      : info.offset.x > threshold || info.velocity.x > 100

    if (shouldClose) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            drag="x"
            dragConstraints={{
              left: direction === 'left' ? -width : 0,
              right: direction === 'left' ? 0 : width
            }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{ x, opacity }}
            className={cn(
              "fixed top-0 bottom-0 z-50 bg-surface shadow-xl",
              "touch-pan-y",
              direction === 'left' ? 'left-0' : 'right-0'
            )}
          >
            <div style={{ width }} className="h-full flex flex-col">
              {/* Close button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-medium">
                  {direction === 'left' ? 'Ferramentas' : 'Propriedades'}
                </span>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4">
                  {children}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Preview Controls for mobile
 */
function MobilePreviewControls({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  isFullscreen,
  onToggleFullscreen,
  currentTime,
  totalDuration
}: {
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  currentTime: number
  totalDuration: number
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-t border-border">
      {/* Time display */}
      <span className="text-xs text-muted-foreground font-mono">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>

      {/* Playback controls */}
      <div className="flex items-center gap-1">
        {isPlaying ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPause}>
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPlay}>
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStop}>
          <Square className="h-4 w-4" />
        </Button>
      </div>

      {/* Fullscreen toggle */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFullscreen}>
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

/**
 * Device Mode Indicator (for dev/debug)
 */
function DeviceModeIndicator() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const { width } = useWindowSize()

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs">
        {isMobile && <Smartphone className="h-3 w-3 mr-1" />}
        {isTablet && <Tablet className="h-3 w-3 mr-1" />}
        {isDesktop && <Monitor className="h-3 w-3 mr-1" />}
        {width}px
      </Badge>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function ResponsiveEditorLayout({
  toolsPanel,
  previewPanel,
  propertiesPanel,
  timelinePanel,
  headerContent,
  footerContent,
  onLayoutChange,
  className
}: ResponsiveEditorLayoutProps) {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const isTouchDevice = useIsTouchDevice()
  
  // Layout state
  const [activeTab, setActiveTab] = useState<EditorPanel>('preview')
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [timelineExpanded, setTimelineExpanded] = useState(true)
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  
  // Preview state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const totalDuration = 120 // Example: 2 minutes

  // Report layout changes
  useEffect(() => {
    const layout = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
    onLayoutChange?.(layout)
  }, [isMobile, isTablet, onLayoutChange])

  // ============================================
  // Mobile Layout
  // ============================================
  if (isMobile) {
    return (
      <div className={cn("flex flex-col h-[100dvh] bg-background", className)}>
        {/* Header */}
        {headerContent && (
          <div className="flex-none border-b border-border">
            {headerContent}
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 flex flex-col"
              >
                {/* Preview Area */}
                <div className="flex-1 bg-black flex items-center justify-center">
                  {previewPanel || (
                    <div className="text-white/50 text-center">
                      <Film className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Área de Preview</p>
                    </div>
                  )}
                </div>

                {/* Preview Controls */}
                <MobilePreviewControls
                  isPlaying={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onStop={() => { setIsPlaying(false); setCurrentTime(0) }}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                  currentTime={currentTime}
                  totalDuration={totalDuration}
                />
              </motion.div>
            )}

            {activeTab === 'tools' && (
              <motion.div
                key="tools"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {toolsPanel || (
                      <div className="space-y-4">
                        <p className="text-muted-foreground text-sm">
                          Ferramentas do editor...
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {activeTab === 'properties' && (
              <motion.div
                key="properties"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0"
              >
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {propertiesPanel || (
                      <div className="space-y-4">
                        <p className="text-muted-foreground text-sm">
                          Propriedades e configurações...
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timeline overlay for mobile */}
          <AnimatePresence>
            {timelineExpanded && activeTab === 'preview' && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 h-32 bg-surface border-t border-border shadow-lg"
              >
                <div className="p-2 h-full overflow-x-auto">
                  {timelinePanel || (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Timeline
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Tab Bar */}
        <MobileTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          timelineExpanded={timelineExpanded}
          onToggleTimeline={() => setTimelineExpanded(!timelineExpanded)}
        />

        {/* Footer (hidden on mobile, controls are in tab bar) */}
        
        <DeviceModeIndicator />
      </div>
    )
  }

  // ============================================
  // Tablet Layout
  // ============================================
  if (isTablet) {
    return (
      <div className={cn("flex flex-col h-screen bg-background", className)}>
        {/* Header */}
        {headerContent && (
          <div className="flex-none border-b border-border">
            {headerContent}
          </div>
        )}

        {/* Main area with panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tools Panel Button */}
          <button
            onClick={() => setLeftPanelOpen(true)}
            className={cn(
              "flex-none w-12 flex flex-col items-center py-4 gap-3",
              "bg-muted/30 border-r border-border",
              "text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <Layers className="h-5 w-5" />
            <span className="text-[10px] writing-mode-vertical">Tools</span>
          </button>

          {/* Center: Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Preview */}
            <div className="flex-1 bg-black flex items-center justify-center">
              {previewPanel || (
                <div className="text-white/50 text-center">
                  <Film className="h-16 w-16 mx-auto mb-3 opacity-50" />
                  <p>Preview</p>
                </div>
              )}
            </div>

            {/* Timeline */}
            {timelineExpanded && (
              <div className="h-40 border-t border-border bg-surface">
                <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-muted/30">
                  <span className="text-xs font-medium">Timeline</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setTimelineExpanded(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="h-[calc(100%-28px)] overflow-x-auto p-2">
                  {timelinePanel || (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Timeline content
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Properties Panel Button */}
          <button
            onClick={() => setRightPanelOpen(true)}
            className={cn(
              "flex-none w-12 flex flex-col items-center py-4 gap-3",
              "bg-muted/30 border-l border-border",
              "text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] writing-mode-vertical">Props</span>
          </button>
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="flex-none border-t border-border">
            {footerContent}
          </div>
        )}

        {/* Swipeable Panels */}
        <SwipeablePanel
          direction="left"
          isOpen={leftPanelOpen}
          onClose={() => setLeftPanelOpen(false)}
          width={300}
        >
          {toolsPanel}
        </SwipeablePanel>

        <SwipeablePanel
          direction="right"
          isOpen={rightPanelOpen}
          onClose={() => setRightPanelOpen(false)}
          width={320}
        >
          {propertiesPanel}
        </SwipeablePanel>

        <DeviceModeIndicator />
      </div>
    )
  }

  // ============================================
  // Desktop Layout (Default)
  // ============================================
  return (
    <div className={cn("flex flex-col h-screen bg-background", className)}>
      {/* Header */}
      {headerContent && (
        <div className="flex-none border-b border-border">
          {headerContent}
        </div>
      )}

      {/* Main area with resizable panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Tools */}
        <ResizablePanel
          side="left"
          collapsed={leftPanelCollapsed}
          onCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          minWidth={200}
          maxWidth={400}
          defaultWidth={280}
        >
          {toolsPanel || (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">Tools panel content</p>
            </div>
          )}
        </ResizablePanel>

        {/* Center: Preview + Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Area */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            {previewPanel || (
              <div className="text-white/50 text-center">
                <Film className="h-20 w-20 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Preview Area</p>
                <p className="text-sm mt-2">16:9 aspect ratio maintained</p>
              </div>
            )}

            {/* Preview overlay controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2 backdrop-blur-sm">
              {isPlaying ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsPlaying(false)}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsPlaying(true)}
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => { setIsPlaying(false); setCurrentTime(0) }}
              >
                <Square className="h-4 w-4" />
              </Button>
              <span className="text-white text-xs font-mono mx-2">
                {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / 
                {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Timeline */}
          {timelineExpanded && (
            <div className="h-48 border-t border-border bg-surface">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Timeline</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setTimelineExpanded(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100%-32px)]">
                <div className="p-2">
                  {timelinePanel || (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Timeline content goes here
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Timeline collapsed indicator */}
          {!timelineExpanded && (
            <button
              onClick={() => setTimelineExpanded(true)}
              className="flex items-center justify-center gap-2 py-1.5 border-t border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Mostrar Timeline</span>
            </button>
          )}
        </div>

        {/* Right Panel: Properties */}
        <ResizablePanel
          side="right"
          collapsed={rightPanelCollapsed}
          onCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          minWidth={250}
          maxWidth={450}
          defaultWidth={320}
        >
          {propertiesPanel || (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">Properties panel content</p>
            </div>
          )}
        </ResizablePanel>
      </div>

      {/* Footer */}
      {footerContent && (
        <div className="flex-none border-t border-border">
          {footerContent}
        </div>
      )}

      <DeviceModeIndicator />
    </div>
  )
}

export default ResponsiveEditorLayout

// Re-export types
export type { ResponsiveEditorLayoutProps, EditorPanel, PanelConfig }
