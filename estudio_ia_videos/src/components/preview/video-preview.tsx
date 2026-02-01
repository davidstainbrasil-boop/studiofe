'use client';

/**
 * Real-time Video Preview Component
 * 
 * Provides live preview of the video as user edits slides.
 * Shows transitions, animations, and timing in real-time.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Clock,
  Layers,
  Eye,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTransitionVariants, TransitionType } from '@/components/editor/slide-transitions';

export interface PreviewSlide {
  id: string;
  content: React.ReactNode;
  duration: number; // seconds
  transition?: TransitionType;
  transitionDuration?: number;
  audioUrl?: string;
  notes?: string;
}

interface VideoPreviewProps {
  slides: PreviewSlide[];
  currentSlideIndex?: number;
  onSlideChange?: (index: number) => void;
  autoPlay?: boolean;
  loop?: boolean;
  aspectRatio?: '16:9' | '9:16' | '4:3' | '1:1';
  className?: string;
}

export function VideoPreview({
  slides,
  currentSlideIndex: controlledIndex,
  onSlideChange,
  autoPlay = false,
  loop = false,
  aspectRatio = '16:9',
  className,
}: VideoPreviewProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Use controlled or internal index
  const currentIndex = controlledIndex ?? internalIndex;
  const setCurrentIndex = onSlideChange ?? setInternalIndex;
  
  const currentSlide = slides[currentIndex];
  const totalDuration = useMemo(() => 
    slides.reduce((acc, s) => acc + s.duration, 0), [slides]
  );

  // Calculate elapsed time up to current slide
  const elapsedTime = useMemo(() => {
    return slides.slice(0, currentIndex).reduce((acc, s) => acc + s.duration, 0) +
      (slideProgress * currentSlide.duration);
  }, [slides, currentIndex, slideProgress, currentSlide]);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play/Pause logic
  useEffect(() => {
    if (isPlaying && currentSlide) {
      const duration = currentSlide.duration * 1000;
      const startTime = Date.now() - (slideProgress * duration);

      progressInterval.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setSlideProgress(progress);

        if (progress >= 1) {
          // Move to next slide
          if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSlideProgress(0);
          } else if (loop) {
            setCurrentIndex(0);
            setSlideProgress(0);
          } else {
            setIsPlaying(false);
          }
        }
      }, 16); // ~60fps

      return () => {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [isPlaying, currentIndex, currentSlide, slides.length, loop, slideProgress, setCurrentIndex]);

  // Handle audio
  useEffect(() => {
    if (audioRef.current && currentSlide?.audioUrl) {
      audioRef.current.src = currentSlide.audioUrl;
      audioRef.current.muted = isMuted;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentSlide?.audioUrl, isPlaying, isMuted]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Navigation
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, slides.length - 1)));
    setSlideProgress(0);
  }, [slides.length, setCurrentIndex]);

  const nextSlide = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      goToSlide(currentIndex + 1);
    }
  }, [currentIndex, slides.length, goToSlide]);

  const prevSlide = useCallback(() => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  }, [currentIndex, goToSlide]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'ArrowRight':
          nextSlide();
          break;
        case 'ArrowLeft':
          prevSlide();
          break;
        case 'm':
          setIsMuted(!isMuted);
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isPlaying, isMuted, nextSlide, prevSlide, toggleFullscreen]);

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    if (containerRef.current) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      clearTimeout(timeout);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [isPlaying]);

  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
  }[aspectRatio];

  if (!slides.length) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-lg', aspectRatioClass, className)}>
        <div className="text-center text-slate-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum slide para visualizar</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-lg bg-black group',
          aspectRatioClass,
          isFullscreen && 'fixed inset-0 z-50 rounded-none',
          className
        )}
        onDoubleClick={toggleFullscreen}
      >
        {/* Slide Content with Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={currentSlide.transition ? getTransitionVariants(currentSlide.transition, 'ease-out').initial : { opacity: 0 }}
            animate={currentSlide.transition ? getTransitionVariants(currentSlide.transition, 'ease-out').animate : { opacity: 1 }}
            exit={currentSlide.transition ? getTransitionVariants(currentSlide.transition, 'ease-out').exit : { opacity: 0 }}
            transition={{ 
              duration: (currentSlide.transitionDuration ?? 500) / 1000 
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {currentSlide.content}
          </motion.div>
        </AnimatePresence>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} className="hidden" />

        {/* Slide Progress Bar (thin line at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <motion.div
            className="h-full bg-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${slideProgress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"
            >
              {/* Top Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                <Badge variant="secondary" className="bg-black/50 text-white">
                  <Layers className="w-3 h-3 mr-1" />
                  {currentIndex + 1} / {slides.length}
                </Badge>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(elapsedTime)} / {formatTime(totalDuration)}
                  </Badge>
                </div>
              </div>

              {/* Center Play Button (when paused) */}
              {!isPlaying && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={() => setIsPlaying(true)}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Play className="w-8 h-8 text-slate-900 ml-1" />
                </motion.button>
              )}

              {/* Bottom Controls */}
              <div className="absolute bottom-4 left-4 right-4">
                {/* Timeline */}
                <div className="mb-3">
                  <Slider
                    value={[currentIndex + slideProgress]}
                    max={slides.length}
                    step={0.01}
                    onValueChange={([value]) => {
                      const newIndex = Math.floor(value);
                      const progress = value - newIndex;
                      if (newIndex !== currentIndex) {
                        setCurrentIndex(newIndex);
                      }
                      setSlideProgress(progress);
                    }}
                    className="cursor-pointer"
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Play/Pause */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="text-white hover:bg-white/20"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPlaying ? 'Pausar (Espaço)' : 'Play (Espaço)'}
                      </TooltipContent>
                    </Tooltip>

                    {/* Previous */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={prevSlide}
                          disabled={currentIndex === 0}
                          className="text-white hover:bg-white/20 disabled:opacity-30"
                        >
                          <SkipBack className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Slide Anterior (←)</TooltipContent>
                    </Tooltip>

                    {/* Next */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={nextSlide}
                          disabled={currentIndex === slides.length - 1}
                          className="text-white hover:bg-white/20 disabled:opacity-30"
                        >
                          <SkipForward className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Próximo Slide (→)</TooltipContent>
                    </Tooltip>

                    {/* Mute */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsMuted(!isMuted)}
                          className="text-white hover:bg-white/20"
                        >
                          {isMuted ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isMuted ? 'Ativar Som (M)' : 'Mudo (M)'}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fullscreen */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          className="text-white hover:bg-white/20"
                        >
                          {isFullscreen ? (
                            <Minimize className="w-5 h-5" />
                          ) : (
                            <Maximize className="w-5 h-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isFullscreen ? 'Sair Tela Cheia (F)' : 'Tela Cheia (F)'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

export default VideoPreview;
