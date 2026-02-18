'use client';

import { useEffect, useCallback } from 'react';

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  /** Key combo description, e.g. "mod+k" (mod = Cmd on Mac, Ctrl on others) */
  key: string;
  handler: ShortcutHandler;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
}

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const modRequired = parts.includes('mod');
  const shiftRequired = parts.includes('shift');
  const altRequired = parts.includes('alt');
  const targetKey = parts.filter((p) => !['mod', 'shift', 'alt'].includes(p))[0];

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modPressed = isMac ? e.metaKey : e.ctrlKey;

  if (modRequired && !modPressed) return false;
  if (shiftRequired && !e.shiftKey) return false;
  if (altRequired && !e.altKey) return false;
  if (targetKey && e.key.toLowerCase() !== targetKey) return false;

  return true;
}

/**
 * Register multiple keyboard shortcuts that fire callbacks.
 * Uses "mod" for Cmd (Mac) / Ctrl (Win/Linux).
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'mod+k', handler: () => setOpen(true), preventDefault: true },
 *   { key: 'mod+shift+p', handler: () => togglePanel() },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow mod+k even in inputs (command palette)
        const isCommandPalette = shortcuts.some(
          (s) => s.key === 'mod+k' && matchesShortcut(e, s.key)
        );
        if (!isCommandPalette) return;
      }

      for (const shortcut of shortcuts) {
        if (matchesShortcut(e, shortcut.key)) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler(e);
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
