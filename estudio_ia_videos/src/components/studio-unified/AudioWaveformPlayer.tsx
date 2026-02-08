'use client';

/**
 * Audio Waveform Player
 * Integrates WaveSurfer.js for audio visualization and playback
 * Used in SceneConfigPanel for TTS narration preview
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@components/ui/button';
import { Slider } from '@components/ui/slider';
import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@lib/utils';

interface AudioWaveformPlayerProps {
  audioUrl: string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  className?: string;
  compact?: boolean;
}

export function AudioWaveformPlayer({
  audioUrl,
  height = 48,
  waveColor = '#6366f1',
  progressColor = '#4f46e5',
  className,
  compact = false,
}: AudioWaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Destroy previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setIsReady(false);
    setIsPlaying(false);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      height,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      cursorWidth: 1,
      cursorColor: '#818cf8',
      interact: true,
    });

    ws.on('ready', () => {
      setIsReady(true);
      setDuration(ws.getDuration());
      ws.setVolume(volume / 100);
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('seeking', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    ws.on('error', () => {
      // Silently handle errors for missing/broken audio
      setIsReady(false);
    });

    ws.load(audioUrl);
    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, height, waveColor, progressColor]);

  const handlePlayPause = useCallback(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  }, []);

  const handleStop = useCallback(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.stop();
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleVolumeChange = useCallback(([v]: number[]) => {
    setVolume(v);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(v / 100);
    }
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          size="sm"
          variant="ghost"
          onClick={handlePlayPause}
          disabled={!isReady}
          className="h-7 w-7 p-0"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <div ref={containerRef} className="flex-1 min-w-0" />
        <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
          {formatTime(currentTime)}/{formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Waveform */}
      <div
        ref={containerRef}
        className="w-full rounded-md border bg-muted/30 overflow-hidden"
      />

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlayPause}
          disabled={!isReady}
          className="h-7 w-7 p-0"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          disabled={!isReady}
          className="h-7 w-7 p-0"
        >
          <Square className="h-3 w-3" />
        </Button>

        {/* Time display */}
        <span className="text-xs text-muted-foreground tabular-nums min-w-[60px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1" />

        {/* Volume */}
        <div className="flex items-center gap-1 min-w-[80px]">
          {volume === 0 ? (
            <VolumeX className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Volume2 className="h-3 w-3 text-muted-foreground" />
          )}
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={5}
            onValueChange={handleVolumeChange}
            className="w-16"
          />
        </div>
      </div>
    </div>
  );
}
