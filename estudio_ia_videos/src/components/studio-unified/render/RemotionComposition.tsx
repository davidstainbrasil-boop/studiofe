import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, Audio, Video, Img, OffthreadVideo } from 'remotion';
import { TimelineProject, TimelineElement } from '@/lib/types/timeline-types';

interface RemotionCompositionProps {
    project: TimelineProject;
}

export const RemotionComposition: React.FC<RemotionCompositionProps> = ({ project }) => {
    // Flatten layers to render order (usually bottom to top, or top to bottom depending on UI)
    // In standard NLE, top layers cover bottom layers.
    // We assume project.layers[0] is bottom, or we reverse.
    // Let's assume standard stack: last in array is top-most (z-index highest).

    // However, for clean DOM, we usually map layers 0..N.

    const layers = useMemo(() => {
        return project.layers.filter(l => l.visible);
    }, [project.layers]);

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {layers.map(layer => (
                <AbsoluteFill key={layer.id}>
                    {layer.items.map(element => (
                        <TimelineItem key={element.id} element={element} />
                    ))}
                </AbsoluteFill>
            ))}
        </AbsoluteFill>
    );
};

const TimelineItem: React.FC<{ element: TimelineElement }> = ({ element }) => {
    // Calculate duration in frames? Or seconds?
    // Remotion usage depends on the parent <Player> setup. 
    // Usually we pass frames. If store uses seconds, we need FPS.
    // Assuming UniversalPlayer normalizes this, OR we use Sequence fromInFrames.

    // For now, let's assume the timeline store works in SECONDS (as per Duration: 300s default).
    // Remotion handles Sequence in frames. usage: from={start * fps} durationInFrames={duration * fps}
    // We need the FPS from context or props.
    // But Remotion Composition *inside* Player can access useVideoConfig()!

    const { fps } = useVideoConfigSafe();

    const startFrame = Math.round(element.start * fps);
    const durationInFrames = Math.round(element.duration * fps);

    return (
        <Sequence from={startFrame} durationInFrames={durationInFrames}>
            <ElementContent element={element} />
        </Sequence>
    );
};

import { useVideoConfig } from 'remotion';

// Helper to avoid crash if used outside Remotion context (though it shouldn't be)
const useVideoConfigSafe = () => {
    try {
        return useVideoConfig(); // { width, height, fps, durationInFrames, id }
    } catch (e) {
        return { fps: 30, width: 1920, height: 1080, durationInFrames: 300, id: 'fallback' };
    }
}

const ElementContent: React.FC<{ element: TimelineElement }> = ({ element }) => {

    switch (element.type) {
        case 'video':
            return <OffthreadVideo src={element.source} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;

        case 'image':
            return <Img src={element.source} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;

        case 'text':
            return (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    color: 'white',
                    fontSize: 60,
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    ...element.properties
                }}>
                    {element.name || "Text"}
                </div>
            );

        case 'audio':
            return <Audio src={element.source} volume={element.volume ?? 1} />;

        case 'avatar':
            // Phase 2 Integration: Play actual avatar video or Placeholder
            // Assuming 'source' contains the URL to the D-ID/Synthesia video result
            // OR if it's dynamic, we might render a component.
            // For now, treat as Video.
            return <OffthreadVideo src={element.source} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;

        default:
            return null;
    }
}
