/**
 * Ready Player Me Avatar with Lip-Sync Animation
 *
 * This component loads a Ready Player Me GLB model and applies
 * ARKit blend shape animations for realistic lip-sync.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig, Audio } from 'remotion';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { BlendShapeFrame } from '@/lib/avatar/blend-shape-controller';

export interface RPMAvatarWithLipSyncProps {
  /**
   * Ready Player Me avatar URL (GLB model)
   * Format: https://models.readyplayer.me/[avatarId].glb
   */
  avatarUrl: string;

  /**
   * Audio file URL for lip-sync
   */
  audioUrl?: string;

  /**
   * Blend shape animation frames from FacialAnimationEngine
   */
  blendShapeFrames: BlendShapeFrame[];

  /**
   * Frame rate (default 30fps)
   */
  fps?: number;

  /**
   * Camera position [x, y, z]
   */
  cameraPosition?: [number, number, number];

  /**
   * Camera target [x, y, z]
   */
  cameraTarget?: [number, number, number];

  /**
   * Background color
   */
  backgroundColor?: string;
}

/**
 * Avatar mesh component that applies blend shapes
 */
function AvatarMesh({
  avatarUrl,
  blendShapeFrames,
}: {
  avatarUrl: string;
  blendShapeFrames: BlendShapeFrame[];
}) {
  const currentFrame = useCurrentFrame();
  const meshRef = useRef<THREE.Mesh>(null);
  const [morphTargetDictionary, setMorphTargetDictionary] = useState<Record<string, number> | null>(
    null,
  );

  // Load GLB model
  const gltf = useLoader(GLTFLoader, avatarUrl);

  // Extract morph target dictionary from the loaded model
  useEffect(() => {
    if (gltf && gltf.scene) {
      gltf.scene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.morphTargetDictionary) {
            setMorphTargetDictionary(mesh.morphTargetDictionary);
            (meshRef as React.MutableRefObject<THREE.Mesh | null>).current = mesh;
          }
        }
      });
    }
  }, [gltf]);

  // Apply blend shapes on each frame
  useFrame(() => {
    if (!meshRef.current || !morphTargetDictionary || !blendShapeFrames.length) return;

    // Find the current blend shape frame
    const frameIndex = Math.floor(currentFrame);
    if (frameIndex >= blendShapeFrames.length) return;

    const frame = blendShapeFrames[frameIndex];
    if (!frame || !frame.weights) return;

    // Apply weights to morph targets
    Object.entries(frame.weights).forEach(([shapeName, weight]) => {
      if (shapeName in morphTargetDictionary) {
        const morphIndex = morphTargetDictionary[shapeName];
        if (meshRef.current && meshRef.current.morphTargetInfluences) {
          meshRef.current.morphTargetInfluences[morphIndex] = weight;
        }
      }
    });
  });

  return <primitive object={gltf.scene} />;
}

/**
 * Main RPM Avatar component with lip-sync
 */
export const RPMAvatarWithLipSync: React.FC<RPMAvatarWithLipSyncProps> = ({
  avatarUrl,
  audioUrl,
  blendShapeFrames,
  fps = 30, // eslint-disable-line @typescript-eslint/no-unused-vars
  cameraPosition = [0, 1.6, 2],
  cameraTarget = [0, 1.6, 0],
  backgroundColor = '#f0f0f0',
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div style={{ width, height, backgroundColor }}>
      <Canvas
        camera={{
          position: cameraPosition,
          fov: 50,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, 5]} intensity={0.5} />

        {/* Avatar with blend shapes */}
        <React.Suspense fallback={null}>
          <AvatarMesh avatarUrl={avatarUrl} blendShapeFrames={blendShapeFrames} />
        </React.Suspense>

        {/* Camera target */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Three.js position prop requires array casting */}
        <group position={cameraTarget as any}>
          <mesh visible={false}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
          </mesh>
        </group>
      </Canvas>

      {/* Audio */}
      {audioUrl && <Audio src={audioUrl} />}
    </div>
  );
};
