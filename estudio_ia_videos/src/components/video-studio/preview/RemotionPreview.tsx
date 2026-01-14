'use client';

import { Player } from '@remotion/player';
import { useEffect, useState } from 'react';
import type { TimelineProject } from '@lib/timeline/types';

export function RemotionPreview({
    project,
    currentTime,
    compositionHeight = 1080,
    compositionWidth = 1920
}: {
    project?: TimelineProject;
    currentTime: number;
    compositionHeight?: number;
    compositionWidth?: number;
}) {
    const [composition, setComposition] = useState<any>(null);

    // Mock composition for now
    const MockComposition = () => {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                fontSize: 100
            }}>
                Preview
            </div>
        );
    };

    return (
        <div className="aspect-video bg-black w-full h-full">
            <Player
                component={MockComposition}
                durationInFrames={300} // 10s * 30fps
                fps={30}
                compositionWidth={compositionWidth}
                compositionHeight={compositionHeight}
                style={{ width: '100%', height: '100%' }}
                controls
                controls
            />
        </div>
    );
}
