/**
 * 📋 Virtualized List Components
 * High-performance lists for large datasets using react-virtuoso
 */

'use client';

import React from 'react';
import { Virtuoso, VirtuosoGrid, TableVirtuoso } from 'react-virtuoso';
import { cn } from '@/lib/utils';

// ============================================
// Project List (for dashboard)
// ============================================

interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  updatedAt: string;
  status: string;
}

interface VirtualProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  className?: string;
}

export function VirtualProjectList({
  projects,
  onSelect,
  className,
}: VirtualProjectListProps) {
  return (
    <Virtuoso
      className={cn('h-[600px]', className)}
      data={projects}
      itemContent={(index, project) => (
        <div
          key={project.id}
          onClick={() => onSelect(project)}
          className="flex items-center gap-4 p-4 border-b hover:bg-muted cursor-pointer"
        >
          {project.thumbnail && (
            <img
              src={project.thumbnail}
              alt={project.name}
              className="w-16 h-9 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <h3 className="font-medium">{project.name}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <span
            className={cn(
              'px-2 py-1 text-xs rounded',
              project.status === 'completed' && 'bg-green-100 text-green-700',
              project.status === 'processing' && 'bg-yellow-100 text-yellow-700',
              project.status === 'draft' && 'bg-gray-100 text-gray-700'
            )}
          >
            {project.status}
          </span>
        </div>
      )}
    />
  );
}

// ============================================
// Template Grid (for template library)
// ============================================

interface Template {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
}

interface VirtualTemplateGridProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  className?: string;
}

export function VirtualTemplateGrid({
  templates,
  onSelect,
  className,
}: VirtualTemplateGridProps) {
  return (
    <VirtuosoGrid
      className={cn('h-[600px]', className)}
      totalCount={templates.length}
      listClassName="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4"
      itemContent={(index) => {
        const template = templates[index];
        return (
          <div
            key={template.id}
            onClick={() => onSelect(template)}
            className="group cursor-pointer"
          >
            <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
              <img
                src={template.thumbnail}
                alt={template.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <h4 className="font-medium text-sm truncate">{template.name}</h4>
            <p className="text-xs text-muted-foreground">{template.category}</p>
          </div>
        );
      }}
    />
  );
}

// ============================================
// Asset List (for media library)
// ============================================

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  size: number;
  createdAt: string;
}

interface VirtualAssetListProps {
  assets: Asset[];
  onSelect: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  className?: string;
}

export function VirtualAssetList({
  assets,
  onSelect,
  onDelete,
  className,
}: VirtualAssetListProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <TableVirtuoso
      className={cn('h-[500px]', className)}
      data={assets}
      fixedHeaderContent={() => (
        <tr className="bg-muted">
          <th className="text-left p-3 font-medium">Nome</th>
          <th className="text-left p-3 font-medium">Tipo</th>
          <th className="text-left p-3 font-medium">Tamanho</th>
          <th className="text-left p-3 font-medium">Data</th>
          <th className="text-right p-3 font-medium">Ações</th>
        </tr>
      )}
      itemContent={(index, asset) => (
        <>
          <td
            className="p-3 cursor-pointer hover:text-primary"
            onClick={() => onSelect(asset)}
          >
            {asset.name}
          </td>
          <td className="p-3">
            <span
              className={cn(
                'px-2 py-1 text-xs rounded',
                asset.type === 'image' && 'bg-blue-100 text-blue-700',
                asset.type === 'video' && 'bg-purple-100 text-purple-700',
                asset.type === 'audio' && 'bg-green-100 text-green-700'
              )}
            >
              {asset.type}
            </span>
          </td>
          <td className="p-3 text-muted-foreground">{formatSize(asset.size)}</td>
          <td className="p-3 text-muted-foreground">
            {new Date(asset.createdAt).toLocaleDateString('pt-BR')}
          </td>
          <td className="p-3 text-right">
            {onDelete && (
              <button
                onClick={() => onDelete(asset)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Excluir
              </button>
            )}
          </td>
        </>
      )}
    />
  );
}

// ============================================
// Timeline Track List (for video editor)
// ============================================

interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'image';
  duration: number;
  locked: boolean;
}

interface VirtualTimelineListProps {
  tracks: TimelineTrack[];
  onSelect: (track: TimelineTrack) => void;
  onToggleLock: (track: TimelineTrack) => void;
  className?: string;
}

export function VirtualTimelineList({
  tracks,
  onSelect,
  onToggleLock,
  className,
}: VirtualTimelineListProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Virtuoso
      className={cn('h-[300px]', className)}
      data={tracks}
      itemContent={(index, track) => (
        <div
          key={track.id}
          onClick={() => onSelect(track)}
          className={cn(
            'flex items-center gap-3 p-2 border-b cursor-pointer',
            track.locked && 'opacity-50'
          )}
        >
          <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              track.type === 'video' && 'bg-purple-500',
              track.type === 'audio' && 'bg-green-500',
              track.type === 'text' && 'bg-blue-500',
              track.type === 'image' && 'bg-yellow-500'
            )}
          />
          <span className="flex-1 text-sm truncate">{track.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDuration(track.duration)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(track);
            }}
            className="text-xs"
          >
            {track.locked ? '🔒' : '🔓'}
          </button>
        </div>
      )}
    />
  );
}
