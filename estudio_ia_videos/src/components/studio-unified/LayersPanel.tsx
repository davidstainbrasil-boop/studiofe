'use client';

/**
 * Layers Panel Component
 * Visual layer management with drag-to-reorder functionality
 */

import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Button } from '@components/ui/button';
import { ScrollArea } from '@components/ui/scroll-area';
import { Separator } from '@components/ui/separator';
import { cn } from '@lib/utils';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Layers as LayersIcon,
  Image as ImageIcon,
  Type,
  User,
  Video,
  Square,
} from 'lucide-react';
import { CanvasElement } from './InteractiveCanvas';

export interface LayersPanelProps {
  elements: CanvasElement[];
  selectedElementIds: string[];
  onSelectElement: (id: string, multiSelect?: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onReorderElements: (elements: CanvasElement[]) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
}

/**
 * Get icon for element type
 */
function getElementIcon(type: string) {
  switch (type) {
    case 'avatar':
      return <User className="w-4 h-4" />;
    case 'image':
      return <ImageIcon className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'text':
      return <Type className="w-4 h-4" />;
    case 'shape':
      return <Square className="w-4 h-4" />;
    default:
      return <LayersIcon className="w-4 h-4" />;
  }
}

/**
 * Individual Layer Item Component
 */
function LayerItem({
  element,
  isSelected,
  onSelect,
  onUpdateElement,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  onUpdateElement: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted/50 border border-transparent',
        !element.visible && 'opacity-50',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => onSelect(e.shiftKey)}
    >
      {/* Element Icon */}
      <div className="text-muted-foreground">{getElementIcon(element.type)}</div>

      {/* Element Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{element.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {element.type} • {Math.round(element.width)}×{Math.round(element.height)}
        </p>
      </div>

      {/* Quick Actions (visible on hover or when selected) */}
      {(isHovered || isSelected) && (
        <div className="flex items-center gap-1">
          {/* Visibility Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement({ visible: !element.visible });
            }}
          >
            {element.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>

          {/* Lock Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement({ locked: !element.locked });
            }}
          >
            {element.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </Button>

          {/* Layer Order */}
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="h-3 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onBringForward();
              }}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-3 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSendBackward();
              }}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>

          {/* Duplicate */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Layers Panel Component
 */
export function LayersPanel({
  elements,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElements,
  onBringForward,
  onSendBackward,
}: LayersPanelProps) {
  // Sort elements by zIndex (highest first)
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayersIcon className="w-4 h-4" />
            <h3 className="font-semibold">Layers</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {elements.length} layer{elements.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Layers List */}
      <ScrollArea className="flex-1 px-2 py-2">
        {elements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <LayersIcon className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No layers yet</p>
            <p className="text-xs">Add elements to see them here</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={sortedElements}
            onReorder={(newOrder) => {
              // Update z-index based on new order (reverse because top = highest z-index)
              const reorderedElements = newOrder.map((el, index) => ({
                ...el,
                zIndex: newOrder.length - index,
              }));
              onReorderElements(reorderedElements);
            }}
            className="space-y-1"
          >
            {sortedElements.map((element) => (
              <Reorder.Item key={element.id} value={element} className="cursor-move">
                <LayerItem
                  element={element}
                  isSelected={selectedElementIds.includes(element.id)}
                  onSelect={(multiSelect) => onSelectElement(element.id, multiSelect)}
                  onUpdateElement={(updates) => onUpdateElement(element.id, updates)}
                  onDelete={() => onDeleteElement(element.id)}
                  onDuplicate={() => onDuplicateElement(element.id)}
                  onBringForward={() => onBringForward(element.id)}
                  onSendBackward={() => onSendBackward(element.id)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </ScrollArea>

      {/* Footer */}
      {selectedElementIds.length > 0 && (
        <>
          <Separator />
          <div className="px-4 py-2 text-xs text-muted-foreground">
            {selectedElementIds.length} layer{selectedElementIds.length !== 1 ? 's' : ''} selected
          </div>
        </>
      )}
    </div>
  );
}
