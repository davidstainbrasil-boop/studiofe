'use client';

import React from 'react';

export function TimelineRuler({ duration, zoom }: { duration: number; zoom: number }) {
    const pxPerSecond = 10 * zoom;
    const totalWidth = duration * pxPerSecond;

    // Generate ticks
    const ticks = [];
    const step = zoom < 0.5 ? 10 : zoom < 2 ? 5 : 1; // seconds per major tick

    for (let i = 0; i <= duration; i += step) {
        ticks.push(
            <div
                key={i}
                className="absolute top-0 h-full border-l border-gray-500 text-[10px] pl-1 select-none"
                style={{ left: `${i * pxPerSecond}px` }}
            >
                {i}s
            </div>
        );
    }

    return (
        <div className="h-8 border-b border-border bg-muted/50 relative" style={{ width: `${totalWidth}px` }}>
            {ticks}
        </div>
    );
}
