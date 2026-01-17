'use client'

/**
 * Professional Studio Timeline - Fase 3
 * Consolidação de todos os editores em um único componente profissional
 * Integra Phase 1 (Lip-Sync) + Phase 2 (Avatares) + recursos avançados
 */

import React, { useState, useRef, useCallback, useEffect, useMemo, useReducer } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Button } from '@components/ui/button'
import { Label } from '@components/ui/label'
import { Input } from '@components/ui/input'
import { Slider } from '@components/ui/slider'
import { Badge } from '@components/ui/badge'
import { Separator } from '@components/ui/separator'
import { ScrollArea } from '@components/ui/scroll-area'
import { Switch } from '@components/ui/switch'
import {
  Play, Pause, Square, SkipBack, SkipForward,
  Volume2, VolumeX, Scissors, Copy, Trash2,
  Plus, Download, Upload, Settings, Eye, EyeOff,
  Lock, Unlock, Layers, Type, Mic, Music,
  Image as ImageIcon, Video, Zap, Timer,
  Maximize, Minimize, RotateCcw, RotateCw,
  ZoomIn, ZoomOut, Save, FileVideo, AudioLines,
  Sparkles, Target, Clock, FastForward, Rewind,
  Wand2, Palette, Move, Scale, RotateCw as Rotate
} from 'lucide-react'
import { cn } from '@lib/utils'
import { toast } from 'sonner'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic'
  | 'spring'
  | 'anticipate'

export type TransitionType =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'rotate'
  | 'blur'
  | 'dissolve'
  | 'wipe'
  | 'push'
  | 'cover'
  | 'reveal'
  | 'flip'
  | 'cube'
  | 'glitch'
  | 'pixelate'
  | 'morph'

export interface Keyframe {
  id: string
  time: number // em segundos
  property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume'
  value: number
  easing: EasingFunction
}

export interface Transition {
  id: string
  type: TransitionType
  duration: number
  easing: EasingFunction
  properties?: Record<string, any>
}

export interface TimelineEffect {
  id: string
  type: 'colorGrade' | 'blur' | 'sharpen' | 'vignette' | 'chromatic' | 'grain'
  intensity: number
  keyframes?: Keyframe[]
}

export interface TimelineItem {
  id: string
  type: 'video' | 'audio' | 'text' | 'image' | 'avatar' | 'effect'
  name: string
  start: number
  duration: number
  trackId: string

  // Conteúdo
  content?: {
    url?: string
    text?: string
    avatarId?: string
    lipSyncData?: any // Phase 1 integration
  }

  // Transformações
  transform: {
    x: number
    y: number
    scale: number
    rotation: number
    opacity: number
  }

  // Keyframes avançados
  keyframes: Keyframe[]

  // Transições
  transitionIn?: Transition
  transitionOut?: Transition

  // Efeitos
  effects: TimelineEffect[]

  // Audio
  volume?: number
  muted?: boolean

  // Locks
  locked: boolean
}

export interface TimelineTrack {
  id: string
  type: 'video' | 'audio' | 'text' | 'image' | 'avatar' | 'effect'
  name: string
  color: string
  items: TimelineItem[]
  visible: boolean
  locked: boolean
  muted?: boolean
  volume?: number
  height: number
  collapsed: boolean
}

export interface TimelineState {
  tracks: TimelineTrack[]
  currentTime: number
  duration: number
  zoom: number
  isPlaying: boolean
  selectedItems: string[]
  clipboard: TimelineItem[]
}

// Undo/Redo State
export interface HistoryState {
  past: TimelineState[]
  present: TimelineState
  future: TimelineState[]
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: (t) => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
  elastic: (t) => {
    const p = 0.3
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
  },
  spring: (t) => 1 + Math.pow(2, -10 * t) * Math.sin((t - 0.3 / 4) * (2 * Math.PI) / 0.3),
  anticipate: (t) => (t *= 2) < 1 ? 0.5 * t * t : 0.5 * (--t * t + 2)
}

// ============================================================================
// KEYFRAME ENGINE
// ============================================================================

