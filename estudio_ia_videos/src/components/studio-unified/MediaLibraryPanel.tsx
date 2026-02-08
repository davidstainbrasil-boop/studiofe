'use client';

/**
 * Media Library Panel
 * Real media upload + stock search (Pexels free API)
 * Replaces "Coming soon" placeholder in studio-pro
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { ScrollArea } from '@components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Loader2,
  Plus,
  Film,
  Folder,
  Trash2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@lib/utils';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  name: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  source: 'upload' | 'stock' | 'project';
  photographer?: string;
}

interface MediaLibraryPanelProps {
  onSelectMedia: (media: { name: string; url: string; type: string; width: number; height: number }) => void;
  className?: string;
}

// ============================================================================
// PEXELS FREE API (no key needed for free tier with attribution)
// Falls back to curated if no key set
// ============================================================================

const PEXELS_API_KEY = typeof window !== 'undefined'
  ? (document.querySelector('meta[name="pexels-api-key"]')?.getAttribute('content') || '')
  : '';

async function searchPexelsImages(query: string): Promise<MediaItem[]> {
  if (!PEXELS_API_KEY) {
    // Return curated placeholder stock images for common categories
    return getCuratedStock(query);
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&locale=pt-BR`,
      { headers: { Authorization: PEXELS_API_KEY } },
    );
    if (!res.ok) return getCuratedStock(query);
    const data = await res.json();
    return (data.photos || []).map((photo: Record<string, unknown>) => ({
      id: `pexels-${photo.id}`,
      type: 'image' as const,
      name: (photo.alt as string) || `Pexels ${photo.id}`,
      url: (photo.src as Record<string, string>)?.large2x || (photo.src as Record<string, string>)?.large,
      thumbnailUrl: (photo.src as Record<string, string>)?.small || (photo.src as Record<string, string>)?.tiny,
      width: (photo.width as number) || 1920,
      height: (photo.height as number) || 1080,
      source: 'stock' as const,
      photographer: photo.photographer as string,
    }));
  } catch {
    return getCuratedStock(query);
  }
}

function getCuratedStock(query: string): MediaItem[] {
  // High-quality Unsplash source images (no API key needed, free to use)
  const categories: Record<string, { images: string[]; labels: string[] }> = {
    'segurança': {
      images: [
        'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800',
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
        'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800',
      ],
      labels: ['Equipamento de segurança', 'Capacete proteção', 'Canteiro de obras', 'EPI profissional'],
    },
    'corporativo': {
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        'https://images.unsplash.com/photo-1560472355-536de3962603?w=800',
        'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      ],
      labels: ['Escritório moderno', 'Sala de reunião', 'Equipe de trabalho', 'Reunião corporativa'],
    },
    'tecnologia': {
      images: [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
        'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
      ],
      labels: ['Circuito tecnológico', 'Código digital', 'Laptop moderno', 'Cybersecurity'],
    },
    'treinamento': {
      images: [
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800',
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
      ],
      labels: ['Sala de treinamento', 'Apresentação profissional', 'Workshop grupo', 'Estudando'],
    },
  };

  // Find best matching category
  const normalizedQuery = query.toLowerCase();
  let bestCategory = 'corporativo';
  for (const [key] of Object.entries(categories)) {
    if (normalizedQuery.includes(key)) {
      bestCategory = key;
      break;
    }
  }

  const cat = categories[bestCategory];
  return cat.images.map((url, i) => ({
    id: `stock-${bestCategory}-${i}`,
    type: 'image' as const,
    name: cat.labels[i],
    url,
    thumbnailUrl: url.replace('w=800', 'w=200'),
    width: 1920,
    height: 1080,
    source: 'stock' as const,
    photographer: 'Unsplash',
  }));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MediaLibraryPanel({ onSelectMedia, className }: MediaLibraryPanelProps) {
  const [tab, setTab] = useState<'upload' | 'stock'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockResults, setStockResults] = useState<MediaItem[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial curated stock
  useEffect(() => {
    setStockResults(getCuratedStock('corporativo'));
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchPexelsImages(searchQuery);
      setStockResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.type.startsWith('video') ? 'video' : 'image');

        const res = await fetch('/api/audio/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          const url = result.url || result.audioUrl || URL.createObjectURL(file);
          const isVideo = file.type.startsWith('video');

          const newMedia: MediaItem = {
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: isVideo ? 'video' : 'image',
            name: file.name,
            url,
            thumbnailUrl: url,
            width: 1920,
            height: 1080,
            source: 'upload',
          };
          setUploadedMedia((prev) => [newMedia, ...prev]);
          toast.success(`${file.name} enviado com sucesso`);
        } else {
          toast.error(`Erro ao enviar ${file.name}`);
        }
      }
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleSelectItem = useCallback((item: MediaItem) => {
    onSelectMedia({
      name: item.name,
      url: item.url,
      type: item.type,
      width: item.width,
      height: item.height,
    });
    toast.success(`"${item.name}" adicionado à cena`);
  }, [onSelectMedia]);

  const renderMediaGrid = (items: MediaItem[]) => (
    <div className="grid grid-cols-2 gap-2 p-3">
      {items.map((item) => (
        <button
          key={item.id}
          className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors cursor-pointer"
          onClick={() => handleSelectItem(item)}
        >
          <div className="aspect-video bg-muted">
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
            <Plus className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {/* Info */}
          <div className="p-1.5">
            <p className="text-[10px] truncate font-medium">{item.name}</p>
            {item.photographer && (
              <p className="text-[9px] text-muted-foreground truncate">📷 {item.photographer}</p>
            )}
          </div>
          {/* Type badge */}
          {item.type === 'video' && (
            <Badge className="absolute top-1 right-1 text-[8px] px-1">
              <Film className="h-2 w-2 mr-0.5" />
              Video
            </Badge>
          )}
        </button>
      ))}
      {items.length === 0 && (
        <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
          Nenhuma mídia encontrada
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'upload' | 'stock')} className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">Biblioteca de Mídia</h3>
          </div>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="stock" className="text-xs">
              <Search className="h-3 w-3 mr-1" />
              Stock
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs">
              <Folder className="h-3 w-3 mr-1" />
              Uploads
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Stock Tab */}
        <TabsContent value="stock" className="flex-1 m-0 flex flex-col">
          {/* Search bar */}
          <div className="p-3 border-b">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="flex gap-2"
            >
              <Input
                placeholder="Buscar imagens (ex: segurança, escritório)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" variant="default" disabled={isSearching} className="h-8">
                {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </form>
            <div className="flex flex-wrap gap-1 mt-2">
              {['segurança', 'corporativo', 'tecnologia', 'treinamento'].map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant="outline"
                  className="h-5 text-[10px] px-2"
                  onClick={() => {
                    setSearchQuery(cat);
                    setStockResults(getCuratedStock(cat));
                  }}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            {renderMediaGrid(stockResults)}
          </ScrollArea>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="flex-1 m-0 flex flex-col">
          <div className="p-3 border-b">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-8 text-xs"
              variant="default"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              {isUploading ? 'Enviando...' : 'Upload Imagem/Vídeo'}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              JPG, PNG, GIF, MP4, WebM (máx. 50MB)
            </p>
          </div>
          <ScrollArea className="flex-1">
            {renderMediaGrid(uploadedMedia)}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
