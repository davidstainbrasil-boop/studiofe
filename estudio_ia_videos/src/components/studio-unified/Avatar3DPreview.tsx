'use client';

/**
 * SPRINT 6: Avatar 3D Preview Component with Lip-Sync
 *
 * Features:
 * - 3D model rendering with Three.js
 * - Orbit controls for interaction
 * - Real-time customization preview
 * - Lip Synchronization using Morph Targets (Ready Player Me standard)
 * - Audio playback integration
 */

import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { Loader2, AlertCircle, Mic } from 'lucide-react';
import type { Avatar } from '@/types/video-project';

// Standard Rhubarb Visemes to RPM (Ready Player Me) Morph Targets mapping
// RPM uses Oculus LipSync standard visemes usually: viseme_aa, viseme_E, etc.
const VISEME_MAP: Record<string, string> = {
  'A': 'viseme_aa', // mbP
  'B': 'viseme_kk', // other
  'C': 'viseme_E',  // E
  'D': 'viseme_aa', // A
  'E': 'viseme_O',  // O
  'F': 'viseme_U',  // W
  'G': 'viseme_FF', // F
  'H': 'viseme_L',  // L
  'X': 'viseme_sil', // Silence
};

export interface Avatar3DPreviewProps {
  avatar: Avatar;
  className?: string;
  autoRotate?: boolean; // Keep for interface compatibility but default false
  showControls?: boolean;
  audioUrl?: string | null;
  lipSyncData?: { start: number; end: number; value: string }[] | null;
  isPlaying?: boolean;
}

/**
 * 3D Avatar Model Component with Lip Sync
 */
interface AvatarModelProps {
  glbUrl: string;
  customization?: Avatar['customization'];
  lipSyncData?: { start: number; end: number; value: string }[] | null;
  audioElement?: HTMLAudioElement | null;
  isPlaying?: boolean;
}

function AvatarModel({ glbUrl, customization, lipSyncData, audioElement, isPlaying }: AvatarModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(glbUrl);
  const { actions } = useAnimations(animations, groupRef);

  // Apply customizations
  useEffect(() => {
    if (!scene || !customization) return;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && 'name' in mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial; // Use standard material
          if (material.name.includes('skin') && customization.skinTone) {
            material.color = new THREE.Color(customization.skinTone);
          }
          if (material.name.includes('hair') && customization.hairColor) {
            material.color = new THREE.Color(customization.hairColor);
          }
        }
      }
    });
  }, [scene, customization]);

  // Idle Animation
  useEffect(() => {
    // Try to find and play an idle animation if available in the GLB
    // Otherwise fallback to procedural breathing
    if (actions && Object.keys(actions).length > 0) {
      const idleAction = actions[Object.keys(actions)[0]]; // Play first animation found
      if (idleAction) {
        idleAction.reset().fadeIn(0.5).play();
        return () => { idleAction.fadeOut(0.5); };
      }
    }
  }, [actions]);

  // Procedural Head movement (Idle)
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating/breathing
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1) * 0.005;
      // Gentle head look
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  // Lip Sync Logic
  useFrame(() => {
    if (!lipSyncData || !audioElement || !isPlaying) {
      // Reset mouth if not playing
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary) {
          const mesh = child as THREE.Mesh;
          Object.values(VISEME_MAP).forEach((morphName) => {
            const idx = mesh.morphTargetDictionary![morphName];
            if (idx !== undefined && mesh.morphTargetInfluences) {
              mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[idx], 0, 0.2);
            }
          });
        }
      });
      return;
    }

    const currentTime = audioElement.currentTime;
    // Find current viseme
    const currentViseme = lipSyncData.find(v => currentTime >= v.start && currentTime <= v.end);

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary) {
        const mesh = child as THREE.Mesh;

        // Reset all valid visemes slowly
        Object.values(VISEME_MAP).forEach((morphName) => {
          const idx = mesh.morphTargetDictionary![morphName];
          if (idx !== undefined && mesh.morphTargetInfluences) {
            // If this is the active viseme, target 1.0, else 0.0
            const target = (currentViseme && VISEME_MAP[currentViseme.value] === morphName) ? 1.0 : 0.0;
            mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[idx], target, 0.4);
          }
        });
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -1.6, 0]}> {/* Adjust position to center body, -1.6 fits RPM standard */}
      <primitive object={scene} scale={1.8} />
    </group>
  );
}

function FallbackAvatar() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#888" />
    </mesh>
  );
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 pointer-events-none">
      <div className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Carregando Modelo 3D...</span>
      </div>
    </div>
  );
}

function ErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-50/10">
      <div className="text-center p-4 bg-background/80 backdrop-blur rounded-lg border border-red-200">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-500">Erro ao carregar avatar</p>
        {error && <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate">{error.message}</p>}
      </div>
    </div>
  );
}


export function Avatar3DPreview({
  avatar,
  className,
  showControls = true,
  audioUrl,
  lipSyncData,
  isPlaying = false,
}: Avatar3DPreviewProps) {
  const [error] = useState<Error | undefined>();

  // Audio Element Management
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous"; // Important for extracting data if needed, though we use pre-calc json
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isPlaying]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <Canvas
        shadows
        className="w-full h-full"
        camera={{ position: [0, 0.3, 1.2], fov: 40 }} // Closer shot for talking head
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#1a1a1a')); // Darker background for editor
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        {/* Studio Lighting */}
        <ambientLight intensity={0.6} />
        <spotLight position={[5, 5, 5]} angle={0.25} penumbra={1} intensity={1.5} castShadow />
        <spotLight position={[-5, 5, 5]} angle={0.25} penumbra={1} intensity={1} color="#e0e0ff" />
        <spotLight position={[0, -5, 5]} angle={0.5} penumbra={1} intensity={0.5} color="#ffe0e0" />

        <Environment preset="city" />

        <Suspense fallback={<FallbackAvatar />}>
          {error ? (
            <FallbackAvatar />
          ) : (
            <AvatarModel
              glbUrl={avatar.glbUrl}
              customization={avatar.customization}
              lipSyncData={lipSyncData}
              audioElement={audioRef.current}
              isPlaying={isPlaying}
            />
          )}
        </Suspense>

        {showControls && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={0.5}
            maxDistance={2.5}
            target={[0, 1.55, 0]} // Focus on head
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 2.5}
          />
        )}
      </Canvas>

      <Suspense fallback={<LoadingFallback />}>
        {/* Suspense trigger */}
      </Suspense>

      {error && <ErrorFallback error={error} />}

      {/* Audio Visualization - Tiny Indicator */}
      {isPlaying && (
        <div className="absolute bottom-4 right-4 bg-primary/90 backdrop-blur text-white px-3 py-1.5 rounded-full animate-pulse shadow-lg flex items-center gap-2">
          <Mic size={14} />
          <span className="text-xs font-medium">Falando...</span>
        </div>
      )}
    </div>
  );
}

export default Avatar3DPreview;
