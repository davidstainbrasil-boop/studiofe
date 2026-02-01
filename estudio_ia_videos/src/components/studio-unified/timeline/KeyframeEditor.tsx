'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Key,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Circle,
  Square,
  Move,
  RotateCw,
  Maximize2,
  Palette,
  Eye,
  Volume2,
  MoreHorizontal,
  Copy,
  Clipboard,
  Layers,
  Zap,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Keyframe {
  id: string;
  time: number; // in seconds
  value: number | string | Record<string, number>;
  easing: EasingType;
}

interface KeyframeTrack {
  id: string;
  property: AnimatableProperty;
  label: string;
  keyframes: Keyframe[];
  color: string;
  visible: boolean;
  locked: boolean;
}

type AnimatableProperty =
  | 'position.x'
  | 'position.y'
  | 'scale'
  | 'rotation'
  | 'opacity'
  | 'volume';

type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic'
  | 'spring';

interface KeyframeEditorProps {
  elementId?: string;
  elementType?: 'video' | 'image' | 'text' | 'shape' | 'audio';
  duration?: number; // in seconds
  currentTime?: number;
  onTimeChange?: (time: number) => void;
  onKeyframeAdd?: (track: string, time: number, value: unknown) => void;
  onKeyframeUpdate?: (track: string, keyframeId: string, changes: Partial<Keyframe>) => void;
  onKeyframeDelete?: (track: string, keyframeId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROPERTY_CONFIG: Record<
  AnimatableProperty,
  { label: string; icon: React.ElementType; color: string; unit: string }
> = {
  'position.x': { label: 'Posição X', icon: Move, color: '#EF4444', unit: 'px' },
  'position.y': { label: 'Posição Y', icon: Move, color: '#F97316', unit: 'px' },
  scale: { label: 'Escala', icon: Maximize2, color: '#22C55E', unit: '%' },
  rotation: { label: 'Rotação', icon: RotateCw, color: '#3B82F6', unit: '°' },
  opacity: { label: 'Opacidade', icon: Eye, color: '#8B5CF6', unit: '%' },
  volume: { label: 'Volume', icon: Volume2, color: '#EC4899', unit: '%' },
};

const EASING_OPTIONS: Array<{ value: EasingType; label: string; icon: React.ElementType }> = [
  { value: 'linear', label: 'Linear', icon: Square },
  { value: 'ease-in', label: 'Ease In', icon: Circle },
  { value: 'ease-out', label: 'Ease Out', icon: Circle },
  { value: 'ease-in-out', label: 'Ease In-Out', icon: Diamond },
  { value: 'bounce', label: 'Bounce', icon: Zap },
  { value: 'elastic', label: 'Elastic', icon: Zap },
  { value: 'spring', label: 'Spring', icon: Zap },
];

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TRACKS: KeyframeTrack[] = [
  {
    id: 'track-pos-x',
    property: 'position.x',
    label: 'Posição X',
    color: '#EF4444',
    visible: true,
    locked: false,
    keyframes: [
      { id: 'kf-1', time: 0, value: 0, easing: 'ease-out' },
      { id: 'kf-2', time: 2, value: 200, easing: 'ease-in-out' },
      { id: 'kf-3', time: 5, value: 100, easing: 'linear' },
    ],
  },
  {
    id: 'track-pos-y',
    property: 'position.y',
    label: 'Posição Y',
    color: '#F97316',
    visible: true,
    locked: false,
    keyframes: [
      { id: 'kf-4', time: 0, value: 0, easing: 'linear' },
      { id: 'kf-5', time: 3, value: -50, easing: 'bounce' },
    ],
  },
  {
    id: 'track-scale',
    property: 'scale',
    label: 'Escala',
    color: '#22C55E',
    visible: true,
    locked: false,
    keyframes: [
      { id: 'kf-6', time: 0, value: 100, easing: 'linear' },
      { id: 'kf-7', time: 1.5, value: 120, easing: 'elastic' },
      { id: 'kf-8', time: 4, value: 100, easing: 'ease-out' },
    ],
  },
  {
    id: 'track-opacity',
    property: 'opacity',
    label: 'Opacidade',
    color: '#8B5CF6',
    visible: true,
    locked: false,
    keyframes: [
      { id: 'kf-9', time: 0, value: 0, easing: 'ease-in' },
      { id: 'kf-10', time: 0.5, value: 100, easing: 'linear' },
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getEasingCurve(easing: EasingType): string {
  const curves: Record<EasingType, string> = {
    linear: 'M0,100 L100,0',
    'ease-in': 'M0,100 C30,100 60,0 100,0',
    'ease-out': 'M0,100 C40,100 70,0 100,0',
    'ease-in-out': 'M0,100 C25,100 25,0 50,0 C75,0 75,100 100,0',
    bounce: 'M0,100 L30,20 L45,60 L60,35 L75,50 L100,0',
    elastic: 'M0,100 C20,100 30,-20 50,0 C70,20 80,100 100,0',
    spring: 'M0,100 C20,80 40,-10 60,0 C80,10 90,95 100,0',
  };
  return curves[easing];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function KeyframeMarker({
  keyframe,
  isSelected,
  color,
  onClick,
  onDoubleClick,
}: {
  keyframe: Keyframe;
  isSelected: boolean;
  color: string;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      className={`absolute -translate-x-1/2 cursor-pointer transition-transform hover:scale-125 ${
        isSelected ? 'scale-125' : ''
      }`}
      style={{ left: `${(keyframe.time / 10) * 100}%` }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <Diamond
        className="h-3 w-3"
        fill={isSelected ? color : 'transparent'}
        stroke={color}
        strokeWidth={2}
      />
    </div>
  );
}

function EasingPreview({ easing }: { easing: EasingType }) {
  return (
    <svg viewBox="0 0 100 100" className="w-12 h-12 bg-muted rounded">
      <path
        d={getEasingCurve(easing)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
      />
    </svg>
  );
}

function TrackRow({
  track,
  selectedKeyframeId,
  onSelectKeyframe,
  onAddKeyframe,
  onDeleteKeyframe,
  currentTime,
  duration,
}: {
  track: KeyframeTrack;
  selectedKeyframeId: string | null;
  onSelectKeyframe: (id: string | null) => void;
  onAddKeyframe: (time: number) => void;
  onDeleteKeyframe: (keyframeId: string) => void;
  currentTime: number;
  duration: number;
}) {
  const config = PROPERTY_CONFIG[track.property];
  const Icon = config.icon;

  return (
    <div className="flex items-stretch border-b last:border-b-0">
      {/* Track Label */}
      <div className="w-32 flex-shrink-0 p-2 border-r bg-muted/30">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: track.color }}
          />
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium truncate">{track.label}</span>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] h-4">
            {track.keyframes.length} keys
          </Badge>
        </div>
      </div>

      {/* Timeline Area */}
      <div
        className="flex-1 relative h-10 bg-muted/10 cursor-crosshair"
        onDoubleClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const time = (x / rect.width) * duration;
          onAddKeyframe(time);
        }}
      >
        {/* Grid lines */}
        {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border/50"
            style={{ left: `${(i / duration) * 100}%` }}
          />
        ))}

        {/* Keyframe markers */}
        <div className="absolute inset-0 flex items-center">
          {track.keyframes.map((kf) => (
            <KeyframeMarker
              key={kf.id}
              keyframe={kf}
              isSelected={selectedKeyframeId === kf.id}
              color={track.color}
              onClick={() => onSelectKeyframe(kf.id)}
              onDoubleClick={() => onDeleteKeyframe(kf.id)}
            />
          ))}
        </div>

        {/* Interpolation lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {track.keyframes.slice(0, -1).map((kf, i) => {
            const nextKf = track.keyframes[i + 1];
            const x1 = (kf.time / duration) * 100;
            const x2 = (nextKf.time / duration) * 100;
            return (
              <line
                key={`line-${kf.id}`}
                x1={`${x1}%`}
                y1="50%"
                x2={`${x2}%`}
                y2="50%"
                stroke={track.color}
                strokeWidth="1"
                strokeDasharray={kf.easing === 'linear' ? '0' : '3,2'}
                opacity="0.5"
              />
            );
          })}
        </svg>

        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>
    </div>
  );
}

function KeyframeInspector({
  keyframe,
  track,
  onUpdate,
  onDelete,
}: {
  keyframe: Keyframe;
  track: KeyframeTrack;
  onUpdate: (changes: Partial<Keyframe>) => void;
  onDelete: () => void;
}) {
  const config = PROPERTY_CONFIG[track.property];

  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Keyframe
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Clipboard className="h-4 w-4 mr-2" />
                Colar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-4">
        {/* Time */}
        <div className="space-y-1">
          <Label className="text-xs">Tempo</Label>
          <Input
            type="number"
            value={keyframe.time}
            onChange={(e) => onUpdate({ time: parseFloat(e.target.value) })}
            step="0.1"
            min="0"
            className="h-8"
          />
        </div>

        {/* Value */}
        <div className="space-y-1">
          <Label className="text-xs">
            Valor ({config.unit})
          </Label>
          <Input
            type="number"
            value={keyframe.value as number}
            onChange={(e) => onUpdate({ value: parseFloat(e.target.value) })}
            className="h-8"
          />
        </div>

        {/* Easing */}
        <div className="space-y-2">
          <Label className="text-xs">Easing</Label>
          <Select
            value={keyframe.easing}
            onValueChange={(v) => onUpdate({ easing: v as EasingType })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EASING_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Easing Preview */}
          <div className="flex justify-center">
            <EasingPreview easing={keyframe.easing} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KeyframeEditor({
  elementId,
  elementType = 'video',
  duration = 10,
  currentTime = 0,
  onTimeChange,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeDelete,
}: KeyframeEditorProps) {
  const [tracks, setTracks] = useState<KeyframeTrack[]>(MOCK_TRACKS);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [playheadTime, setPlayheadTime] = useState(currentTime);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedKeyframe = useMemo(() => {
    for (const track of tracks) {
      const kf = track.keyframes.find((k) => k.id === selectedKeyframeId);
      if (kf) return { keyframe: kf, track };
    }
    return null;
  }, [tracks, selectedKeyframeId]);

  const handleAddKeyframe = useCallback(
    (trackId: string, time: number) => {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id !== trackId) return track;
          const newKf: Keyframe = {
            id: `kf-${Date.now()}`,
            time: Math.round(time * 10) / 10,
            value: 0,
            easing: 'ease-in-out',
          };
          return {
            ...track,
            keyframes: [...track.keyframes, newKf].sort((a, b) => a.time - b.time),
          };
        })
      );
      onKeyframeAdd?.(trackId, time, 0);
    },
    [onKeyframeAdd]
  );

