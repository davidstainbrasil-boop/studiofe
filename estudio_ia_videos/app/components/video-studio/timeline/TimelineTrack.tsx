'use client';

import { TimelineTrack } from '@/app/lib/timeline/types';
import { useDroppable } from '@dnd-kit/core';
import { TimelineElement } from './TimelineElement';

export function TimelineTrack({ track, zoom }: { track: TimelineTrack; zoom: number }) {
    const { setNodeRef } = useDroppable({
        id: track.id,
    });

    return (
        <div
            ref={setNodeRef}
            className="h-24 border-b border-border bg-card/50 relative w-full"
        >
            {/* Grid lines for visual aid */}
            <div className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px)',
                    backgroundSize: `${10 * zoom}px 100%`
                }}
            />


            {/* Elements render here */}
            {track.elements.length > 0 ? (
                track.elements.map(element => (
                    <TimelineElement
                        key={element.id}
                        element={element}
                        zoom={zoom}
                        trackType={track.type}
                    />
                ))
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground opacity-30">
                    Drop items here
                </div>
            )}
        </div>
    );
}
