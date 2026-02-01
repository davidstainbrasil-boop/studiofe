'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Plus,
  Search,
  Heart,
  Clock,
  Filter,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface MusicTrack {
  id: string;
  name: string;
  artist?: string;
  duration: number; // seconds
  category: MusicCategory;
  mood: MusicMood;
  tempo: 'slow' | 'medium' | 'fast';
  previewUrl?: string;
  downloadUrl?: string;
  waveform?: number[]; // For visual waveform
  isPremium?: boolean;
  isFavorite?: boolean;
}

type MusicCategory = 
  | 'corporate'
  | 'inspirational'
  | 'ambient'
  | 'cinematic'
  | 'electronic'
  | 'acoustic'
  | 'minimal';

type MusicMood =
  | 'professional'
  | 'uplifting'
  | 'calm'
  | 'energetic'
  | 'serious'
  | 'hopeful'
  | 'neutral';

// Sample music library (in production, fetch from API)
const MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: 'corp-001',
    name: 'Business Forward',
    artist: 'Studio IA',
    duration: 180,
    category: 'corporate',
    mood: 'professional',
    tempo: 'medium',
    waveform: generateWaveform(),
  },
  {
    id: 'corp-002',
    name: 'Clean Presentation',
    artist: 'Studio IA',
    duration: 150,
    category: 'corporate',
    mood: 'neutral',
    tempo: 'slow',
    waveform: generateWaveform(),
  },
  {
    id: 'insp-001',
    name: 'Rising Success',
    artist: 'Studio IA',
    duration: 200,
    category: 'inspirational',
    mood: 'uplifting',
    tempo: 'medium',
    waveform: generateWaveform(),
  },
  {
    id: 'insp-002',
    name: 'Achieve Together',
    artist: 'Studio IA',
    duration: 165,
    category: 'inspirational',
    mood: 'hopeful',
    tempo: 'medium',
    waveform: generateWaveform(),
  },
  {
    id: 'amb-001',
    name: 'Soft Focus',
    artist: 'Studio IA',
    duration: 240,
    category: 'ambient',
    mood: 'calm',
    tempo: 'slow',
    waveform: generateWaveform(),
  },
  {
    id: 'amb-002',
    name: 'Mindful Space',
    artist: 'Studio IA',
    duration: 210,
    category: 'ambient',
    mood: 'calm',
    tempo: 'slow',
    waveform: generateWaveform(),
  },
  {
    id: 'cin-001',
    name: 'Epic Training',
    artist: 'Studio IA',
    duration: 190,
    category: 'cinematic',
    mood: 'serious',
    tempo: 'medium',
    waveform: generateWaveform(),
    isPremium: true,
  },
  {
    id: 'cin-002',
    name: 'Documentary Style',
    artist: 'Studio IA',
    duration: 220,
    category: 'cinematic',
    mood: 'neutral',
    tempo: 'slow',
    waveform: generateWaveform(),
  },
  {
    id: 'elec-001',
    name: 'Tech Innovation',
    artist: 'Studio IA',
    duration: 175,
    category: 'electronic',
    mood: 'energetic',
    tempo: 'fast',
    waveform: generateWaveform(),
  },
  {
    id: 'elec-002',
    name: 'Digital Progress',
    artist: 'Studio IA',
    duration: 160,
    category: 'electronic',
    mood: 'professional',
    tempo: 'medium',
    waveform: generateWaveform(),
  },
  {
    id: 'aco-001',
    name: 'Warm Welcome',
    artist: 'Studio IA',
    duration: 145,
    category: 'acoustic',
    mood: 'hopeful',
    tempo: 'medium',
    waveform: generateWaveform(),
  },
  {
    id: 'min-001',
    name: 'Simple & Clear',
    artist: 'Studio IA',
    duration: 130,
    category: 'minimal',
    mood: 'neutral',
    tempo: 'slow',
    waveform: generateWaveform(),
  },
];

// Generate fake waveform data
function generateWaveform(): number[] {
  return Array.from({ length: 50 }, () => Math.random() * 0.8 + 0.2);
}

// Format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Category labels
const CATEGORY_LABELS: Record<MusicCategory, string> = {
  corporate: 'Corporativo',
  inspirational: 'Inspiracional',
  ambient: 'Ambiente',
  cinematic: 'Cinemático',
  electronic: 'Eletrônico',
  acoustic: 'Acústico',
  minimal: 'Minimalista',
};

// Mood labels
const MOOD_LABELS: Record<MusicMood, string> = {
  professional: 'Profissional',
  uplifting: 'Motivante',
  calm: 'Calmo',
  energetic: 'Energético',
  serious: 'Sério',
  hopeful: 'Esperançoso',
  neutral: 'Neutro',
};

