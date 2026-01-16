/**
 * LipSyncAvatar - Remotion Component
 * Renders an avatar with realistic lip-sync animation
 * Compatible with facial animation data from FacialAnimationEngine
 */

import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import type { FacialAnimation, EnhancedBlendShapeFrame } from '@/lib/avatar/facial-animation-engine';
import { ARKitBlendShape } from '@/lib/sync/types/viseme.types';

export interface LipSyncAvatarProps {
  /** Facial animation data */
  animation: FacialAnimation;

  /** Avatar image or video URL */
  avatarSrc: string;

  /** Avatar type */
  avatarType?: '2d' | '3d' | 'video';

  /** Width of avatar */
  width?: number;

  /** Height of avatar */
  height?: number;

  /** Position */
  x?: number;
  y?: number;

  /** Scale factor */
  scale?: number;

  /** Enable debug overlay */
  debug?: boolean;
}

/**
 * Get blend shape frame for current time
 */
function getFrameAtTime(
  animation: FacialAnimation,
  time: number
): EnhancedBlendShapeFrame | null {
  // Find closest frame
  const frameIndex = Math.floor(time * animation.fps);

  if (frameIndex < 0 || frameIndex >= animation.frames.length) {
    return null;
  }

  return animation.frames[frameIndex];
}

/**
 * Apply blend shapes to CSS transforms
 * Maps facial blend shapes to 2D transformations
 */
function blendShapesToCSS(frame: EnhancedBlendShapeFrame | null): React.CSSProperties {
  if (!frame) return {};

  const weights = frame.weights;

  // Extract key blend shapes
  const jawOpen = weights[ARKitBlendShape.JawOpen] || 0;
  const mouthSmileLeft = weights[ARKitBlendShape.MouthSmileLeft] || 0;
  const mouthSmileRight = weights[ARKitBlendShape.MouthSmileRight] || 0;
  const mouthFunnel = weights[ARKitBlendShape.MouthFunnel] || 0;
  const eyeBlinkLeft = weights[ARKitBlendShape.EyeBlinkLeft] || 0;
  const eyeBlinkRight = weights[ARKitBlendShape.EyeBlinkRight] || 0;

  // Map to CSS transforms (simplified 2D approach)
  const transforms: string[] = [];

  // Head rotation (if available)
  if (frame.headRotation) {
    transforms.push(`rotateX(${frame.headRotation.x}deg)`);
    transforms.push(`rotateY(${frame.headRotation.y}deg)`);
    transforms.push(`rotateZ(${frame.headRotation.z}deg)`);
  }

  return {
    transform: transforms.join(' '),
    filter: `blur(${eyeBlinkLeft * 2}px)` // Subtle effect for blinks
  };
}

/**
 * Calculate mouth region transformation
 */
function getMouthTransform(frame: EnhancedBlendShapeFrame | null): React.CSSProperties {
  if (!frame) return {};

  const weights = frame.weights;

  const jawOpen = weights[ARKitBlendShape.JawOpen] || 0;
  const mouthFunnel = weights[ARKitBlendShape.MouthFunnel] || 0;
  const mouthPucker = weights[ARKitBlendShape.MouthPucker] || 0;
  const mouthSmileLeft = (weights[ARKitBlendShape.MouthSmileLeft] || 0);
  const mouthSmileRight = (weights[ARKitBlendShape.MouthSmileRight] || 0);
  const avgSmile = (mouthSmileLeft + mouthSmileRight) / 2;

  // Map to 2D transformations
  const scaleY = 1 + (jawOpen * 0.3); // Open mouth
  const scaleX = 1 + (mouthFunnel * 0.2) - (avgSmile * 0.1); // Funnel/smile

  return {
    transform: `scale(${scaleX}, ${scaleY})`,
    transformOrigin: 'center center'
  };
}

