/**
 * VoicePicker - Seletor de Voz com preview de áudio
 */
'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect, useRef } from 'react';
import { SelectedVoice } from '../hooks/usePPTXToVideo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search,
  Mic,
  Play,
  Pause,
  Check,
  Loader2,
  Volume2,
  User,
  Star,
} from 'lucide-react';

interface VoicePickerProps {
  selected: SelectedVoice | null;
  onSelect: (voice: SelectedVoice) => void;
}

// Default voices - in production these would come from the TTS service
const DEFAULT_VOICES: SelectedVoice[] = [
  // ElevenLabs PT-BR
  {
    id: 'narrador-profissional',
    name: 'Narrador Profissional',
    provider: 'elevenlabs',
    language: 'pt-BR',
    gender: 'male',
    previewUrl: '/audio/previews/narrador-profissional.mp3',
  },
  {
    id: 'narradora-profissional',
    name: 'Narradora Profissional',
    provider: 'elevenlabs',
    language: 'pt-BR',
    gender: 'female',
    previewUrl: '/audio/previews/narradora-profissional.mp3',
  },
  {
    id: 'instrutor-tecnico',
    name: 'Instrutor Técnico',
    provider: 'elevenlabs',
    language: 'pt-BR',
    gender: 'male',
    previewUrl: '/audio/previews/instrutor-tecnico.mp3',
  },
  {
    id: 'instrutora-tecnica',
    name: 'Instrutora Técnica',
    provider: 'elevenlabs',
    language: 'pt-BR',
    gender: 'female',
    previewUrl: '/audio/previews/instrutora-tecnica.mp3',
  },
  // Azure PT-BR
  {
    id: 'pt-BR-AntonioNeural',
    name: 'Antonio (Neural)',
    provider: 'azure',
    language: 'pt-BR',
    gender: 'male',
    previewUrl: '/audio/previews/antonio-neural.mp3',
  },
  {
    id: 'pt-BR-FranciscaNeural',
    name: 'Francisca (Neural)',
    provider: 'azure',
    language: 'pt-BR',
    gender: 'female',
    previewUrl: '/audio/previews/francisca-neural.mp3',
  },
  // Edge TTS (Free)
  {
    id: 'edge-pt-br-male',
    name: 'Antonio (Edge)',
    provider: 'edge',
    language: 'pt-BR',
    gender: 'male',
  },
  {
    id: 'edge-pt-br-female',
    name: 'Francisca (Edge)',
    provider: 'edge',
    language: 'pt-BR',
    gender: 'female',
  },
  // Google TTS
  {
    id: 'pt-BR-Wavenet-A',
    name: 'Wavenet A',
    provider: 'google',
    language: 'pt-BR',
    gender: 'female',
  },
  {
    id: 'pt-BR-Wavenet-B',
    name: 'Wavenet B',
    provider: 'google',
    language: 'pt-BR',
    gender: 'male',
  },
];

type FilterGender = 'all' | 'male' | 'female';
type FilterProvider = 'all' | 'elevenlabs' | 'azure' | 'edge' | 'google';

const PROVIDER_LABELS: Record<FilterProvider, string> = {
  all: 'Todos',
  elevenlabs: 'ElevenLabs',
  azure: 'Azure',
  edge: 'Edge (Grátis)',
  google: 'Google',
};

