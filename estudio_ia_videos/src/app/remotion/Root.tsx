import React from 'react';
import { Composition } from 'remotion';
import { MyComposition } from './Composition';
import { TimelineComposition } from './TimelineComposition';
import { RPMAvatarComposition } from './RPMAvatarComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {}
      <Composition<any, any> // eslint-disable-line @typescript-eslint/no-explicit-any
        id="MyVideo"
        component={MyComposition as any} // eslint-disable-line @typescript-eslint/no-explicit-any
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
        calculateMetadata={async ({ props }: { props: any }) => {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          const fps = 30;
          const slides = (props?.slides || []) as Array<{ duration?: number }>;
          const totalDurationInSeconds = slides.reduce(
            (acc: number, slide: { duration?: number }) => acc + (slide.duration || 5),
            0,
          );
          return {
            durationInFrames: Math.ceil(totalDurationInSeconds * fps),
            props,
          };
        }}
      />
      {}
      <Composition<any, any> // eslint-disable-line @typescript-eslint/no-explicit-any
        id="TimelineVideo"
        component={TimelineComposition as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        durationInFrames={30 * 60}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tracks: [],
        }}
        // Calculate total duration from tracks
        calculateMetadata={async ({ props }: { props: any }) => {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          let maxDuration = 0;
          const tracks = (props?.tracks || []) as Array<{
            elements?: Array<{ startTime: number; duration: number }>;
          }>;
          if (Array.isArray(tracks)) {
            tracks.forEach((t: any) => {
              // eslint-disable-line @typescript-eslint/no-explicit-any
              if (t.elements && Array.isArray(t.elements)) {
                t.elements.forEach((e: any) => {
                  // eslint-disable-line @typescript-eslint/no-explicit-any
                  const end = e.startTime + e.duration;
                  if (end > maxDuration) maxDuration = end;
                });
              }
            });
          }
          return {
            durationInFrames: Math.max(30, Math.ceil(maxDuration * 30)), // At least 1 sec
            props,
          };
        }}
      />
      {}
      <Composition<any, any> // eslint-disable-line @typescript-eslint/no-explicit-any
        id="RPMAvatar"
        component={RPMAvatarComposition as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        durationInFrames={30 * 60}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          avatarUrl: 'https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb',
          blendShapeFrames: [],
        }}
        calculateMetadata={async ({ props }: { props: any }) => {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          const frames = props?.blendShapeFrames || [];
          const durationInFrames = frames.length > 0 ? frames.length : 30 * 5; // 5 seconds default
          return {
            durationInFrames,
            props,
          };
        }}
      />
    </>
  );
};
