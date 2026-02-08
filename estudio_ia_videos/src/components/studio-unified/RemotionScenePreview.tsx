'use client';

/**
 * Remotion Scene Preview
 * Live video preview of scenes using @remotion/player
 * Renders scene elements (images, text, avatars) as a composited preview
 */

import React, { useMemo, useCallback } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, Img, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { Scene } from '@/types/scene';
import type { CanvasElement } from '@components/studio-unified/InteractiveCanvas';
import { Badge } from '@components/ui/badge';
import { cn } from '@lib/utils';

// ============================================================================
// REMOTION COMPOSITION — renders a single Scene
// ============================================================================

interface SceneCompositionProps {
  scene: Scene;
}

const SceneComposition: React.FC<SceneCompositionProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, fps * 0.3, durationInFrames - fps * 0.3, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.backgroundColor || '#1a1a1a',
        opacity,
      }}
    >
      {/* Background image */}
      {scene.backgroundImage && (
        <Img
          src={scene.backgroundImage}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Scene elements */}
      {scene.elements.map((element: CanvasElement) => (
        <SceneElement key={element.id} element={element} />
      ))}

      {/* Avatar overlay */}
      {scene.avatarConfig?.thumbnailUrl && (
        <div
          style={{
            position: 'absolute',
            ...(getAvatarPosition(scene.avatarConfig.position)),
          }}
        >
          <Img
            src={scene.avatarConfig.thumbnailUrl}
            style={{
              width: 200,
              height: 300,
              objectFit: 'cover',
              borderRadius: 12,
            }}
          />
        </div>
      )}

      {/* Script text overlay (subtitle-style) */}
      {scene.script && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: '10%',
            right: '10%',
            textAlign: 'center',
            color: '#fff',
            fontSize: 24,
            fontWeight: 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            lineHeight: 1.4,
            padding: '8px 16px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 8,
          }}
        >
          {scene.script.slice(0, 120)}{scene.script.length > 120 ? '...' : ''}
        </div>
      )}
    </AbsoluteFill>
  );
};

function getAvatarPosition(position?: string): React.CSSProperties {
  switch (position) {
    case 'left':
      return { left: 20, bottom: 20 };
    case 'center':
      return { left: '50%', bottom: 20, transform: 'translateX(-50%)' };
    case 'right':
      return { right: 20, bottom: 20 };
    case 'bottom-left':
      return { left: 20, bottom: 20 };
    case 'bottom-right':
    default:
      return { right: 20, bottom: 20 };
  }
}

const SceneElement: React.FC<{ element: CanvasElement }> = ({ element }) => {
  if (!element.visible) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    opacity: element.opacity ?? 1,
    transform: `rotate(${element.rotation || 0}deg) scaleX(${element.scaleX || 1}) scaleY(${element.scaleY || 1})`,
  };

  switch (element.type) {
    case 'image':
    case 'avatar':
      return element.src ? (
        <Img src={element.src} style={{ ...style, objectFit: 'contain' }} />
      ) : null;
    case 'text':
      return (
        <div
          style={{
            ...style,
            color: element.fill || '#ffffff',
            fontSize: 32,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {element.text}
        </div>
      );
    default:
      return (
        <div
          style={{
            ...style,
            backgroundColor: element.fill || '#333',
            borderRadius: 4,
          }}
        />
      );
  }
};

// ============================================================================
// MULTI-SCENE COMPOSITION — renders all scenes sequentially
// ============================================================================

interface MultiSceneCompositionProps {
  scenes: Scene[];
}

const MultiSceneComposition: React.FC<MultiSceneCompositionProps> = ({ scenes }) => {
  const { fps } = useVideoConfig();

  let currentFrame = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {scenes.map((scene) => {
        const durationInFrames = Math.max(1, Math.round(scene.duration * fps));
        const fromFrame = currentFrame;
        currentFrame += durationInFrames;

        return (
          <Sequence key={scene.id} from={fromFrame} durationInFrames={durationInFrames}>
            <SceneComposition scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================================================
// PLAYER COMPONENT — exposed to studio-pro
// ============================================================================

interface RemotionScenePreviewProps {
  scenes: Scene[];
  activeSceneId?: string | null;
  mode?: 'single' | 'all';
  className?: string;
}

export function RemotionScenePreview({
  scenes,
  activeSceneId,
  mode = 'single',
  className,
}: RemotionScenePreviewProps) {
  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || scenes[0],
    [scenes, activeSceneId],
  );

  const totalDuration = useMemo(
    () => scenes.reduce((sum, s) => sum + s.duration, 0),
    [scenes],
  );

  if (!activeScene && scenes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center bg-black text-white/50', className)}>
        Nenhuma cena para preview
      </div>
    );
  }

  if (mode === 'single' && activeScene) {
    return (
      <div className={cn('relative', className)}>
        <Player
          component={SceneComposition as React.ComponentType<Record<string, unknown>>}
          inputProps={{ scene: activeScene }}
          durationInFrames={Math.max(1, Math.round(activeScene.duration * 30))}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={30}
          style={{ width: '100%', height: '100%' }}
          controls
          loop
        />
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-[10px] bg-black/60 text-white"
        >
          Remotion Preview
        </Badge>
      </div>
    );
  }

  // All scenes mode
  return (
    <div className={cn('relative', className)}>
      <Player
        component={MultiSceneComposition as React.ComponentType<Record<string, unknown>>}
        inputProps={{ scenes }}
        durationInFrames={Math.max(1, Math.round(totalDuration * 30))}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        style={{ width: '100%', height: '100%' }}
        controls
        loop
      />
      <Badge
        variant="secondary"
        className="absolute top-2 left-2 text-[10px] bg-black/60 text-white"
      >
        {scenes.length} cenas • {totalDuration}s
      </Badge>
    </div>
  );
}
