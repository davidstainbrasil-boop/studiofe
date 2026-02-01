/**
 * 🎭 Avatar Canvas Element
 * Renderiza avatar 2D/3D no canvas unificado com preview em tempo real
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedStudioStore } from '@/lib/stores/unified-studio-store';

// ============================================================================
// TYPES
// ============================================================================

export interface AvatarConfig {
  id: string;
  type: '2d' | '3d' | 'photo';
  name: string;
  thumbnailUrl?: string;
  modelUrl?: string;
  voiceId?: string;
  voiceName?: string;
  expression: 'neutral' | 'happy' | 'serious' | 'concerned' | 'excited';
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  flipHorizontal: boolean;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface AvatarCanvasElementProps {
  config: AvatarConfig;
  isSelected: boolean;
  isPlaying: boolean;
  currentTime: number;
  audioUrl?: string;
  onSelect: () => void;
  onUpdate: (updates: Partial<AvatarConfig>) => void;
  onDoubleClick: () => void;
  className?: string;
}

// ============================================================================
// MOCK AVATARS
// ============================================================================

const AVATAR_EXPRESSIONS = {
  neutral: { mouthOpen: 0, eyebrowRaise: 0, smile: 0 },
  happy: { mouthOpen: 0.3, eyebrowRaise: 0.2, smile: 0.8 },
  serious: { mouthOpen: 0, eyebrowRaise: -0.1, smile: -0.3 },
  concerned: { mouthOpen: 0.1, eyebrowRaise: 0.4, smile: -0.2 },
  excited: { mouthOpen: 0.5, eyebrowRaise: 0.5, smile: 0.9 },
};

// ============================================================================
// LIP SYNC UTILITIES
// ============================================================================

/**
 * Simula lip-sync básico baseado em tempo
 * Em produção, usaria análise de áudio real
 */
function useLipSync(isPlaying: boolean, currentTime: number) {
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying) {
      setMouthOpenness(0);
      return;
    }

    // Simula variação de abertura de boca baseado em tempo
    const animate = () => {
      const variation = Math.sin(currentTime * 8) * 0.3 + 
                       Math.sin(currentTime * 12) * 0.2 +
                       Math.random() * 0.1;
      setMouthOpenness(Math.max(0, Math.min(1, 0.3 + variation)));
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isPlaying, currentTime]);

  return mouthOpenness;
}

// ============================================================================
// AVATAR CANVAS ELEMENT COMPONENT
// ============================================================================

