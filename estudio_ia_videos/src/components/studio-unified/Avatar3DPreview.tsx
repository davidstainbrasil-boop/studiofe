'use client';

/**
 * SPRINT 6: Avatar 3D Preview Component
 *
 * Features:
 * - 3D model rendering with Three.js
 * - Orbit controls for interaction
 * - Real-time customization preview
 * - Loading states
 * - Error handling
 */

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Avatar } from '@/types/video-project';

export interface Avatar3DPreviewProps {
  avatar: Avatar;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
}

/**
 * 3D Avatar Model Component
 */
interface AvatarModelProps {
  glbUrl: string;
  customization?: Avatar['customization'];
}

function AvatarModel({ glbUrl, customization }: AvatarModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load GLB model
  const gltf = useLoader(GLTFLoader, glbUrl);

  // Apply customizations to materials
  useEffect(() => {
    if (!gltf || !customization) return;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Apply skin tone to skin material
        if (mesh.material && 'name' in mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial;

          if (material.name.includes('skin') && customization.skinTone) {
            material.color = new THREE.Color(customization.skinTone);
          }

          if (material.name.includes('hair') && customization.hairColor) {
            material.color = new THREE.Color(customization.hairColor);
          }
        }
      }
    });
  }, [gltf, customization]);

  // Idle animation (slight breathing)
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} scale={1.5} />
    </group>
  );
}

/**
 * Fallback Avatar (when model fails to load)
 */
function FallbackAvatar() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#666666" roughness={0.5} metalness={0.3} />
    </mesh>
  );
}

/**
 * Loading Fallback
 */
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D model...</p>
      </div>
    </div>
  );
}

/**
 * Error Fallback
 */
function ErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
      <div className="text-center p-4">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-red-900 dark:text-red-100">
          Failed to load 3D model
        </p>
        {error && (
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Main Avatar 3D Preview Component
 */
export function Avatar3DPreview({
  avatar,
  className,
  autoRotate = true,
  showControls = true,
}: Avatar3DPreviewProps) {
  const [error, setError] = React.useState<Error | undefined>();

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows
        onCreated={({ gl }) => {
          gl.setClearColor('#f5f5f5');
        }}
        onError={(err) => setError(err as Error)}
      >
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 1.5, 3]} fov={50} />

        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 3, -5]} intensity={0.3} />

        {/* Environment (optional HDRI for better reflections) */}
        <Environment preset="studio" />

        {/* 3D Avatar Model */}
        <Suspense fallback={<FallbackAvatar />}>
          {error ? (
            <FallbackAvatar />
          ) : (
            <AvatarModel
              glbUrl={avatar.glbUrl}
              customization={avatar.customization}
            />
          )}
        </Suspense>

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.2} />
        </mesh>

        {/* Controls */}
        {showControls && (
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={2}
            enableZoom={true}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
            minDistance={2}
            maxDistance={5}
            target={[0, 1, 0]}
          />
        )}
      </Canvas>

      {/* Overlay for loading/error */}
      <Suspense fallback={<LoadingFallback />}>
        {error && <ErrorFallback error={error} />}
      </Suspense>
    </div>
  );
}

export default Avatar3DPreview;
