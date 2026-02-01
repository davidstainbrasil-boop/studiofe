/**
 * 📁 Media Tab
 * Upload e gerenciamento de mídia do usuário
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Video,
  Image as ImageIcon,
  Music,
  FileText,
  MoreHorizontal,
  Play,
  Trash2,
  Download,
  Star,
  Clock,
  FolderPlus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AssetItem } from '../UnifiedAssetBrowser';

interface MediaTabProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'type';
  showFavoritesOnly: boolean;
  onAssetSelect?: (asset: AssetItem) => void;
  onAssetDragStart?: (asset: AssetItem) => void;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

// Mock data - replace with real data from API
const MOCK_MEDIA: AssetItem[] = [
  {
    id: '1',
    name: 'intro_video.mp4',
    type: 'video',
    url: '/uploads/intro.mp4',
    thumbnail: '/thumbnails/intro.jpg',
    duration: 30,
    size: 15000000,
    createdAt: new Date('2026-01-28'),
    isFavorite: true,
  },
  {
    id: '2',
    name: 'background_music.mp3',
    type: 'audio',
    url: '/uploads/music.mp3',
    duration: 180,
    size: 5000000,
    createdAt: new Date('2026-01-27'),
  },
  {
    id: '3',
    name: 'logo.png',
    type: 'image',
    url: '/uploads/logo.png',
    thumbnail: '/uploads/logo.png',
    size: 500000,
    createdAt: new Date('2026-01-26'),
    isFavorite: true,
  },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'image':
      return ImageIcon;
    default:
      return FileText;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function MediaTab({
  searchQuery,
  viewMode,
  sortBy,
  showFavoritesOnly,
  onAssetSelect,
  onAssetDragStart,
}: MediaTabProps) {
  const [media, setMedia] = useState<AssetItem[]>(MOCK_MEDIA);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort media
  const filteredMedia = React.useMemo(() => {
    let result = [...media];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(query));
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      result = result.filter((item) => item.isFavorite);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return result;
  }, [media, searchQuery, showFavoritesOnly, sortBy]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // TODO: Implement actual file upload
    files.forEach((file) => {
      const uploadId = `upload-${Date.now()}-${Math.random()}`;
      setUploading((prev) => [
        ...prev,
        { id: uploadId, name: file.name, progress: 0, status: 'uploading' },
      ]);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, progress: Math.min(u.progress + 10, 100) }
              : u
          )
        );
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        setUploading((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u))
        );
        // Remove from uploading after a delay
        setTimeout(() => {
          setUploading((prev) => prev.filter((u) => u.id !== uploadId));
        }, 1000);
      }, 2000);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // TODO: Handle dropped files
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setMedia((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  }, []);

  const deleteMedia = useCallback((id: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleItemDragStart = useCallback(
    (e: React.DragEvent, asset: AssetItem) => {
      e.dataTransfer.setData('application/json', JSON.stringify(asset));
      e.dataTransfer.effectAllowed = 'copy';
      onAssetDragStart?.(asset);
    },
    [onAssetDragStart]
  );

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onClick={handleFileSelect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">
          Video, Audio, Images (Max 100MB)
        </p>
      </div>

      {/* Upload Progress */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <Progress value={file.progress} className="h-1 mt-1" />
              </div>
              <span className="text-xs text-muted-foreground">{file.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Clock className="h-4 w-4 mr-2" />
          Recent
        </Button>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No media found</p>
          <p className="text-xs mt-1">Upload some files to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredMedia.map((item) => {
            const Icon = getFileIcon(item.type);
            return (
              <Card
                key={item.id}
                className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                onClick={() => onAssetSelect?.(item)}
              >
                <div className="aspect-video bg-muted relative flex items-center justify-center">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  )}
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-8 w-8 text-white" fill="white" />
                    </div>
                  )}
                  {item.duration && (
                    <Badge
                      variant="secondary"
                      className="absolute bottom-1 right-1 text-xs px-1.5 py-0"
                    >
                      {formatDuration(item.duration)}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'absolute top-1 left-1 h-6 w-6',
                      item.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        item.isFavorite && 'fill-yellow-400 text-yellow-400'
                      )}
                    />
                  </Button>
                </div>
                <div className="p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.size && formatFileSize(item.size)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMedia(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredMedia.map((item) => {
            const Icon = getFileIcon(item.type);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer group"
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                onClick={() => onAssetSelect?.(item)}
              >
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size && formatFileSize(item.size)}
                    {item.duration && ` • ${formatDuration(item.duration)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    item.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                >
                  <Star
                    className={cn('h-4 w-4', item.isFavorite && 'fill-yellow-400 text-yellow-400')}
                  />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MediaTab;
