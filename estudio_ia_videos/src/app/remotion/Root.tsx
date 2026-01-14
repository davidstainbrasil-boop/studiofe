import React from 'react';
import { Composition } from 'remotion';
import { MyComposition, MyCompositionProps } from './Composition';
import { TimelineComposition, TimelineCompositionProps } from './TimelineComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Remotion Composition generic typing requires component cast */}
      <Composition<MyCompositionProps, Record<string, unknown>>
        id="MyVideo"
        component={MyComposition as React.ComponentType<MyCompositionProps>}
        durationInFrames={30 * 60} // Fallback duration
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          slides: [
            {
              id: '1',
              title: 'Slide 1',
              content: 'Welcome to Remotion',
              duration: 5,
            },
          ],
        }}
        calculateMetadata={async ({ props }) => {
          const fps = 30;
          const totalDurationInSeconds = props.slides.reduce((acc, slide) => acc + (slide.duration || 5), 0);
          return {
            durationInFrames: Math.ceil(totalDurationInSeconds * fps),
            props,
          };
        }}
      />
      <Composition<TimelineCompositionProps, Record<string, unknown>>
        id="TimelineVideo"
        component={TimelineComposition as React.ComponentType<TimelineCompositionProps>}
        durationInFrames={30 * 60}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tracks: []
        }}
        // Calculate total duration from tracks
        calculateMetadata={async ({ props }) => {
          let maxDuration = 0;
          if (props.tracks) {
            props.tracks.forEach((t: any) => {
              if (t.elements) {
                t.elements.forEach((e: any) => {
                  const end = e.startTime + e.duration;
                  if (end > maxDuration) maxDuration = end;
                });
              }
            });
          }
          return {
            durationInFrames: Math.max(30, Math.ceil(maxDuration * 30)), // At least 1 sec
            props
          };
        }}
      />
    </>
  );
};