export class KeyframeEngine {
  static interpolate(
    keyframes: Keyframe[],
    currentTime: number,
    property: Keyframe['property']
  ): number {
    const propertyKeyframes = keyframes
      .filter(k => k.property === property)
      .sort((a, b) => a.time - b.time)

    if (propertyKeyframes.length === 0) return 0
    if (propertyKeyframes.length === 1) return propertyKeyframes[0].value

    // Encontrar keyframes antes e depois
    let beforeKeyframe: Keyframe | null = null
    let afterKeyframe: Keyframe | null = null

    for (let i = 0; i < propertyKeyframes.length; i++) {
      if (propertyKeyframes[i].time <= currentTime) {
        beforeKeyframe = propertyKeyframes[i]
      }
      if (propertyKeyframes[i].time > currentTime && !afterKeyframe) {
        afterKeyframe = propertyKeyframes[i]
      }
    }

    // Se está antes de todos os keyframes
    if (!beforeKeyframe) return propertyKeyframes[0].value

    // Se está depois de todos os keyframes
    if (!afterKeyframe) return beforeKeyframe.value

    // Interpolar entre keyframes
    const timeDelta = afterKeyframe.time - beforeKeyframe.time
    const progress = (currentTime - beforeKeyframe.time) / timeDelta

    // Aplicar easing
    const easedProgress = easingFunctions[beforeKeyframe.easing](progress)

    // Interpolação linear com easing
    return beforeKeyframe.value + (afterKeyframe.value - beforeKeyframe.value) * easedProgress
  }

  static evaluateItemTransform(item: TimelineItem, currentTime: number) {
    return {
      x: this.interpolate(item.keyframes, currentTime, 'x') || item.transform.x,
      y: this.interpolate(item.keyframes, currentTime, 'y') || item.transform.y,
      scale: this.interpolate(item.keyframes, currentTime, 'scale') || item.transform.scale,
      rotation: this.interpolate(item.keyframes, currentTime, 'rotation') || item.transform.rotation,
      opacity: this.interpolate(item.keyframes, currentTime, 'opacity') || item.transform.opacity,
    }
  }
}

// ============================================================================
// TRANSITION ENGINE
// ============================================================================

export class TransitionEngine {
  static getTransitionCSS(transition: Transition, progress: number): React.CSSProperties {
    const easedProgress = easingFunctions[transition.easing](progress)

    const transitions: Record<TransitionType, React.CSSProperties> = {
      fade: {
        opacity: easedProgress
      },
      slide: {
        transform: `translateX(${(1 - easedProgress) * -100}%)`
      },
      zoom: {
        transform: `scale(${easedProgress})`,
        opacity: easedProgress
      },
      rotate: {
        transform: `rotate(${easedProgress * 360}deg)`,
        opacity: easedProgress
      },
      blur: {
        filter: `blur(${(1 - easedProgress) * 20}px)`,
        opacity: easedProgress
      },
      dissolve: {
        opacity: easedProgress,
        filter: `brightness(${1 + (1 - easedProgress)})`
      },
      wipe: {
        clipPath: `inset(0 ${(1 - easedProgress) * 100}% 0 0)`
      },
      push: {
        transform: `translateX(${(1 - easedProgress) * 100}%)`
      },
      cover: {
        transform: `translateY(${(1 - easedProgress) * 100}%)`,
        opacity: 1
      },
      reveal: {
        clipPath: `inset(${(1 - easedProgress) * 100}% 0 0 0)`
      },
      flip: {
        transform: `rotateY(${easedProgress * 180}deg)`
      },
      cube: {
        transform: `perspective(1000px) rotateY(${easedProgress * 90}deg)`
      },
      glitch: {
        transform: `translate(${Math.random() * 10 * (1 - easedProgress)}px, ${Math.random() * 10 * (1 - easedProgress)}px)`,
        opacity: easedProgress
      },
      pixelate: {
        filter: `pixelate(${(1 - easedProgress) * 10}px)`,
        opacity: easedProgress
      },
      morph: {
        transform: `scale(${0.8 + easedProgress * 0.2})`,
        opacity: easedProgress,
        filter: `blur(${(1 - easedProgress) * 5}px)`
      }
    }

    return transitions[transition.type] || {}
  }
}