interface MusicLibraryProps {
  onSelectTrack?: (track: MusicTrack) => void;
  selectedTrackId?: string | null;
  className?: string;
}

export function MusicLibrary({
  onSelectTrack,
  selectedTrackId,
  className,
}: MusicLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MusicCategory | 'all'>('all');
  const [moodFilter, setMoodFilter] = useState<MusicMood | 'all'>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentTab, setCurrentTab] = useState<'all' | 'favorites'>('all');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter tracks
  const filteredTracks = MUSIC_LIBRARY.filter((track) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !track.name.toLowerCase().includes(query) &&
        !track.artist?.toLowerCase().includes(query) &&
        !CATEGORY_LABELS[track.category].toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== 'all' && track.category !== categoryFilter) {
      return false;
    }

    // Mood filter
    if (moodFilter !== 'all' && track.mood !== moodFilter) {
      return false;
    }

    // Favorites tab
    if (currentTab === 'favorites' && !favorites.has(track.id)) {
      return false;
    }

    return true;
  });

  // Toggle play/pause
  const togglePlay = (track: MusicTrack) => {
    if (playingTrackId === track.id) {
      setPlayingTrackId(null);
      audioRef.current?.pause();
    } else {
      setPlayingTrackId(track.id);
      // In production, play actual audio
      // audioRef.current?.play();
    }
  };

  // Toggle favorite
  const toggleFavorite = (trackId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(trackId)) {
        newFavorites.delete(trackId);
      } else {
        newFavorites.add(trackId);
      }
      return newFavorites;
    });
  };

  // Select track for project
  const handleSelectTrack = (track: MusicTrack) => {
    onSelectTrack?.(track);
  };

  // Volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Music className="w-5 h-5 text-violet-600" />
            Biblioteca de Músicas
          </h2>
          
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[volume * 100]}
              onValueChange={([v]) => setVolume(v / 100)}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar músicas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as MusicCategory | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={moodFilter}
            onValueChange={(v) => setMoodFilter(v as MusicMood | 'all')}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(MOOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as 'all' | 'favorites')}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              Todas ({MUSIC_LIBRARY.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              <Heart className="w-4 h-4 mr-1" />
              Favoritas ({favorites.size})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma música encontrada</p>
          </div>
        ) : (
          filteredTracks.map((track) => (
            <MusicTrackCard
              key={track.id}
              track={track}
              isPlaying={playingTrackId === track.id}
              isSelected={selectedTrackId === track.id}
              isFavorite={favorites.has(track.id)}
              onTogglePlay={() => togglePlay(track)}
              onToggleFavorite={() => toggleFavorite(track.id)}
              onSelect={() => handleSelectTrack(track)}
            />
          ))
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
}

// Track Card Component
interface MusicTrackCardProps {
  track: MusicTrack;
  isPlaying: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  onTogglePlay: () => void;
  onToggleFavorite: () => void;
  onSelect: () => void;
}

function MusicTrackCard({
  track,
  isPlaying,
  isSelected,
  isFavorite,
  onTogglePlay,
  onToggleFavorite,
  onSelect,
}: MusicTrackCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-lg border transition-all',
        isSelected
          ? 'border-violet-500 bg-violet-50'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Play Button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-10 h-10 rounded-full flex-shrink-0',
            isPlaying && 'bg-violet-100 text-violet-600'
          )}
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{track.name}</span>
            {track.isPremium && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                PRO
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{CATEGORY_LABELS[track.category]}</span>
            <span>•</span>
            <span>{MOOD_LABELS[track.mood]}</span>
          </div>
        </div>

        {/* Waveform visualization */}
        {track.waveform && (
          <div className="hidden md:flex items-center gap-0.5 h-8 w-24">
            {track.waveform.slice(0, 20).map((v, i) => (
              <div
                key={i}
                className={cn(
                  'w-1 rounded-full transition-all',
                  isPlaying ? 'bg-violet-500' : 'bg-slate-300'
                )}
                style={{ height: `${v * 100}%` }}
              />
            ))}
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <Clock className="w-3 h-3" />
          {formatDuration(track.duration)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFavorite}
            className={cn(isFavorite && 'text-red-500')}
          >
            <Heart
              className={cn('w-4 h-4', isFavorite && 'fill-current')}
            />
          </Button>
          
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={onSelect}
            className={cn(isSelected && 'bg-violet-600')}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Selecionada
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Usar
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Export types
export type { MusicCategory, MusicMood };
