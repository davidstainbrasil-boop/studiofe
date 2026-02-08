'use client';
import { logger } from '@/lib/logger';

import { useState, useRef, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import type { TimelineTrack } from '@lib/timeline/types';
import { TimelineTrack as TrackComponent } from './TimelineTrack';
import { TimelineRuler } from './TimelineRuler';
import { Button } from '@components/ui/button';
import { Play, Pause, ZoomIn, ZoomOut, Plus, Settings } from 'lucide-react';

// Local interface for project since TimelineState doesn't quite match
interface TimelineProject {
  id: string;
  duration: number;
  fps: number;
  tracks: TimelineTrack[];
}

export function TimelineEditor({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<TimelineProject | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Mock load project for now
        setProject({
            id: projectId,
            duration: 300,
            fps: 30,
            tracks: [
                {
                    id: 't1',
                    type: 'video',
                    name: 'Video 1',
                    locked: false,
                    visible: true,
                    muted: false,
                    solo: false,
                    height: 80,
                    elements: [
                        {
                            id: 'el-1',
                            trackId: 't1',
                            startTime: 0,
                            duration: 10,
                            properties: { opacity: 1 },
                            keyframes: []
                        }
                    ]
                },
                {
                    id: 't2',
                    type: 'audio',
                    name: 'Audio 1',
                    locked: false,
                    visible: true,
                    muted: false,
                    solo: false,
                    height: 60,
                    elements: [
                        {
                            id: 'el-2',
                            trackId: 't2',
                            startTime: 0,
                            duration: 15,
                            properties: { source: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
                            keyframes: []
                        }
                    ]
                }
            ]
        });
    }, [projectId]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        logger.info('Dragged', active.id, 'to', over.id);
        // Logic to update element position
    };

    const addTrack = (type: TimelineTrack['type']) => {
        if (!project) return;
        const newTrack: TimelineTrack = {
            id: `track-${Date.now()}`,
            type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${project.tracks.length + 1}`,
            locked: false,
            visible: true,
            muted: false,
            solo: false,
            height: 60,
            elements: []
        };
        setProject({
            ...project,
            tracks: [...project.tracks, newTrack]
        });
    };

    return (
        <div className="flex flex-col h-full bg-background border-t border-border">
            {/* Toolbar */}
            <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-muted/40">
                <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="h-4 w-px bg-border mx-2" />
                <Button variant="outline" size="sm" onClick={() => addTrack('video')}>
                    <Plus className="h-3 w-3 mr-1" /> Video
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTrack('audio')}>
                    <Plus className="h-3 w-3 mr-1" /> Audio
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(5, z + 0.1))}>
                    <ZoomIn className="h-4 w-4" />
                </Button>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Headers Column */}
                <div className="w-64 border-r border-border bg-muted/20 flex flex-col">
                    <div className="h-8 border-b border-border bg-muted/50" /> {/* Ruler data spacer */}
                    <div className="flex-1 overflow-y-hidden">
                        {project?.tracks.map(track => (
                            <div key={track.id} className="h-24 border-b border-border p-2 flex items-center justify-between">
                                <span className="font-medium text-sm">{track.name}</span>
                                <Button variant="ghost" size="icon" title="Settings"><Settings className="h-3 w-3" /></Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tracks Viewport */}
                <DndContext onDragEnd={handleDragEnd}>
                    <div className="flex-1 flex flex-col overflow-x-auto relative" ref={timelineRef}>
                        <TimelineRuler duration={project?.duration || 0} zoom={zoom} />
                        <div className="flex-1 min-w-max relative">
                            {/* Virtualized Tracks */}
                            {project && project.tracks.length > 0 && (
                                <div style={{ height: 'calc(100vh - 200px)' }}> {/* Adjust height as needed */}
                                    {project.tracks.map(track => (
                                        <TrackComponent key={track.id} track={track} zoom={zoom} />
                                    ))}
                                </div>
                            )}

                            {/* Playhead */}
                            <div
                                className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none"
                                style={{ left: `${currentTime * zoom * 10}px` }} // 10px per second base
                            />
                        </div>
                    </div>
                </DndContext>
            </div>
        </div>
    );
}
