/**
 * Ready Player Me Avatar Composition
 *
 * Remotion composition for rendering RPM avatars with facial animations
 */

import React from 'react';
import { RPMAvatarWithLipSync } from './components/RPMAvatarWithLipSync';
import { BlendShapeFrame } from '@/lib/avatar/blend-shape-controller';

export interface RPMAvatarCompositionProps {
  avatarUrl: string;
  audioUrl?: string;
  blendShapeFrames: BlendShapeFrame[];
  fps?: number;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  backgroundColor?: string;
}

export const RPMAvatarComposition: React.FC<RPMAvatarCompositionProps> = (props) => {
  return <RPMAvatarWithLipSync {...props} />;
};
