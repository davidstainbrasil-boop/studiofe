/**
 * 🎬 Remotion Preview Hook
 * Syncs timeline state with Remotion Player for real-time preview
 */

'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { PlayerRef } from '@remotion/player';
import { useTimelineStore } from '@lib/stores/timeline-store';

interface RemotionPreviewState {
  currentFrame: number;
  isPlaying: boolean;
  duration: number;
  fps: number;
}

interface UseRemotionPreviewOptions {
  fps?: number;
  autoSync?: boolean;
}

export function useRemotionPreview(options: UseRemotionPreviewOptions = {}) {
  const { fps = 30, autoSync = true } = options;
  
  const playerRef = useRef<PlayerRef>(null);
  
  const [state, setState] = useState<RemotionPreviewState>({
    currentFrame: 0,
    isPlaying: false,
    duration: 0,
    fps
  });

  // Get timeline state
  const project = useTimelineStore(s => s.project);
  const currentTime = useTimelineStore(s => s.currentTime);
  const setCurrentTime = useTimelineStore(s => s.setCurrentTime);

  // Convert time (ms) to frame number
  const timeToFrame = useCallback((timeMs: number) => {
    return Math.round((timeMs / 1000) * fps);
  }, [fps]);

  // Convert frame to time (ms)
  const frameToTime = useCallback((frame: number) => {
    return Math.round((frame / fps) * 1000);
  }, [fps]);

  // Calculate total duration in frames
  const durationInFrames = useMemo(() => {
    if (!project) return 0;
    // Calculate from project duration or tracks
    const projectDuration = project.duration || 0;
    return timeToFrame(projectDuration);
  }, [project, timeToFrame]);

  // Map timeline elements to Remotion input props
  const inputProps = useMemo(() => {
    if (!project) {
      return { tracks: [], width: 1920, height: 1080 };
    }

    return {
      project,
      tracks: project.tracks || [],
      width: project.resolution?.width || 1920,
      height: project.resolution?.height || 1080
    };
  }, [project]);

  // Play/Pause controls
  const play = useCallback(() => {
    playerRef.current?.play();
    setState(s => ({ ...s, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setState(s => ({ ...s, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek to specific time
  const seekToTime = useCallback((timeMs: number) => {
    const frame = timeToFrame(timeMs);
    playerRef.current?.seekTo(frame);
    setState(s => ({ ...s, currentFrame: frame }));
    setCurrentTime(timeMs);
  }, [timeToFrame, setCurrentTime]);

  // Seek to specific frame
  const seekToFrame = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
    setState(s => ({ ...s, currentFrame: frame }));
    setCurrentTime(frameToTime(frame));
  }, [frameToTime, setCurrentTime]);

  // Handle player frame updates
  const onFrameUpdate = useCallback((frame: number) => {
    setState(s => ({ ...s, currentFrame: frame }));
    if (autoSync) {
      setCurrentTime(frameToTime(frame));
    }
  }, [autoSync, frameToTime, setCurrentTime]);

  // Handle player state changes
  const onPlayStateChange = useCallback((isPlaying: boolean) => {
    setState(s => ({ ...s, isPlaying }));
  }, []);

  // Sync timeline time to player when timeline scrubs
  useEffect(() => {
    if (!autoSync || state.isPlaying) return;
    
    const targetFrame = timeToFrame(currentTime);
    if (Math.abs(targetFrame - state.currentFrame) > 1) {
      playerRef.current?.seekTo(targetFrame);
      setState(s => ({ ...s, currentFrame: targetFrame }));
    }
  }, [currentTime, autoSync, state.isPlaying, state.currentFrame, timeToFrame]);

  // Get current time in various formats
  const currentTimeMs = useMemo(() => frameToTime(state.currentFrame), [state.currentFrame, frameToTime]);
  const currentTimeFormatted = useMemo(() => {
    const seconds = currentTimeMs / 1000;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = state.currentFrame % fps;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }, [currentTimeMs, state.currentFrame, fps]);

  return {
    playerRef,
    state,
    durationInFrames,
    inputProps,
    // Playback controls
    play,
    pause,
    togglePlayPause,
    seekToTime,
    seekToFrame,
    // Event handlers for Player component
    onFrameUpdate,
    onPlayStateChange,
    // Utilities
    timeToFrame,
    frameToTime,
    currentTimeMs,
    currentTimeFormatted
  };
}

// Re-export for convenience
export type { RemotionPreviewState };
