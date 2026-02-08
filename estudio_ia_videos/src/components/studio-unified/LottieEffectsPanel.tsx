'use client';

/**
 * Lottie Effects Panel
 * Browse, preview, and add Lottie animations to scenes
 * Reuses lottie-web (already installed) for rendering
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { ScrollArea } from '@components/ui/scroll-area';
import { Slider } from '@components/ui/slider';
import {
  Search,
  Play,
  Pause,
  Plus,
  Star,
  Sparkles,
  Repeat,
  Upload,
  Zap,
} from 'lucide-react';
import { cn } from '@lib/utils';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface LottieEffect {
  id: string;
  name: string;
  category: 'transitions' | 'overlays' | 'stickers' | 'backgrounds' | 'text-effects';
  tags: string[];
  premium: boolean;
  /** URL to Lottie JSON file or inline data */
  source: string | Record<string, unknown>;
  thumbnailColor: string;
}

interface LottieEffectsPanelProps {
  onAddEffect: (effect: { id: string; name: string; type: string; source: string | Record<string, unknown> }) => void;
  className?: string;
}

// ============================================================================
// BUILT-IN EFFECTS (lightweight inline Lottie JSON)
// ============================================================================

const BUILTIN_EFFECTS: LottieEffect[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'transitions',
    tags: ['fade', 'entrance'],
    premium: false,
    thumbnailColor: '#6366f1',
    source: {
      v: '5.5.7', fr: 30, ip: 0, op: 30, w: 200, h: 200, nm: 'Fade In',
      layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'fade', sr: 1,
        ks: { o: { a: 1, k: [{ t: 0, s: [0] }, { t: 30, s: [100] }] }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] }, s: { a: 0, k: [100, 100, 100] } },
        shapes: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [200, 200] }, r: { a: 0, k: 0 } }, { ty: 'fl', c: { a: 0, k: [0.388, 0.4, 0.945, 1] }, o: { a: 0, k: 100 } }],
        ip: 0, op: 30, st: 0
      }]
    },
  },
  {
    id: 'slide-up',
    name: 'Slide Up',
    category: 'transitions',
    tags: ['slide', 'entrance', 'up'],
    premium: false,
    thumbnailColor: '#10b981',
    source: {
      v: '5.5.7', fr: 30, ip: 0, op: 30, w: 200, h: 200, nm: 'Slide Up',
      layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'slide', sr: 1,
        ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 1, k: [{ t: 0, s: [100, 300, 0] }, { t: 20, s: [100, 100, 0] }] }, s: { a: 0, k: [100, 100, 100] } },
        shapes: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [160, 160] }, r: { a: 0, k: 8 } }, { ty: 'fl', c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, o: { a: 0, k: 100 } }],
        ip: 0, op: 30, st: 0
      }]
    },
  },
  {
    id: 'pulse-glow',
    name: 'Pulse Glow',
    category: 'overlays',
    tags: ['pulse', 'glow', 'attention'],
    premium: false,
    thumbnailColor: '#f59e0b',
    source: {
      v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'Pulse Glow',
      layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'pulse', sr: 1,
        ks: { o: { a: 1, k: [{ t: 0, s: [100] }, { t: 15, s: [40] }, { t: 30, s: [100] }, { t: 45, s: [40] }, { t: 60, s: [100] }] }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] },
          s: { a: 1, k: [{ t: 0, s: [80, 80, 100] }, { t: 15, s: [110, 110, 100] }, { t: 30, s: [80, 80, 100] }, { t: 45, s: [110, 110, 100] }, { t: 60, s: [80, 80, 100] }] } },
        shapes: [{ ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } }, { ty: 'fl', c: { a: 0, k: [0.961, 0.62, 0.043, 1] }, o: { a: 0, k: 100 } }],
        ip: 0, op: 60, st: 0
      }]
    },
  },
  {
    id: 'confetti',
    name: 'Confetti',
    category: 'stickers',
    tags: ['celebration', 'party', 'confetti'],
    premium: false,
    thumbnailColor: '#ec4899',
    source: {
      v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'Confetti',
      layers: Array.from({ length: 5 }, (_, i) => ({
        ddd: 0, ind: i + 1, ty: 4, nm: `particle-${i}`, sr: 1,
        ks: {
          o: { a: 1, k: [{ t: 0, s: [0] }, { t: 5 + i * 3, s: [100] }, { t: 50 + i * 2, s: [0] }] },
          r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360 + i * 90] }] },
          p: { a: 1, k: [{ t: 0, s: [100 + (i - 2) * 30, 20, 0] }, { t: 60, s: [100 + (i - 2) * 40, 180, 0] }] },
          s: { a: 0, k: [60, 60, 100] }
        },
        shapes: [
          { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [12, 12] }, r: { a: 0, k: 2 } },
          { ty: 'fl', c: { a: 0, k: [[0.925, 0.282, 0.6], [0.388, 0.4, 0.945], [0.063, 0.725, 0.506], [0.961, 0.62, 0.043], [0.925, 0.282, 0.282]][i].concat([1]) }, o: { a: 0, k: 100 } }
        ],
        ip: 0, op: 60, st: 0
      }))
    },
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'transitions',
    tags: ['zoom', 'entrance', 'scale'],
    premium: false,
    thumbnailColor: '#8b5cf6',
    source: {
      v: '5.5.7', fr: 30, ip: 0, op: 20, w: 200, h: 200, nm: 'Zoom In',
      layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'zoom', sr: 1,
        ks: { o: { a: 1, k: [{ t: 0, s: [0] }, { t: 5, s: [100] }] }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] },
          s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 15, s: [110, 110, 100] }, { t: 20, s: [100, 100, 100] }] } },
        shapes: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [120, 120] }, r: { a: 0, k: 12 } }, { ty: 'fl', c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 } }],
        ip: 0, op: 20, st: 0
      }]
    },
  },
  {
    id: 'text-reveal',
    name: 'Text Reveal',
    category: 'text-effects',
    tags: ['text', 'reveal', 'typewriter'],
    premium: true,
    thumbnailColor: '#06b6d4',
    source: {
      v: '5.5.7', fr: 30, ip: 0, op: 45, w: 300, h: 100, nm: 'Text Reveal',
      layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'mask', sr: 1,
        ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [150, 50, 0] },
          s: { a: 1, k: [{ t: 0, s: [0, 100, 100] }, { t: 30, s: [100, 100, 100] }] } },
        shapes: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [300, 60] }, r: { a: 0, k: 0 } }, { ty: 'fl', c: { a: 0, k: [0.024, 0.714, 0.831, 1] }, o: { a: 0, k: 100 } }],
        ip: 0, op: 45, st: 0
      }]
    },
  },
  {
    id: 'sparkle-burst',
    name: 'Sparkle Burst',
    category: 'overlays',
    tags: ['sparkle', 'highlight', 'magic'],
    premium: true,
    thumbnailColor: '#eab308',
    source: {
      v: '5.5.7', fr: 30, ip: 0, op: 45, w: 200, h: 200, nm: 'Sparkle',
      layers: Array.from({ length: 4 }, (_, i) => ({
        ddd: 0, ind: i + 1, ty: 4, nm: `star-${i}`, sr: 1,
        ks: {
          o: { a: 1, k: [{ t: i * 5, s: [0] }, { t: 10 + i * 5, s: [100] }, { t: 35 + i * 3, s: [0] }] },
          r: { a: 1, k: [{ t: 0, s: [i * 45] }, { t: 45, s: [i * 45 + 180] }] },
          p: { a: 0, k: [100 + Math.cos(i * 1.57) * 50, 100 + Math.sin(i * 1.57) * 50, 0] },
          s: { a: 1, k: [{ t: i * 5, s: [0, 0, 100] }, { t: 15 + i * 5, s: [100, 100, 100] }, { t: 35 + i * 3, s: [0, 0, 100] }] }
        },
        shapes: [
          { ty: 'sr', p: { a: 0, k: [0, 0] }, or: { a: 0, k: 12 }, ir: { a: 0, k: 5 }, pt: { a: 0, k: 4 }, r: { a: 0, k: 0 }, sy: 1 },
          { ty: 'fl', c: { a: 0, k: [0.918, 0.702, 0.031, 1] }, o: { a: 0, k: 100 } }
        ],
        ip: 0, op: 45, st: 0
      }))
    },
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Zap },
  { id: 'transitions', label: 'Transições', icon: Zap },
  { id: 'overlays', label: 'Overlays', icon: Sparkles },
  { id: 'stickers', label: 'Stickers', icon: Star },
  { id: 'text-effects', label: 'Texto', icon: Zap },
];

