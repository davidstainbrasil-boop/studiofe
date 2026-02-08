import { logger } from '@/lib/logger';
/**
 * Emergency Loop Killer Utility
 * Detects and terminates infinite loops in browser context
 */

import { useCallback, useRef } from 'react';

interface LoopStats {
  iterations: number;
  startTime: number;
  lastCheckTime: number;
}

const activeLoops = new Map<string, LoopStats>();

const MAX_ITERATIONS = 10000;
const MAX_TIME_MS = 5000;

export function startLoop(id: string): void {
  activeLoops.set(id, {
    iterations: 0,
    startTime: Date.now(),
    lastCheckTime: Date.now()
  });
}

export function checkLoop(id: string): boolean {
  const stats = activeLoops.get(id);
  if (!stats) return true;

  stats.iterations++;
  stats.lastCheckTime = Date.now();

  const elapsed = stats.lastCheckTime - stats.startTime;

  if (stats.iterations > MAX_ITERATIONS) {
    logger.error(`[Emergency Loop Killer] Loop ${id} exceeded max iterations (${MAX_ITERATIONS})`);
    killLoop(id);
    return false;
  }

  if (elapsed > MAX_TIME_MS) {
    logger.error(`[Emergency Loop Killer] Loop ${id} exceeded max time (${MAX_TIME_MS}ms)`);
    killLoop(id);
    return false;
  }

  return true;
}

export function killLoop(id: string): void {
  activeLoops.delete(id);
}

export function endLoop(id: string): void {
  activeLoops.delete(id);
}

export function getActiveLoops(): string[] {
  return Array.from(activeLoops.keys());
}

export function killAllLoops(): void {
  activeLoops.clear();
}

/**
 * React hook for loop protection
 */
export function useLoopProtection(componentId: string) {
  const loopCountRef = useRef(0);
  const lastResetRef = useRef(Date.now());
  const isBlockedRef = useRef(false);

  const checkRenderLoop = useCallback(() => {
    const now = Date.now();
    
    // Reset counter every 1 second
    if (now - lastResetRef.current > 1000) {
      loopCountRef.current = 0;
      lastResetRef.current = now;
      isBlockedRef.current = false;
    }

    loopCountRef.current++;

    if (loopCountRef.current > 100) {
      logger.error(`[Loop Protection] ${componentId} detected render loop (${loopCountRef.current} renders/sec)`);
      isBlockedRef.current = true;
      return false;
    }

    return true;
  }, [componentId]);

  const resetCounter = useCallback(() => {
    loopCountRef.current = 0;
    lastResetRef.current = Date.now();
    isBlockedRef.current = false;
  }, []);

  const reset = useCallback(() => {
    loopCountRef.current = 0;
    lastResetRef.current = Date.now();
    isBlockedRef.current = false;
  }, []);

  return {
    checkRenderLoop,
    resetCounter,
    reset,
    renderCount: loopCountRef.current,
    isBlocked: isBlockedRef.current
  };
}

export const emergencyLoopKiller = {
  startLoop,
  checkLoop,
  killLoop,
  endLoop,
  getActiveLoops,
  killAllLoops
};

export default emergencyLoopKiller;
