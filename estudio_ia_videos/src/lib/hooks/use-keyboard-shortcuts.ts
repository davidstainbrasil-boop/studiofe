'use client';

import { useEffect, useRef } from 'react';

type KeyCombo = string; // e.g., 'Ctrl+S', 'Space', 'Delete'
type Handler = (e: KeyboardEvent) => void;

export function useKeyboardShortcuts(shortcuts: Record<KeyCombo, Handler>) {
  // Use a ref for shortcuts to avoid re-binding the event listener when the object identity changes
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
      ) {
        return;
      }

      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      
      // Normalize key codes
      let key = e.key;
      if (key === ' ') key = 'Space';
      
      // If modifiers are present, force the key to uppercase to match common definitions (e.g. "Ctrl+S")
      // Browser might return "s" when Ctrl is held.
      if (keys.length > 0 && key.length === 1) {
          key = key.toUpperCase();
      }

      if (key === 'Control' || key === 'Shift' || key === 'Alt') return; // Ignore modifier only presses

      keys.push(key);
      const combo = keys.join('+');

      const currentShortcuts = shortcutsRef.current;

      if (currentShortcuts[combo]) {
        e.preventDefault();
        currentShortcuts[combo](e);
      } else if (currentShortcuts[e.code]) {
         // Fallback to code (e.g. 'Space', 'Delete')
         e.preventDefault();
         currentShortcuts[e.code](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array: only bind once
}