  const handleUpdateKeyframe = useCallback(
    (trackId: string, keyframeId: string, changes: Partial<Keyframe>) => {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id !== trackId) return track;
          return {
            ...track,
            keyframes: track.keyframes
              .map((kf) => (kf.id === keyframeId ? { ...kf, ...changes } : kf))
              .sort((a, b) => a.time - b.time),
          };
        })
      );
      onKeyframeUpdate?.(trackId, keyframeId, changes);
    },
    [onKeyframeUpdate]
  );

  const handleDeleteKeyframe = useCallback(
    (trackId: string, keyframeId: string) => {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id !== trackId) return track;
          return {
            ...track,
            keyframes: track.keyframes.filter((kf) => kf.id !== keyframeId),
          };
        })
      );
      if (selectedKeyframeId === keyframeId) {
        setSelectedKeyframeId(null);
      }
      onKeyframeDelete?.(trackId, keyframeId);
    },
    [selectedKeyframeId, onKeyframeDelete]
  );

  const addPropertyTrack = (property: AnimatableProperty) => {
    const config = PROPERTY_CONFIG[property];
    const newTrack: KeyframeTrack = {
      id: `track-${property}-${Date.now()}`,
      property,
      label: config.label,
      color: config.color,
      visible: true,
      locked: false,
      keyframes: [],
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  const availableProperties = Object.keys(PROPERTY_CONFIG).filter(
    (prop) => !tracks.some((t) => t.property === prop)
  ) as AnimatableProperty[];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          <span className="font-medium text-sm">Keyframe Editor</span>
          {elementId && (
            <Badge variant="secondary" className="text-xs">
              {elementType}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {availableProperties.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Propriedade
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableProperties.map((prop) => {
                  const config = PROPERTY_CONFIG[prop];
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={prop}
                      onClick={() => addPropertyTrack(prop)}
                    >
                      <Icon className="h-4 w-4 mr-2" style={{ color: config.color }} />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Time Ruler */}
      <div className="flex border-b bg-muted/30">
        <div className="w-32 flex-shrink-0 border-r" />
        <div className="flex-1 relative h-6">
          {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${(i / duration) * 100}%` }}
            >
              <div className="h-2 w-px bg-border" />
              <span className="text-[9px] text-muted-foreground">{i}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 flex overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="min-w-[600px]">
            {tracks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma propriedade animada</p>
                <p className="text-xs">Adicione uma propriedade para começar</p>
              </div>
            ) : (
              tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  selectedKeyframeId={selectedKeyframeId}
                  onSelectKeyframe={setSelectedKeyframeId}
                  onAddKeyframe={(time) => handleAddKeyframe(track.id, time)}
                  onDeleteKeyframe={(kfId) => handleDeleteKeyframe(track.id, kfId)}
                  currentTime={playheadTime}
                  duration={duration}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Inspector Panel */}
        {selectedKeyframe && (
          <div className="w-56 border-l bg-muted/10 p-2">
            <KeyframeInspector
              keyframe={selectedKeyframe.keyframe}
              track={selectedKeyframe.track}
              onUpdate={(changes) =>
                handleUpdateKeyframe(
                  selectedKeyframe.track.id,
                  selectedKeyframe.keyframe.id,
                  changes
                )
              }
              onDelete={() =>
                handleDeleteKeyframe(
                  selectedKeyframe.track.id,
                  selectedKeyframe.keyframe.id
                )
              }
            />
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between p-3 border-t bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono">{formatTime(playheadTime)}</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-mono text-muted-foreground">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Key className="h-3 w-3 mr-1" />
            Add Key
          </Button>
        </div>
      </div>
    </div>
  );
}

export default KeyframeEditor;
