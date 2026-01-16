/**
 * 🖱️ Cursor Sync Hook
 * Real-time cursor position sharing between collaborators
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { throttle } from 'lodash';

interface UseCursorSyncOptions {
  containerRef: React.RefObject<HTMLElement>;
  onCursorMove: (x: number, y: number) => void;
  throttleMs?: number;
  enabled?: boolean;
}

export function useCursorSync(options: UseCursorSyncOptions) {
  const { containerRef, onCursorMove, throttleMs = 50, enabled = true } = options;
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Throttled cursor emission
  const throttledEmit = useRef(
    throttle((x: number, y: number) => {
      onCursorMove(x, y);
      lastPositionRef.current = { x, y };
    }, throttleMs)
  ).current;

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate relative position (0-1 range)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Only emit if position changed significantly
    if (lastPositionRef.current) {
      const dx = Math.abs(x - lastPositionRef.current.x);
      const dy = Math.abs(y - lastPositionRef.current.y);
      if (dx < 0.005 && dy < 0.005) return; // Ignore tiny movements
    }

    throttledEmit(x, y);
  }, [enabled, containerRef, throttledEmit]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!enabled) return;
    // Emit special position to indicate cursor left
    onCursorMove(-1, -1);
    lastPositionRef.current = null;
  }, [enabled, onCursorMove]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      throttledEmit.cancel();
    };
  }, [containerRef, enabled, handleMouseMove, handleMouseLeave, throttledEmit]);

  return {
    isEnabled: enabled
  };
}
