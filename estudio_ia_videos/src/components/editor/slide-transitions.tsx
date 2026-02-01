'use client';

/**
 * Slide Transitions Component
 * 
 * Provides visual slide transition effects including:
 * - Fade, Slide, Zoom, Wipe, Flip
 * - Duration and easing controls
 * - Preview functionality
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  ArrowRight,
  ZoomIn,
  Square,
  RotateCcw,
  Play,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Transition types
export type TransitionType = 
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'wipe-left'
  | 'wipe-right'
  | 'flip-horizontal'
  | 'flip-vertical';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // seconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// Transition definitions with icons and labels
const TRANSITIONS: Array<{
  type: TransitionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'basic' | 'slide' | 'zoom' | 'advanced';
}> = [
  { type: 'none', label: 'Nenhuma', icon: Square, category: 'basic' },
  { type: 'fade', label: 'Dissolve', icon: Layers, category: 'basic' },
  { type: 'slide-left', label: 'Deslizar Esquerda', icon: ArrowRight, category: 'slide' },
  { type: 'slide-right', label: 'Deslizar Direita', icon: ArrowRight, category: 'slide' },
  { type: 'slide-up', label: 'Deslizar Cima', icon: ArrowRight, category: 'slide' },
  { type: 'slide-down', label: 'Deslizar Baixo', icon: ArrowRight, category: 'slide' },
  { type: 'zoom-in', label: 'Zoom In', icon: ZoomIn, category: 'zoom' },
  { type: 'zoom-out', label: 'Zoom Out', icon: ZoomIn, category: 'zoom' },
  { type: 'wipe-left', label: 'Cortina Esquerda', icon: Square, category: 'advanced' },
  { type: 'wipe-right', label: 'Cortina Direita', icon: Square, category: 'advanced' },
  { type: 'flip-horizontal', label: 'Virar Horizontal', icon: RotateCcw, category: 'advanced' },
  { type: 'flip-vertical', label: 'Virar Vertical', icon: RotateCcw, category: 'advanced' },
];

// Easing options
const EASINGS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Aceleração' },
  { value: 'ease-out', label: 'Desaceleração' },
  { value: 'ease-in-out', label: 'Suave' },
];

// Animation variants for each transition type
export function getTransitionVariants(type: TransitionType, easing: string) {
  const easingMap: Record<string, number[]> = {
    'linear': [0, 0, 1, 1],
    'ease-in': [0.4, 0, 1, 1],
    'ease-out': [0, 0, 0.2, 1],
    'ease-in-out': [0.4, 0, 0.2, 1],
  };
  
  const ease = easingMap[easing] || easingMap['ease-in-out'];

  const variants: Record<TransitionType, {
    initial: object;
    animate: object;
    exit: object;
  }> = {
    'none': {
      initial: {},
      animate: {},
      exit: {},
    },
    'fade': {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    'slide-left': {
      initial: { x: '100%', opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '-100%', opacity: 0 },
    },
    'slide-right': {
      initial: { x: '-100%', opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 0 },
    },
    'slide-up': {
      initial: { y: '100%', opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '-100%', opacity: 0 },
    },
    'slide-down': {
      initial: { y: '-100%', opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 },
    },
    'zoom-in': {
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1.5, opacity: 0 },
    },
    'zoom-out': {
      initial: { scale: 1.5, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0, opacity: 0 },
    },
    'wipe-left': {
      initial: { clipPath: 'inset(0 100% 0 0)' },
      animate: { clipPath: 'inset(0 0% 0 0)' },
      exit: { clipPath: 'inset(0 0 0 100%)' },
    },
    'wipe-right': {
      initial: { clipPath: 'inset(0 0 0 100%)' },
      animate: { clipPath: 'inset(0 0 0 0%)' },
      exit: { clipPath: 'inset(0 100% 0 0)' },
    },
    'flip-horizontal': {
      initial: { rotateY: 90, opacity: 0 },
      animate: { rotateY: 0, opacity: 1 },
      exit: { rotateY: -90, opacity: 0 },
    },
    'flip-vertical': {
      initial: { rotateX: 90, opacity: 0 },
      animate: { rotateX: 0, opacity: 1 },
      exit: { rotateX: -90, opacity: 0 },
    },
  };

  return {
    ...variants[type],
    transition: { ease, duration: 0.5 },
  };
}

interface TransitionSelectorProps {
  value: TransitionConfig;
  onChange: (config: TransitionConfig) => void;
  className?: string;
}

export function TransitionSelector({
  value,
  onChange,
  className,
}: TransitionSelectorProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const currentTransition = TRANSITIONS.find(t => t.type === value.type) || TRANSITIONS[0];

  const handleTypeChange = useCallback((type: TransitionType) => {
    onChange({ ...value, type });
  }, [value, onChange]);

  const handleDurationChange = useCallback((duration: number[]) => {
    onChange({ ...value, duration: duration[0] });
  }, [value, onChange]);

  const handleEasingChange = useCallback((easing: string) => {
    onChange({ ...value, easing: easing as TransitionConfig['easing'] });
  }, [value, onChange]);

  const playPreview = useCallback(() => {
    setPreviewKey(k => k + 1);
    setIsPreviewOpen(true);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Transition Type Selector */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          Tipo de Transição
        </label>
        <div className="grid grid-cols-4 gap-2">
          {TRANSITIONS.map((transition) => {
            const Icon = transition.icon;
            const isSelected = value.type === transition.type;
            
            return (
              <button
                key={transition.type}
                onClick={() => handleTypeChange(transition.type)}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-center',
                  isSelected
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-violet-300',
                  transition.type.includes('slide-right') && 'transform rotate-180',
                  transition.type.includes('slide-up') && 'transform -rotate-90',
                  transition.type.includes('slide-down') && 'transform rotate-90'
                )}
                title={transition.label}
              >
                <Icon className={cn(
                  'w-5 h-5 mx-auto',
                  isSelected ? 'text-violet-600' : 'text-slate-400'
                )} />
                <span className="text-xs mt-1 block truncate">{transition.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Duração
          </label>
          <span className="text-sm text-slate-500">{value.duration.toFixed(1)}s</span>
        </div>
        <Slider
          value={[value.duration]}
          onValueChange={handleDurationChange}
          min={0.1}
          max={2}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0.1s</span>
          <span>2s</span>
        </div>
      </div>

      {/* Easing Selector */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          Suavização
        </label>
        <Select value={value.easing} onValueChange={handleEasingChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EASINGS.map((easing) => (
              <SelectItem key={easing.value} value={easing.value}>
                {easing.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview Button */}
      <Popover open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full"
            onClick={playPreview}
            disabled={value.type === 'none'}
          >
            <Play className="w-4 h-4 mr-2" />
            Visualizar Transição
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="center">
          <TransitionPreview
            key={previewKey}
            config={value}
            onComplete={() => setTimeout(() => setIsPreviewOpen(false), 500)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Transition Preview Component
function TransitionPreview({
  config,
  onComplete,
}: {
  config: TransitionConfig;
  onComplete?: () => void;
}) {
  const [showSlide, setShowSlide] = useState(true);
  const variants = getTransitionVariants(config.type, config.easing);

  // Auto-toggle slides
  useState(() => {
    const timer1 = setTimeout(() => setShowSlide(false), config.duration * 1000 + 500);
    const timer2 = setTimeout(() => {
      setShowSlide(true);
      onComplete?.();
    }, config.duration * 2000 + 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  });

  return (
    <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative" style={{ perspective: 1000 }}>
      <AnimatePresence mode="wait">
        {showSlide ? (
          <motion.div
            key="slide1"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: config.duration, ease: config.easing }}
            className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center"
          >
            <span className="text-white text-2xl font-bold">Slide 1</span>
          </motion.div>
        ) : (
          <motion.div
            key="slide2"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: config.duration, ease: config.easing }}
            className="absolute inset-0 bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center"
          >
            <span className="text-white text-2xl font-bold">Slide 2</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick Transition Picker (for timeline)
interface QuickTransitionPickerProps {
  value: TransitionType;
  onChange: (type: TransitionType) => void;
}

export function QuickTransitionPicker({ value, onChange }: QuickTransitionPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
          <Layers className="w-4 h-4 text-slate-400 group-hover:text-violet-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="space-y-1">
          {TRANSITIONS.slice(0, 6).map((transition) => (
            <button
              key={transition.type}
              onClick={() => onChange(transition.type)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                value === transition.type
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <transition.icon className="w-4 h-4" />
              {transition.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Default transition config
export const DEFAULT_TRANSITION: TransitionConfig = {
  type: 'fade',
  duration: 0.5,
  easing: 'ease-in-out',
};

export default TransitionSelector;
