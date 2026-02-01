'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Volume2,
  VolumeX,
  Volume1,
  Music,
  Mic,
  SlidersHorizontal,
  Waves,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  MoreHorizontal,
  Headphones,
  Disc,
  Radio,
  AudioWaveform,
  Link,
  Link2Off,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// TYPES
// ============================================================================

interface AudioTrack {
  id: string;
  name: string;
  type: 'video' | 'music' | 'voice' | 'sfx';
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  effects: AudioEffect[];
}

interface AudioEffect {
  id: string;
  type: 'eq' | 'compressor' | 'reverb' | 'noise-gate' | 'limiter';
  enabled: boolean;
  params: Record<string, number>;
}

interface MasterSettings {
  volume: number;
  muted: boolean;
  limiter: boolean;
  normalize: boolean;
}

interface AudioMixerProps {
  tracks?: AudioTrack[];
  onTrackChange?: (trackId: string, changes: Partial<AudioTrack>) => void;
  onMasterChange?: (changes: Partial<MasterSettings>) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TRACKS: AudioTrack[] = [
  {
    id: 'track-video',
    name: 'Vídeo Principal',
    type: 'video',
    color: '#3B82F6',
    volume: 85,
    pan: 0,
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    effects: [
      { id: 'eq-1', type: 'eq', enabled: true, params: { low: 0, mid: 2, high: 1 } },
    ],
  },
  {
    id: 'track-music',
    name: 'Música de Fundo',
    type: 'music',
    color: '#8B5CF6',
    volume: 45,
    pan: 0,
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    effects: [],
  },
  {
    id: 'track-voice',
    name: 'Narração',
    type: 'voice',
    color: '#10B981',
    volume: 100,
    pan: 0,
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    effects: [
      { id: 'comp-1', type: 'compressor', enabled: true, params: { threshold: -18, ratio: 4 } },
      { id: 'ng-1', type: 'noise-gate', enabled: true, params: { threshold: -45 } },
    ],
  },
  {
    id: 'track-sfx',
    name: 'Efeitos Sonoros',
    type: 'sfx',
    color: '#F59E0B',
    volume: 70,
    pan: 0,
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    effects: [],
  },
];

const DEFAULT_MASTER: MasterSettings = {
  volume: 100,
  muted: false,
  limiter: true,
  normalize: false,
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
  if (muted || volume === 0) return <VolumeX className="h-4 w-4" />;
  if (volume < 50) return <Volume1 className="h-4 w-4" />;
  return <Volume2 className="h-4 w-4" />;
}

function TrackTypeIcon({ type }: { type: AudioTrack['type'] }) {
  switch (type) {
    case 'video':
      return <Disc className="h-4 w-4" />;
    case 'music':
      return <Music className="h-4 w-4" />;
    case 'voice':
      return <Mic className="h-4 w-4" />;
    case 'sfx':
      return <Radio className="h-4 w-4" />;
  }
}

function VolumeSlider({
  value,
  onChange,
  vertical = false,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  vertical?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={vertical ? 'h-32 flex justify-center' : 'w-full'}>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={120}
        step={1}
        disabled={disabled}
        orientation={vertical ? 'vertical' : 'horizontal'}
        className={vertical ? '[&>span]:h-full' : ''}
      />
    </div>
  );
}

function PanKnob({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground">L</span>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={-100}
        max={100}
        step={1}
        disabled={disabled}
        className="w-20"
      />
      <span className="text-[10px] text-muted-foreground">R</span>
    </div>
  );
}

function LevelMeter({ level }: { level: number }) {
  const normalizedLevel = Math.min(100, Math.max(0, level));
  const isClipping = normalizedLevel > 95;

  return (
    <div className="h-full w-2 bg-muted rounded-full overflow-hidden relative">
      <div
        className={`absolute bottom-0 w-full transition-all duration-75 rounded-full ${
          isClipping ? 'bg-red-500' : normalizedLevel > 75 ? 'bg-yellow-500' : 'bg-green-500'
        }`}
        style={{ height: `${normalizedLevel}%` }}
      />
      {/* Peak indicator */}
      <div
        className="absolute w-full h-0.5 bg-white/50"
        style={{ bottom: `${Math.min(100, normalizedLevel + 5)}%` }}
      />
    </div>
  );
}

// ============================================================================
// TRACK STRIP
// ============================================================================

function TrackStrip({
  track,
  onChange,
  isExpanded,
  onToggleExpand,
}: {
  track: AudioTrack;
  onChange: (changes: Partial<AudioTrack>) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  // Simulate audio level
  const [level] = useState(() => track.muted ? 0 : Math.random() * 40 + track.volume * 0.6);

  return (
    <Card className={`${track.solo ? 'ring-2 ring-yellow-500' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        {/* Header */}
        <div className="flex items-center gap-2 p-2 border-b">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Track Info */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: track.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <TrackTypeIcon type={track.type} />
              <span className="text-sm font-medium truncate">{track.name}</span>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant={track.muted ? 'destructive' : 'ghost'}
              size="icon"
              className="h-6 w-6"
              onClick={() => onChange({ muted: !track.muted })}
            >
              <VolumeIcon volume={track.volume} muted={track.muted} />
            </Button>
            <Button
              variant={track.solo ? 'default' : 'ghost'}
              size="icon"
              className={`h-6 w-6 ${track.solo ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
              onClick={() => onChange({ solo: !track.solo })}
            >
              <Headphones className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onChange({ locked: !track.locked })}
            >
              {track.locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  {track.visible ? 'Ocultar' : 'Mostrar'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Waves className="h-4 w-4 mr-2" />
                  Adicionar Efeito
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Remover Track
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Compact View */}
        <div className="p-2">
          <div className="flex items-center gap-3">
            {/* Level Meter */}
            <div className="flex gap-0.5 h-8">
              <LevelMeter level={track.muted ? 0 : level} />
              <LevelMeter level={track.muted ? 0 : level * 0.95} />
            </div>

            {/* Volume Slider */}
            <div className="flex-1">
              <VolumeSlider
                value={track.volume}
                onChange={(v) => onChange({ volume: v })}
                disabled={track.locked}
              />
            </div>

            {/* Volume Value */}
            <div className="w-10 text-right">
              <span className="text-xs font-mono">
                {track.volume > 100 ? '+' : ''}{track.volume - 100}dB
              </span>
            </div>
          </div>
        </div>

        {/* Expanded View */}
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-4">
            <Separator />

            {/* Pan Control */}
            <div className="space-y-2">
              <Label className="text-xs">Pan (L/R)</Label>
              <div className="flex items-center gap-2">
                <PanKnob
                  value={track.pan}
                  onChange={(v) => onChange({ pan: v })}
                  disabled={track.locked}
                />
                <span className="text-xs font-mono w-8 text-center">
                  {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(track.pan)}` : `R${track.pan}`}
                </span>
              </div>
            </div>

            {/* Effects */}
            {track.effects.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Efeitos Ativos</Label>
                <div className="space-y-1">
                  {track.effects.map((effect) => (
                    <div
                      key={effect.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <AudioWaveform className="h-3 w-3" />
                        <span className="text-xs capitalize">{effect.type.replace('-', ' ')}</span>
                      </div>
                      <Switch
                        checked={effect.enabled}
                        onCheckedChange={() => {}}
                        disabled={track.locked}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EQ Quick Controls */}
            <div className="space-y-2">
              <Label className="text-xs">Equalização Rápida</Label>
              <div className="grid grid-cols-3 gap-2">
                {['Low', 'Mid', 'High'].map((band) => (
                  <div key={band} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-muted-foreground">{band}</span>
                      <span className="text-[10px] font-mono">0dB</span>
                    </div>
                    <Slider
                      defaultValue={[0]}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={track.locked}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// MASTER SECTION
// ============================================================================

function MasterSection({
  settings,
  onChange,
}: {
  settings: MasterSettings;
  onChange: (changes: Partial<MasterSettings>) => void;
}) {
  const [masterLevel] = useState(75);

  return (
    <Card className="bg-muted/50">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Waves className="h-4 w-4" />
          Master Output
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-4">
        {/* Master Volume with Level Meter */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1 h-12">
            <LevelMeter level={settings.muted ? 0 : masterLevel} />
            <LevelMeter level={settings.muted ? 0 : masterLevel * 0.98} />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Volume Master</Label>
              <span className="text-xs font-mono">
                {settings.volume > 100 ? '+' : ''}{settings.volume - 100}dB
              </span>
            </div>
            <VolumeSlider
              value={settings.volume}
              onChange={(v) => onChange({ volume: v })}
            />
          </div>

          <Button
            variant={settings.muted ? 'destructive' : 'outline'}
            size="icon"
            onClick={() => onChange({ muted: !settings.muted })}
          >
            <VolumeIcon volume={settings.volume} muted={settings.muted} />
          </Button>
        </div>

        <Separator />

        {/* Master Effects */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Limiter</Label>
              <p className="text-[10px] text-muted-foreground">Previne clipping</p>
            </div>
            <Switch
              checked={settings.limiter}
              onCheckedChange={(v) => onChange({ limiter: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Normalizar</Label>
              <p className="text-[10px] text-muted-foreground">Auto-level</p>
            </div>
            <Switch
              checked={settings.normalize}
              onCheckedChange={(v) => onChange({ normalize: v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AudioMixer({
  tracks: initialTracks,
  onTrackChange,
  onMasterChange,
}: AudioMixerProps) {
  const [tracks, setTracks] = useState<AudioTrack[]>(initialTracks || MOCK_TRACKS);
  const [masterSettings, setMasterSettings] = useState<MasterSettings>(DEFAULT_MASTER);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [isLinked, setIsLinked] = useState(false);

  const handleTrackChange = useCallback(
    (trackId: string, changes: Partial<AudioTrack>) => {
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, ...changes } : t))
      );
      onTrackChange?.(trackId, changes);
    },
    [onTrackChange]
  );

  const handleMasterChange = useCallback(
    (changes: Partial<MasterSettings>) => {
      setMasterSettings((prev) => ({ ...prev, ...changes }));
      onMasterChange?.(changes);
    },
    [onMasterChange]
  );

  const toggleExpanded = (trackId: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const muteAll = () => {
    setTracks((prev) => prev.map((t) => ({ ...t, muted: true })));
  };

  const unmuteAll = () => {
    setTracks((prev) => prev.map((t) => ({ ...t, muted: false, solo: false })));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="font-medium text-sm">Audio Mixer</span>
          <Badge variant="secondary" className="text-xs">
            {tracks.length} tracks
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsLinked(!isLinked)}
          >
            {isLinked ? (
              <Link className="h-3 w-3 mr-1" />
            ) : (
              <Link2Off className="h-3 w-3 mr-1" />
            )}
            {isLinked ? 'Linked' : 'Unlinked'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={muteAll}>
            <VolumeX className="h-3 w-3 mr-1" />
            Mute All
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={unmuteAll}>
            <Volume2 className="h-3 w-3 mr-1" />
            Unmute All
          </Button>
        </div>
      </div>

      {/* Tracks */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {tracks.map((track) => (
            <TrackStrip
              key={track.id}
              track={track}
              onChange={(changes) => handleTrackChange(track.id, changes)}
              isExpanded={expandedTracks.has(track.id)}
              onToggleExpand={() => toggleExpanded(track.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Master Section */}
      <div className="p-3 border-t">
        <MasterSection settings={masterSettings} onChange={handleMasterChange} />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2 p-3 border-t bg-muted/30">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="default" size="icon" className="h-10 w-10">
          <Play className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default AudioMixer;
