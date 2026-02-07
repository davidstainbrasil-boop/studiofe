/**
 * MusicPicker - Seletor de Música de fundo com controle de volume
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import type { MusicTrack, MusicCategory, MusicMood } from '@/lib/audio/music-library';
import { getMusicLibrary, getCategoryDisplayName, getMoodDisplayName, formatDuration } from '@/lib/audio/music-library';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Music,
  Play,
  Pause,
  Check,
  Volume2,
  VolumeX,
  X,
  Clock,
} from 'lucide-react';

interface MusicPickerProps {
  selected: MusicTrack | null;
  onSelect: (track: MusicTrack | null) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const CATEGORY_ICONS: Record<MusicCategory, string> = {
  corporate: '🏢',
  training: '📚',
  motivational: '🚀',
  ambient: '🌿',
  technology: '💻',
  documentary: '🎬',
  uplifting: '☀️',
  calm: '🌊',
};

export function MusicPicker({ selected, onSelect, volume, onVolumeChange }: MusicPickerProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playlists, setPlaylists] = useState<{ id: string; name: string; description: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<MusicCategory | 'all'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load music library
  useEffect(() => {
    const library = getMusicLibrary();
    setTracks(library.getAllTracks());
    setPlaylists(library.getAllPlaylists());
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Filter tracks by category
  const filteredTracks =
    activeCategory === 'all'
      ? tracks
      : tracks.filter((t) => t.category === activeCategory);

  // Get unique categories from tracks
  const categories = Array.from(new Set(tracks.map((t) => t.category)));

  const playPreview = (track: MusicTrack) => {
    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === track.id) {
      setPlayingId(null);
      return;
    }

    const audioUrl = track.previewUrl || track.url;
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = volume / 100;
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.onerror = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(track.id);
    }
  };

  // Update audio volume when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  return (
    <div className="space-y-4">
      {/* "No Music" Option */}
      <div
        onClick={() => onSelect(null)}
        className={cn(
          'p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3',
          selected === null
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
        )}
      >
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
          <VolumeX className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium">Sem Música de Fundo</div>
          <div className="text-sm text-muted-foreground">
            Vídeo apenas com narração
          </div>
        </div>
        {selected === null && <Check className="w-5 h-5 text-blue-500 ml-auto" />}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActiveCategory('all')}
        >
          Todas
        </Badge>
        {categories.map((category) => (
          <Badge
            key={category}
            variant={activeCategory === category ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveCategory(category)}
          >
            {CATEGORY_ICONS[category]} {getCategoryDisplayName(category)}
          </Badge>
        ))}
      </div>

      {/* Volume Control - only show when music is selected */}
      {selected && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Volume2 className="w-5 h-5 text-muted-foreground shrink-0" />
          <Slider
            value={[volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            min={0}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-sm font-medium w-12 text-right">{volume}%</span>
          <div className="text-xs text-muted-foreground">
            (Baixa durante narração)
          </div>
        </div>
      )}

      {/* Tracks List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {filteredTracks.map((track) => (
          <div
            key={track.id}
            onClick={() => onSelect(track)}
            className={cn(
              'group rounded-lg border-2 p-4 cursor-pointer transition-all',
              selected?.id === track.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                : 'border-transparent hover:border-muted-foreground/30 bg-muted/30 hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl">
                {CATEGORY_ICONS[track.category]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{track.title}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{track.artist}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(track.duration)}
                  </span>
                  <span>•</span>
                  <span>{track.bpm} BPM</span>
                </div>
                <div className="flex gap-1 mt-1">
                  {track.mood.slice(0, 3).map((mood) => (
                    <Badge key={mood} variant="secondary" className="text-xs">
                      {getMoodDisplayName(mood)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Play Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  playPreview(track);
                }}
                className={cn(
                  'shrink-0',
                  playingId === track.id && 'text-blue-500'
                )}
              >
                {playingId === track.id ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              {/* Selected Indicator */}
              {selected?.id === track.id && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredTracks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma música encontrada</p>
        </div>
      )}

      {/* Playing indicator */}
      {playingId && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full animate-pulse"
                style={{
                  height: `${8 + Math.random() * 8}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <span>Reproduzindo preview...</span>
        </div>
      )}
    </div>
  );
}
