'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Sparkles,
  Zap,
  Wind,
  Clock,
  ChevronDown,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// =============================================================================
// Types
// =============================================================================

export type TransitionType = 
  | 'none'
  | 'fade'
  | 'fadeblack'
  | 'fadewhite'
  | 'slideleft'
  | 'slideright'
  | 'slideup'
  | 'slidedown'
  | 'smoothleft'
  | 'smoothright'
  | 'dissolve'
  | 'circlecrop'
  | 'circleopen'
  | 'circleclose'
  | 'wipeleft'
  | 'wiperight'
  | 'zoomin'
  | 'zoomout'
  | 'pixelize'
  | 'radial';

export interface TransitionConfig {
  type: TransitionType
  duration: number // seconds (0.1 - 2.0)
}

export interface TransitionSelectorProps {
  value: TransitionConfig
  onChange: (config: TransitionConfig) => void
  disabled?: boolean
  className?: string
}

// =============================================================================
// Data
// =============================================================================

interface TransitionOption {
  value: TransitionType
  label: string
  icon: React.ComponentType<{ className?: string }>
  category: 'basic' | 'slide' | 'shape' | 'effect'
  description: string
}

const TRANSITIONS: TransitionOption[] = [
  // Basic
  { value: 'none', label: 'Sem transição', icon: Square, category: 'basic', description: 'Corte direto' },
  { value: 'fade', label: 'Fade', icon: Sparkles, category: 'basic', description: 'Desvanecimento suave' },
  { value: 'fadeblack', label: 'Fade preto', icon: Circle, category: 'basic', description: 'Fade através do preto' },
  { value: 'fadewhite', label: 'Fade branco', icon: Circle, category: 'basic', description: 'Fade através do branco' },
  { value: 'dissolve', label: 'Dissolve', icon: Wind, category: 'basic', description: 'Dissolução gradual' },
  
  // Slide
  { value: 'slideleft', label: 'Deslizar ←', icon: ArrowLeft, category: 'slide', description: 'Desliza para esquerda' },
  { value: 'slideright', label: 'Deslizar →', icon: ArrowRight, category: 'slide', description: 'Desliza para direita' },
  { value: 'slideup', label: 'Deslizar ↑', icon: ArrowUp, category: 'slide', description: 'Desliza para cima' },
  { value: 'slidedown', label: 'Deslizar ↓', icon: ArrowDown, category: 'slide', description: 'Desliza para baixo' },
  { value: 'smoothleft', label: 'Suave ←', icon: ArrowLeft, category: 'slide', description: 'Desliza suave esquerda' },
  { value: 'smoothright', label: 'Suave →', icon: ArrowRight, category: 'slide', description: 'Desliza suave direita' },
  
  // Shape
  { value: 'circlecrop', label: 'Círculo crop', icon: Circle, category: 'shape', description: 'Transição circular' },
  { value: 'circleopen', label: 'Círculo ↗', icon: Circle, category: 'shape', description: 'Círculo abrindo' },
  { value: 'circleclose', label: 'Círculo ↙', icon: Circle, category: 'shape', description: 'Círculo fechando' },
  { value: 'wipeleft', label: 'Wipe ←', icon: ArrowLeft, category: 'shape', description: 'Cortina esquerda' },
  { value: 'wiperight', label: 'Wipe →', icon: ArrowRight, category: 'shape', description: 'Cortina direita' },
  
  // Effect
  { value: 'zoomin', label: 'Zoom in', icon: Zap, category: 'effect', description: 'Zoom aproximando' },
  { value: 'zoomout', label: 'Zoom out', icon: Zap, category: 'effect', description: 'Zoom afastando' },
  { value: 'pixelize', label: 'Pixelizar', icon: Square, category: 'effect', description: 'Efeito pixels' },
  { value: 'radial', label: 'Radial', icon: Circle, category: 'effect', description: 'Transição radial' },
]

const PRESETS = [
  { name: 'Profissional', type: 'fade' as TransitionType, duration: 0.5 },
  { name: 'Dinâmico', type: 'slideleft' as TransitionType, duration: 0.3 },
  { name: 'Suave', type: 'dissolve' as TransitionType, duration: 0.7 },
  { name: 'Dramático', type: 'fadeblack' as TransitionType, duration: 1.0 },
  { name: 'Moderno', type: 'circlecrop' as TransitionType, duration: 0.5 },
]

const CATEGORY_LABELS = {
  basic: 'Básico',
  slide: 'Deslizar',
  shape: 'Forma',
  effect: 'Efeito',
}

// =============================================================================
// Components
// =============================================================================

function TransitionPreview({ type, isActive }: { type: TransitionType; isActive: boolean }) {
  return (
    <div className="relative w-full aspect-video bg-slate-100 rounded overflow-hidden">
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={type}
            className="absolute inset-0 bg-violet-500"
            initial={getInitialState(type)}
            animate={getAnimateState(type)}
            exit={getExitState(type)}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs text-slate-400">Preview</span>
      </div>
    </div>
  )
}

