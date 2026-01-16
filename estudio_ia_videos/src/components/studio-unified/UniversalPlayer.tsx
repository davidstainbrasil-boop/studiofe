'use client';

import React, { useRef, useMemo } from 'react';
import { Player } from '@remotion/player';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import { RemotionComposition } from './render/RemotionComposition';
import { Loader2 } from 'lucide-react';

export const UniversalPlayer: React.FC = () => {
    const project = useTimelineStore(state => state.project);
    const { currentTime, isPlaying, duration, setCurrentTime, play, pause } = useTimelineStore();
    const playerRef = useRef<any>(null);

    // Sync Store -> Player
    // (In a real app, we need tight bidirectional sync. 
    // Remotion Player manages its own state, so we listen to it).

    if (!project) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black/90 text-white">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Carregando Projeto...</p>
                </div>
            </div>
        );
    }

    // Calculate input props
    const inputProps = useMemo(() => ({
        project: project
    }), [project]);

    return (
        <div className="w-full h-full bg-black flex flex-col">
            <div className="flex-1 relative overflow-hidden">
                <Player
                    ref={playerRef}
                    component={RemotionComposition as any}
                    inputProps={inputProps}
                    durationInFrames={Math.max(1, Math.round(duration * 30))} // 30 FPS default
                    compositionWidth={project.resolution.width}
                    compositionHeight={project.resolution.height}
                    fps={30}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    controls
                    autoPlay={isPlaying}
                    initialFrame={Math.round(currentTime * 30)}
                />
            </div>
        </div>
    );
};
