
'use client';

import React, { useEffect, useRef } from 'react';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { TimelineElement } from '@lib/types/timeline-types';

export function AudioPlaybackManager() {
    const isPlaying = useTimelineStore(state => state.isPlaying);
    const currentTime = useTimelineStore(state => state.currentTime);
    const project = useTimelineStore(state => state.project);

    // Map of element ID to Audio element
    const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    useEffect(() => {
        if (!project) return;

        const audioElements = project.layers.flatMap(l => l.items).filter(i => i.type === 'audio');
        const currentIds = new Set(audioElements.map(i => i.id));

        // 1. Cleanup old audios
        for (const [id, audio] of audiosRef.current.entries()) {
            if (!currentIds.has(id)) {
                audio.pause();
                audio.src = '';
                audiosRef.current.delete(id);
            }
        }

        // 2. Initialize new/update existing audios
        audioElements.forEach(element => {
            let audio = audiosRef.current.get(element.id);
            if (!audio) {
                audio = new Audio(element.source);
                audiosRef.current.set(element.id, audio);
            }

            // Sync properties
            const volume = element.volume ?? 1;
            const muted = element.muted ?? false;

            // Calculate Fade (simplified Volume adjustment)
            let currentVolume = volume;
            const relativeTime = currentTime - element.start;

            if (element.fadeIn && relativeTime < element.fadeIn / 1000) {
                currentVolume *= (relativeTime / (element.fadeIn / 1000));
            }

            const timeUntilEnd = (element.start + element.duration) - currentTime;
            if (element.fadeOut && timeUntilEnd < element.fadeOut / 1000) {
                currentVolume *= (timeUntilEnd / (element.fadeOut / 1000));
            }

            audio.volume = Math.max(0, Math.min(1, muted ? 0 : currentVolume));

            // Sync Playback State
            const isActive = currentTime >= element.start && currentTime < (element.start + element.duration);

            if (isActive && isPlaying) {
                if (audio.paused) {
                    // Set time first
                    audio.currentTime = currentTime - element.start;
                    audio.play().catch(e => console.warn('Audio play blocked:', e));
                } else {
                    // Constant sync to prevent drift (drastic drift check)
                    const targetTime = currentTime - element.start;
                    if (Math.abs(audio.currentTime - targetTime) > 0.1) {
                        audio.currentTime = targetTime;
                    }
                }
            } else {
                if (!audio.paused) {
                    audio.pause();
                }
            }
        });

    }, [project, isPlaying, currentTime]);

    return null; // Invisible component
}
