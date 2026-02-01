'use client';

/**
 * Slide Thumbnails Component
 * 
 * Visual timeline of slides with drag-and-drop reordering.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical,
  Play,
  Trash2,
  Copy,
  Plus,
  Clock,
  Volume2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { PreviewSlide } from './video-preview';

interface SlideThumbnailsProps {
  slides: PreviewSlide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  onReorder?: (slides: PreviewSlide[]) => void;
  onDelete?: (index: number) => void;
  onDuplicate?: (index: number) => void;
  onAddSlide?: (afterIndex: number) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function SlideThumbnails({
  slides,
  currentSlideIndex,
  onSlideSelect,
  onReorder,
  onDelete,
  onDuplicate,
  onAddSlide,
  orientation = 'horizontal',
  className,
}: SlideThumbnailsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleReorder = useCallback((reorderedSlides: PreviewSlide[]) => {
    if (onReorder) {
      onReorder(reorderedSlides);
    }
  }, [onReorder]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'bg-slate-100 dark:bg-slate-900 rounded-lg p-2',
        isHorizontal ? 'overflow-x-auto' : 'overflow-y-auto max-h-[600px]',
        className
      )}
    >
      <Reorder.Group
        axis={isHorizontal ? 'x' : 'y'}
        values={slides}
        onReorder={handleReorder}
        className={cn(
          'flex gap-2',
          isHorizontal ? 'flex-row' : 'flex-col'
        )}
      >
        {slides.map((slide, index) => (
          <Reorder.Item
            key={slide.id}
            value={slide}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="relative"
          >
            <ContextMenu>
              <ContextMenuTrigger>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSlideSelect(index)}
                  className={cn(
                    'relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
                    isHorizontal ? 'w-32 h-20' : 'w-48 h-28',
                    currentSlideIndex === index
                      ? 'border-violet-500 shadow-lg shadow-violet-500/20'
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  {/* Slide Preview */}
                  <div className="absolute inset-0 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    <div className="transform scale-[0.15] origin-center">
                      {slide.content}
                    </div>
                  </div>

                  {/* Overlay Info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="flex items-center justify-between text-white text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(slide.duration)}
                        </span>
                        {slide.audioUrl && <Volume2 className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>

                  {/* Slide Number */}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'absolute top-1 left-1 text-xs px-1.5 py-0',
                      currentSlideIndex === index
                        ? 'bg-violet-500 text-white'
                        : 'bg-black/50 text-white'
                    )}
                  >
                    {index + 1}
                  </Badge>

                  {/* Drag Handle */}
                  <AnimatePresence>
                    {hoveredIndex === index && onReorder && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-1 right-1 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-4 h-4 text-white drop-shadow-md" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Current Slide Indicator */}
                  {currentSlideIndex === index && (
                    <motion.div
                      layoutId="currentSlideIndicator"
                      className="absolute inset-0 border-2 border-violet-500 rounded-lg pointer-events-none"
                    />
                  )}
                </motion.div>
              </ContextMenuTrigger>

              <ContextMenuContent>
                <ContextMenuItem onClick={() => onSlideSelect(index)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onSlideSelect(index)}>
                  <Play className="w-4 h-4 mr-2" />
                  Reproduzir daqui
                </ContextMenuItem>
                <ContextMenuSeparator />
                {onDuplicate && (
                  <ContextMenuItem onClick={() => onDuplicate(index)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                  </ContextMenuItem>
                )}
                {onAddSlide && (
                  <ContextMenuItem onClick={() => onAddSlide(index)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar slide após
                  </ContextMenuItem>
                )}
                {onDelete && slides.length > 1 && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => onDelete(index)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Add Slide Button */}
      {onAddSlide && (
        <Button
          variant="ghost"
          onClick={() => onAddSlide(slides.length - 1)}
          className={cn(
            'border-2 border-dashed border-slate-300 dark:border-slate-700',
            isHorizontal ? 'w-32 h-20' : 'w-48 h-28',
            'hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
          )}
        >
          <Plus className="w-6 h-6 text-slate-400" />
        </Button>
      )}
    </div>
  );
}

export default SlideThumbnails;
