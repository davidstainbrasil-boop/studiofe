import { Player } from '@remotion/player';
import { useMemo } from 'react';
import type { TimelineProject } from '@lib/types/timeline-types';
import { TimelineComposition } from '@/app/remotion/TimelineComposition';
import { mapProjectToRemotionProps } from '@lib/mappers/timeline-mapper';

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
    const inputProps = useMemo(() => {
        if (!project) return { tracks: [] };
        return mapProjectToRemotionProps(project);
    }, [project]);

    // Calculate duration in frames (30fps default)
    const durationInFrames = useMemo(() => {
        if (!project) return 300;
        return Math.max(30, Math.ceil(project.duration * 30));
    }, [project]);

    if (!project) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-gray-900 text-white">
                No Project Loaded
            </div>
        );
    }

    return (
        <div className="aspect-video bg-black w-full h-full">
            <Player
                component={TimelineComposition}
                inputProps={inputProps}
                durationInFrames={durationInFrames}
                fps={30}
                compositionWidth={compositionWidth}
                compositionHeight={compositionHeight}
                style={{ width: '100%', height: '100%' }}
                controls
                initialFrame={Math.round(currentTime * 30)}
            />
        </div>
    );
}
