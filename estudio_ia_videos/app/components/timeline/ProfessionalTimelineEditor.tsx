/**
 * 🎬 Editor de Timeline Profissional - Nova Implementação
 * Sistema completo com drag-and-drop, múltiplas tracks e preview em tempo real
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Layers,
  Plus,
  Scissors,
  Copy,
  Trash2,
  Download,
  Upload,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Square,
  Circle,
  Type,
  Image as ImageIcon,
  Save,
  Video,
  Music,
  Mic,
  Settings,
  Grid,
  Maximize2,
  Search,
  Music4 // Import Music icon for Smart Mix
} from 'lucide-react';

// Types

// Types
import { TranscriptionService } from '../../lib/services/transcription-service'
import { StockService, StockMedia } from '../../lib/services/stock-service'

// Preview Track Interface
interface PreviewTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'shape' | 'avatar';
  color: string;
  visible: boolean;
  locked: boolean;
  clips: Array<{
    id: string;
    name: string;
    startTime: number;
    duration: number;
    content: string | null;
    effects: string[];
  }>;
}

// Stub for missing component
const UnifiedPreviewPlayer = ({ currentTime, tracks, isPlaying }: { currentTime: number, tracks: PreviewTrack[], isPlaying: boolean }) => (
  <div className="w-full h-full flex items-center justify-center bg-black text-white">
    <div className="text-center">
      <p className="font-bold">Preview Player</p>
      <p className="text-sm text-gray-400">{isPlaying ? 'Playing' : 'Paused'} • {currentTime.toFixed(1)}s</p>
      <p className="text-xs text-gray-500">{tracks.length} tracks</p>
    </div>
  </div>
);

interface TimelineElement {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'shape';
  name: string;
  startTime: number;
  duration: number;
  content: string | null;
  properties: {
    volume?: number;
    opacity?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    scale?: number;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  keyframes?: Keyframe[];
  style?: React.CSSProperties; // Sync with Composition
  locked: boolean;
  visible: boolean;
  animation?: {
    type: 'fade-in' | 'fade-out' | 'slide-in' | 'slide-out' | 'zoom-in' | 'zoom-out' | 'none';
    duration: number;
  };
}

interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'composite';
  elements: TimelineElement[];
  height: number;
  color: string;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  volume: number;
  collapsed: boolean;
}

interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: unknown;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

interface TimelineProject {
  id: string;
  name: string;
  duration: number;
  fps: number;
  resolution: { width: number; height: number };
  tracks: TimelineTrack[];
  currentTime: number;
  zoom: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
}

// Sample Elements for Testing
const sampleElements: TimelineElement[] = [
  {
    id: 'elem-1',
    type: 'video',
    name: 'Intro Video',
    startTime: 0,
    duration: 10,
    content: 'intro.mp4',
    properties: { volume: 1, opacity: 1 },
    keyframes: [],
    locked: false,
    visible: true
  },
  {
    id: 'elem-2',
    type: 'audio',
    name: 'Background Music',
    startTime: 0,
    duration: 30,
    content: 'music.mp3',
    properties: { volume: 0.3 },
    keyframes: [],
    locked: false,
    visible: true
  },
  {
    id: 'elem-3',
    type: 'text',
    name: 'Title Text',
    startTime: 2,
    duration: 5,
    content: 'Título do Vídeo',
    properties: {
      x: 100,
      y: 50,
      fontSize: 48,
      color: '#ffffff',
      fontFamily: 'Arial'
    },
    keyframes: [],
    locked: false,
    visible: true
  }
];

// Initial project data
const initialProject: TimelineProject = {
  id: 'project-1',
  name: 'Projeto de Demonstração',
  duration: 60,
  fps: 30,
  resolution: { width: 1920, height: 1080 },
  tracks: [
    {
      id: 'track-1',
      name: 'Vídeo Principal',
      type: 'video',
      elements: [sampleElements[0], sampleElements[2]],
      height: 80,
      color: '#3B82F6',
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
      collapsed: false
    },
    {
      id: 'track-2',
      name: 'Áudio e Música',
      type: 'audio',
      elements: [sampleElements[1]],
      height: 60,
      color: '#10B981',
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
      collapsed: false
    }
  ],
  currentTime: 0,
  zoom: 1,
  isPlaying: false,
  volume: 1,
  muted: false
};

// Timeline Element Component with Drag Support
function TimelineElementComponent({
  element,
  track,
  pixelsPerSecond,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
  onDurationChange
}: {
  element: TimelineElement;
  track: TimelineTrack;
  pixelsPerSecond: number;
  onSelect: (id: string, multiSelect?: boolean) => void;
  onEdit: (element: TimelineElement) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onDurationChange?: (elementId: string, newDuration: number) => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: element.id,
    disabled: element.locked || track.locked
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    left: element.startTime * pixelsPerSecond,
    width: Math.max(element.duration * pixelsPerSecond, 40),
    opacity: isDragging ? 0.5 : 1,
  };

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-3 h-3" />;
      case 'audio': return <Music className="w-3 h-3" />;
      case 'image': return <ImageIcon className="w-3 h-3" />;
      case 'text': return <Type className="w-3 h-3" />;
      case 'shape': return <Square className="w-3 h-3" />;
      default: return <Square className="w-3 h-3" />;
    }
  };

  const handleResizeStart = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = element.duration * pixelsPerSecond;
    const startLeft = element.startTime * pixelsPerSecond;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;

      if (direction === 'right') {
        const newWidth = Math.max(40, startWidth + deltaX);
        const newDuration = newWidth / pixelsPerSecond;
        onDurationChange?.(element.id, newDuration);
      } else if (direction === 'left') {
        const newLeft = Math.max(0, startLeft + deltaX);
        const newStartTime = newLeft / pixelsPerSecond;
        const newDuration = element.duration + (element.startTime - newStartTime);

        if (newDuration > 0.1) {
          // Would need to implement start time change
          onEdit({ ...element, startTime: newStartTime, duration: newDuration });
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        absolute top-1 h-[calc(100%-8px)] 
        rounded cursor-move select-none
        flex items-center px-2 gap-1
        text-xs font-medium text-white
        border-2 transition-all
        ${isSelected ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-400/20' : 'border-transparent'}
        ${element.visible ? 'opacity-100' : 'opacity-50'}
        ${element.locked || track.locked ? 'cursor-not-allowed opacity-60' : 'cursor-move'}
        ${isResizing ? 'cursor-ew-resize' : ''}
        hover:shadow-md
        group
      `}
      style={{
        ...style,
        backgroundColor: track.color,
        backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)`,
        backgroundSize: '8px 8px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id, e.ctrlKey || e.metaKey);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit(element);
      }}
    >
      {/* Element Icon and Name */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {getElementIcon(element.type)}
        <span className="truncate">{element.name}</span>
        {element.locked && <Lock className="w-3 h-3 flex-shrink-0" />}
      </div>

      {/* Duration indicator */}
      <span className="text-xs opacity-70 flex-shrink-0">
        {element.duration.toFixed(1)}s
      </span>

      {/* Resize handles */}
      {!element.locked && !track.locked && (
        <>
          <div
            className="absolute left-0 top-0 w-2 h-full cursor-w-resize opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="absolute right-0 top-0 w-2 h-full cursor-e-resize opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
        </>
      )}

      {/* Keyframe indicators */}
      {element.keyframes && element.keyframes.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />
      )}
    </div>
  );
}

