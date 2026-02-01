/**
 * 🎬 Video Player Component
 * Enhanced Remotion Player with custom controls
 */

'use client'

import * as React from 'react'
import { Player, PlayerRef } from '@remotion/player'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Maximize,
  RotateCcw,
  Loader2
} from 'lucide-react'

// Time formatting utility
export const formatTime = (frame: number, fps: number): string => {
  const hours = Math.floor(frame / fps / 3600)
  const remainingMinutes = frame - hours * fps * 3600
  const minutes = Math.floor(remainingMinutes / 60 / fps)
  const remainingSec = frame - hours * fps * 3600 - minutes * fps * 60
  const seconds = Math.floor(remainingSec / fps)
  const frameAfterSec = Math.round(frame % fps)

  const hoursStr = String(hours)
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')
  const frameStr = String(frameAfterSec).padStart(2, '0')

  if (hours > 0) {
    return `${hoursStr}:${minutesStr}:${secondsStr}.${frameStr}`
  }
  return `${minutesStr}:${secondsStr}.${frameStr}`
}

interface VideoPlayerProps {
  component: React.ComponentType<any>
  inputProps?: Record<string, unknown>
  durationInFrames: number
  compositionWidth?: number
  compositionHeight?: number
  fps?: number
  className?: string
  showControls?: boolean
  autoPlay?: boolean
  loop?: boolean
}

export function VideoPlayer({
  component,
  inputProps = {},
  durationInFrames,
  compositionWidth = 1920,
  compositionHeight = 1080,
  fps = 30,
  className,
  showControls = true,
  autoPlay = false,
  loop = false,
}: VideoPlayerProps) {
  const playerRef = React.useRef<PlayerRef>(null)
  const [isPlaying, setIsPlaying] = React.useState(autoPlay)
  const [currentFrame, setCurrentFrame] = React.useState(0)
  const [volume, setVolume] = React.useState(1)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Frame update listener
  React.useEffect(() => {
    const { current } = playerRef
    if (!current) return

    const onFrameUpdate = () => {
      setCurrentFrame(current.getCurrentFrame())
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      if (!loop) setIsPlaying(false)
    }

    current.addEventListener('frameupdate', onFrameUpdate)
    current.addEventListener('play', onPlay)
    current.addEventListener('pause', onPause)
    current.addEventListener('ended', onEnded)

    // Initial frame
    setCurrentFrame(current.getCurrentFrame())
    setIsLoading(false)

    return () => {
      current.removeEventListener('frameupdate', onFrameUpdate)
      current.removeEventListener('play', onPlay)
      current.removeEventListener('pause', onPause)
      current.removeEventListener('ended', onEnded)
    }
  }, [loop])

  // Controls
  const handlePlayPause = React.useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause()
    } else {
      playerRef.current?.play()
    }
  }, [isPlaying])

  const handleSeek = React.useCallback((value: number[]) => {
    playerRef.current?.seekTo(value[0])
  }, [])

  const handleSkipBack = React.useCallback(() => {
    const newFrame = Math.max(0, currentFrame - fps)
    playerRef.current?.seekTo(newFrame)
  }, [currentFrame, fps])

  const handleSkipForward = React.useCallback(() => {
    const newFrame = Math.min(durationInFrames - 1, currentFrame + fps)
    playerRef.current?.seekTo(newFrame)
  }, [currentFrame, fps, durationInFrames])

  const handleReset = React.useCallback(() => {
    playerRef.current?.seekTo(0)
    playerRef.current?.pause()
  }, [])

  const handleVolumeChange = React.useCallback((value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  const handleToggleMute = React.useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleFullscreen = React.useCallback(() => {
    playerRef.current?.requestFullscreen()
  }, [])

  // Loading fallback
  const renderLoading = React.useCallback(() => (
    <div className="flex items-center justify-center w-full h-full bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ), [])

  // Error fallback
  const errorFallback = React.useCallback(({ error }: { error: Error }) => (
    <div className="flex items-center justify-center w-full h-full bg-destructive/10 text-destructive p-4">
      <p>Erro ao carregar vídeo: {error.message}</p>
    </div>
  ), [])

  const progress = (currentFrame / durationInFrames) * 100

  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-black', className)}>
      {/* Player */}
      <Player
        ref={playerRef}
        component={component}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        compositionWidth={compositionWidth}
        compositionHeight={compositionHeight}
        fps={fps}
        style={{ width: '100%', height: 'auto', aspectRatio: `${compositionWidth}/${compositionHeight}` }}
        controls={false}
        loop={loop}
        autoPlay={autoPlay}
        clickToPlay
        doubleClickToFullscreen
        spaceKeyToPlayOrPause
        renderLoading={renderLoading}
        errorFallback={errorFallback}
      />

      {/* Custom Controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[currentFrame]}
              max={durationInFrames - 1}
              step={1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              {/* Skip Back */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipBack}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipForward}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              {/* Reset */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              {/* Time Display */}
              <span className="text-white text-sm font-mono ml-2">
                {formatTime(currentFrame, fps)} / {formatTime(durationInFrames, fps)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Volume */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Simple preview without controls
export function VideoPreview({
  component,
  inputProps = {},
  durationInFrames,
  compositionWidth = 1920,
  compositionHeight = 1080,
  fps = 30,
  className,
  frame = 0,
}: Omit<VideoPlayerProps, 'showControls' | 'autoPlay' | 'loop'> & { frame?: number }) {
  const playerRef = React.useRef<PlayerRef>(null)

  React.useEffect(() => {
    playerRef.current?.seekTo(frame)
  }, [frame])

  return (
    <div className={cn('rounded-lg overflow-hidden bg-black', className)}>
      <Player
        ref={playerRef}
        component={component}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        compositionWidth={compositionWidth}
        compositionHeight={compositionHeight}
        fps={fps}
        style={{ width: '100%', height: 'auto', aspectRatio: `${compositionWidth}/${compositionHeight}` }}
        controls={false}
      />
    </div>
  )
}
