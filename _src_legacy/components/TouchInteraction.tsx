'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

interface TouchInteractionProps {
  children: React.ReactNode;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  disabled?: boolean;
  className?: string;
}

export default function TouchInteraction({
  children,
  onTap,
  onDoubleTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  disabled = false,
  className = '',
}: TouchInteractionProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<Touch | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      touchStartRef.current = touch;
      touchStartTimeRef.current = Date.now();

      // Handle pinch gesture for two fingers
      if (e.touches.length === 2) {
        initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
        return;
      }

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress();
        }, 500); // 500ms for long press
      }

      onTouchStart?.(e);
    },
    [disabled, onLongPress, onTouchStart, getDistance],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      // Clear long press timer if moved
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Handle pinch gesture
      if (e.touches.length === 2 && onPinch) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistanceRef.current;
        onPinch(scale);
        return;
      }

      onTouchMove?.(e);
    },
    [disabled, onPinch, onTouchMove, getDistance],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const touch = e.changedTouches[0];
      const touchEnd = Date.now();
      const touchDuration = touchEnd - touchStartTimeRef.current;

      // Check for tap vs swipe
      if (touchStartRef.current && touchDuration < 300) {
        const deltaX = touch.clientX - touchStartRef.current.clientX;
        const deltaY = touch.clientY - touchStartRef.current.clientY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Tap threshold
        if (distance < 10) {
          const now = Date.now();
          const timeSinceLastTap = now - lastTapRef.current;

          // Double tap detection
          if (timeSinceLastTap < 300 && onDoubleTap) {
            onDoubleTap();
          } else if (onTap) {
            onTap();
          }

          lastTapRef.current = now;
        }
        // Swipe detection
        else if (distance > 50 && touchDuration < 300) {
          const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

          if (angle > -45 && angle <= 45 && onSwipeRight) {
            onSwipeRight();
          } else if (angle > 45 && angle <= 135 && onSwipeDown) {
            onSwipeDown();
          } else if (angle > 135 || (angle <= -135 && onSwipeLeft)) {
            onSwipeLeft();
          } else if (angle > -135 && angle <= -45 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      touchStartRef.current = null;
      initialDistanceRef.current = 0;
      onTouchEnd?.(e);
    },
    [
      disabled,
      onTap,
      onDoubleTap,
      onLongPress,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onTouchEnd,
    ],
  );

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`touch-interaction ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}

// Hook for detecting touch device
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - for older browsers
        navigator.msMaxTouchPoints > 0
      );
    };

    setIsTouchDevice(checkTouchDevice());

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsTouchDevice(e.matches);
    };

    const mediaQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  return isTouchDevice;
}

// Hook for touch feedback
export function useTouchFeedback() {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const bind = {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    className: isPressed ? 'touch-pressed' : '',
  };

  return { isPressed, bind };
}