// Main Professional Timeline Editor Component
export default function ProfessionalTimelineEditor({ projectId }: { projectId?: string }) {
  const [project, setProject] = useState<TimelineProject>(initialProject);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [draggedElement, setDraggedElement] = useState<TimelineElement | null>(null);
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Export State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    resolution: '1080p',
    format: 'mp4',
    preset: 'custom'
  });

  // Stock State
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState<StockMedia[]>([]);
  const [activeTab, setActiveTab] = useState<'uploads' | 'stock'>('uploads');

  // Load initial stock
  useEffect(() => {
    StockService.search('business').then(setStockResults);
  }, []);

  const handleStockSearch = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const results = await StockService.search(stockQuery, 'image');
      setStockResults(results);
    }
  };

  // Calculated values
  const pixelsPerSecond = 60 * project.zoom;
  const totalWidth = project.duration * pixelsPerSecond;
  const snapInterval = snapToGrid ? 0.5 : 0.1; // Snap to half seconds or 0.1s

  // Utility function to snap time to grid
  const snapTime = useCallback((time: number) => {
    if (!snapToGrid) return time;
    return Math.round(time / snapInterval) * snapInterval;
  }, [snapToGrid, snapInterval]);

  // Playback controls
  const togglePlayback = useCallback(() => {
    if (project.isPlaying) {
      if (playInterval) {
        clearInterval(playInterval);
        setPlayInterval(null);
      }
      setProject(prev => ({ ...prev, isPlaying: false }));
    } else {
      const interval = setInterval(() => {
        setProject(prev => {
          const newTime = prev.currentTime + (1 / prev.fps);
          if (newTime >= prev.duration) {
            return { ...prev, currentTime: 0, isPlaying: false };
          }
          return { ...prev, currentTime: newTime };
        });
      }, 1000 / project.fps);

      setPlayInterval(interval);
      setProject(prev => ({ ...prev, isPlaying: true }));
    }
  }, [project.isPlaying, playInterval, project.fps]);

  const seekTo = useCallback((time: number) => {
    const snappedTime = snapTime(Math.max(0, Math.min(time, project.duration)));
    setProject(prev => ({ ...prev, currentTime: snappedTime }));
  }, [snapTime, project.duration]);

  const skipBack = useCallback(() => {
    seekTo(Math.max(0, project.currentTime - 5));
  }, [project.currentTime, seekTo]);

  const skipForward = useCallback(() => {
    seekTo(Math.min(project.duration, project.currentTime + 5));
  }, [project.currentTime, project.duration, seekTo]);

  // Track management
  const addTrack = useCallback((type: 'video' | 'audio' | 'composite') => {
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      name: `Nova Track ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      elements: [],
      height: type === 'audio' ? 60 : 80,
      color: type === 'video' ? '#3B82F6' : type === 'audio' ? '#10B981' : '#8B5CF6',
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
      collapsed: false
    };

    setProject(prev => ({
      ...prev,
      tracks: [...prev.tracks, newTrack]
    }));
  }, []);

  const updateTrack = useCallback((updatedTrack: TimelineTrack) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === updatedTrack.id ? updatedTrack : track
      )
    }));
  }, []);

  const deleteTrack = useCallback((trackId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.filter(track => track.id !== trackId)
    }));
  }, []);

  // Element management
  const addElement = useCallback((trackId: string, type: TimelineElement['type']) => {
    const newElement: TimelineElement = {
      id: `element-${Date.now()}`,
      type,
      name: `Novo ${type}`,
      startTime: snapTime(project.currentTime),
      duration: 5,
      content: type === 'text' ? 'Novo texto' : null,
      properties: {
        volume: 1,
        opacity: 1,
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        rotation: 0,
        scale: 1,
        color: '#ffffff',
        fontSize: 24,
        fontFamily: 'Arial'
      },
      keyframes: [],
      locked: false,
      visible: true
    };

    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId
          ? { ...track, elements: [...track.elements, newElement] }
          : track
      )
    }));
  }, [project.currentTime, snapTime]);

  const updateElement = useCallback((element: TimelineElement) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        elements: track.elements.map(el =>
          el.id === element.id ? element : el
        )
      }))
    }));
  }, []);

  const updateElementDuration = useCallback((elementId: string, newDuration: number) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        elements: track.elements.map(el =>
          el.id === elementId ? { ...el, duration: Math.max(0.1, newDuration) } : el
        )
      }))
    }));
  }, []);

  const deleteElement = useCallback((elementId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        elements: track.elements.filter(el => el.id !== elementId)
      }))
    }));
    setSelectedElements(prev => prev.filter(id => id !== elementId));
  }, []);

  const duplicateElement = useCallback((elementId: string) => {
    const element = project.tracks
      .flatMap(track => track.elements)
      .find(el => el.id === elementId);

    if (!element) return;

    const track = project.tracks.find(t => t.elements.some(el => el.id === elementId));
    if (!track) return;

    const duplicated: TimelineElement = {
      ...element,
      id: `element-${Date.now()}`,
      name: `${element.name} (cópia)`,
      startTime: snapTime(element.startTime + element.duration)
    };

    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t =>
        t.id === track.id
          ? { ...t, elements: [...t.elements, duplicated] }
          : t
      )
    }));
  }, [project.tracks, snapTime]);

  // Selection management
  const selectElement = useCallback((elementId: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedElements(prev =>
        prev.includes(elementId)
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedElements([elementId]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElements([]);
  }, []);

  // Drag & Drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const elementId = event.active.id as string;
    const element = project.tracks
      .flatMap(track => track.elements)
      .find(el => el.id === elementId);

    setDraggedElement(element || null);
  }, [project.tracks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !draggedElement) {
      setDraggedElement(null);
      return;
    }

    const elementId = active.id as string;
    const targetTrackId = over.id as string;

    // Move element between tracks
    setProject(prev => {
      const sourceTrack = prev.tracks.find(track =>
        track.elements.some(el => el.id === elementId)
      );
      const targetTrack = prev.tracks.find(track => track.id === targetTrackId);

      if (!sourceTrack || !targetTrack || sourceTrack.id === targetTrack.id) {
        return prev;
      }

      const element = sourceTrack.elements.find(el => el.id === elementId);
      if (!element) return prev;

      return {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id === sourceTrack.id) {
            return {
              ...track,
              elements: track.elements.filter(el => el.id !== elementId)
            };
          }
          if (track.id === targetTrack.id) {
            return {
              ...track,
              elements: [...track.elements, element]
            };
          }
          return track;
        })
      };
    });

    setDraggedElement(null);
  }, [draggedElement]);

  // Export functionality (Now Render)
  const handleRender = useCallback(async () => {
    try {
      setIsLoading(true); // Reuse existing loading state or add specific one
      toast.info('Iniciando exportação...');
      setIsExportOpen(false);

      // Map resolution string to actual dimensions
      let width = 1920;
      let height = 1080;

      switch (exportSettings.resolution) {
        case '4k': width = 3840; height = 2160; break;
        case '1080p': width = 1920; height = 1080; break;
        case '720p': width = 1280; height = 720; break;
        case 'portrait': width = 1080; height = 1920; break; // For presets
        case 'square': width = 1080; height = 1080; break;
      }

      // If preset overrides
      if (exportSettings.preset === 'instagram') { width = 1080; height = 1920; }
      if (exportSettings.preset === 'linkedin') { width = 1080; height = 1080; }

      const response = await fetch('/api/render/real-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || 'demo-project',
          priority: 'normal',
          render_type: 'video',
          settings: {
            resolution: { width, height },
            fps: project.fps,
            duration: project.duration,
            format: exportSettings.format
          }
        })
      });

      if (!response.ok) throw new Error('Falha ao iniciar renderização');

      const data = await response.json();
      if (data.videoUrl) {
        toast.success(`Vídeo exportado em ${exportSettings.resolution.toUpperCase()}!`);
        window.open(data.videoUrl, '_blank');
      } else {
        toast.success('Renderização iniciada em background.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao iniciar renderização');
    } finally {
      setIsLoading(false);
    }
  }, [project, projectId, exportSettings]);

  // Persist Project State (Mock/Real)
  useEffect(() => {
    if (!projectId) return;

    // 1. Check LocalStorage (Priority for Demo/AI Generator)
    const localData = localStorage.getItem(`project-${projectId}`);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        // Ensure defaults if missing
        setProject({
          ...initialProject,
          ...parsed,
          id: projectId
        });
        toast.success('Projeto carregado do armazenamento local');
        return;
      } catch (e) {
        console.error('Failed to parse local project', e);
      }
    }

    // Mock Load
    if (projectId === 'demo') return;

    // Real Load from Supabase via API
    console.log('Loading project:', projectId);
    const loadProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) throw new Error('Failed to load project');

        const { data } = await response.json();

        // Transform API data to Editor state
        if (data && data.timeline) {
          // Handle timeline relation (could be array or object depending on supersonic/prisma result)
          const timelineData = Array.isArray(data.timeline) ? data.timeline[0] : data.timeline;

          if (timelineData) {
            setProject({
              id: data.id,
              name: data.name,
              duration: timelineData.total_duration || 60,
              fps: timelineData.settings?.fps || 30,
              resolution: timelineData.settings?.resolution || { width: 1920, height: 1080 },
              tracks: timelineData.tracks || [],
              currentTime: 0,
              zoom: 1,
              isPlaying: false,
              volume: 1,
              muted: false
            });
            toast.success('Projeto carregado com sucesso!');
          }
        }
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Erro ao carregar projeto');
      }
    };
    loadProject();
  }, [projectId]);

  // Save Project
  const saveProject = useCallback(async () => {
    if (!projectId) {
      // Just download JSON if no ID
      downloadJSON();
      return;
    }

    toast.success('Projeto salvo com sucesso! (Simulado)');
    // In real app: await supabase.from('projects').update({ content: project }).eq('id', projectId)
  }, [project, projectId]);

  const downloadJSON = () => {
    const exportData = {
      project,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent if typing in input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === 'Delete' && selectedElements.length > 0) {
        selectedElements.forEach(deleteElement);
      } else if (e.ctrlKey && e.code === 'KeyD' && selectedElements.length > 0) {
        e.preventDefault();
        selectedElements.forEach(duplicateElement);
      } else if (e.ctrlKey && e.code === 'KeyA') {
        e.preventDefault();
        const allElementIds = project.tracks.flatMap(t => t.elements.map(e => e.id));
        setSelectedElements(allElementIds);
      } else if (e.code === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback, selectedElements, deleteElement, duplicateElement, project.tracks, clearSelection]);

  // Timeline click handler
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // Account for track headers offset in UI logic if needed, but here we click on timeline area
    const time = x / pixelsPerSecond;

    seekTo(time);
    if (!e.ctrlKey && !e.metaKey) {
      clearSelection();
    }
  }, [pixelsPerSecond, seekTo, clearSelection]);

  // Get selected element for properties panel
  const selectedElement = selectedElements.length === 1
    ? project.tracks.flatMap(t => t.elements).find(e => e.id === selectedElements[0])
    : null;

  // Helper to convert tracks for preview player
  const getPreviewTracks = useCallback(() => {
    const validTypes = ['video', 'audio', 'text', 'image', 'shape', 'avatar'] as const
    type ValidType = typeof validTypes[number]

    return project.tracks.map(track => {
      const trackType: ValidType = validTypes.includes(track.type as ValidType)
        ? (track.type as ValidType)
        : 'video'

      return {
        id: track.id,
        name: track.name,
        type: trackType,
        color: track.color,
        visible: track.visible,
        locked: track.locked,
        clips: track.elements.map(el => ({
          id: el.id,
          name: el.name,
          startTime: el.startTime,
          duration: el.duration,
          content: el.content,
          effects: [] as string[]
        }))
      }
    })
  }, [project.tracks])

  const handleGenerateTTS = async () => {
    if (!project.id) return;

    const toastId = toast.loading('Gerando narração via IA...');
    try {
      const response = await fetch(`/api/projects/${project.id}/generate-tts`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Áudio gerado para ${result.generatedCount} slides!`, { id: toastId });
        // Trigger reload to fetch new tracks
        // In a real app we might want to just re-fetch the project data without reload, 
        // but for now this ensures we have fresh state.
        window.location.reload();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar narração', { id: toastId });
    }
  };

  const handleGenerateAvatar = async () => {
    if (!project.id) return;

    const toastId = toast.loading('Gerando avatares D-ID (pode demorar)...');
    try {
      const response = await fetch(`/api/projects/${project.id}/generate-avatar`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Gerado ${result.generatedCount} avatares falantes!`, { id: toastId });
        window.location.reload();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar avatares', { id: toastId });
    }
  };

  const handleGenerateSubtitles = async () => {
    try {
      if (!project) return

      const ttsTrack = project.tracks.find(t => t.type === 'audio' && t.id.includes('tts'))
      if (!ttsTrack || ttsTrack.clips.length === 0) {
        toast.warning('Gere a narração (TTS) primeiro antes das legendas.')
        return
      }

      setIsLoading(true)
      toast.info('Gerando legendas automáticas...')

      const transcriptionService = TranscriptionService.getInstance()
      const newClips: Clip[] = []

      for (const audioClip of ttsTrack.clips) {
        const matchingVideoClip = project.tracks.find(t => t.type === 'video')?.elements.find(c => Math.abs(c.startTime - audioClip.startTime) < 0.5)
        const slideText = matchingVideoClip?.content // Assuming content holds text for video clips or need metadata check

        const subtitles = await transcriptionService.generateSubtitles(
          audioClip.contentRef,
          audioClip.duration,
          slideText
        )

        subtitles.forEach(sub => {
          newClips.push({
            id: sub.id,
            trackId: 'subtitles-track',
            startTime: audioClip.startTime + sub.startTime,
            duration: sub.endTime - sub.startTime,
            type: 'text',
            contentRef: sub.text,
            style: {
              top: '80%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70%',
              textAlign: 'center',
              fontSize: '40px',
              color: '#ffffff',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: '8px',
              padding: '10px',
              position: 'absolute'
            }
          })
        })
      }

      let updatedTracks = [...project.tracks]
      let subTrack = updatedTracks.find(t => t.type === 'text' && t.name === 'Legendas')

      if (!subTrack) {
        subTrack = {
          id: 'subtitles-track',
          name: 'Legendas',
          type: 'text',
          clips: [],
          isMuted: false,
          isLocked: false,
          volume: 1
        }
        updatedTracks.push(subTrack)
      }

      subTrack.clips = newClips

      setProject({
        ...project,
        tracks: updatedTracks
      })

      toast.success('Legendas geradas com sucesso!')

    } catch (error) {
      console.error("Subtitle generation failed", error)
      toast.error('Erro ao gerar legendas.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSmartMix = useCallback(() => {
    // 1. Identify Voice Track (TTS or Custom Audio with voice)
    const voiceTracks = project.tracks.filter(t => t.name === 'Locução (TTS)' || t.name === 'Voiceover');
    const musicTracks = project.tracks.filter(t => t.type === 'audio' && t.id !== 'track-audio-voice' && !voiceTracks.includes(t) && !t.name.includes('Locução'));

    // If no distinct tracks found, generic approach: duck all non-selected audio when selected audio plays?
    // Let's assume tracks are well named from our defaults.

    if (musicTracks.length === 0) {
      toast('Nenhuma música de fundo encontrada para mixar.', { icon: '🎵' });
      return;
    }

    let updatedTracks = [...project.tracks];
    let duckingApplied = 0;

    // 2. Iterate Music Tracks
    updatedTracks = updatedTracks.map(track => {
      if (!musicTracks.find(mt => mt.id === track.id)) return track;

      // Apply automation/keyframes to lower volume when any voice track has a clip
      // Simplification for MVP: Just set volume lower globally if distinct mixing is complex UI wise.
      // Better: Split clips or add Volume Keyframes.
      // Let's try keyframes if we have them in the data model.
      // We have `keyframes: []` on elements.

      // Hack for MVP: Set global volume of music track to 0.15 (15%)
      // This is "Static Mix" but effective.
      // "Smart Mix" v1: Just lower the background music :)

      return { ...track, volume: 0.15 };
    });

    setProject(prev => ({
      ...prev,
      tracks: updatedTracks
    }));

    toast.success('Smart Mix aplicado: Música de fundo ajustada para 15%.');

  }, [project.tracks]);

  console.log('DEBUG EDITOR RENDER', { project, tracks: project?.tracks });

  if (!project || !project.tracks) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Project State...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden flex flex-col h-screen">

      {/* Header Toolbar - Now outside DndContext */}
      <div className="bg-gray-900 border-b border-gray-800 p-2 shrink-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🎬 Timeline Pro
              </h1>
            </div>

            {/* Project Info */}
            <div className="text-xs text-gray-500 space-x-2 hidden md:block">
              <span>{project.resolution.width}x{project.resolution.height}</span>
              <span>•</span>
              <span>{project.fps}fps</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-2">
            {/* Playback Controls */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-md p-1 border border-gray-700">
              <Button size="sm" variant="ghost" onClick={skipBack} className="h-8 w-8 p-0">
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={togglePlayback} className={`h-8 w-8 p-0 ${project.isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {project.isPlaying ?
                  <Pause className="w-4 h-4" /> :
                  <Play className="w-4 h-4" />
                }
              </Button>
              <Button size="sm" variant="ghost" onClick={skipForward} className="h-8 w-8 p-0">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Time Display */}
            <div className="text-sm text-blue-400 font-mono bg-black/50 px-3 py-1.5 rounded border border-gray-800 min-w-[100px] text-center">
              {Math.floor(project.currentTime / 60)}:{(project.currentTime % 60).toFixed(1).padStart(4, '0')}
            </div>

            <div className="h-6 w-px bg-gray-700 mx-2" />

            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateTTS}
              className="h-8 text-xs border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 mr-2"
            >
              <Mic className="w-3 h-3 mr-2" />
              Gerar Narração
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSubtitles}
              className="h-8 text-xs border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 mr-2"
            >
              <Type className="w-3 h-3 mr-2" />
              Gerar Legendas
            </Button>

            <Button size="sm" variant="outline" onClick={saveProject} className="h-8 text-xs border-gray-700 hover:bg-gray-800 mr-2">
              <Save className="w-3 h-3 mr-2" />
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateAvatar}
              className="h-8 text-xs border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 mr-2"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Gerar Avatar
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRender}
              data-testid="render-button"
              className="h-8 text-xs border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
            >
              <Zap className="w-3 h-3 mr-2" />
              Renderizar
            </Button>
          </div>
        </div>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Workspace Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Left: Preview Player */}
          <div className="flex-1 relative bg-black flex items-center justify-center p-4 border-r border-gray-800">
            <div className="aspect-video w-full max-h-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-gray-800 relative">
              <UnifiedPreviewPlayer
                currentTime={project.currentTime}
                tracks={getPreviewTracks()}
                isPlaying={project.isPlaying}
              />

              {/* Safe Area Guides (Optional) */}
              <div className="absolute inset-0 pointer-events-none opacity-20 border-[40px] border-transparent">
                <div className="w-full h-full border border-white/50 border-dashed"></div>
              </div>
            </div>
          </div>

          {/* Right: Properties Panel */}
          {showProperties && (
            <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  Propriedades
                </h3>
              </div>

              {selectedElement ? (
                <div className="p-4 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Geral</label>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Nome</span>
                        <Input
                          value={selectedElement.name}
                          onChange={(e) => updateElement({ ...selectedElement, name: e.target.value })}
                          className="h-8 bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Início</span>
                          <Input
                            type="number"
                            value={selectedElement.startTime.toFixed(1)}
                            onChange={(e) => updateElement({ ...selectedElement, startTime: parseFloat(e.target.value) })}
                            className="h-8 bg-gray-800 border-gray-700"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Duração</span>
                          <Input
                            type="number"
                            value={selectedElement.duration.toFixed(1)}
                            onChange={(e) => updateElement({ ...selectedElement, duration: parseFloat(e.target.value) })}
                            className="h-8 bg-gray-800 border-gray-700"
                            step="0.1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Animação</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <span className="text-xs text-gray-400 block mb-1">Tipo</span>
                        <select
                          className="w-full h-8 bg-gray-800 border-gray-700 rounded text-xs px-2"
                          value={selectedElements.length === 1 ? project.tracks.flatMap(t => t.elements).find(e => e.id === selectedElements[0])?.animation?.type || 'none' : 'none'}
                          onChange={(e) => {
                            if (selectedElements.length !== 1) return;
                            const elId = selectedElements[0];
                            const el = project.tracks.flatMap(t => t.elements).find(el => el.id === elId);
                            if (!el) return;

                            const newType = e.target.value as any;
                            const currentAnim = el.animation || { duration: 1 };

                            updateElement({
                              ...el,
                              animation: { ...currentAnim, type: newType, duration: currentAnim.duration || 1 }
                            });
                          }}
                        >
                          <option value="none">Nenhuma</option>
                          <option value="fade-in">Fade In</option>
                          <option value="fade-out">Fade Out</option>
                          <option value="slide-in">Slide In (Left)</option>
                          <option value="zoom-in">Zoom In</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Duração (s)</span>
                        <Input
                          type="number"
                          className="h-8 bg-gray-800 border-gray-700"
                          defaultValue={1}
                          step={0.1}
                          min={0.1}
                          max={5}
                          value={selectedElements.length === 1 ? project.tracks.flatMap(t => t.elements).find(e => e.id === selectedElements[0])?.animation?.duration || 1 : 1}
                          onChange={(e) => {
                            if (selectedElements.length !== 1) return;
                            const elId = selectedElements[0];
                            const el = project.tracks.flatMap(t => t.elements).find(el => el.id === elId);
                            if (!el) return;

                            const newDur = parseFloat(e.target.value);
                            const currentAnim = el.animation || { type: 'none' };

                            updateElement({
                              ...el,
                              animation: { ...currentAnim, duration: newDur, type: currentAnim.type || 'none' }
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Transformação</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Posição X</span>
                        <Input type="number" className="h-8 bg-gray-800 border-gray-700" defaultValue={0} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Posição Y</span>
                        <Input type="number" className="h-8 bg-gray-800 border-gray-700" defaultValue={0} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Escala</span>
                        <Input type="number" className="h-8 bg-gray-800 border-gray-700" defaultValue={100} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Rotação</span>
                        <Input type="number" className="h-8 bg-gray-800 border-gray-700" defaultValue={0} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => selectedElements.forEach(deleteElement)}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Remover Elemento
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 text-gray-600 p-4 text-center">
                  <Move className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Selecione um clipe na timeline para editar suas propriedades</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline Area (Bottom) */}
        <div className="h-[40vh] flex flex-col border-t border-gray-800 bg-gray-900 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-40">

          {/* Timeline Toolbar */}
          <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 text-xs">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => addTrack('video')} className="h-7 px-2 hover:bg-blue-900/30 hover:text-blue-400">
                <Plus className="w-3 h-3 mr-1" /> Track de Vídeo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => addTrack('audio')} className="h-7 px-2 hover:bg-green-900/30 hover:text-green-400">
                <Plus className="w-3 h-3 mr-1" /> Track de Áudio
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500">Zoom</span>
              <Slider
                value={[project.zoom * 100]}
                min={10} max={300}
                onValueChange={([v]) => setProject(p => ({ ...p, zoom: v / 100 }))}
                className="w-24"
              />
            </div>
          </div>

          {/* Tracks Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
            <div className="flex min-w-full min-h-full relative">
              {/* Track Headers Column */}
              <div className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 sticky left-0 z-20 shadow-lg">
                {project.tracks.map(track => (
                  <div key={track.id} style={{ height: track.collapsed ? 40 : track.height }} className="border-b border-gray-800 p-2 flex flex-col justify-center relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs truncate text-gray-300 w-32" title={track.name}>{track.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateTrack({ ...track, muted: !track.muted })}>
                          {track.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-gray-400" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateTrack({ ...track, locked: !track.locked })}>
                          {track.locked ? <Lock className="w-3 h-3 text-red-400" /> : <Unlock className="w-3 h-3 text-gray-400" />}
                        </Button>
                      </div>
                    </div>
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: track.color }}></div>
                  </div>
                ))}
              </div>

              {/* Tracks Content Area */}
              <div className="flex-1 relative bg-gray-900/50 overflow-x-auto" ref={timelineRef} onClick={handleTimelineClick}>
                <div style={{ width: totalWidth, minWidth: '100%' }} className="relative h-full">
                  {/* Time Ruler */}
                  <div className="h-6 border-b border-gray-700 bg-gray-900 sticky top-0 z-10 flex items-end text-[10px] text-gray-500 select-none">
                    {Array.from({ length: Math.ceil(project.duration) }).map((_, i) => (
                      <div key={i} className="absolute bottom-0 border-l border-gray-600 pl-1" style={{ left: i * pixelsPerSecond }}>
                        {i % 5 === 0 ? `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}` : '|'}
                      </div>
                    ))}
                  </div>

                  {/* Playhead Line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
                    style={{ left: project.currentTime * pixelsPerSecond }}
                  >
                    <div className="w-3 h-3 bg-red-500 -ml-1.5 rounded-full shadow-sm" />
                  </div>

                  {/* Render Tracks */}
                  {project.tracks.map(track => (
                    <div key={track.id} style={{ height: track.collapsed ? 40 : track.height }} className="border-b border-gray-800 relative group">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 pointer-events-none opacity-10"
                        style={{ backgroundImage: `linear-gradient(90deg, #333 1px, transparent 1px)`, backgroundSize: `${pixelsPerSecond}px 100%` }}>
                      </div>

                      <SortableContext items={track.elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
                        {track.elements.map(element => (
                          <TimelineElementComponent
                            key={element.id}
                            element={element}
                            track={track}
                            pixelsPerSecond={pixelsPerSecond}
                            onSelect={selectElement}
                            onEdit={() => { }} // Open properties
                            onDelete={deleteElement}
                            onDurationChange={updateElementDuration}
                            isSelected={selectedElements.includes(element.id)}
                          />
                        ))}
                      </SortableContext>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
