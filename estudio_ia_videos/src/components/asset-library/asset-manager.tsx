'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FolderOpen,
  Image,
  Music,
  Video,
  FileText,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Trash2,
  Download,
  Copy,
  Edit3,
  Star,
  StarOff,
  Filter,
  SortAsc,
  SortDesc,
  Plus,
  X,
  Check,
  Cloud,
  HardDrive,
  Loader2,
  Eye,
  Info,
  Tag,
  Calendar,
  File,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export type AssetType = 'image' | 'audio' | 'video' | 'document' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  duration?: number; // in seconds for audio/video
  createdAt: string;
  updatedAt: string;
  tags: string[];
  favorite: boolean;
  folder?: string;
  metadata?: Record<string, unknown>;
}

export interface AssetFolder {
  id: string;
  name: string;
  parentId?: string;
  assetCount: number;
  createdAt: string;
}

interface AssetManagerProps {
  assets?: Asset[];
  folders?: AssetFolder[];
  onUpload?: (files: File[]) => Promise<void>;
  onDelete?: (assetId: string) => Promise<void>;
  onRename?: (assetId: string, newName: string) => Promise<void>;
  onMove?: (assetId: string, folderId: string) => Promise<void>;
  onToggleFavorite?: (assetId: string) => Promise<void>;
  onSelect?: (asset: Asset) => void;
  onDownload?: (asset: Asset) => void;
  multiSelect?: boolean;
  className?: string;
}

// Mock assets for demonstration
const mockAssets: Asset[] = [
  {
    id: '1',
    name: 'background-seguranca.jpg',
    type: 'image',
    url: '/assets/bg-1.jpg',
    thumbnailUrl: '/assets/thumb-1.jpg',
    size: 245000,
    mimeType: 'image/jpeg',
    dimensions: { width: 1920, height: 1080 },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    tags: ['background', 'segurança', 'NR-35'],
    favorite: true,
    folder: 'backgrounds',
  },
  {
    id: '2',
    name: 'narration-intro-nr35.mp3',
    type: 'audio',
    url: '/assets/audio-1.mp3',
    size: 1250000,
    mimeType: 'audio/mpeg',
    duration: 45,
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-14T14:20:00Z',
    tags: ['narração', 'intro', 'NR-35'],
    favorite: false,
    folder: 'narrations',
  },
  {
    id: '3',
    name: 'epi-capacete.png',
    type: 'image',
    url: '/assets/epi-1.png',
    thumbnailUrl: '/assets/thumb-epi-1.png',
    size: 85000,
    mimeType: 'image/png',
    dimensions: { width: 512, height: 512 },
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-13T09:15:00Z',
    tags: ['EPI', 'capacete', 'NR-6'],
    favorite: true,
  },
  {
    id: '4',
    name: 'video-demonstracao.mp4',
    type: 'video',
    url: '/assets/video-1.mp4',
    thumbnailUrl: '/assets/thumb-video-1.jpg',
    size: 15000000,
    mimeType: 'video/mp4',
    dimensions: { width: 1920, height: 1080 },
    duration: 120,
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-12T16:45:00Z',
    tags: ['demonstração', 'vídeo', 'procedimento'],
    favorite: false,
  },
  {
    id: '5',
    name: 'manual-nr10.pdf',
    type: 'document',
    url: '/assets/manual-nr10.pdf',
    size: 2500000,
    mimeType: 'application/pdf',
    createdAt: '2024-01-10T11:00:00Z',
    updatedAt: '2024-01-10T11:00:00Z',
    tags: ['manual', 'NR-10', 'documentação'],
    favorite: false,
    folder: 'documents',
  },
];

const mockFolders: AssetFolder[] = [
  { id: 'backgrounds', name: 'Backgrounds', assetCount: 15, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'narrations', name: 'Narrações', assetCount: 23, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'documents', name: 'Documentos', assetCount: 8, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'icons', name: 'Ícones', assetCount: 45, createdAt: '2024-01-01T00:00:00Z' },
];

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getAssetIcon(type: AssetType) {
  switch (type) {
    case 'image': return Image;
    case 'audio': return Music;
    case 'video': return Video;
    case 'document': return FileText;
    default: return File;
  }
}

function getAssetColor(type: AssetType) {
  switch (type) {
    case 'image': return 'text-green-400 bg-green-500/20';
    case 'audio': return 'text-purple-400 bg-purple-500/20';
    case 'video': return 'text-red-400 bg-red-500/20';
    case 'document': return 'text-blue-400 bg-blue-500/20';
    default: return 'text-zinc-400 bg-zinc-500/20';
  }
}

