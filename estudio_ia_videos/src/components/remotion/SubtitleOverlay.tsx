
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export interface SubtitleWord {
    text: string;
    start: number; // seconds
    end: number;   // seconds
}

interface SubtitleOverlayProps {
    subtitles: SubtitleWord[];
    style?: React.CSSProperties;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ subtitles, style }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;

    // Find the active word(s) or phrase
    const activeSubtitle = useMemo(() => {
        return subtitles.find(word => currentTime >= word.start && currentTime <= word.end);
    }, [subtitles, currentTime]);

    if (!activeSubtitle) return null;

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 80,
                left: 0,
                right: 0,
                textAlign: 'center',
                padding: '0 40px',
                ...style
            }}
        >
            <span
                style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 52,
                    fontWeight: 700,
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    padding: '8px 24px',
                    borderRadius: 8,
                    // Highlight effect
                    ...style
                }}
            >
                {activeSubtitle.text}
            </span>
        </div>
    );
};
