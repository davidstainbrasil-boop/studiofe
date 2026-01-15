'use client'

/**
 * Slides Panel - Scene/Slide Management
 *
 * Features:
 * - Thumbnail preview of all slides
 * - Drag-and-drop reordering
 * - Add/delete slides
 * - Quick selection
 */

import React, { useState, useCallback } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Button } from '@components/ui/button'
import { ScrollArea } from '@components/ui/scroll-area'
import { Badge } from '@components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@lib/utils'
import {
  Plus,
  Trash2,
  Copy,
  MoreVertical,
  Play,
  Clock,
  GripVertical,
  Image as ImageIcon,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@components/ui/dropdown-menu'
import type { SceneData } from './scene-canvas-editor'

// Item types for drag and drop
const ItemTypes = {
  SLIDE: 'slide'
}

interface SlideItemProps {
  slide: SceneData
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (dragIndex: number, hoverIndex: number) => void
}

// Draggable slide item
const DraggableSlideItem: React.FC<SlideItemProps> = ({
  slide,
  index,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMove
}) => {
  const ref = React.useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.SLIDE,
    item: { index, id: slide.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.SLIDE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) return

      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      // Get rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top

      // Only move when the cursor is past half the height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      onMove(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  // Connect drag and drop refs
  drag(drop(ref))

  return (
    <div
      ref={ref}
      onClick={() => onSelect(slide.id)}
      className={cn(
        "group relative rounded-lg overflow-hidden transition-all duration-200 cursor-pointer",
        "border-2",
        isSelected
          ? "border-blue-500 shadow-lg shadow-blue-500/20"
          : "border-transparent hover:border-white/20",
        isDragging && "opacity-40",
        isOver && "ring-2 ring-blue-400 ring-offset-2 ring-offset-[#0f1115]"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-800 relative">
        {slide.thumbnail ? (
          <img
            src={slide.thumbnail}
            alt={slide.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : slide.backgroundImage ? (
          <img
            src={slide.backgroundImage}
            alt={slide.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: slide.backgroundColor || '#1f2937' }}
          />
        )}

        {/* Slide number */}
        <div className="absolute top-1.5 left-1.5">
          <Badge className="bg-black/60 text-[10px] px-1.5 py-0.5 font-mono">
            {index + 1}
          </Badge>
        </div>

        {/* Duration */}
        <div className="absolute bottom-1.5 right-1.5">
          <Badge className="bg-black/60 text-[10px] px-1.5 py-0.5">
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            {slide.duration}s
          </Badge>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(slide.id)
              }}
            >
              <Play className="w-3.5 h-3.5 text-gray-900" />
            </Button>
          </div>
        </div>

        {/* Drag handle */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/60 px-0.5 py-2 rounded-r-md cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="p-2 flex items-center justify-between bg-white/[0.02]">
        <p className="text-xs text-gray-300 truncate flex-1">{slide.name}</p>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1c1f26] border-white/10">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate(slide.id)
              }}
              className="text-white hover:bg-white/10"
            >
              <Copy className="w-3.5 h-3.5 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete(slide.id)
              }}
              className="text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 ring-2 ring-blue-500 ring-inset rounded-lg" />
        </div>
      )}
    </div>
  )
}

interface SlidesPanelProps {
  slides: SceneData[]
  selectedSlideId?: string
  onSlideSelect: (id: string) => void
  onSlideAdd: () => void
  onSlideDelete: (id: string) => void
  onSlideDuplicate: (id: string) => void
  onSlidesReorder: (slides: SceneData[]) => void
}

export function SlidesPanel({
  slides,
  selectedSlideId,
  onSlideSelect,
  onSlideAdd,
  onSlideDelete,
  onSlideDuplicate,
  onSlidesReorder
}: SlidesPanelProps) {
  // Handle slide reordering
  const moveSlide = useCallback((dragIndex: number, hoverIndex: number) => {
    const newSlides = [...slides]
    const [removed] = newSlides.splice(dragIndex, 1)
    newSlides.splice(hoverIndex, 0, removed)
    onSlidesReorder(newSlides)
  }, [slides, onSlidesReorder])

  // Calculate total duration
  const totalDuration = slides.reduce((acc, slide) => acc + slide.duration, 0)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Cenas</h3>
            <Badge variant="outline" className="text-[10px] border-white/20">
              {slides.length} cenas
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(totalDuration)} total
            </span>
          </div>

          {/* Add slide button */}
          <Button
            onClick={onSlideAdd}
            className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Cena
          </Button>
        </div>

        {/* Slides list */}
        <ScrollArea className="flex-1 px-4 py-3">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <ImageIcon className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-sm text-gray-400 font-medium">Nenhuma cena</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[180px]">
                Adicione cenas para comecar a editar seu video
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <DraggableSlideItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isSelected={slide.id === selectedSlideId}
                  onSelect={onSlideSelect}
                  onDelete={onSlideDelete}
                  onDuplicate={onSlideDuplicate}
                  onMove={moveSlide}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer tips */}
        <div className="p-3 border-t border-white/5 bg-white/[0.02]">
          <p className="text-[10px] text-gray-500 text-center">
            Arraste para reordenar as cenas
          </p>
        </div>
      </div>
    </DndProvider>
  )
}

export default SlidesPanel
