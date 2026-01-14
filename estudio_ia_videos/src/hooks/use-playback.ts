
import { useEffect, useRef } from 'react';
import { useTimelineStore } from '@lib/stores/timeline-store';

export function usePlayback() {
  const isPlaying = useTimelineStore(state => state.isPlaying);
  const duration = useTimelineStore(state => state.duration);
  const setCurrentTime = useTimelineStore(state => state.setCurrentTime);
  // Actions
  const play = useTimelineStore(state => state.play);
  const pause = useTimelineStore(state => state.pause);
  const stop = useTimelineStore(state => state.stop);
  const removeSelected = useTimelineStore(state => state.removeSelected);
  const removeElementRipple = useTimelineStore(state => state.removeElementRipple);
  const splitElement = useTimelineStore(state => state.splitElement);
  const undo = useTimelineStore(state => state.undo);
  const redo = useTimelineStore(state => state.redo);
  const selectAll = useTimelineStore(state => state.selectAll);
  const selection = useTimelineStore(state => state.selection);
  const currentTime = useTimelineStore(state => state.currentTime);
  
  // Use refs for mutable values in the loop to avoid closure staleness
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>();

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      
      // Access current store state directly to avoid subscription overhead in loop
      const currentState = useTimelineStore.getState();
      const nextTime = currentState.currentTime + deltaTime;

      if (nextTime >= currentState.duration) {
        setCurrentTime(currentState.duration);
        pause();
        lastTimeRef.current = 0; // Reset
        return;
      } else {
        setCurrentTime(nextTime);
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      lastTimeRef.current = 0;
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying]); // Re-run when play state changes

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) pause();
        else play();
      }

      // Undo (Ctrl+Z)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
      }

      // Redo (Ctrl+Shift+Z or Ctrl+Y)
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey) || 
          ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')) {
          e.preventDefault();
          redo();
      }

      // Select All (Ctrl+A)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const selection = useTimelineStore.getState().selection;
        const duplicateElement = useTimelineStore.getState().duplicateElement;
        
        if (selection.elementIds.length === 1) {
          duplicateElement(selection.elementIds[0]);
        }
      }

      // Delete / Backspace: Remove element
      if (e.code === 'Delete' || e.code === 'Backspace') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) return;
        
        e.preventDefault();
        const selection = useTimelineStore.getState().selection;
        const removeSelected = useTimelineStore.getState().removeSelected;
        const removeElementRipple = useTimelineStore.getState().removeElementRipple;
        
        if (selection.elementIds.length > 0) {
             if (e.shiftKey) {
                 // Ripple Delete (Single item support mainly, or loop for valid ripple logic?)
                 // Ripple delete for multiple items on different tracks is complex. 
                 // For MVP, if multi-selected, fallback to normal delete or just ripple the FIRST one?
                 // Let's iterate and ripple each? No, that messes up state per iteration.
                 // Safer: Only allow Ripple Delete for single selection for now, or just the primary one.
                 // PRO BEHAVIOR: Ripple delete is usually track-specific. 
                 
                 // Implementation: Only ripple if 1 item selected for safety in V1
                 if (selection.elementIds.length === 1) {
                     removeElementRipple(selection.elementIds[0]);
                 } else {
                     removeSelected(); // Fallback to normal delete for multi-selection
                 }
             } else {
                  selection.elementIds.forEach(id => removeSelected()); // removeSelected already handles the stored selection
             }
        }
      }

      // 'S': Split element
      if (e.code === 'KeyS') {
        const selection = useTimelineStore.getState().selection;
        const splitElement = useTimelineStore.getState().splitElement;
        const currentTime = useTimelineStore.getState().currentTime;
        
        if (selection.elementIds.length === 1) {
          splitElement(selection.elementIds[0], currentTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
