
'use client';

import React, { useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  useGLTF,
  Stage,
  SoftShadows,
  BakeShadows
} from '@react-three/drei';
import * as THREE from 'three';
import { FaceBlendShapes } from './FacialCapture';

export interface AvatarCustomizationConfig {
  skinColor: string;
  eyeColor: string;
  hairColor: string;
  roughness: number;
  metalness: number;
  scale: number;
}

export interface RealisticAvatarRendererRef {
  captureScreenshot: () => string;
}

interface RealisticAvatarRendererProps {
  modelUrl?: string;
  blendShapes: FaceBlendShapes;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  lightingPreset?: 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse';
  config: AvatarCustomizationConfig;
}

function HighFidelityAvatar({ blendShapes, modelUrl, config }: { blendShapes: FaceBlendShapes, modelUrl?: string, config: AvatarCustomizationConfig }) {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  
  // Physics state for smooth interpolation (Spring-damper system simulation)
  const currentShapes = useRef<FaceBlendShapes>({ ...blendShapes });
  const velocity = useRef<FaceBlendShapes>({
    jawOpen: 0, mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0,
    eyeBlinkLeft: 0, eyeBlinkRight: 0, browInnerUp: 0, browOuterUpLeft: 0, browOuterUpRight: 0,
    headYaw: 0, headPitch: 0, headRoll: 0
  });

  // Dynamic PBR material based on config
  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: config.skinColor,
    roughness: config.roughness,
    metalness: config.metalness,
    envMapIntensity: 1.2,
    normalScale: new THREE.Vector2(0.5, 0.5)
  }), [config.skinColor, config.roughness, config.metalness]);

  const eyeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: config.eyeColor,
    roughness: 0.1,
    metalness: 0,
    envMapIntensity: 2
  }), [config.eyeColor]);

  useFrame((state, delta) => {
    if (!group.current) return;

    // --- Physics-based Animation System ---
    // Critical Damping for natural movement
    const springStiffness = 150;
    const damping = 15;

    const updatePhysics = (key: keyof FaceBlendShapes) => {
      const target = blendShapes[key];
      const current = currentShapes.current[key];
      const vel = velocity.current[key];

      const acceleration = (target - current) * springStiffness - vel * damping;
      velocity.current[key] += acceleration * delta;
      currentShapes.current[key] += velocity.current[key] * delta;
    };

    // Update all blend shape physics
    (Object.keys(blendShapes) as Array<keyof FaceBlendShapes>).forEach(updatePhysics);

    // Apply Head Rotation (Rigging simulation)
    const { headYaw, headPitch, headRoll } = currentShapes.current;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, headYaw, 0.1);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, headPitch, 0.1);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, headRoll, 0.1);

    // Apply Micro-movements (Subconscious behavior)
    // Breathing
    const breath = Math.sin(state.clock.elapsedTime * 1.5) * 0.005;
    group.current.position.y = -1 + breath;
    
    // Eye Saccades (Micro eye movements) - simulated on head slightly
    const saccadeX = (Math.random() - 0.5) * 0.002;
    const saccadeY = (Math.random() - 0.5) * 0.002;
    group.current.rotation.y += saccadeX;
    group.current.rotation.x += saccadeY;

    // Apply Blend Shapes to Mesh (if it existed and had morph targets)
    if (headRef.current && headRef.current.morphTargetInfluences && headRef.current.morphTargetDictionary) {
        // Map our generic shapes to specific morph targets of the model
        // This is where retargeting would happen
        const dict = headRef.current.morphTargetDictionary;
        const influences = headRef.current.morphTargetInfluences;
        
        if (dict['jawOpen'] !== undefined) influences[dict['jawOpen']] = currentShapes.current.jawOpen;
        if (dict['smileLeft'] !== undefined) influences[dict['smileLeft']] = currentShapes.current.mouthSmileLeft;
        // ... map other shapes
    }
  });

  return (
    <group ref={group} position={[0, -1, 0]} scale={config.scale}>
      {/* High Fidelity Avatar Placeholder Structure */}
      <mesh ref={headRef} position={[0, 1.5, 0]} castShadow receiveShadow material={skinMaterial}>
        <sphereGeometry args={[0.6, 64, 64]} /> {/* High poly for smooth lighting */}
      </mesh>
      
      {/* Eyes (PBR Glass-like material) */}
      <mesh position={[-0.2, 1.6, 0.5]} castShadow material={eyeMaterial}>
        <sphereGeometry args={[0.12, 32, 32]} />
      </mesh>
      <mesh position={[0.2, 1.6, 0.5]} castShadow material={eyeMaterial}>
        <sphereGeometry args={[0.12, 32, 32]} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 2, 32]} />
        <meshStandardMaterial color={config.hairColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

// Component to handle screenshot capture
function ScreenshotHandler({ onRegister }: { onRegister: (fn: () => string) => void }) {
  const { gl, scene, camera } = useThree();
  
  useEffect(() => {
    onRegister(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    });
  }, [gl, scene, camera, onRegister]);
  
  return null;
}

export const RealisticAvatarRenderer = forwardRef<RealisticAvatarRendererRef, RealisticAvatarRendererProps>(({ 
  blendShapes, 
  modelUrl, 
  quality = 'high',
  lightingPreset = 'studio',
  config
}, ref) => {
  const captureRef = useRef<() => string>(() => '');

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => captureRef.current()
  }));

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl">
      <Canvas shadows dpr={quality === 'ultra' ? [1, 2] : [1, 1.5]} camera={{ position: [0, 0, 4], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
        <ScreenshotHandler onRegister={(fn) => captureRef.current = fn} />
        
        {/* Advanced PBR Lighting Setup */}
        <Environment preset={lightingPreset} blur={0.8} background />
        
        {quality !== 'low' && (
          <>
            <SoftShadows size={10} focus={0} samples={10} />
            <BakeShadows />
          </>
        )}

        {/* Stage handles professional lighting setup automatically */}
        <Stage intensity={0.5} environment={lightingPreset} adjustCamera={false}>
          <HighFidelityAvatar blendShapes={blendShapes} modelUrl={modelUrl} config={config} />
        </Stage>

        <ContactShadows opacity={0.4} scale={10} blur={2.5} far={4} resolution={512} color="#000000" />
        
        <OrbitControls 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2} 
          minDistance={2} 
          maxDistance={6}
          enablePan={false}
        />
        
        {/* Post-processing effects could be added here (Bloom, DOF) */}
      </Canvas>
    </div>
  );
});
RealisticAvatarRenderer.displayName = 'RealisticAvatarRenderer';

