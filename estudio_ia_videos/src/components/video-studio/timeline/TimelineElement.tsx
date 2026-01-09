'use client';

import { useDraggable } from '@dnd-kit/core';
import type { TimelineElement as ITimelineElement } from '@lib/timeline/types';
import { AudioWaveform } from './AudioWaveform';

export function TimelineElement({
    element,
    zoom,
    trackType
}: {
    element: ITimelineElement;
    zoom: number;
    trackType: string;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: element.id,
        data: {
            type: 'element',
            element
        }
    });

    const width = element.duration * 10 * zoom; // 10px per second base
    const left = element.startTime * 10 * zoom;

    // Transform handling for drag preview
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : {
        left: `${left}px`,
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`absolute h-full top-0 border border-black/20 rounded overflow-hidden cursor-move ${trackType === 'audio' ? 'bg-indigo-300' : 'bg-blue-300'
                }`}
            style={{
                width: `${width}px`,
                ...style
            }}
            title={element.id}
        >
            {trackType === 'audio' ? (
                // Use a valid public audio for testing if possible, or placeholder
                // For now, passing a generic URL. In production, this comes from element.properties.source
                <AudioWaveform audioUrl={element.properties.source || 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'} />
            ) : (
                <div className="p-1 text-xs truncate">
                    {element.id}
                </div>
            )}
        </div>
    );
}