const PROVIDER_COLORS: Record<string, string> = {
  elevenlabs: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  azure: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  edge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  google: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function VoicePicker({ selected, onSelect }: VoicePickerProps) {
  const [voices, setVoices] = useState<SelectedVoice[]>(DEFAULT_VOICES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [filterProvider, setFilterProvider] = useState<FilterProvider>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices from API
  useEffect(() => {
    async function fetchVoices() {
      setLoading(true);
      try {
        const response = await fetch('/api/voice/list');
        if (response.ok) {
          const data = await response.json();
          if (data.voices?.length > 0) {
            setVoices(data.voices);
          }
        }
      } catch (error) {
        logger.error('Failed to fetch voices:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVoices();
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

  // Filter voices
  const filteredVoices = voices.filter((voice) => {
    if (search && !voice.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterGender !== 'all' && voice.gender !== filterGender) {
      return false;
    }
    if (filterProvider !== 'all' && voice.provider !== filterProvider) {
      return false;
    }
    return true;
  });

  // Group by recommended
  const recommendedVoices = filteredVoices.filter(
    (v) => v.id.includes('profissional') || v.id.includes('instrutor')
  );
  const otherVoices = filteredVoices.filter(
    (v) => !v.id.includes('profissional') && !v.id.includes('instrutor')
  );

  const playPreview = async (voice: SelectedVoice) => {
    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === voice.id) {
      setPlayingId(null);
      return;
    }

    // Generate preview if no URL
    let audioUrl = voice.previewUrl;
    if (!audioUrl) {
      try {
        const response = await fetch('/api/voice/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceId: voice.id,
            provider: voice.provider,
            text: 'Olá! Esta é uma demonstração da minha voz. Vamos criar vídeos incríveis juntos!',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          audioUrl = data.audioUrl;
        }
      } catch (error) {
        logger.error('Failed to generate preview:', error);
        return;
      }
    }

    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.onerror = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(voice.id);
    }
  };

  const VoiceCard = ({ voice, recommended }: { voice: SelectedVoice; recommended?: boolean }) => (
    <div
      key={voice.id}
      onClick={() => onSelect(voice)}
      className={cn(
        'group relative rounded-lg border-2 p-4 cursor-pointer transition-all',
        selected?.id === voice.id
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-transparent hover:border-muted-foreground/30 bg-muted/30 hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            voice.gender === 'male'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-pink-100 dark:bg-pink-900/30'
          )}
        >
          <User
            className={cn(
              'w-6 h-6',
              voice.gender === 'male' ? 'text-blue-600' : 'text-pink-600'
            )}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{voice.name}</span>
            {recommended && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant="secondary"
              className={cn('text-xs', PROVIDER_COLORS[voice.provider])}
            >
              {PROVIDER_LABELS[voice.provider as FilterProvider] || voice.provider}
            </Badge>
            <span>{voice.language}</span>
            <span>•</span>
            <span>{voice.gender === 'male' ? 'Masculino' : 'Feminino'}</span>
          </div>
        </div>

        {/* Play Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            playPreview(voice);
          }}
          className={cn(
            'shrink-0',
            playingId === voice.id && 'text-blue-500'
          )}
        >
          {playingId === voice.id ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>

        {/* Selected Indicator */}
        {selected?.id === voice.id && (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar voz..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Gender Filter */}
        <div className="flex gap-1">
          {(['all', 'male', 'female'] as const).map((gender) => (
            <Button
              key={gender}
              size="sm"
              variant={filterGender === gender ? 'default' : 'outline'}
              onClick={() => setFilterGender(gender)}
            >
              {gender === 'all' ? 'Todos' : gender === 'male' ? 'Masculino' : 'Feminino'}
            </Button>
          ))}
        </div>
      </div>

      {/* Provider Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'elevenlabs', 'azure', 'edge', 'google'] as const).map((provider) => (
          <Badge
            key={provider}
            variant={filterProvider === provider ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer',
              filterProvider === provider && provider !== 'all' && PROVIDER_COLORS[provider]
            )}
            onClick={() => setFilterProvider(provider)}
          >
            {PROVIDER_LABELS[provider]}
          </Badge>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Voices List */}
      <div className="space-y-4 max-h-[350px] overflow-y-auto">
        {/* Recommended Section */}
        {recommendedVoices.length > 0 && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500" />
              Recomendadas para NR
            </div>
            <div className="space-y-2">
              {recommendedVoices.map((voice) => (
                <VoiceCard key={voice.id} voice={voice} recommended />
              ))}
            </div>
          </div>
        )}

        {/* Other Voices */}
        {otherVoices.length > 0 && (
          <div>
            {recommendedVoices.length > 0 && (
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Outras Vozes
              </div>
            )}
            <div className="space-y-2">
              {otherVoices.map((voice) => (
                <VoiceCard key={voice.id} voice={voice} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No Results */}
      {!loading && filteredVoices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma voz encontrada
        </div>
      )}

      {/* Volume hint */}
      {playingId && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span>Reproduzindo preview...</span>
        </div>
      )}
    </div>
  );
}
