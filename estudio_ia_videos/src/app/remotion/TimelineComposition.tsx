
import React from 'react';
import { AbsoluteFill, Sequence, Audio, OffthreadVideo, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

// Interfaces matching our database/editor structure
export interface TimelineElement {
    id: string;
    type: 'video' | 'audio' | 'text' | 'image';
    name: string;
    startTime: number; // seconds
    duration: number; // seconds
    content: string | null;
    properties: Record<string, any>;
    style?: React.CSSProperties;
    animation?: {
        type: 'fade-in' | 'fade-out' | 'slide-in' | 'slide-out' | 'zoom-in' | 'zoom-out' | 'none';
        duration: number; // seconds
    };
}

export interface TimelineTrack {
    id: string;
    name: string;
    type: 'video' | 'audio' | 'text' | 'image';
    elements: TimelineElement[];
}

import { SubtitleOverlay } from '@/components/remotion/SubtitleOverlay';
import { getTheme } from '@/lib/themes/theme-registry';

export interface TimelineCompositionProps {
    tracks: TimelineTrack[];
    themeId?: string;
}

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({ tracks, themeId }) => {
    const { fps } = useVideoConfig(); // Get FPS for animation calcs
    const theme = getTheme(themeId);

    return (
        <AbsoluteFill className="bg-black">
            {tracks.map((track) => (
                <AbsoluteFill key={track.id}>
                    {track.elements.map((element) => {
                        const startFrame = Math.round(element.startTime * 30); // 30 is default, but safer to use useVideoConfig().fps if passed down or synced. 
                        // Note: For this composition, we are assuming 30fps mapping unless 'fps' context is utilized differently.
                        // Let's stick to the existing math but use 'fps' from book if we want robust, but existing code used 30.
                        // The 'startFrame' logic above is hardcoded to 30.
                        const durationFrames = Math.round(element.duration * 30);

                        // Animation Logic Setup
                        const frame = useCurrentFrame();
                        const relativeFrame = frame - startFrame;

                        let opacity = 1;
                        let transform = '';

                        if (element.animation && element.animation.type !== 'none') {
                            const animDurationFrames = element.animation.duration * 30; // Assuming 30fps like above

                            switch (element.animation.type) {
                                case 'fade-in':
                                    opacity = interpolate(relativeFrame, [0, animDurationFrames], [0, 1], { extrapolateRight: 'clamp' });
                                    break;
                                case 'fade-out':
                                    opacity = interpolate(relativeFrame, [durationFrames - animDurationFrames, durationFrames], [1, 0], { extrapolateLeft: 'clamp' });
                                    break;
                                case 'slide-in':
                                    const x = interpolate(relativeFrame, [0, animDurationFrames], [-100, 0], { extrapolateRight: 'clamp', easing: (t) => t * (2 - t) }); // Ease-out
                                    transform = `translateX(${x}%)`;
                                    break;
                                case 'zoom-in':
                                    const scale = interpolate(relativeFrame, [0, animDurationFrames], [0, 1], { extrapolateRight: 'clamp' });
                                    transform = `scale(${scale})`;
                                    break;
                                // Add more as needed
                            }
                        }

                        if (!element.content) return null;

                        return (
                            <Sequence
                                key={element.id}
                                from={startFrame}
                                durationInFrames={durationFrames}
                            >
                                {element.type === 'video' && (
                                    <OffthreadVideo
                                        src={element.content}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                            opacity: opacity,
                                            transform: transform
                                        }}
                                    />
                                )}
                                {element.type === 'image' && (
                                    <Img
                                        src={element.content}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: opacity, transform: transform }}
                                    />
                                )}
                                {element.type === 'audio' && (
                                    <Audio src={element.content} volume={element.properties?.volume ?? 1} />
                                )}
                                {element.type === 'text' && (
                                    <>
                                        {element.properties?.isSubtitle ? (
                                            <SubtitleOverlay
                                                subtitles={element.data?.subtitles || []}
                                                style={{
                                                    fontFamily: theme.styles.fontFamily,
                                                    // color: theme.styles.textPrimary // SubtitleOverlay uses its own style or we pass it
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    ...element.style, // Apply dynamic style if available
                                                    position: 'absolute',
                                                    width: element.style?.width || '100%',
                                                    height: element.style?.height || 'auto',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    textAlign: element.style?.textAlign || 'center'
                                                }}
                                                className="w-full h-full flex items-center justify-center"
                                            >
                                                <h1
                                                    style={{
                                                        fontFamily: element.style?.fontFamily || theme.styles.fontFamily,
                                                        fontSize: element.style?.fontSize || '60px',
                                                        color: element.style?.color || theme.styles.textPrimary,
                                                        textShadow: element.style?.textShadow || '2px 2px 4px black',
                                                        backgroundColor: element.style?.backgroundColor || 'rgba(0,0,0,0.5)',
                                                        borderRadius: element.style?.borderRadius || `${theme.styles.borderRadius}px`,
                                                        padding: element.style?.padding || '16px'
                                                    }}
                                                    className="font-bold"
                                                >
                                                    {element.content}
                                                </h1>
                                            </div>
                                        )}
                                    </>
                                )}
                            </Sequence>
                        );
                    })}
                </AbsoluteFill>
            ))}
        </AbsoluteFill>
    );
};