export function AvatarCanvasElement({
  config,
  isSelected,
  isPlaying,
  currentTime,
  audioUrl,
  onSelect,
  onUpdate,
  onDoubleClick,
  className,
}: AvatarCanvasElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mouthOpenness = useLipSync(isPlaying, currentTime);
  const expression = AVATAR_EXPRESSIONS[config.expression];

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (config.locked) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - config.position.x, y: e.clientY - config.position.y });
    onSelect();
  }, [config.locked, config.position, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || config.locked) return;
    onUpdate({
      position: {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      },
    });
  }, [isDragging, config.locked, dragStart, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!config.visible) return null;

  return (
    <TooltipProvider>
      <div
        ref={elementRef}
        className={cn(
          'absolute cursor-pointer transition-shadow duration-200',
          isSelected && 'ring-2 ring-blue-500 ring-offset-2',
          isDragging && 'cursor-grabbing',
          config.locked && 'cursor-not-allowed opacity-75',
          className
        )}
        style={{
          left: config.position.x,
          top: config.position.y,
          transform: `scale(${config.scale}) rotate(${config.rotation}deg) ${config.flipHorizontal ? 'scaleX(-1)' : ''}`,
          opacity: config.opacity,
          zIndex: isSelected ? 100 : 50,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={onDoubleClick}
      >
        {/* Avatar Container */}
        <div className="relative w-48 h-64 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden shadow-lg">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/20 z-10">
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <span className="text-xs text-red-500">{error}</span>
            </div>
          )}

          {/* Avatar Preview */}
          {config.thumbnailUrl ? (
            <img
              src={config.thumbnailUrl}
              alt={config.name}
              className="w-full h-full object-cover"
            />
          ) : (
            /* Placeholder Avatar SVG */
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-blue-400 to-blue-600">
              <svg
                viewBox="0 0 100 120"
                className="w-32 h-40"
                style={{ transform: `translateY(${-expression.eyebrowRaise * 5}px)` }}
              >
                {/* Head */}
                <ellipse cx="50" cy="45" rx="35" ry="40" fill="#FFD5B5" />
                
                {/* Hair */}
                <ellipse cx="50" cy="25" rx="35" ry="25" fill="#4A3728" />
                
                {/* Eyes */}
                <g transform={`translate(0, ${-expression.eyebrowRaise * 3})`}>
                  {/* Left eye */}
                  <ellipse cx="35" cy="40" rx="6" ry="4" fill="white" />
                  <circle cx="35" cy="40" r="3" fill="#333" />
                  
                  {/* Right eye */}
                  <ellipse cx="65" cy="40" rx="6" ry="4" fill="white" />
                  <circle cx="65" cy="40" r="3" fill="#333" />
                </g>
                
                {/* Eyebrows */}
                <g transform={`translate(0, ${-expression.eyebrowRaise * 5})`}>
                  <line x1="28" y1="30" x2="42" y2="32" stroke="#4A3728" strokeWidth="2" />
                  <line x1="58" y1="32" x2="72" y2="30" stroke="#4A3728" strokeWidth="2" />
                </g>
                
                {/* Mouth - animated with lip sync */}
                <ellipse 
                  cx="50" 
                  cy="60" 
                  rx={6 + expression.smile * 4} 
                  ry={2 + mouthOpenness * 8} 
                  fill={mouthOpenness > 0.3 ? '#8B0000' : '#CC6666'}
                />
                {mouthOpenness > 0.3 && (
                  <ellipse cx="50" cy="62" rx="4" ry={mouthOpenness * 4} fill="#FFD5B5" />
                )}
                
                {/* Body/Shoulders */}
                <path
                  d="M 10 120 Q 50 95 90 120"
                  fill="#2563EB"
                />
              </svg>
            </div>
          )}

          {/* Voice/Audio Indicator */}
          {isPlaying && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-white/80 font-medium">Falando</span>
            </div>
          )}

          {/* Avatar Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white font-medium truncate">{config.name}</span>
              {config.voiceName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[9px] h-4">
                      <Mic className="h-2 w-2 mr-1" />
                      {config.voiceName}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Voz: {config.voiceName}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Lock Indicator */}
          {config.locked && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive" className="text-[9px] h-4">
                Bloqueado
              </Badge>
            </div>
          )}
        </div>

        {/* Selection Handles */}
        {isSelected && !config.locked && (
          <>
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nwse-resize" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-nesw-resize" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nesw-resize" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-nwse-resize" />
            
            {/* Rotation handle */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-grab" />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// AVATAR LAYER COMPONENT (for timeline integration)
// ============================================================================

export interface AvatarLayerProps {
  avatars: AvatarConfig[];
  isPlaying: boolean;
  currentTime: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<AvatarConfig>) => void;
  onDoubleClick: (id: string) => void;
}

export function AvatarLayer({
  avatars,
  isPlaying,
  currentTime,
  selectedId,
  onSelect,
  onUpdate,
  onDoubleClick,
}: AvatarLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {avatars.map((avatar) => (
        <div key={avatar.id} className="pointer-events-auto">
          <AvatarCanvasElement
            config={avatar}
            isSelected={avatar.id === selectedId}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onSelect={() => onSelect(avatar.id)}
            onUpdate={(updates) => onUpdate(avatar.id, updates)}
            onDoubleClick={() => onDoubleClick(avatar.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default AvatarCanvasElement;
