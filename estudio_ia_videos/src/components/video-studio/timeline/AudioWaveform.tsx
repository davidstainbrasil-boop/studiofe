'use client';
import { logger } from '@/lib/logger';

import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

export function AudioWaveform({
    audioUrl,
    height = 64,
    waveColor = '#4F4A85',
    progressColor = '#383351'
}: {
    audioUrl: string;
    height?: number;
    waveColor?: string;
    progressColor?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Destroy previous instance if it exists
        if (wavesurfer.current) {
            wavesurfer.current.destroy();
        }

        // Initialize WaveSurfer
        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor,
            progressColor,
            height,
            barWidth: 2,
            barGap: 1,
            normalize: true,
            cursorWidth: 0, // Hide internal cursor if we use external playhead
            interact: false // Disable interaction if used just for visualization
        });

        // Load audio
        wavesurfer.current.load(audioUrl);

        // Initial silent error handling
        wavesurfer.current.on('error', (e) => {
            logger.warn('WaveSurfer error:', e);
        });

        return () => {
            if (wavesurfer.current) {
                wavesurfer.current.destroy();
            }
        };
    }, [audioUrl, height, waveColor, progressColor]);

    return (
        <div ref={containerRef} className="w-full h-full" />
    );
}