function getInitialState(type: TransitionType) {
  switch (type) {
    case 'slideleft':
    case 'smoothleft':
    case 'wipeleft':
      return { x: '100%' }
    case 'slideright':
    case 'smoothright':
    case 'wiperight':
      return { x: '-100%' }
    case 'slideup':
      return { y: '100%' }
    case 'slidedown':
      return { y: '-100%' }
    case 'zoomin':
      return { scale: 0, opacity: 0 }
    case 'zoomout':
      return { scale: 1.5, opacity: 0 }
    case 'circlecrop':
    case 'circleopen':
      return { clipPath: 'circle(0% at 50% 50%)' }
    case 'circleclose':
      return { clipPath: 'circle(150% at 50% 50%)' }
    default:
      return { opacity: 0 }
  }
}

function getAnimateState(type: TransitionType) {
  switch (type) {
    case 'slideleft':
    case 'slideright':
    case 'smoothleft':
    case 'smoothright':
    case 'wipeleft':
    case 'wiperight':
      return { x: 0 }
    case 'slideup':
    case 'slidedown':
      return { y: 0 }
    case 'zoomin':
    case 'zoomout':
      return { scale: 1, opacity: 1 }
    case 'circlecrop':
    case 'circleopen':
      return { clipPath: 'circle(150% at 50% 50%)' }
    case 'circleclose':
      return { clipPath: 'circle(0% at 50% 50%)' }
    default:
      return { opacity: 1 }
  }
}

function getExitState(type: TransitionType) {
  return { opacity: 0 }
}

// =============================================================================
// Main Component
// =============================================================================

export function TransitionSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TransitionSelectorProps) {
  const [previewType, setPreviewType] = useState<TransitionType | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const selectedTransition = TRANSITIONS.find((t) => t.value === value.type)

  const handleTransitionSelect = useCallback(
    (type: TransitionType) => {
      onChange({ ...value, type })
    },
    [onChange, value]
  )

  const handleDurationChange = useCallback(
    (newDuration: number[]) => {
      onChange({ ...value, duration: newDuration[0] })
    },
    [onChange, value]
  )

  const handlePresetSelect = useCallback(
    (preset: typeof PRESETS[0]) => {
      onChange({ type: preset.type, duration: preset.duration })
    },
    [onChange]
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Transition Type Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de Transição</Label>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-between"
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                {selectedTransition && (
                  <selectedTransition.icon className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{selectedTransition?.label || 'Selecionar transição'}</span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto p-1">
                {(['basic', 'slide', 'shape', 'effect'] as const).map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="text-xs py-2">
                    {CATEGORY_LABELS[cat]}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {(['basic', 'slide', 'shape', 'effect'] as const).map((cat) => (
                <TabsContent key={cat} value={cat} className="p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSITIONS.filter((t) => t.category === cat).map((transition) => (
                      <button
                        key={transition.value}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                          'hover:border-violet-300 hover:bg-violet-50',
                          value.type === transition.value
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-transparent bg-slate-50'
                        )}
                        onClick={() => {
                          handleTransitionSelect(transition.value)
                          setIsOpen(false)
                        }}
                        onMouseEnter={() => setPreviewType(transition.value)}
                        onMouseLeave={() => setPreviewType(null)}
                      >
                        <transition.icon className="h-4 w-4 text-violet-600 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{transition.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {transition.description}
                          </div>
                        </div>
                        {value.type === transition.value && (
                          <Check className="h-4 w-4 text-violet-600 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>

      {/* Duration Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Duração</Label>
          <Badge variant="secondary" className="font-mono">
            {value.duration.toFixed(1)}s
          </Badge>
        </div>
        <Slider
          value={[value.duration]}
          onValueChange={handleDurationChange}
          min={0.1}
          max={2.0}
          step={0.1}
          disabled={disabled || value.type === 'none'}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.1s</span>
          <span>2.0s</span>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Presets</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(
                'text-xs',
                value.type === preset.type &&
                  value.duration === preset.duration &&
                  'border-violet-500 bg-violet-50'
              )}
              onClick={() => handlePresetSelect(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Preview</Label>
        <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden border">
          <TransitionPreview
            type={previewType || value.type}
            isActive={true}
          />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Quick Selector (Compact Version)
// =============================================================================

export function TransitionQuickSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: TransitionType
  onChange: (type: TransitionType) => void
  disabled?: boolean
}) {
  const quickOptions = TRANSITIONS.slice(0, 6) // First 6 options

  return (
    <div className="flex items-center gap-1">
      {quickOptions.map((transition) => (
        <Button
          key={transition.value}
          variant={value === transition.value ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => onChange(transition.value)}
          title={transition.label}
        >
          <transition.icon className="h-4 w-4" />
        </Button>
      ))}
      <Select value={value} onValueChange={(v) => onChange(v as TransitionType)}>
        <SelectTrigger className="w-8 h-8 p-0 border-0">
          <ChevronDown className="h-4 w-4" />
        </SelectTrigger>
        <SelectContent>
          {TRANSITIONS.map((transition) => (
            <SelectItem key={transition.value} value={transition.value}>
              <div className="flex items-center gap-2">
                <transition.icon className="h-4 w-4" />
                <span>{transition.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export { TRANSITIONS, PRESETS, CATEGORY_LABELS }
export default TransitionSelector
