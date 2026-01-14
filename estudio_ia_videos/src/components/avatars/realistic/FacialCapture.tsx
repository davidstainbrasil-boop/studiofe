
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

// Interface for facial blend shapes (subset of ARKit standard)
export interface FaceBlendShapes {
  jawOpen: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthFrownLeft: number;
  mouthFrownRight: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
}

interface FacialCaptureProps {
  onBlendShapesUpdate: (shapes: FaceBlendShapes) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

export function FacialCapture({ onBlendShapesUpdate, isActive, onToggle }: FacialCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sensitivity, setSensitivity] = useState(0.5);
  const requestRef = useRef<number>();

  // Mock facial capture loop
  const animate = (time: number) => {
    if (!isActive) return;

    // Simulate organic facial movement (noise)
    // In a real implementation, this would come from MediaPipe Face Mesh or similar
    const noise1 = Math.sin(time * 0.002);
    const noise2 = Math.cos(time * 0.003);
    const noise3 = Math.sin(time * 0.005);

    const shapes: FaceBlendShapes = {
      jawOpen: Math.max(0, noise1 * 0.2 + 0.05), // Slight mouth movement
      mouthSmileLeft: Math.max(0, noise2 * 0.3),
      mouthSmileRight: Math.max(0, noise2 * 0.3),
      mouthFrownLeft: 0,
      mouthFrownRight: 0,
      eyeBlinkLeft: Math.random() > 0.98 ? 1 : 0, // Random blinking
      eyeBlinkRight: Math.random() > 0.98 ? 1 : 0,
      browInnerUp: Math.max(0, noise3 * 0.4),
      browOuterUpLeft: 0,
      browOuterUpRight: 0,
      headYaw: noise1 * 0.2,
      headPitch: noise2 * 0.1,
      headRoll: noise3 * 0.05
    };

    onBlendShapesUpdate(shapes);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive]);

  return (
    <Card className="p-4 space-y-4 bg-slate-900/50 backdrop-blur border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          Captura Facial (Simulada)
        </h3>
        <Button
          size="sm"
          variant={isActive ? "destructive" : "default"}
          onClick={() => onToggle(!isActive)}
          className="h-8"
        >
          {isActive ? <PowerOff className="w-4 h-4 mr-2" /> : <Power className="w-4 h-4 mr-2" />}
          {isActive ? 'Parar' : 'Iniciar'}
        </Button>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
        {isActive ? (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-emerald-500 text-xs animate-pulse">
                    Detectando pontos faciais...
                </div>
                {/* Visualizer mock */}
                <div className="absolute inset-0 opacity-20 bg-[url('/grid.png')] bg-repeat opacity-10"></div>
            </div>
        ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                Câmera desligada
            </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Sensibilidade</span>
          <span>{Math.round(sensitivity * 100)}%</span>
        </div>
        <Slider
          value={[sensitivity]}
          min={0}
          max={1}
          step={0.1}
          onValueChange={([val]) => setSensitivity(val)}
        />
      </div>
    </Card>
  );
}
