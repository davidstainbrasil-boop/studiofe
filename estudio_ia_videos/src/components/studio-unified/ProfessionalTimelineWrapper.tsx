
'use client';

import React, { useRef, useEffect, useState, useCallback, DragEvent } from 'react';
import { ScrollArea } from '@components/ui/scroll-area';
import { Button } from '@components/ui/button';
import { Layers, Plus, Scissors, ZoomIn, ZoomOut, Type, Image as ImageIcon, Square, Hand, MousePointer, Lock, Unlock } from 'lucide-react';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { cn } from '@lib/utils';
import type { TimelineElement, DragData, TimelineElementType } from '@lib/types/timeline-types';
import { AudioWaveform } from '@components/video-studio/timeline/AudioWaveform';
import { calculateSnapTime, getSnapPoints } from '@lib/utils/snap-utils';
import { useCollaboration } from '@components/collaboration/CollaborationProvider';


// Constants
const TRACK_HEIGHT = 48;
const HEADER_HEIGHT = 32;
const RULER_HEIGHT = 24;

export function ProfessionalTimelineWrapper() {
    const containerRef = useRef<HTMLDivElement>(null);
    // Safe access for collaboration context
    let lockedElements: Record<string, { userId: string; userName: string; color: string }> = {};
    try {
        const collab = useCollaboration();
        lockedElements = collab.lockedElements;
    } catch (e) {
        // Fallback for standalone/testing
    }

    // Store State
    const zoom = useTimelineStore(state => state.zoom);
    const project = useTimelineStore(state => state.project);
    const pixelsPerSecond = useTimelineStore(state => state.pixelsPerSecond);
    const selection = useTimelineStore(state => state.selection);
    const isPlaying = useTimelineStore(state => state.isPlaying);
    // Remove currentTime from here to avoid re-renders on every frame

    // Store Actions
    const setZoom = useTimelineStore(state => state.setZoom);
    const setCurrentTime = useTimelineStore(state => state.setCurrentTime);
    const addElement = useTimelineStore(state => state.addElement);
    const moveElement = useTimelineStore(state => state.moveElement);
    const updateElement = useTimelineStore(state => state.updateElement);
    const selectElement = useTimelineStore(state => state.selectElement);
    const splitElement = useTimelineStore(state => state.splitElement);
    const toggleLayerLock = useTimelineStore(state => state.toggleLayerLock);

    // Helper: Create Demo Elements
    const handleAddElement = (type: 'text' | 'image' | 'shape') => {
        const id = crypto.randomUUID();
        const layerId = `layer-${type}`; // Simplified layer assignment

        const newElement: TimelineElement = {
            id,
            type: type as TimelineElementType,
            name: `New ${type}`,
            start: useTimelineStore.getState().currentTime, // Start at playhead
            duration: 5, // 5s default
            source: '', // Empty source for new elements
            layer: 0, // Default layer
            layerId,
            properties: type === 'text' ? { text: 'Hello' } : {}
        };

        addElement(newElement);
    };

    const handleSplit = () => {
        if (selection.elementIds.length === 1) {
            splitElement(selection.elementIds[0], useTimelineStore.getState().currentTime);
        }
    };

    // Dragging State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState(0);

    // Hover State for Ruler
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState<number>(0);

    // Virtualization State
    const [scrollLeft, setScrollLeft] = useState(0);
    const [viewportWidth, setViewportWidth] = useState(1000); // Default placeholder

    // Update viewport width on resize
    useEffect(() => {
        if (containerRef.current) {
            setViewportWidth(containerRef.current.clientWidth);
        }
        const handleResize = () => {
            if (containerRef.current) setViewportWidth(containerRef.current.clientWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Zoom Helpers
    const handleZoom = (direction: 'in' | 'out') => {
        const newZoom = direction === 'in' ? zoom * 1.2 : zoom / 1.2;
        setZoom(Math.max(0.1, Math.min(newZoom, 10)));
    };

    // Drag & Drop Handler for Timeline
    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        if (!containerRef.current) return;

        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const dragData = JSON.parse(data) as DragData;

            if (dragData.type === 'element' && dragData.sourceType === 'asset') {
                const assetData = dragData.data;

                // Calculate drop time
                // We need to find the scroll container or assume offset
                // A bit tricky without direct ref to scroll content, but we can approximate relative to container
                // minus header width (192px)
                const rect = containerRef.current.getBoundingClientRect();
                const relativeX = e.clientX - rect.left - 192; // 192 = 48px * 4 (header width approx w-48)
                const scrollX = 0; // Ideally we read from store or ref. For MVP/PR7 assume 0 or need ref

                // Better approach: Drop on specific track areas?
                // Let's rely on scroll area calculation 
                // If we drop anywhere in the timeline body
                const time = Math.max(0, (relativeX + scrollX) / (pixelsPerSecond * zoom));

                // Determine Layer?
                // If dropped on a specific track row, we could parse that.
                // For simplicity in PR 7: Create a new layer or use default based on type
                const targetLayerId = assetData.type === 'audio' ? 'music-track' : 'layer-drop';

                const newElement: TimelineElement = {
                    id: crypto.randomUUID(),
                    type: assetData.type as TimelineElementType,
                    name: assetData.name as string,
                    source: assetData.source as string, // Blob URL
                    layer: 0, // Default layer index
                    start: time,
                    duration: assetData.type === 'audio' ? 10 : 5,
                    layerId: targetLayerId,
                    properties: assetData.type === 'image' ? {
                        left: 1920 / 2 - 200,
                        top: 1080 / 2 - 150,
                        width: 400,
                        height: 300,
                        scaleX: 1,
                        scaleY: 1
                    } : {}
                };
                addElement(newElement);
            }
        } catch (err) {
            console.error('Timeline Drop Error', err);
        }
    };

    return (
        <div
            className="h-full flex flex-col bg-background border-t select-none"
            ref={containerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Toolbar */}
            <div className="h-10 border-b flex items-center justify-between px-2 bg-muted/20 shrink-0">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSplit} title="Split (S)">
                        <Scissors className="w-4 h-4" />
                    </Button>

                    <div className="h-4 w-[1px] bg-border mx-2" />

                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddElement('text')}>
                        <Type className="w-3 h-3" /> Text
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddElement('image')}>
                        <ImageIcon className="w-3 h-3" /> IMG
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddElement('shape')}>
                        <Square className="w-3 h-3" /> Shape
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('out')}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('in')}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Headers (Left Panel) */}
                <div className="w-48 border-r bg-muted/10 flex flex-col pt-6 shrink-0 z-20 shadow-sm">
                    {project?.layers.map((layer) => (
                        <div key={layer.id} className="border-b flex items-center px-4 gap-2 bg-background hover:bg-muted/20 transition-colors justify-between" style={{ height: TRACK_HEIGHT }}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-xs font-medium text-muted-foreground truncate">{layer.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-6 w-6", layer.isLocked ? "text-destructive" : "text-muted-foreground/50")}
                                onClick={() => toggleLayerLock(layer.id)}
                            >
                                {layer.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </Button>
                        </div>
                    ))}
                    {(!project || project.layers.length === 0) && (
                        <div className="p-4 text-xs text-muted-foreground text-center">No tracks yet</div>
                    )}
                </div>

                {/* Timeline Tracks Area */}
                <ScrollArea
                    className="flex-1 bg-muted/5 relative"
                    onScrollCapture={(e) => {
                        // Capture scroll position for virtualization
                        // Note: Radix ScrollArea might wrap the target, we need the viewport
                        const target = e.target as HTMLElement;
                        if (target.dataset.radixScrollAreaViewport !== undefined || target.classList.contains('overflow-y-hidden')) { // Attempt to detect actual scroller
                            setScrollLeft(target.scrollLeft);
                        }
                    }}
                >
                    <div className="min-w-full relative" style={{ height: Math.max(1, (project?.layers.length || 0) * TRACK_HEIGHT + RULER_HEIGHT + 100) }}>

                        {/* Ruler */}
                        <div className="sticky top-0 z-10 bg-background border-b" style={{ height: RULER_HEIGHT }}>
                            <TimelineRuler
                                zoom={zoom}
                                pixelsPerSecond={pixelsPerSecond}
                                duration={Math.max(project?.duration || 300, 600)}
                            />
                        </div>

                        {/* Playhead */}
                        <TimelinePlayhead pixelsPerSecond={pixelsPerSecond} zoom={zoom} isPlaying={isPlaying} />

                        {/* Playhead Scrubber (Clickable Area on Ruler) */}
                        <div
                            className="absolute top-0 inset-x-0 h-6 cursor-pointer z-20"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const time = x / (pixelsPerSecond * zoom);
                                useTimelineStore.getState().setCurrentTime(Math.max(0, time));
                            }}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const time = x / (pixelsPerSecond * zoom);
                                setHoverTime(Math.max(0, time));
                                setHoverX(x);
                            }}
                            onMouseLeave={() => {
                                setHoverTime(null);
                            }}
                        />

                        {/* Hover Timestamp Tooltip */}
                        {hoverTime !== null && (
                            <div
                                className="absolute top-6 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded border shadow-sm pointer-events-none z-50 transform -translate-x-1/2 whitespace-nowrap"
                                style={{ left: hoverX }}
                            >
                                {new Date(hoverTime * 1000).toISOString().substr(14, 5)}
                                {(hoverTime % 1 * 100).toFixed(0).padStart(2, '0')} {/* Frames approx */}
                            </div>
                        )}

                        {/* Tracks & Elements */}
                        <div className="relative pt-2">
                            {project?.layers.map((layer, layerIndex) => (
                                <div
                                    key={layer.id}
                                    className={cn("relative border-b border-muted/20 w-[10000px]", layer.isLocked && "bg-muted/10 pattern-diagonal-lines")}
                                    style={{ height: TRACK_HEIGHT }}
                                >
                                    {layer.items.map(element => {
                                        // VIRTUALIZATION CHECK
                                        const startPx = element.start * pixelsPerSecond * zoom;
                                        const endPx = (element.start + element.duration) * pixelsPerSecond * zoom;

                                        // Render buffer: 1000px
                                        const BUFFER = 1000;
                                        const isVisible = (endPx > scrollLeft - BUFFER) && (startPx < scrollLeft + viewportWidth + BUFFER);

                                        if (!isVisible) return null;

                                        return (
                                            <TimelineClip
                                                key={element.id}
                                                element={element}
                                                pixelsPerSecond={pixelsPerSecond * zoom}
                                                isSelected={selection.elementIds.includes(element.id)}
                                                // Lock if layer is locked OR if element is in lockedElements map (collaborator lock)
                                                isLocked={!!layer.isLocked || !!lockedElements[element.id]}
                                                lockedBy={lockedElements[element.id]} // Pass lock info
                                                // Pass shiftKey info via wrapper or handle in clip
                                                onSelect={(multi) => !layer.isLocked && !lockedElements[element.id] && selectElement(element.id, multi)}
                                                onUpdate={(param) => {
                                                    if (layer.isLocked) return;

                                                    // Handle Moves
                                                    if (typeof param.start === 'number' && param.isDelta) {
                                                        // Bulk Move via delta
                                                        useTimelineStore.getState().moveSelection(param.start);
                                                    } else if (typeof param.start === 'number') {
                                                        // Legacy absolute move
                                                        moveElement(element.id, layer.id, param.start);
                                                    }

                                                    if (typeof param.duration === 'number') {
                                                        updateElement(element.id, { duration: param.duration });
                                                    }

                                                    if (param.updates) {
                                                        updateElement(element.id, param.updates);
                                                    }
                                                }}
                                                // Pass actions for keyframes
                                                onKeyframeChange={(action, data) => {
                                                    if (layer.isLocked) return;
                                                    const store = useTimelineStore.getState();
                                                    if (action === 'add') store.addKeyframe(element.id, data as any);
                                                    if (action === 'update') store.updateKeyframe(element.id, data.id, data.updates);
                                                    if (action === 'remove') store.removeKeyframe(element.id, data.id);
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

// Sub-components

function TimelineRuler({ zoom, pixelsPerSecond, duration }: { zoom: number, pixelsPerSecond: number, duration: number }) {
    const tickSpacing = 100 * zoom;
    const numberOfTicks = Math.ceil((duration * pixelsPerSecond * zoom) / 100);

    return (
        <div className="relative w-full h-full overflow-hidden">
            {Array.from({ length: numberOfTicks }).map((_, i) => {
                const second = (i * 100) / (pixelsPerSecond * zoom);
                return (
                    <div
                        key={i}
                        className="absolute bottom-0 text-[10px] text-muted-foreground border-l border-muted-foreground/30 pl-1 h-3"
                        style={{ left: i * 100 }}
                    >
                        {new Date(second * 1000).toISOString().substr(14, 5)}
                    </div>
                );
            })}
        </div>
    )
}

const TimelinePlayhead = React.memo(function TimelinePlayhead({ zoom, pixelsPerSecond, isPlaying }: { zoom: number, pixelsPerSecond: number, isPlaying: boolean }) {
    const currentTime = useTimelineStore(state => state.currentTime);
    const left = currentTime * pixelsPerSecond * zoom;

    return (
        <div
            className={cn(
                "absolute top-0 bottom-0 w-[1px] bg-red-500 z-30 pointer-events-none will-change-transform",
                isPlaying ? "transition-transform duration-75 ease-linear" : ""
            )}
            style={{ transform: `translateX(${left}px)` }}
        >
            <div className="absolute -top-[1px] -left-[5px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-500" />
        </div>
    );
});

// Helper to determine if an element's layer is audio (or element itself is audio)
const layerIsAudio = (element: TimelineElement) => element.type === 'audio';

const TimelineClip = React.memo(function TimelineClip({ element, pixelsPerSecond, isSelected, isLocked, lockedBy, onSelect, onUpdate, onKeyframeChange }: {
    element: TimelineElement,
    pixelsPerSecond: number,
    isSelected: boolean,
    isLocked?: boolean,
    lockedBy?: { userId: string, userName: string, color: string },
    onSelect: (multi: boolean) => void,
    onUpdate: (u: { start?: number, duration?: number, isDelta?: boolean, updates?: Partial<TimelineElement> }) => void,
    onKeyframeChange?: (action: 'add' | 'update' | 'remove', data: any) => void
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [lastDelta, setLastDelta] = useState(0);

    // Fade Drag State
    const [isFadeDragging, setIsFadeDragging] = useState<'in' | 'out' | null>(null);
    const [initialFadeVal, setInitialFadeVal] = useState(0);

    // Check if we are part of a multi-selection
    const selection = useTimelineStore(state => state.selection);
    const isMultiSelection = selection.elementIds.length > 1 && isSelected;

    // Local snap points ref
    const snapPointsRef = useRef<number[]>([]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isLocked) return;
        e.stopPropagation(); // Stop propagation immediately

        onSelect(e.shiftKey);
        setIsDragging(true);
        setDragStartX(e.clientX);
        setLastDelta(0);

        const state = useTimelineStore.getState();
        if (state.project) {
            snapPointsRef.current = getSnapPoints(state.project, state.currentTime, element.id);
        }
    };

    // Fade Handle Handlers
    const handleFadeMouseDown = (e: React.MouseEvent, type: 'in' | 'out') => {
        if (isLocked) return;
        e.stopPropagation(); // Vital: don't start clip drag

        setIsFadeDragging(type);
        setDragStartX(e.clientX);
        setInitialFadeVal(type === 'in' ? (element.fadeIn || 0) : (element.fadeOut || 0));
    };

    useEffect(() => {
        if (isFadeDragging) {
            const handleFadeMove = (e: MouseEvent) => {
                const deltaPx = e.clientX - dragStartX;
                const deltaTime = deltaPx / pixelsPerSecond;

                let newVal = 0;
                const duration = element.duration;
                const currentOpposite = isFadeDragging === 'in' ? (element.fadeOut || 0) : (element.fadeIn || 0);

                if (isFadeDragging === 'in') {
                    newVal = Math.max(0, Math.min(duration - currentOpposite, initialFadeVal + deltaTime));
                    onUpdate({ updates: { fadeIn: newVal } });
                } else {
                    // Dragging left implies negative delta increases fadeOut (since handle starts at right)
                    // Wait, handle is at right. Dragging LEFT (negative delta) means increasing fade out duration (moving handle away from edge).
                    // Dragging RIGHT (positive delta) means decreasing fade out duration.
                    newVal = Math.max(0, Math.min(duration - currentOpposite, initialFadeVal - deltaTime));
                    onUpdate({ updates: { fadeOut: newVal } });
                }
            };

            const handleFadeUp = () => {
                setIsFadeDragging(null);
            };

            window.addEventListener('mousemove', handleFadeMove);
            window.addEventListener('mouseup', handleFadeUp);
            return () => {
                window.removeEventListener('mousemove', handleFadeMove);
                window.removeEventListener('mouseup', handleFadeUp);
            };
        }
    }, [isFadeDragging, dragStartX, pixelsPerSecond, element.duration, element.fadeIn, element.fadeOut, initialFadeVal, onUpdate]);

    useEffect(() => {
        if (!isDragging || isFadeDragging) return;

        // Capture initial start at mount of drag
        const startStateTime = element.start;

        const handleMouseMove = (e: MouseEvent) => {
            const totalDeltaPx = e.clientX - dragStartX;
            const totalDeltaTime = totalDeltaPx / pixelsPerSecond;

            if (isMultiSelection) {
                const incrementalTime = totalDeltaTime - lastDelta;
                if (incrementalTime !== 0) {
                    onUpdate({ start: incrementalTime, isDelta: true });
                    setLastDelta(totalDeltaTime);
                }
            } else {
                const proposedStart = Math.max(0, startStateTime + totalDeltaTime);

                if (proposedStart !== element.start) {
                    const snapResult = calculateSnapTime(proposedStart, snapPointsRef.current, pixelsPerSecond);
                    onUpdate({ start: snapResult.snappedTime });
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            snapPointsRef.current = [];
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStartX, pixelsPerSecond, onUpdate, isMultiSelection, lastDelta, element.start, isFadeDragging]);

    // Render Fade Visualization
    const fadeInWidth = (element.fadeIn || 0) * pixelsPerSecond;
    const fadeOutWidth = (element.fadeOut || 0) * pixelsPerSecond;

    return (
        <div
            className={cn(
                "absolute top-0 bottom-0 rounded-sm overflow-hidden select-none group cursor-pointer",
                isSelected ? "ring-2 ring-primary z-10" : "hover:ring-1 hover:ring-primary/50",
                isLocked && "opacity-90 cursor-not-allowed",
                !!lockedBy && "ring-2 z-10"
            )}
            style={{
                left: element.start * pixelsPerSecond,
                width: element.duration * pixelsPerSecond,
                backgroundColor: isLocked ? '#333' : '#2563eb',
                borderColor: lockedBy?.color,
            }}
            onMouseDown={(e) => {
                // If adding keyframe
                if (e.altKey && !isLocked) {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const rx = e.clientX - rect.left;
                    const timestamp = rx / pixelsPerSecond;
                    if (onKeyframeChange) {
                        onKeyframeChange('add', {
                            id: crypto.randomUUID(),
                            timestamp: Math.max(0, Math.min(element.duration, timestamp)),
                            property: 'opacity',
                            value: 1
                        });
                    }
                    return;
                }
                handleMouseDown(e);
            }}
        >
            {/* Content (Name/Thumb) */}
            <div className="absolute inset-0 px-2 flex items-center text-xs text-white font-medium truncate pointer-events-none z-10">
                {lockedBy ? (
                    <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {lockedBy.userName}
                    </span>
                ) : (
                    element.name || element.id
                )}
            </div>

            {/* Visuals Layer (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {fadeInWidth > 0 && (
                    <polygon points={`0,0 ${fadeInWidth},0 0,${Math.min(30, layerIsAudio(element) ? 40 : 20)}`} fill="black" opacity="0.5" />
                )}
                {fadeOutWidth > 0 && (
                    <polygon points={`${element.duration * pixelsPerSecond - fadeOutWidth},0 ${element.duration * pixelsPerSecond},0 ${element.duration * pixelsPerSecond},${Math.min(30, layerIsAudio(element) ? 40 : 20)}`} fill="black" opacity="0.5" />
                )}
                {/* Keyframes Line */}
                {element.keyframes && element.keyframes.length > 0 && (
                    <polyline
                        points={element.keyframes.map(k => {
                            const x = k.timestamp * pixelsPerSecond;
                            const y = (1 - (typeof k.value === 'number' ? k.value : 1)) * (30); // Approx height
                            return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        opacity="0.8"
                    />
                )}
            </svg>

            {/* Keyframe Interactive Points */}
            {element.keyframes?.map(k => {
                const x = k.timestamp * pixelsPerSecond;
                const value = typeof k.value === 'number' ? k.value : 1;
                // Assuming height ~ 40px for audio or 30px video
                const trackH = layerIsAudio(element) ? 40 : 30;
                const y = (1 - value) * (trackH - 10) + 5;

                return (
                    <div
                        key={k.id}
                        className="absolute w-3 h-3 bg-yellow-400 border border-black rotate-45 transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-crosshair hover:scale-125 transition-transform shadow-sm"
                        style={{ left: x, top: y }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            if (e.shiftKey) {
                                if (onKeyframeChange) onKeyframeChange('remove', { id: k.id });
                                return;
                            }
                            // Simple drag logic placeholder
                        }}
                    />
                )
            })}

            {/* Fade Handles (Visible on Hover) */}
            {!isLocked && (
                <>
                    <div
                        className="absolute top-0 -translate-x-1/2 w-4 h-4 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-start justify-center pt-0.5"
                        style={{ left: fadeInWidth }}
                        onMouseDown={(e) => handleFadeMouseDown(e, 'in')}
                    >
                        <div className="w-2 h-2 rounded-full bg-white border border-black shadow-sm" />
                    </div>

                    <div
                        className="absolute top-0 translate-x-1/2 w-4 h-4 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-start justify-center pt-0.5"
                        style={{ right: fadeOutWidth }}
                        onMouseDown={(e) => handleFadeMouseDown(e, 'out')}
                    >
                        <div className="w-2 h-2 rounded-full bg-white border border-black shadow-sm" />
                    </div>
                </>
            )}

            {/* Resize Handles */}
            <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-black/20 z-10"
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const startX = e.clientX;
                    const startDuration = element.duration;
                    const move = (em: MouseEvent) => {
                        const d = (em.clientX - startX) / pixelsPerSecond;
                        onUpdate({ duration: Math.max(0.1, startDuration + d) });
                    };
                    const up = () => {
                        window.removeEventListener('mousemove', move);
                        window.removeEventListener('mouseup', up);
                    };
                    window.addEventListener('mousemove', move);
                    window.addEventListener('mouseup', up);
                }}
            />
        </div>
    );
});
