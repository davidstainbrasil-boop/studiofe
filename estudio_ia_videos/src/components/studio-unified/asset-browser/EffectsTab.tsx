'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Sparkles,
  Film,
  Wand2,
  Layers,
  Palette,
  Zap,
  Clock,
  ArrowRight,
  Play,
  Plus,
  Star,
  Heart,
  Filter,
  Grid3X3,
  List,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Effect {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  thumbnail: string;
  isPro: boolean;
  isNew: boolean;
  isFavorite: boolean;
  duration?: number; // For transitions
  previewUrl?: string;
}

type EffectCategory = 
  | 'filters'
  | 'transitions'
  | 'overlays'
  | 'text-animations'
  | 'color-grades'
  | 'motion';

interface EffectsTabProps {
  onApplyEffect: (effect: Effect) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const EFFECT_CATEGORIES: Array<{
  id: EffectCategory;
  label: string;
  icon: React.ElementType;
  count: number;
}> = [
  { id: 'filters', label: 'Filtros', icon: Palette, count: 24 },
  { id: 'transitions', label: 'Transições', icon: ArrowRight, count: 18 },
  { id: 'overlays', label: 'Overlays', icon: Layers, count: 15 },
  { id: 'text-animations', label: 'Texto Animado', icon: Zap, count: 12 },
  { id: 'color-grades', label: 'Color Grades', icon: Wand2, count: 20 },
  { id: 'motion', label: 'Motion FX', icon: Film, count: 16 },
];

const MOCK_EFFECTS: Effect[] = [
  // Filters
  {
    id: 'filter-1',
    name: 'Cinematic',
    description: 'Visual cinematográfico com tons azulados',
    category: 'filters',
    thumbnail: '/effects/cinematic.jpg',
    isPro: false,
    isNew: false,
    isFavorite: true,
  },
  {
    id: 'filter-2',
    name: 'Vintage',
    description: 'Efeito retrô com granulação',
    category: 'filters',
    thumbnail: '/effects/vintage.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'filter-3',
    name: 'Noir',
    description: 'Alto contraste preto e branco',
    category: 'filters',
    thumbnail: '/effects/noir.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'filter-4',
    name: 'Teal & Orange',
    description: 'Look Hollywood blockbuster',
    category: 'filters',
    thumbnail: '/effects/teal-orange.jpg',
    isPro: true,
    isNew: true,
    isFavorite: false,
  },
  {
    id: 'filter-5',
    name: 'Warm Sunset',
    description: 'Tons quentes de pôr do sol',
    category: 'filters',
    thumbnail: '/effects/warm-sunset.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'filter-6',
    name: 'Cold Blue',
    description: 'Tons frios e azulados',
    category: 'filters',
    thumbnail: '/effects/cold-blue.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  // Transitions
  {
    id: 'trans-1',
    name: 'Fade',
    description: 'Transição suave com fade',
    category: 'transitions',
    thumbnail: '/effects/fade.jpg',
    isPro: false,
    isNew: false,
    isFavorite: true,
    duration: 0.5,
  },
  {
    id: 'trans-2',
    name: 'Dissolve',
    description: 'Dissolve entre clips',
    category: 'transitions',
    thumbnail: '/effects/dissolve.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
    duration: 0.75,
  },
  {
    id: 'trans-3',
    name: 'Slide Left',
    description: 'Desliza da direita para esquerda',
    category: 'transitions',
    thumbnail: '/effects/slide-left.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
    duration: 0.5,
  },
  {
    id: 'trans-4',
    name: 'Zoom Blur',
    description: 'Zoom com desfoque de movimento',
    category: 'transitions',
    thumbnail: '/effects/zoom-blur.jpg',
    isPro: true,
    isNew: true,
    isFavorite: false,
    duration: 0.75,
  },
  {
    id: 'trans-5',
    name: 'Glitch',
    description: 'Efeito glitch digital',
    category: 'transitions',
    thumbnail: '/effects/glitch-trans.jpg',
    isPro: true,
    isNew: false,
    isFavorite: false,
    duration: 0.5,
  },
  {
    id: 'trans-6',
    name: 'Wipe Clock',
    description: 'Wipe estilo relógio',
    category: 'transitions',
    thumbnail: '/effects/wipe-clock.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
    duration: 1,
  },
  // Overlays
  {
    id: 'overlay-1',
    name: 'Light Leaks',
    description: 'Vazamentos de luz cinematográficos',
    category: 'overlays',
    thumbnail: '/effects/light-leaks.jpg',
    isPro: false,
    isNew: false,
    isFavorite: true,
  },
  {
    id: 'overlay-2',
    name: 'Film Grain',
    description: 'Granulação de filme 35mm',
    category: 'overlays',
    thumbnail: '/effects/film-grain.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'overlay-3',
    name: 'Dust & Scratches',
    description: 'Arranhões e poeira vintage',
    category: 'overlays',
    thumbnail: '/effects/dust-scratches.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'overlay-4',
    name: 'Bokeh',
    description: 'Luzes bokeh flutuantes',
    category: 'overlays',
    thumbnail: '/effects/bokeh.jpg',
    isPro: true,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'overlay-5',
    name: 'VHS Scanlines',
    description: 'Linhas de scan estilo VHS',
    category: 'overlays',
    thumbnail: '/effects/vhs-lines.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  // Text Animations
  {
    id: 'text-1',
    name: 'Typewriter',
    description: 'Texto digitado letra por letra',
    category: 'text-animations',
    thumbnail: '/effects/typewriter.jpg',
    isPro: false,
    isNew: false,
    isFavorite: true,
  },
  {
    id: 'text-2',
    name: 'Bounce In',
    description: 'Texto entra com bounce',
    category: 'text-animations',
    thumbnail: '/effects/bounce-in.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'text-3',
    name: 'Slide Up',
    description: 'Texto sobe suavemente',
    category: 'text-animations',
    thumbnail: '/effects/slide-up.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'text-4',
    name: 'Glitch Text',
    description: 'Texto com efeito glitch',
    category: 'text-animations',
    thumbnail: '/effects/glitch-text.jpg',
    isPro: true,
    isNew: true,
    isFavorite: false,
  },
  // Color Grades
  {
    id: 'grade-1',
    name: 'Blockbuster',
    description: 'Grade estilo Hollywood',
    category: 'color-grades',
    thumbnail: '/effects/blockbuster.jpg',
    isPro: true,
    isNew: false,
    isFavorite: true,
  },
  {
    id: 'grade-2',
    name: 'Documentary',
    description: 'Visual natural de documentário',
    category: 'color-grades',
    thumbnail: '/effects/documentary.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'grade-3',
    name: 'Corporate',
    description: 'Limpo e profissional',
    category: 'color-grades',
    thumbnail: '/effects/corporate.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'grade-4',
    name: 'Moody',
    description: 'Atmosfera sombria e intensa',
    category: 'color-grades',
    thumbnail: '/effects/moody.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  // Motion FX
  {
    id: 'motion-1',
    name: 'Ken Burns',
    description: 'Pan e zoom suave em imagens',
    category: 'motion',
    thumbnail: '/effects/ken-burns.jpg',
    isPro: false,
    isNew: false,
    isFavorite: true,
  },
  {
    id: 'motion-2',
    name: 'Shake',
    description: 'Trepidação de câmera',
    category: 'motion',
    thumbnail: '/effects/shake.jpg',
    isPro: false,
    isNew: false,
    isFavorite: false,
  },
  {
    id: 'motion-3',
    name: 'Zoom Pulse',
    description: 'Zoom pulsante no ritmo',
    category: 'motion',
    thumbnail: '/effects/zoom-pulse.jpg',
    isPro: true,
    isNew: true,
    isFavorite: false,
  },
  {
    id: 'motion-4',
    name: 'Parallax',
    description: 'Efeito parallax 2.5D',
    category: 'motion',
    thumbnail: '/effects/parallax.jpg',
    isPro: true,
    isNew: false,
    isFavorite: false,
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function EffectCard({
  effect,
  onApply,
  onToggleFavorite,
  viewMode,
}: {
  effect: Effect;
  onApply: () => void;
  onToggleFavorite: () => void;
  viewMode: 'grid' | 'list';
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group"
        onClick={onApply}
      >
        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{effect.name}</span>
            {effect.isPro && (
              <Badge variant="secondary" className="text-[10px] px-1">
                PRO
              </Badge>
            )}
            {effect.isNew && (
              <Badge className="text-[10px] px-1 bg-green-500">
                NOVO
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{effect.description}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart
              className={`h-3.5 w-3.5 ${effect.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
            />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Aplicar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card
      className="group cursor-pointer overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onApply}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/50" />
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {effect.isPro && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              PRO
            </Badge>
          )}
          {effect.isNew && (
            <Badge className="text-[10px] px-1.5 bg-green-500">
              NOVO
            </Badge>
          )}
        </div>

        {/* Favorite */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <Heart
            className={`h-3.5 w-3.5 ${effect.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
          />
        </Button>

        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" className="h-8">
              <Play className="h-3.5 w-3.5 mr-1" />
              Preview
            </Button>
            <Button size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Aplicar
            </Button>
          </div>
        )}

        {/* Duration badge for transitions */}
        {effect.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
            {effect.duration}s
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <h4 className="text-sm font-medium truncate">{effect.name}</h4>
        <p className="text-xs text-muted-foreground truncate">{effect.description}</p>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EffectsTab({ onApplyEffect }: EffectsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory | 'all' | 'favorites'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [effects, setEffects] = useState<Effect[]>(MOCK_EFFECTS);

  // Filter effects
  const filteredEffects = effects.filter((effect) => {
    const matchesSearch =
      effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      effect.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'all') return matchesSearch;
    if (selectedCategory === 'favorites') return matchesSearch && effect.isFavorite;
    return matchesSearch && effect.category === selectedCategory;
  });

  const toggleFavorite = (effectId: string) => {
    setEffects((prev) =>
      prev.map((e) => (e.id === effectId ? { ...e, isFavorite: !e.isFavorite } : e))
    );
  };

  const favoriteCount = effects.filter((e) => e.isFavorite).length;

  return (
    <div className="h-full flex flex-col">
      {/* Search & View Toggle */}
      <div className="p-3 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar efeitos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              Filtros
            </Button>
          </div>
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <Tabs
        value={selectedCategory}
        onValueChange={(v) => setSelectedCategory(v as typeof selectedCategory)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 p-2 bg-transparent border-b rounded-none">
          <TabsTrigger value="all" className="h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Todos
          </TabsTrigger>
          <TabsTrigger value="favorites" className="h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Star className="h-3 w-3 mr-1" />
            Favoritos ({favoriteCount})
          </TabsTrigger>
          {EFFECT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-3 w-3 mr-1" />
                {cat.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-3">
            {filteredEffects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum efeito encontrado</p>
                <p className="text-xs">Tente outra busca ou categoria</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredEffects.map((effect) => (
                  <EffectCard
                    key={effect.id}
                    effect={effect}
                    onApply={() => onApplyEffect(effect)}
                    onToggleFavorite={() => toggleFavorite(effect.id)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEffects.map((effect) => (
                  <EffectCard
                    key={effect.id}
                    effect={effect}
                    onApply={() => onApplyEffect(effect)}
                    onToggleFavorite={() => toggleFavorite(effect.id)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </Tabs>

      {/* Footer Info */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        {filteredEffects.length} efeitos disponíveis • Arraste para aplicar na timeline
      </div>
    </div>
  );
}

export default EffectsTab;