// ============================================================================
// LOTTIE THUMBNAIL — renders a small animated preview
// ============================================================================

function LottieThumbnail({
  effect,
  selected,
  onClick,
}: {
  effect: LottieEffect;
  selected: boolean;
  onClick: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: typeof effect.source === 'object' ? effect.source : undefined,
      path: typeof effect.source === 'string' ? effect.source : undefined,
    });

    return () => {
      animRef.current?.destroy();
    };
  }, [effect.source]);

  return (
    <button
      className={cn(
        'relative rounded-lg border-2 p-1 transition-all hover:shadow-md cursor-pointer',
        selected ? 'border-primary ring-1 ring-primary shadow-lg' : 'border-transparent hover:border-muted-foreground/30',
      )}
      onClick={onClick}
    >
      <div
        ref={containerRef}
        className="w-full aspect-square rounded bg-muted/50"
      />
      <p className="text-[10px] text-center mt-1 truncate font-medium">{effect.name}</p>
      {effect.premium && (
        <Badge className="absolute top-0 right-0 text-[8px] px-1 py-0">PRO</Badge>
      )}
    </button>
  );
}

// ============================================================================
// MAIN PANEL
// ============================================================================

export function LottieEffectsPanel({ onAddEffect, className }: LottieEffectsPanelProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedEffect, setSelectedEffect] = useState<LottieEffect | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewAnimRef = useRef<AnimationItem | null>(null);

  const filteredEffects = BUILTIN_EFFECTS.filter((e) => {
    if (category !== 'all' && e.category !== category) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.tags.some((t) => t.includes(search.toLowerCase()))) return false;
    return true;
  });

  // Large preview
  useEffect(() => {
    if (!previewRef.current || !selectedEffect) return;

    previewAnimRef.current?.destroy();
    previewAnimRef.current = lottie.loadAnimation({
      container: previewRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: typeof selectedEffect.source === 'object' ? selectedEffect.source : undefined,
      path: typeof selectedEffect.source === 'string' ? selectedEffect.source : undefined,
    });

    return () => {
      previewAnimRef.current?.destroy();
    };
  }, [selectedEffect]);

  const handleAddToScene = useCallback(() => {
    if (!selectedEffect) return;
    onAddEffect({
      id: selectedEffect.id,
      name: selectedEffect.name,
      type: 'lottie',
      source: selectedEffect.source,
    });
    toast.success(`Efeito "${selectedEffect.name}" adicionado à cena`);
  }, [selectedEffect, onAddEffect]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold">Efeitos & Animações</h3>
          <Badge variant="secondary" className="text-[10px]">Lottie</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar efeitos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={category === cat.id ? 'default' : 'outline'}
              onClick={() => setCategory(cat.id)}
              className="h-6 text-[10px] px-2"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Selected Preview */}
      {selectedEffect && (
        <div className="p-3 border-b bg-muted/20">
          <div className="flex gap-3">
            <div
              ref={previewRef}
              className="w-20 h-20 rounded-lg bg-black/10 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{selectedEffect.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{selectedEffect.category}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedEffect.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
                ))}
              </div>
              <Button size="sm" onClick={handleAddToScene} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Adicionar à Cena
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Effects Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-3 gap-2">
          {filteredEffects.map((effect) => (
            <LottieThumbnail
              key={effect.id}
              effect={effect}
              selected={selectedEffect?.id === effect.id}
              onClick={() => setSelectedEffect(effect)}
            />
          ))}
          {filteredEffects.length === 0 && (
            <div className="col-span-3 text-center py-8 text-xs text-muted-foreground">
              Nenhum efeito encontrado
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Upload Custom */}
      <div className="p-3 border-t">
        <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => toast.info('Upload de Lottie JSON em breve')}>
          <Upload className="h-3 w-3 mr-1" />
          Upload Lottie JSON
        </Button>
      </div>
    </div>
  );
}
