/**
 * 📦 Stock Media Tab
 * Integração com Pexels/Unsplash para mídia stock
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Image,
  Video,
  Music,
  Search,
  Download,
  ExternalLink,
  Heart,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetItem } from '../UnifiedAssetBrowser';

interface StockTabProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'type';
  showFavoritesOnly: boolean;
  onAssetSelect?: (asset: AssetItem) => void;
  onAssetDragStart?: (asset: AssetItem) => void;
}

interface StockItem {
  id: string;
  title: string;
  type: 'image' | 'video' | 'audio';
  thumbnail: string;
  url: string;
  source: 'pexels' | 'unsplash' | 'pixabay';
  author: string;
  duration?: number;
  width?: number;
  height?: number;
}

// Mock stock items (would come from API)
const MOCK_IMAGES: StockItem[] = [
  {
    id: 'stock-img-1',
    title: 'Office workspace with laptop',
    type: 'image',
    thumbnail: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=300',
    url: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg',
    source: 'pexels',
    author: 'Christina Morillo',
    width: 1920,
    height: 1280,
  },
  {
    id: 'stock-img-2',
    title: 'Safety helmet on construction site',
    type: 'image',
    thumbnail: 'https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=300',
    url: 'https://images.pexels.com/photos/159306/pexels-photo-159306.jpeg',
    source: 'pexels',
    author: 'Pixabay',
    width: 1920,
    height: 1280,
  },
  {
    id: 'stock-img-3',
    title: 'Team meeting presentation',
    type: 'image',
    thumbnail: 'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg?auto=compress&cs=tinysrgb&w=300',
    url: 'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg',
    source: 'pexels',
    author: 'fauxels',
    width: 1920,
    height: 1280,
  },
];

const MOCK_VIDEOS: StockItem[] = [
  {
    id: 'stock-vid-1',
    title: 'Business office timelapse',
    type: 'video',
    thumbnail: 'https://images.pexels.com/videos/3129671/free-video-3129671.jpg?auto=compress&cs=tinysrgb&w=300',
    url: 'https://www.pexels.com/video/3129671/download/',
    source: 'pexels',
    author: 'Kelly Lacy',
    duration: 15,
    width: 1920,
    height: 1080,
  },
  {
    id: 'stock-vid-2',
    title: 'Factory machinery in operation',
    type: 'video',
    thumbnail: 'https://images.pexels.com/videos/4834/pexels-photo-4834.jpeg?auto=compress&cs=tinysrgb&w=300',
    url: 'https://www.pexels.com/video/4834/download/',
    source: 'pexels',
    author: 'Pressmaster',
    duration: 22,
    width: 1920,
    height: 1080,
  },
];

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function StockTab({
  searchQuery: parentSearchQuery,
  viewMode,
  onAssetSelect,
  onAssetDragStart,
}: StockTabProps) {
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Combine parent search with local search
  const activeSearch = localSearch || parentSearchQuery;

  useEffect(() => {
    // Initial load
    setLoading(true);
    setTimeout(() => {
      setItems([...MOCK_IMAGES, ...MOCK_VIDEOS]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSearch = useCallback(() => {
    if (!localSearch.trim()) return;
    
    setSearching(true);
    // Simulate API search
    setTimeout(() => {
      // Would call Pexels/Unsplash API here
      setSearching(false);
    }, 1000);
  }, [localSearch]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    let result = [...items];

    if (mediaType !== 'all') {
      result = result.filter((item) => item.type === mediaType);
    }

    if (activeSearch) {
      const query = activeSearch.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.author.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, mediaType, activeSearch]);

  const handleItemSelect = useCallback(
    (item: StockItem) => {
      const assetItem: AssetItem = {
        id: item.id,
        name: item.title,
        type: item.type === 'image' ? 'image' : 'video',
        url: item.url,
        thumbnail: item.thumbnail,
        duration: item.duration,
        createdAt: new Date(),
        metadata: {
          source: item.source,
          author: item.author,
          width: item.width,
          height: item.height,
        },
      };
      onAssetSelect?.(assetItem);
    },
    [onAssetSelect]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, item: StockItem) => {
      const assetItem: AssetItem = {
        id: item.id,
        name: item.title,
        type: item.type === 'image' ? 'image' : 'video',
        url: item.url,
        thumbnail: item.thumbnail,
        duration: item.duration,
        createdAt: new Date(),
        metadata: {
          source: item.source,
          author: item.author,
          width: item.width,
          height: item.height,
        },
      };
      e.dataTransfer.setData('application/json', JSON.stringify(assetItem));
      e.dataTransfer.effectAllowed = 'copy';
      onAssetDragStart?.(assetItem);
    },
    [onAssetDragStart]
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stock media..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-8 h-9"
          />
        </div>
        <Button size="sm" onClick={handleSearch} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Type Filter */}
      <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as typeof mediaType)}>
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs">
            <Image className="h-3 w-3 mr-1" />
            Images
          </TabsTrigger>
          <TabsTrigger value="video" className="text-xs">
            <Video className="h-3 w-3 mr-1" />
            Videos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results */}
      {loading ? (
        <div className={cn('grid gap-2', viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1')}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No stock media found</p>
          <p className="text-xs mt-1">Try searching for something</p>
        </div>
      ) : (
        <div className={cn('grid gap-2', viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1')}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-lg overflow-hidden cursor-pointer bg-muted"
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => handleItemSelect(item)}
            >
              {/* Thumbnail */}
              <div className="aspect-video relative">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Type Badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-black/60 text-white">
                    {item.type === 'video' ? (
                      <>
                        <Video className="h-3 w-3 mr-1" />
                        {item.duration && formatDuration(item.duration)}
                      </>
                    ) : (
                      <>
                        <Image className="h-3 w-3 mr-1" />
                        {item.width}x{item.height}
                      </>
                    )}
                  </Badge>
                </div>

                {/* Source Badge */}
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/80">
                    {item.source}
                  </Badge>
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">by {item.author}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attribution */}
      <div className="text-center text-[10px] text-muted-foreground pt-2 border-t">
        Free media from{' '}
        <a
          href="https://pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Pexels
        </a>{' '}
        &{' '}
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Unsplash
        </a>
      </div>
    </div>
  );
}

export default StockTab;
