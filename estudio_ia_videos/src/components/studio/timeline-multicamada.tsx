'use client';

import { useState, useRef, useEffect } from 'react';
import { useTimelineStore } from '@lib/stores/timeline-store';

interface TimelineBlock {
    id: string;
    slideIndex: number;
    title: string;
    startTime: number;
    duration: number;
    layerType: 'video' | 'audio' | 'captions';
}

export function TimelineMulticamada() {
    const {
        project,
        currentTime,
        duration,
        setCurrentTime,
        selectElement,
        moveElement
    } = useTimelineStore();

    const [isDragging, setIsDragging] = useState(false);
    const [draggedBlock, setDraggedBlock] = useState<TimelineBlock | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);

    const pixelsPerSecond = 50; // 50px = 1 segundo
    const snapInterval = 5; // Snap to 5s grid
    const totalWidth = duration * pixelsPerSecond;

    // Convert project layers to timeline blocks
    const blocks: TimelineBlock[] = project?.layers.flatMap((layer) =>
        layer.elements.map((element) => ({
            id: element.id,
            slideIndex: parseInt(element.id.split('-')[1] || '0'),
            title: element.name || `Slide ${element.id}`,
            startTime: element.start / 1000, // ms to seconds
            duration: element.duration / 1000,
            layerType: layer.type as 'video' | 'audio' | 'captions'
        }))
    ) || [];

    const handleMouseDown = (e: React.MouseEvent, block: TimelineBlock) => {
        setIsDragging(true);
        setDraggedBlock(block);

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setDragOffset(e.clientX - rect.left);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !draggedBlock || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset;
        const newTime = Math.max(0, x / pixelsPerSecond);

        // Snap to grid
        const snappedTime = Math.round(newTime / snapInterval) * snapInterval;

        // Update visual position (temporary - will be saved on mouseup)
        const element = document.getElementById(`block-${draggedBlock.id}`);
        if (element) {
            element.style.left = `${snappedTime * pixelsPerSecond}px`;
        }
    };

    const handleMouseUp = () => {
        if (!draggedBlock) return;

        const element = document.getElementById(`block-${draggedBlock.id}`);
        if (element) {
            const left = parseInt(element.style.left);
            const newStartTime = left / pixelsPerSecond;

            // Update store
            moveElement(
                draggedBlock.id,
                draggedBlock.layerType,
                newStartTime * 1000 // seconds to ms
            );
        }

        setIsDragging(false);
        setDraggedBlock(null);
    };

    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickedTime = x / pixelsPerSecond;

        setCurrentTime(clickedTime * 1000); // seconds to ms
    };

    // Render time markers
    const timeMarkers = [];
    for (let t = 0; t <= duration; t += snapInterval) {
        timeMarkers.push(
            <div
                key={t}
                className="absolute top-0 bottom-0 border-l border-gray-300 dark:border-gray-600"
                style={{ left: `${t * pixelsPerSecond}px` }}
            >
                <span className="absolute -top-5 -left-2 text-xs text-gray-500">
                    {Math.floor(t / 60)}:{String(t % 60).padStart(2, '0')}
                </span>
            </div>
        );
    }

    // Group blocks by layer
    const videoBlocks = blocks.filter((b) => b.layerType === 'video');
    const audioBlocks = blocks.filter((b) => b.layerType === 'audio');
    const captionBlocks = blocks.filter((b) => b.layerType === 'captions');

    const renderLayer = (layerBlocks: TimelineBlock[], layerName: string, color: string) => (
        <div className="relative h-16 border-b border-gray-200 dark:border-gray-700">
            <div className="absolute left-0 top-0 w-24 h-full bg-gray-100 dark:bg-gray-800 px-2 py-1 border-r border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{layerName}</span>
            </div>
            <div className="ml-24 relative h-full">
                {layerBlocks.map((block) => (
                    <div
                        key={block.id}
                        id={`block-${block.id}`}
                        className={`absolute top-2 h-12 rounded cursor-move ${color} border-2 border-opacity-50 px-2 py-1 hover:opacity-80 transition-opacity`}
                        style={{
                            left: `${block.startTime * pixelsPerSecond}px`,
                            width: `${block.duration * pixelsPerSecond}px`
                        }}
                        onMouseDown={(e) => handleMouseDown(e, block)}
                        onClick={() => selectElement(block.id, false)}
                    >
                        <div className="text-xs font-medium text-white truncate">
                            {block.title}
                        </div>
                        <div className="text-xs text-white opacity-75">
                            {block.duration.toFixed(1)}s
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            {/* Timeline Header */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    🎬 Timeline - Edição Multicamada
                </h3>
            </div>

            {/* Timeline Ruler */}
            <div className="relative h-8 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <div className="ml-24 relative" style={{ width: `${totalWidth}px` }}>
                    {timeMarkers}
                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: `${(currentTime / 1000) * pixelsPerSecond}px` }}
                    >
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Timeline Tracks */}
            <div
                ref={timelineRef}
                className="overflow-x-auto overflow-y-auto max-h-96"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleTimelineClick}
            >
                <div style={{ width: `${totalWidth + 100}px` }}>
                    {renderLayer(videoBlocks, '📹 Video', 'bg-blue-500')}
                    {renderLayer(audioBlocks, '🎵 Audio', 'bg-green-500')}
                    {renderLayer(captionBlocks, '💬 Legendas', 'bg-purple-500')}
                </div>
            </div>

            {/* Timeline Controls */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                        ▶️ Play
                    </button>
                    <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 text-sm">
                        ⏸️ Pause
                    </button>
                    <span className="text-sm ml-2 text-gray-600 dark:text-gray-400">
                        {Math.floor((currentTime / 1000) / 60)}:{String(Math.floor((currentTime / 1000) % 60)).padStart(2, '0')}
                    </span>
                </div>

                <div className="text-xs text-gray-500">
                    {blocks.length} elementos • {duration}s total
                </div>
            </div>
        </div>
    );
}
