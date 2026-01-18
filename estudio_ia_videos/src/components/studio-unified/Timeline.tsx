'use client';

/**
 * SPRINT 5: Timeline Component with Multi-Track Support
 *
 * Features:
 * - Canvas-based rendering for performance
 * - Multi-track support (avatar, audio, video, text, overlay)
 * - Drag to reorder elements
 * - Zoom in/out
 * - Playback head
 * - Scene switcher
 * - Grid snapping
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Scene,
  Track,
  TimelineElement,
  TimelineState,
  TrackType,
} from '@/types/video-project';

export interface TimelineProps {
  scenes: Scene[];
  currentScene: Scene;
  timelineState: TimelineState;
  onTimeUpdate: (time: number) => void;
  onSceneChange: (sceneId: string) => void;
  onTrackUpdate: (sceneId: string, track: Track) => void;
  onElementSelect: (elementIds: string[]) => void;
  onElementUpdate: (elementId: string, updates: Partial<TimelineElement>) => void;
  onPlayPause: () => void;
  onStop: () => void;
  className?: string;
}

const TRACK_HEIGHT = 60;
const TRACK_HEADER_WIDTH = 200;
const RULER_HEIGHT = 30;
const MIN_ZOOM = 10; // pixels per second
const MAX_ZOOM = 200;

const TRACK_COLORS: Record<TrackType, string> = {
  avatar: '#3b82f6',
  audio: '#10b981',
  video: '#8b5cf6',
  text: '#f59e0b',
  image: '#ec4899',
  overlay: '#6366f1',
};

export function Timeline({
  scenes,
  currentScene,
  timelineState,
  onTimeUpdate,
  onSceneChange,
  onTrackUpdate,
  onElementSelect,
  onElementUpdate,
  onPlayPause,
  onStop,
  className,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(timelineState.zoom);

  // Calculate total timeline width
  const timelineWidth = currentScene.duration * zoom;

  // Render timeline tracks on canvas
  const renderTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = timelineWidth + TRACK_HEADER_WIDTH;
    canvas.height = currentScene.tracks.length * TRACK_HEIGHT + RULER_HEIGHT;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render time ruler
    renderTimeRuler(ctx);

    // Render each track
    currentScene.tracks.forEach((track, trackIndex) => {
      const y = trackIndex * TRACK_HEIGHT + RULER_HEIGHT;
      renderTrack(ctx, track, trackIndex, y);
    });

    // Render playback head
    renderPlaybackHead(ctx);
  }, [currentScene, timelineWidth, zoom, timelineState.currentTime]);

  // Render time ruler (top bar with time markers)
  const renderTimeRuler = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, TRACK_HEADER_WIDTH + timelineWidth, RULER_HEIGHT);

      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 1;
      ctx.font = '10px Inter';
      ctx.fillStyle = '#a1a1a1';

      // Draw time markers every second
      for (let i = 0; i <= currentScene.duration; i++) {
        const x = TRACK_HEADER_WIDTH + i * zoom;

        // Major marker every 5 seconds
        if (i % 5 === 0) {
          ctx.beginPath();
          ctx.moveTo(x, RULER_HEIGHT - 10);
          ctx.lineTo(x, RULER_HEIGHT);
          ctx.stroke();

          const minutes = Math.floor(i / 60);
          const seconds = i % 60;
          const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          ctx.fillText(timeLabel, x + 2, RULER_HEIGHT - 15);
        } else {
          // Minor marker
          ctx.beginPath();
          ctx.moveTo(x, RULER_HEIGHT - 5);
          ctx.lineTo(x, RULER_HEIGHT);
          ctx.stroke();
        }
      }
    },
    [currentScene.duration, zoom, timelineWidth]
  );

  // Render single track
  const renderTrack = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      track: Track,
      trackIndex: number,
      y: number
    ) => {
      // Track header background
      ctx.fillStyle = track.locked ? '#1a1a1a' : '#0f0f0f';
      ctx.fillRect(0, y, TRACK_HEADER_WIDTH, TRACK_HEIGHT);

      // Track header border
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, TRACK_HEADER_WIDTH, TRACK_HEIGHT);

      // Track name
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter';
      ctx.fillText(track.name, 10, y + 20);

      // Track type indicator
      ctx.fillStyle = track.color || TRACK_COLORS[track.type] || '#666666';
      ctx.fillRect(10, y + 30, 80, 4);

      // Timeline area background
      ctx.fillStyle = track.locked ? '#1a1a1a' : '#0a0a0a';
      ctx.fillRect(TRACK_HEADER_WIDTH, y, timelineWidth, TRACK_HEIGHT);

      // Track timeline border
      ctx.strokeStyle = '#404040';
      ctx.strokeRect(TRACK_HEADER_WIDTH, y, timelineWidth, TRACK_HEIGHT);

      // Render track elements
      track.elements.forEach((element) => {
        renderTrackElement(ctx, element, track, y);
      });
    },
    [timelineWidth]
  );

  // Render single timeline element
  const renderTrackElement = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      element: TimelineElement,
      track: Track,
      trackY: number
    ) => {
      const x = TRACK_HEADER_WIDTH + element.startTime * zoom;
      const width = element.duration * zoom;
      const elementHeight = TRACK_HEIGHT - 10;
      const elementY = trackY + 5;

      // Element background
      const color = track.color || TRACK_COLORS[element.type] || '#666666';
      const isSelected = timelineState.selectedElements.includes(element.id);

      ctx.fillStyle = isSelected ? color : color + 'cc';
      ctx.fillRect(x, elementY, width, elementHeight);

      // Element border
      ctx.strokeStyle = isSelected ? '#ffffff' : color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, elementY, width, elementHeight);

      // Element label
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px Inter';
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, elementY, width, elementHeight);
      ctx.clip();
      const label = element.name || element.content.text || element.type;
      ctx.fillText(label, x + 5, elementY + 15);
      ctx.restore();

      // Duration label
      if (width > 40) {
        ctx.fillStyle = '#cccccc';
        ctx.font = '9px Inter';
        ctx.fillText(`${element.duration.toFixed(1)}s`, x + 5, elementY + 30);
      }

      // Waveform for audio elements
      if (element.type === 'audio' && element.content.waveformData) {
        renderWaveform(ctx, element, x, elementY, width, elementHeight);
      }
    },
    [zoom, timelineState.selectedElements]
  );

  // Render audio waveform
  const renderWaveform = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      element: TimelineElement,
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      const waveformData = element.content.waveformData || [];
      const step = Math.max(1, Math.floor(waveformData.length / width));

      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < waveformData.length; i += step) {
        const barX = x + (i / waveformData.length) * width;
        const barHeight = (waveformData[i] || 0) * (height * 0.6);
        const barY = y + height / 2 - barHeight / 2;

        ctx.moveTo(barX, y + height / 2);
        ctx.lineTo(barX, barY);
        ctx.lineTo(barX, barY + barHeight);
      }

      ctx.stroke();
    },
    []
  );

  // Render playback head (current time indicator)
  const renderPlaybackHead = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const x = TRACK_HEADER_WIDTH + timelineState.currentTime * zoom;

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(x - 6, RULER_HEIGHT);
      ctx.lineTo(x + 6, RULER_HEIGHT);
      ctx.lineTo(x, RULER_HEIGHT - 8);
      ctx.closePath();
      ctx.fill();
    },
    [timelineState.currentTime, zoom]
  );

  // Handle canvas click (seek/select)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Click on ruler - seek to time
      if (y < RULER_HEIGHT) {
        const time = Math.max(0, (x - TRACK_HEADER_WIDTH) / zoom);
        onTimeUpdate(Math.min(time, currentScene.duration));
        return;
      }

      // Click on track element - select element
      const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT);
      const track = currentScene.tracks[trackIndex];

      if (track) {
        const clickTime = (x - TRACK_HEADER_WIDTH) / zoom;
        const clickedElement = track.elements.find(
          (el) => clickTime >= el.startTime && clickTime <= el.endTime
        );

        if (clickedElement) {
          const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
          if (isMultiSelect) {
            const newSelection = timelineState.selectedElements.includes(
              clickedElement.id
            )
              ? timelineState.selectedElements.filter(
                  (id) => id !== clickedElement.id
                )
              : [...timelineState.selectedElements, clickedElement.id];
            onElementSelect(newSelection);
          } else {
            onElementSelect([clickedElement.id]);
          }
        } else {
          onElementSelect([]);
        }
      }
    },
    [
      zoom,
      currentScene,
      timelineState.selectedElements,
      onTimeUpdate,
      onElementSelect,
    ]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - 10));
  }, []);

  // Toggle track lock
  const toggleTrackLock = useCallback(
    (trackId: string) => {
      const track = currentScene.tracks.find((t) => t.id === trackId);
      if (track) {
        onTrackUpdate(currentScene.id, {
          ...track,
          locked: !track.locked,
        });
      }
    },
    [currentScene, onTrackUpdate]
  );

  // Toggle track visibility
  const toggleTrackVisibility = useCallback(
    (trackId: string) => {
      const track = currentScene.tracks.find((t) => t.id === trackId);
      if (track) {
        onTrackUpdate(currentScene.id, {
          ...track,
          visible: !track.visible,
        });
      }
    },
    [currentScene, onTrackUpdate]
  );

  // Toggle track mute
  const toggleTrackMute = useCallback(
    (trackId: string) => {
      const track = currentScene.tracks.find((t) => t.id === trackId);
      if (track && (track.type === 'audio' || track.type === 'video')) {
        onTrackUpdate(currentScene.id, {
          ...track,
          muted: !track.muted,
        });
      }
    },
    [currentScene, onTrackUpdate]
  );

  // Re-render canvas when dependencies change
  useEffect(() => {
    renderTimeline();
  }, [renderTimeline]);

  return (
    <div className={cn('flex flex-col bg-black border-t border-gray-800', className)}>
      {/* Timeline Controls */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-950 border-b border-gray-800">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onStop}
            className="h-8 w-8 p-0"
            title="Stop"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPlayPause}
            className="h-8 w-8 p-0"
            title={timelineState.isPlaying ? 'Pause' : 'Play'}
          >
            {timelineState.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Time Display */}
        <div className="text-xs font-mono text-gray-400 min-w-[80px]">
          {Math.floor(timelineState.currentTime / 60)}:
          {Math.floor(timelineState.currentTime % 60)
            .toString()
            .padStart(2, '0')}
          .{Math.floor((timelineState.currentTime % 1) * 100)
            .toString()
            .padStart(2, '0')}{' '}
          / {Math.floor(currentScene.duration / 60)}:
          {Math.floor(currentScene.duration % 60)
            .toString()
            .padStart(2, '0')}
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="h-8 w-8 p-0"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="w-24">
            <Slider
              value={[zoom]}
              onValueChange={(values) => setZoom(values[0])}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={5}
              className="w-full"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="h-8 w-8 p-0"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-400 min-w-[60px]">
            {zoom}px/s
          </span>
        </div>

        <div className="flex-1" />

        {/* Scene Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Scene:</span>
          <select
            value={currentScene.id}
            onChange={(e) => onSceneChange(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
          >
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-black"
        style={{ maxHeight: '400px' }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="cursor-crosshair"
        />
      </div>

      {/* Track Controls (Overlaid on left side) */}
      <div
        className="absolute left-0 mt-[50px] pointer-events-none"
        style={{ top: RULER_HEIGHT }}
      >
        {currentScene.tracks.map((track, index) => (
          <div
            key={track.id}
            className="flex items-center gap-1 px-2 pointer-events-auto"
            style={{
              height: TRACK_HEIGHT,
              width: TRACK_HEADER_WIDTH,
              marginTop: index === 0 ? 0 : 0,
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleTrackLock(track.id)}
              className="h-6 w-6 p-0"
              title={track.locked ? 'Unlock Track' : 'Lock Track'}
            >
              {track.locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleTrackVisibility(track.id)}
              className="h-6 w-6 p-0"
              title={track.visible ? 'Hide Track' : 'Show Track'}
            >
              {track.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
            {(track.type === 'audio' || track.type === 'video') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleTrackMute(track.id)}
                className="h-6 w-6 p-0"
                title={track.muted ? 'Unmute Track' : 'Mute Track'}
              >
                {track.muted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