// ============================================================================
// UNDO/REDO REDUCER
// ============================================================================

type HistoryAction =
  | { type: 'SET_PRESENT'; state: TimelineState }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET_PRESENT':
      return {
        past: [...state.past, state.present],
        present: action.state,
        future: []
      }

    case 'UNDO':
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future]
      }

    case 'REDO':
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1)
      }

    case 'CLEAR_HISTORY':
      return {
        past: [],
        present: state.present,
        future: []
      }

    default:
      return state
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProfessionalStudioTimeline() {
  // Initial state
  const initialState: TimelineState = {
    tracks: [
      {
        id: '1',
        type: 'video',
        name: 'Video Track 1',
        color: '#3b82f6',
        items: [],
        visible: true,
        locked: false,
        height: 80,
        collapsed: false
      },
      {
        id: '2',
        type: 'audio',
        name: 'Audio Track 1',
        color: '#10b981',
        items: [],
        visible: true,
        locked: false,
        muted: false,
        volume: 100,
        height: 60,
        collapsed: false
      }
    ],
    currentTime: 0,
    duration: 60,
    zoom: 1,
    isPlaying: false,
    selectedItems: [],
    clipboard: []
  }

  // History state with undo/redo
  const [history, dispatchHistory] = useReducer(historyReducer, {
    past: [],
    present: initialState,
    future: []
  })

  const state = history.present

  // Update state with history
  const updateState = useCallback((newState: TimelineState | ((prev: TimelineState) => TimelineState)) => {
    const nextState = typeof newState === 'function' ? newState(state) : newState
    dispatchHistory({ type: 'SET_PRESENT', state: nextState })
  }, [state])

  // UI State
  const [showKeyframes, setShowKeyframes] = useState(false)
  const [showEffects, setShowEffects] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Keyframe['property']>('x')

  // Refs
  const timelineRef = useRef<HTMLDivElement>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout>()

  // ============================================================================
  // PLAYBACK CONTROLS
  // ============================================================================

  const play = useCallback(() => {
    updateState(prev => ({ ...prev, isPlaying: true }))

    playbackIntervalRef.current = setInterval(() => {
      updateState(prev => {
        const newTime = prev.currentTime + 0.0333 // ~30fps
        if (newTime >= prev.duration) {
          clearInterval(playbackIntervalRef.current)
          return { ...prev, currentTime: 0, isPlaying: false }
        }
        return { ...prev, currentTime: newTime }
      })
    }, 33)
  }, [updateState])

  const pause = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
    }
    updateState(prev => ({ ...prev, isPlaying: false }))
  }, [updateState])

  const stop = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
    }
    updateState(prev => ({ ...prev, currentTime: 0, isPlaying: false }))
  }, [updateState])

  const seek = useCallback((time: number) => {
    updateState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(time, prev.duration)) }))
  }, [updateState])

  // ============================================================================
  // TRACK MANAGEMENT
  // ============================================================================

  const addTrack = useCallback((type: TimelineTrack['type']) => {
    const colors: Record<TimelineTrack['type'], string> = {
      video: '#3b82f6',
      audio: '#10b981',
      text: '#f59e0b',
      image: '#8b5cf6',
      avatar: '#ec4899',
      effect: '#6366f1'
    }

    updateState(prev => ({
      ...prev,
      tracks: [
        ...prev.tracks,
        {
          id: `track-${Date.now()}`,
          type,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${prev.tracks.filter(t => t.type === type).length + 1}`,
          color: colors[type],
          items: [],
          visible: true,
          locked: false,
          height: type === 'audio' ? 60 : 80,
          collapsed: false
        }
      ]
    }))

    toast.success(`Added ${type} track`)
  }, [updateState])

  const deleteTrack = useCallback((trackId: string) => {
    updateState(prev => ({
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== trackId)
    }))
    toast.success('Track deleted')
  }, [updateState])

  // ============================================================================
  // ITEM MANAGEMENT
  // ============================================================================

  const addItem = useCallback((trackId: string, type: TimelineItem['type']) => {
    const newItem: TimelineItem = {
      id: `item-${Date.now()}`,
      type,
      name: `${type} ${Date.now()}`,
      start: state.currentTime,
      duration: 5,
      trackId,
      transform: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1
      },
      keyframes: [],
      effects: [],
      locked: false
    }

    updateState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId
          ? { ...track, items: [...track.items, newItem] }
          : track
      )
    }))

    toast.success(`Added ${type} to timeline`)
  }, [state.currentTime, updateState])

  const deleteSelectedItems = useCallback(() => {
    updateState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        items: track.items.filter(item => !prev.selectedItems.includes(item.id))
      })),
      selectedItems: []
    }))
    toast.success('Items deleted')
  }, [updateState])

  // ============================================================================
  // KEYFRAME MANAGEMENT
  // ============================================================================

  const addKeyframe = useCallback((
    itemId: string,
    property: Keyframe['property'],
    value: number
  ) => {
    updateState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        items: track.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                keyframes: [
                  ...item.keyframes,
                  {
                    id: `kf-${Date.now()}`,
                    time: prev.currentTime - item.start,
                    property,
                    value,
                    easing: 'easeInOut'
                  }
                ]
              }
            : item
        )
      }))
    }))
    toast.success('Keyframe added')
  }, [updateState])

  // ============================================================================
  // UNDO/REDO
  // ============================================================================

  const undo = useCallback(() => {
    dispatchHistory({ type: 'UNDO' })
    toast.info('Undo')
  }, [])

  const redo = useCallback(() => {
    dispatchHistory({ type: 'REDO' })
    toast.info('Redo')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        state.isPlaying ? pause() : play()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelectedItems()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isPlaying, play, pause, undo, redo, deleteSelectedItems])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
    }
  }, [])

  // ============================================================================
  // RENDER
  // ============================================================================

  const timelineWidth = state.duration * 100 * state.zoom
  const pixelsPerSecond = 100 * state.zoom

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-gray-950 text-white">
        {/* Top Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
          <Button
            size="sm"
            variant={state.isPlaying ? "default" : "outline"}
            onClick={state.isPlaying ? pause : play}
          >
            {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button size="sm" variant="outline" onClick={stop}>
            <Square className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="outline" onClick={() => seek(state.currentTime - 1)}>
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="outline" onClick={() => seek(state.currentTime + 1)}>
            <SkipForward className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Undo/Redo */}
          <Button
            size="sm"
            variant="outline"
            onClick={undo}
            disabled={history.past.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={redo}
            disabled={history.future.length === 0}
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Tools */}
          <Button size="sm" variant="outline" onClick={deleteSelectedItems}>
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="outline">
            <Scissors className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.1) }))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="text-xs text-gray-400 w-16 text-center">
            {Math.round(state.zoom * 100)}%
          </span>

          <Button
            size="sm"
            variant="outline"
            onClick={() => updateState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.1) }))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* View Options */}
          <Button
            size="sm"
            variant={showKeyframes ? "default" : "outline"}
            onClick={() => setShowKeyframes(!showKeyframes)}
          >
            <Target className="h-4 w-4 mr-2" />
            Keyframes
          </Button>

          <Button
            size="sm"
            variant={showEffects ? "default" : "outline"}
            onClick={() => setShowEffects(!showEffects)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Effects
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">
              {Math.floor(state.currentTime / 60)}:{String(Math.floor(state.currentTime % 60)).padStart(2, '0')}
            </Badge>

            <Button size="sm" variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>

            <Button size="sm">
              <FileVideo className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Timeline Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Headers */}
          <div className="w-48 bg-gray-900 border-r border-gray-800 flex flex-col">
            <div className="h-12 flex items-center justify-center border-b border-gray-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addTrack('video')}
                className="w-full mx-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {state.tracks.map(track => (
                <div
                  key={track.id}
                  className="p-3 border-b border-gray-800 hover:bg-gray-800/50"
                  style={{ height: track.height }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{track.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => {
                          updateState(prev => ({
                            ...prev,
                            tracks: prev.tracks.map(t =>
                              t.id === track.id ? { ...t, visible: !t.visible } : t
                            )
                          }))
                        }}
                      >
                        {track.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => {
                          updateState(prev => ({
                            ...prev,
                            tracks: prev.tracks.map(t =>
                              t.id === track.id ? { ...t, locked: !t.locked } : t
                            )
                          }))
                        }}
                      >
                        {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0"
                      style={{ borderColor: track.color }}
                    >
                      {track.type}
                    </Badge>

                    {track.type === 'audio' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => {
                          updateState(prev => ({
                            ...prev,
                            tracks: prev.tracks.map(t =>
                              t.id === track.id ? { ...t, muted: !t.muted } : t
                            )
                          }))
                        }}
                      >
                        {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Timeline Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Ruler */}
            <div className="h-12 bg-gray-900 border-b border-gray-800 relative overflow-hidden">
              <ScrollArea orientation="horizontal" className="h-full">
                <div className="relative" style={{ width: timelineWidth }}>
                  {Array.from({ length: Math.ceil(state.duration) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-gray-700"
                      style={{ left: i * pixelsPerSecond }}
                    >
                      <span className="absolute top-1 left-1 text-[10px] text-gray-500">
                        {i}s
                      </span>
                    </div>
                  ))}

                  {/* Playhead */}
                  <div
                    className="absolute top-0 w-0.5 h-full bg-red-500 z-10"
                    style={{ left: state.currentTime * pixelsPerSecond }}
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Tracks */}
            <ScrollArea className="flex-1">
              <div ref={timelineRef} className="relative" style={{ width: timelineWidth }}>
                {state.tracks.map(track => (
                  <div
                    key={track.id}
                    className="relative border-b border-gray-800"
                    style={{
                      height: track.height,
                      backgroundColor: track.visible ? 'transparent' : 'rgba(0,0,0,0.5)'
                    }}
                  >
                    {track.items.map(item => (
                      <TimelineItemComponent
                        key={item.id}
                        item={item}
                        pixelsPerSecond={pixelsPerSecond}
                        trackColor={track.color}
                        isSelected={state.selectedItems.includes(item.id)}
                        onSelect={() => {
                          updateState(prev => ({
                            ...prev,
                            selectedItems: [item.id]
                          }))
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Bottom Panel - Keyframes */}
        {showKeyframes && (
          <div className="h-48 bg-gray-900 border-t border-gray-800 p-4">
            <div className="text-sm font-medium mb-2">Keyframe Editor</div>
            <div className="text-xs text-gray-400">
              Select an item and click to add keyframes
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  )
}

// ============================================================================
// TIMELINE ITEM COMPONENT
// ============================================================================

interface TimelineItemComponentProps {
  item: TimelineItem
  pixelsPerSecond: number
  trackColor: string
  isSelected: boolean
  onSelect: () => void
}

function TimelineItemComponent({
  item,
  pixelsPerSecond,
  trackColor,
  isSelected,
  onSelect
}: TimelineItemComponentProps) {
  const left = item.start * pixelsPerSecond
  const width = item.duration * pixelsPerSecond

  return (
    <motion.div
      className={cn(
        "absolute top-1 bottom-1 rounded cursor-pointer",
        "border-2 overflow-hidden",
        isSelected ? "ring-2 ring-blue-500" : ""
      )}
      style={{
        left,
        width,
        borderColor: trackColor,
        backgroundColor: `${trackColor}33`
      }}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="px-2 py-1">
        <div className="text-xs font-medium truncate">{item.name}</div>
        <div className="text-[10px] text-gray-400">{item.duration.toFixed(1)}s</div>
      </div>

      {/* Keyframe Indicators */}
      {item.keyframes.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
      )}
    </motion.div>
  )
}
