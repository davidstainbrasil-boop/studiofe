/**
 * AvatarPicker - Seletor de Avatar com grid e preview
 */
'use client';

import { useState, useEffect } from 'react';
import { SelectedAvatar } from '../hooks/usePPTXToVideo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, User, Play, Check, Loader2, X } from 'lucide-react';

interface AvatarPickerProps {
  selected: SelectedAvatar | null;
  onSelect: (avatar: SelectedAvatar | null) => void;
}

// Default avatars - in production these would come from an API
const DEFAULT_AVATARS: SelectedAvatar[] = [
  {
    id: 'avatar-1',
    name: 'Lucas',
    mode: 'generic',
    provider: 'heygen',
    thumbnailUrl: '/avatars/lucas.jpg',
    gender: 'male',
    language: 'pt-BR',
  },
  {
    id: 'avatar-2',
    name: 'Ana',
    mode: 'generic',
    provider: 'heygen',
    thumbnailUrl: '/avatars/ana.jpg',
    gender: 'female',
    language: 'pt-BR',
  },
  {
    id: 'avatar-3',
    name: 'Pedro',
    mode: 'generic',
    provider: 'did',
    thumbnailUrl: '/avatars/pedro.jpg',
    gender: 'male',
    language: 'pt-BR',
  },
  {
    id: 'avatar-4',
    name: 'Maria',
    mode: 'generic',
    provider: 'did',
    thumbnailUrl: '/avatars/maria.jpg',
    gender: 'female',
    language: 'pt-BR',
  },
  {
    id: 'avatar-5',
    name: 'Carlos',
    mode: 'generic',
    provider: 'synthesia',
    thumbnailUrl: '/avatars/carlos.jpg',
    gender: 'male',
    language: 'pt-BR',
  },
  {
    id: 'avatar-6',
    name: 'Julia',
    mode: 'generic',
    provider: 'synthesia',
    thumbnailUrl: '/avatars/julia.jpg',
    gender: 'female',
    language: 'pt-BR',
  },
  {
    id: 'avatar-7',
    name: 'Rafael',
    mode: 'generic',
    provider: 'rpm',
    thumbnailUrl: '/avatars/rafael.jpg',
    gender: 'male',
    language: 'pt-BR',
  },
  {
    id: 'avatar-8',
    name: 'Fernanda',
    mode: 'generic',
    provider: 'rpm',
    thumbnailUrl: '/avatars/fernanda.jpg',
    gender: 'female',
    language: 'pt-BR',
  },
];

type FilterGender = 'all' | 'male' | 'female';
type FilterProvider = 'all' | 'heygen' | 'did' | 'synthesia' | 'rpm';

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<SelectedAvatar[]>(DEFAULT_AVATARS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [filterProvider, setFilterProvider] = useState<FilterProvider>('all');
  const [previewAvatar, setPreviewAvatar] = useState<SelectedAvatar | null>(null);

  // Fetch avatars from API
  useEffect(() => {
    async function fetchAvatars() {
      setLoading(true);
      try {
        const response = await fetch('/api/avatars/list');
        if (response.ok) {
          const data = await response.json();
          if (data.avatars?.length > 0) {
            setAvatars(data.avatars);
          }
        }
      } catch (error) {
        // Use default avatars on error
        console.error('Failed to fetch avatars:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAvatars();
  }, []);

  // Filter avatars
  const filteredAvatars = avatars.filter((avatar) => {
    if (search && !avatar.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterGender !== 'all' && avatar.gender !== filterGender) {
      return false;
    }
    if (filterProvider !== 'all' && avatar.provider !== filterProvider) {
      return false;
    }
    return true;
  });

  const handleSelect = (avatar: SelectedAvatar) => {
    if (selected?.id === avatar.id) {
      onSelect(null); // Deselect
    } else {
      onSelect(avatar);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar avatar..."
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
        {(['all', 'heygen', 'did', 'synthesia', 'rpm'] as const).map((provider) => (
          <Badge
            key={provider}
            variant={filterProvider === provider ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterProvider(provider)}
          >
            {provider === 'all'
              ? 'Todos'
              : provider === 'rpm'
                ? 'Ready Player Me'
                : provider.charAt(0).toUpperCase() + provider.slice(1)}
          </Badge>
        ))}
      </div>

      {/* "No Avatar" Option */}
      <div
        onClick={() => onSelect(null)}
        className={cn(
          'p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3',
          selected === null
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
        )}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <X className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium">Sem Avatar</div>
          <div className="text-sm text-muted-foreground">
            Mostrar apenas slides com narração de áudio
          </div>
        </div>
        {selected === null && (
          <Check className="w-5 h-5 text-blue-500 ml-auto" />
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Avatars Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[350px] overflow-y-auto">
        {filteredAvatars.map((avatar) => (
          <div
            key={avatar.id}
            onClick={() => handleSelect(avatar)}
            className={cn(
              'group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all',
              selected?.id === avatar.id
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-transparent hover:border-muted-foreground/30'
            )}
          >
            {/* Thumbnail */}
            <div className="aspect-square bg-muted relative">
              {avatar.thumbnailUrl ? (
                <img
                  src={avatar.thumbnailUrl}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${avatar.name}&size=200&background=6366f1&color=fff`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              {/* Selected Overlay */}
              {selected?.id === avatar.id && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}

              {/* Preview Button */}
              {avatar.previewUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAvatar(avatar);
                  }}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play className="w-4 h-4 text-white" />
                </button>
              )}

              {/* Provider Badge */}
              <Badge
                variant="secondary"
                className="absolute top-2 left-2 text-xs capitalize"
              >
                {avatar.provider}
              </Badge>
            </div>

            {/* Info */}
            <div className="p-2 bg-card">
              <div className="font-medium text-sm truncate">{avatar.name}</div>
              <div className="text-xs text-muted-foreground">
                {avatar.gender === 'male' ? 'Masculino' : 'Feminino'}
                {avatar.language && ` • ${avatar.language}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {!loading && filteredAvatars.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum avatar encontrado
        </div>
      )}

      {/* Preview Modal - simplified */}
      {previewAvatar && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setPreviewAvatar(null)}
        >
          <div
            className="bg-card rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{previewAvatar.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewAvatar(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {previewAvatar.previewUrl && (
              <video
                src={previewAvatar.previewUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
              />
            )}
            <Button
              className="w-full mt-4"
              onClick={() => {
                handleSelect(previewAvatar);
                setPreviewAvatar(null);
              }}
            >
              Selecionar Avatar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