// Asset Card Component
function AssetCard({
  asset,
  selected,
  viewMode,
  onSelect,
  onDelete,
  onRename,
  onToggleFavorite,
  onDownload,
}: {
  asset: Asset;
  selected: boolean;
  viewMode: 'grid' | 'list';
  onSelect?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onToggleFavorite?: () => void;
  onDownload?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const Icon = getAssetIcon(asset.type);
  const colorClass = getAssetColor(asset.type);

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onClick={onSelect}
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors',
          selected 
            ? 'bg-blue-500/20 border border-blue-500/50' 
            : 'hover:bg-zinc-800/50 border border-transparent'
        )}
      >
        {/* Thumbnail / Icon */}
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', colorClass)}>
          {asset.thumbnailUrl ? (
            <img 
              src={asset.thumbnailUrl} 
              alt={asset.name} 
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Icon className="w-6 h-6" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{asset.name}</span>
            {asset.favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>{formatFileSize(asset.size)}</span>
            {asset.dimensions && (
              <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
            )}
            {asset.duration && (
              <span>{formatDuration(asset.duration)}</span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="hidden md:flex items-center gap-1">
          {asset.tags.slice(0, 2).map((tag) => (
            <span 
              key={tag} 
              className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded"
            >
              {tag}
            </span>
          ))}
          {asset.tags.length > 2 && (
            <span className="text-xs text-zinc-500">+{asset.tags.length - 2}</span>
          )}
        </div>

        {/* Date */}
        <span className="hidden lg:block text-sm text-zinc-500">
          {new Date(asset.createdAt).toLocaleDateString('pt-BR')}
        </span>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-zinc-400" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 min-w-[160px]"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onDownload?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  {asset.favorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                  {asset.favorite ? 'Remover favorito' : 'Favoritar'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRename?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  <Edit3 className="w-4 h-4" />
                  Renomear
                </button>
                <hr className="my-1 border-zinc-700" />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onSelect}
      className={cn(
        'relative group rounded-xl overflow-hidden cursor-pointer transition-all',
        selected 
          ? 'ring-2 ring-blue-500' 
          : 'hover:ring-2 hover:ring-zinc-600'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-zinc-800 flex items-center justify-center">
        {asset.thumbnailUrl ? (
          <img 
            src={asset.thumbnailUrl} 
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn('p-6 rounded-xl', colorClass)}>
            <Icon className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent 
                      opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium truncate">{asset.name}</p>
          <p className="text-zinc-400 text-xs">{formatFileSize(asset.size)}</p>
        </div>
      </div>

      {/* Favorite Badge */}
      {asset.favorite && (
        <div className="absolute top-2 left-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        </div>
      )}

      {/* Type Badge */}
      <div className={cn('absolute top-2 right-2 p-1.5 rounded-lg', colorClass)}>
        <Icon className="w-3 h-3" />
      </div>

      {/* Duration Badge for video/audio */}
      {asset.duration && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
          {formatDuration(asset.duration)}
        </div>
      )}

      {/* Selection Checkbox */}
      {selected && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </motion.div>
  );
}

// Main Component
export function AssetManager({
  assets = mockAssets,
  folders = mockFolders,
  onUpload,
  onDelete,
  onRename,
  onMove,
  onToggleFavorite,
  onSelect,
  onDownload,
  multiSelect = false,
  className,
}: AssetManagerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a => a.name.toLowerCase().includes(query) || 
             a.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter(a => a.type === selectedType);
    }

    // Filter by folder
    if (selectedFolder) {
      result = result.filter(a => a.folder === selectedFolder);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [assets, searchQuery, selectedType, selectedFolder, sortBy, sortOrder]);

  // Handle file upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload?.(files);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUpload]);

  // Handle asset selection
  const handleAssetSelect = useCallback((asset: Asset) => {
    if (multiSelect) {
      setSelectedAssets(prev => {
        const newSet = new Set(prev);
        if (newSet.has(asset.id)) {
          newSet.delete(asset.id);
        } else {
          newSet.add(asset.id);
        }
        return newSet;
      });
    } else {
      onSelect?.(asset);
    }
  }, [multiSelect, onSelect]);

  return (
    <div className={cn('flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Biblioteca de Assets</h2>
          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-sm rounded">
            {filteredAssets.length} itens
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar assets..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white 
                     placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {(['all', 'image', 'audio', 'video', 'document'] as const).map((type) => {
            const Icon = type === 'all' ? Filter : getAssetIcon(type as AssetType);
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                )}
                title={type === 'all' ? 'Todos' : type}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
        >
          <option value="date">Data</option>
          <option value="name">Nome</option>
          <option value="size">Tamanho</option>
        </select>

        <button
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {sortOrder === 'asc' ? (
            <SortAsc className="w-4 h-4 text-zinc-400" />
          ) : (
            <SortDesc className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* View Mode */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Folders */}
        <div className="w-48 border-r border-zinc-800 p-3 overflow-y-auto">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Pastas</h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolder(null)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                !selectedFolder 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm">Todos</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                  selectedFolder === folder.id 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                )}
              >
                <Folder className="w-4 h-4" />
                <span className="text-sm flex-1 truncate">{folder.name}</span>
                <span className="text-xs text-zinc-500">{folder.assetCount}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FolderOpen className="w-16 h-16 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-400">Nenhum asset encontrado</h3>
              <p className="text-sm text-zinc-500 mt-1">
                {searchQuery ? 'Tente outra busca' : 'Faça upload de arquivos para começar'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={selectedAssets.has(asset.id)}
                    viewMode="grid"
                    onSelect={() => handleAssetSelect(asset)}
                    onDelete={() => onDelete?.(asset.id)}
                    onToggleFavorite={() => onToggleFavorite?.(asset.id)}
                    onDownload={() => onDownload?.(asset)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={selectedAssets.has(asset.id)}
                    viewMode="list"
                    onSelect={() => handleAssetSelect(asset)}
                    onDelete={() => onDelete?.(asset.id)}
                    onToggleFavorite={() => onToggleFavorite?.(asset.id)}
                    onDownload={() => onDownload?.(asset)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Selection Actions */}
      {selectedAssets.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 border-t border-zinc-800 bg-zinc-800/50"
        >
          <span className="text-sm text-zinc-400">
            {selectedAssets.size} item(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedAssets(new Set())}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Limpar seleção
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-sm text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default AssetManager;
