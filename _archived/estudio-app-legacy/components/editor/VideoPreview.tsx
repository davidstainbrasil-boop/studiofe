/**
 * Video Preview Component
 * Componente React para preview de vídeo em tempo real
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  VideoPreviewService, 
  PreviewConfig, 
  PreviewState,
  SlideData,
} from '@/src/lib/preview/video-preview-service';

interface VideoPreviewProps {
  slides: SlideData[];
  avatarConfig?: {
    enabled: boolean;
    avatarId: string;
    position: 'bottom-right' | 'bottom-left' | 'full-screen' | 'picture-in-picture';
    size: 'small' | 'medium' | 'large';
  };
  voiceConfig?: {
    voiceId: string;
    speed: number;
  };
  onSlideChange?: (slideIndex: number) => void;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  className?: string;
}

export default function VideoPreview({
  slides,
  avatarConfig = { enabled: false, avatarId: '', position: 'bottom-right', size: 'medium' },
  voiceConfig = { voiceId: 'maria', speed: 1.0 },
  onSlideChange,
  onTimeUpdate,
  onEnded,
  className = '',
}: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<VideoPreviewService | null>(null);
  
  const [state, setState] = useState<PreviewState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentSlideIndex: 0,
    isBuffering: false,
  });
  const [isReady, setIsReady] = useState(false);

  // Initialize preview service
  useEffect(() => {
    if (!canvasRef.current) return;

    const preview = new VideoPreviewService();
    previewRef.current = preview;

    preview.initialize(canvasRef.current, {
      onTimeUpdate: (time) => {
        setState((prev: PreviewState) => ({ ...prev, currentTime: time }));
        onTimeUpdate?.(time);
      },
      onSlideChange: (index) => {
        setState((prev: PreviewState) => ({ ...prev, currentSlideIndex: index }));
        onSlideChange?.(index);
      },
      onEnded: () => {
        setState((prev: PreviewState) => ({ ...prev, isPlaying: false }));
        onEnded?.();
      },
      onBuffering: (isBuffering) => {
        setState((prev: PreviewState) => ({ ...prev, isBuffering }));
      },
    });

    return () => {
      preview.dispose();
    };
  }, [onTimeUpdate, onSlideChange, onEnded]);

  // Configure preview when slides change
  useEffect(() => {
    if (!previewRef.current || slides.length === 0) return;

    const config: PreviewConfig = {
      slides,
      avatar: avatarConfig,
      voice: voiceConfig,
      resolution: '720p',
    };

    previewRef.current.configure(config).then(() => {
      setIsReady(true);
      setState((prev: PreviewState) => ({
        ...prev,
        duration: previewRef.current?.getDuration() || 0,
      }));
    });
  }, [slides, avatarConfig, voiceConfig]);

  const handlePlayPause = useCallback(() => {
    if (!previewRef.current) return;

    if (state.isPlaying) {
      previewRef.current.pause();
      setState((prev: PreviewState) => ({ ...prev, isPlaying: false }));
    } else {
      previewRef.current.play();
      setState((prev: PreviewState) => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying]);

  const handleStop = useCallback(() => {
    if (!previewRef.current) return;
    previewRef.current.stop();
    setState((prev: PreviewState) => ({ ...prev, isPlaying: false, currentTime: 0, currentSlideIndex: 0 }));
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!previewRef.current) return;
    const time = parseFloat(e.target.value);
    previewRef.current.seek(time);
  }, []);

  const handlePrevSlide = useCallback(() => {
    if (!previewRef.current) return;
    const newIndex = Math.max(0, state.currentSlideIndex - 1);
    previewRef.current.goToSlide(newIndex);
  }, [state.currentSlideIndex]);

  const handleNextSlide = useCallback(() => {
    if (!previewRef.current) return;
    const newIndex = Math.min(slides.length - 1, state.currentSlideIndex + 1);
    previewRef.current.goToSlide(newIndex);
  }, [state.currentSlideIndex, slides.length]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      {/* Canvas */}
      <div className="relative aspect-video">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full"
        />
        
        {/* Loading overlay */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-white">Carregando preview...</p>
            </div>
          </div>
        )}

        {/* Buffering indicator */}
        {state.isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Play button overlay (when paused) */}
        {isReady && !state.isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
          >
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800">
        {/* Progress bar */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={state.duration}
            step={0.1}
            value={state.currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              disabled={!isReady}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Stop */}
            <button
              onClick={handleStop}
              disabled={!isReady}
              className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Prev slide */}
            <button
              onClick={handlePrevSlide}
              disabled={!isReady || state.currentSlideIndex === 0}
              className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Next slide */}
            <button
              onClick={handleNextSlide}
              disabled={!isReady || state.currentSlideIndex === slides.length - 1}
              className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Slide indicator */}
          <div className="text-sm text-gray-400">
            Slide {state.currentSlideIndex + 1} de {slides.length}
          </div>

          {/* Fullscreen (placeholder) */}
          <button
            className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
            onClick={() => canvasRef.current?.requestFullscreen?.()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