export const LipSyncAvatar: React.FC<LipSyncAvatarProps> = ({
  animation,
  avatarSrc,
  avatarType = '2d',
  width = 512,
  height = 512,
  x = 0,
  y = 0,
  scale = 1,
  debug = false
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Get current time in seconds
  const currentTime = frame / fps;

  // Get blend shape frame for current time
  const blendShapeFrame = useMemo(
    () => getFrameAtTime(animation, currentTime),
    [animation, currentTime]
  );

  // Calculate CSS transformations
  const containerStyle = useMemo(
    () => blendShapesToCSS(blendShapeFrame),
    [blendShapeFrame]
  );

  const mouthStyle = useMemo(
    () => getMouthTransform(blendShapeFrame),
    [blendShapeFrame]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}
    >
      {/* Avatar container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...containerStyle
        }}
      >
        {/* Avatar image/video */}
        {avatarType === 'video' ? (
          <video
            src={avatarSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            muted
            playsInline
          />
        ) : (
          <Img
            src={avatarSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* Mouth overlay (for 2D avatars with separate mouth layer) */}
        <div
          style={{
            position: 'absolute',
            bottom: '30%',
            left: '50%',
            width: '30%',
            height: '15%',
            transform: 'translateX(-50%)',
            ...mouthStyle
          }}
        >
          {/* Mouth shape visualization (could be replaced with actual mouth texture) */}
          {debug && (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(255, 0, 0, 0.3)',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
              }}
            />
          )}
        </div>
      </div>

      {/* Debug overlay */}
      {debug && blendShapeFrame && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: 10,
            fontSize: 12,
            fontFamily: 'monospace',
            maxWidth: 300,
            maxHeight: 400,
            overflow: 'auto'
          }}
        >
          <div><strong>Frame:</strong> {frame}</div>
          <div><strong>Time:</strong> {currentTime.toFixed(2)}s</div>
          <div><strong>Source:</strong> {animation.metadata.lipSyncSource}</div>
          <hr style={{ margin: '5px 0' }} />
          <div><strong>Active Blend Shapes:</strong></div>
          {Object.entries(blendShapeFrame.weights)
            .filter(([_, weight]) => weight > 0.01)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 10)
            .map(([shape, weight]) => (
              <div key={shape}>
                {shape}: {(weight * 100).toFixed(0)}%
              </div>
            ))}
          {blendShapeFrame.headRotation && (
            <>
              <hr style={{ margin: '5px 0' }} />
              <div><strong>Head Rotation:</strong></div>
              <div>X: {blendShapeFrame.headRotation.x.toFixed(1)}°</div>
              <div>Y: {blendShapeFrame.headRotation.y.toFixed(1)}°</div>
              <div>Z: {blendShapeFrame.headRotation.z.toFixed(1)}°</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Higher-level component that handles animation loading
 */
export interface SimpleLipSyncAvatarProps {
  /** Avatar image URL */
  avatarSrc: string;

  /** Audio URL */
  audioSrc: string;

  /** Pre-generated animation data (if available) */
  animationData?: FacialAnimation;

  /** Lip-sync text (if animation not pre-generated) */
  text?: string;

  /** Other props */
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  scale?: number;
  debug?: boolean;
}

export const SimpleLipSyncAvatar: React.FC<SimpleLipSyncAvatarProps> = ({
  animationData,
  text,
  ...props
}) => {
  // If animation data is not provided, show placeholder
  if (!animationData) {
    return (
      <div
        style={{
          position: 'absolute',
          left: props.x || 0,
          top: props.y || 0,
          width: props.width || 512,
          height: props.height || 512,
          backgroundColor: 'rgba(200, 200, 200, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 16
        }}
      >
        <div>
          <div>Animation data not available</div>
          {text && <div style={{ fontSize: 12, marginTop: 8 }}>Text: {text.substring(0, 50)}...</div>}
        </div>
      </div>
    );
  }

  return <LipSyncAvatar animation={animationData} {...props} />;
};
