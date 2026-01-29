/**
 * 🎞️ Timeline Editor Component
 * Visual timeline for video editing with drag-and-drop tracks
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX
} from 'lucide-react'

// Timeline Types
export interface TimelineItem {
  id: string
  type: 'video' | 'audio' | 'text' | 'image' | 'shape'
  from: number
  durationInFrames: number
  name: string
  color?: string
  locked?: boolean
  muted?: boolean
  data?: Record<string, unknown>
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio' | 'overlay'
  items: TimelineItem[]
  locked?: boolean
  visible?: boolean
  muted?: boolean
}

interface TimelineEditorProps {
  tracks: TimelineTrack[]
  onTracksChange: (tracks: TimelineTrack[]) => void
  durationInFrames: number
  fps: number
  currentFrame: number
  onSeek: (frame: number) => void
  className?: string
  zoom?: number
}

// Calculate pixel position from frame
const frameToPixels = (frame: number, zoom: number) => frame * zoom

// Calculate frame from pixel position
const pixelsToFrame = (pixels: number, zoom: number) => Math.round(pixels / zoom)

// Timeline Ruler
function TimelineRuler({ 
  durationInFrames, 
  fps, 
  zoom,
  currentFrame,
  onSeek
}: { 
  durationInFrames: number
  fps: number
  zoom: number
  currentFrame: number
  onSeek: (frame: number) => void
}) {
  const markers: number[] = []
  const interval = fps // One marker per second
  
  for (let i = 0; i <= durationInFrames; i += interval) {
    markers.push(i)
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const frame = pixelsToFrame(x, zoom)
    onSeek(Math.max(0, Math.min(frame, durationInFrames - 1)))
  }

  return (
    <div 
      className="relative h-6 bg-muted border-b cursor-pointer"
      onClick={handleClick}
      style={{ width: frameToPixels(durationInFrames, zoom) }}
    >
      {markers.map((frame) => (
        <div
          key={frame}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: frameToPixels(frame, zoom) }}
        >
          <div className="w-px h-2 bg-border" />
          <span className="text-[10px] text-muted-foreground">
            {Math.floor(frame / fps)}s
          </span>
        </div>
      ))}
      
      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
        style={{ left: frameToPixels(currentFrame, zoom) }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45" />
      </div>
    </div>
  )
}

// Timeline Track Row
function TimelineTrackRow({
  track,
  zoom,
  durationInFrames,
  onUpdateTrack,
  onDeleteTrack,
  onSelectItem,
}: {
  track: TimelineTrack
  zoom: number
  durationInFrames: number
  onUpdateTrack: (track: TimelineTrack) => void
  onDeleteTrack: () => void
  onSelectItem: (item: TimelineItem) => void
}) {
  const getItemColor = (item: TimelineItem) => {
    if (item.color) return item.color
    switch (item.type) {
      case 'video': return 'bg-blue-500'
      case 'audio': return 'bg-green-500'
      case 'text': return 'bg-yellow-500'
      case 'image': return 'bg-purple-500'
      case 'shape': return 'bg-pink-500'
      default: return 'bg-gray-500'
    }
  }

  const toggleLock = () => {
    onUpdateTrack({ ...track, locked: !track.locked })
  }

  const toggleVisible = () => {
    onUpdateTrack({ ...track, visible: track.visible === false ? true : false })
  }

  const toggleMute = () => {
    onUpdateTrack({ ...track, muted: !track.muted })
  }

  return (
    <div className="flex border-b">
      {/* Track Header */}
      <div className="w-48 flex-shrink-0 p-2 bg-muted/50 border-r flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <span className="text-sm font-medium truncate flex-1">{track.name}</span>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleLock}
          >
            {track.locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Unlock className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleVisible}
          >
            {track.visible === false ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>

          {track.type === 'audio' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleMute}
            >
              {track.muted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onDeleteTrack}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Track Items */}
      <div 
        className="relative h-12 bg-background flex-1"
        style={{ minWidth: frameToPixels(durationInFrames, zoom) }}
      >
        {track.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'absolute top-1 bottom-1 rounded cursor-pointer',
              'flex items-center px-2 text-white text-xs truncate',
              'hover:ring-2 hover:ring-primary transition-shadow',
              getItemColor(item),
              track.locked && 'opacity-50 cursor-not-allowed',
              track.visible === false && 'opacity-30'
            )}
            style={{
              left: frameToPixels(item.from, zoom),
              width: frameToPixels(item.durationInFrames, zoom),
            }}
            onClick={() => !track.locked && onSelectItem(item)}
          >
            {item.name}
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Timeline Editor
export function TimelineEditor({
  tracks,
  onTracksChange,
  durationInFrames,
  fps,
  currentFrame,
  onSeek,
  className,
  zoom = 2,
}: TimelineEditorProps) {
  const [selectedItem, setSelectedItem] = React.useState<TimelineItem | null>(null)

  const handleUpdateTrack = (index: number, updatedTrack: TimelineTrack) => {
    const newTracks = [...tracks]
    newTracks[index] = updatedTrack
    onTracksChange(newTracks)
  }

  const handleDeleteTrack = (index: number) => {
    const newTracks = tracks.filter((_, i) => i !== index)
    onTracksChange(newTracks)
  }

  const handleAddTrack = (type: TimelineTrack['type']) => {
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${tracks.length + 1}`,
      type,
      items: [],
      visible: true,
      muted: false,
      locked: false,
    }
    onTracksChange([...tracks, newTrack])
  }

  return (
    <div className={cn('flex flex-col border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted border-b">
        <span className="text-sm font-medium">Timeline</span>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddTrack('video')}
        >
          <Plus className="h-4 w-4 mr-1" />
          Vídeo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddTrack('audio')}
        >
          <Plus className="h-4 w-4 mr-1" />
          Áudio
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddTrack('overlay')}
        >
          <Plus className="h-4 w-4 mr-1" />
          Overlay
        </Button>
      </div>

      {/* Timeline Content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {/* Ruler */}
          <div className="flex">
            <div className="w-48 flex-shrink-0 bg-muted border-b border-r" />
            <TimelineRuler
              durationInFrames={durationInFrames}
              fps={fps}
              zoom={zoom}
              currentFrame={currentFrame}
              onSeek={onSeek}
            />
          </div>

          {/* Tracks */}
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p>Nenhuma track. Adicione uma track para começar.</p>
            </div>
          ) : (
            tracks.map((track, index) => (
              <TimelineTrackRow
                key={track.id}
                track={track}
                zoom={zoom}
                durationInFrames={durationInFrames}
                onUpdateTrack={(t) => handleUpdateTrack(index, t)}
                onDeleteTrack={() => handleDeleteTrack(index)}
                onSelectItem={setSelectedItem}
              />
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Footer with zoom and info */}
      <div className="flex items-center justify-between p-2 bg-muted border-t text-xs text-muted-foreground">
        <span>
          {tracks.length} tracks • {tracks.reduce((acc, t) => acc + t.items.length, 0)} items
        </span>
        <span>
          Frame: {currentFrame} / {durationInFrames} ({fps} fps)
        </span>
      </div>
    </div>
  )
}

export type { TimelineItem, TimelineTrack }
