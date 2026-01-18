/**
 * Keyboard Shortcuts Hook
 * Gerencia atalhos de teclado para o Studio Pro
 */

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  callback: () => void
  description: string
  preventDefault?: boolean
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  shortcuts: KeyboardShortcutConfig[]
}

/**
 * Hook para gerenciar keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { enabled = true, shortcuts } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Find matching shortcut
      const shortcut = shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase()
        const ctrlMatch = s.ctrl === undefined || s.ctrl === (event.ctrlKey || event.metaKey)
        const shiftMatch = s.shift === undefined || s.shift === event.shiftKey
        const altMatch = s.alt === undefined || s.alt === event.altKey
        const metaMatch = s.meta === undefined || s.meta === event.metaKey

        return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch
      })

      if (shortcut) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        shortcut.callback()
      }
    },
    [enabled, shortcuts]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return {
    shortcuts: shortcuts.map(s => ({
      key: s.key,
      ctrl: s.ctrl,
      shift: s.shift,
      alt: s.alt,
      description: s.description
    }))
  }
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Partial<KeyboardShortcutConfig>): string {
  const parts: string[] = []

  if (shortcut.ctrl || shortcut.meta) {
    parts.push('Ctrl')
  }
  if (shortcut.shift) {
    parts.push('Shift')
  }
  if (shortcut.alt) {
    parts.push('Alt')
  }
  if (shortcut.key) {
    parts.push(shortcut.key.toUpperCase())
  }

  return parts.join('+')
}

/**
 * Common shortcuts presets
 */
export const COMMON_SHORTCUTS = {
  // Playback
  PLAY_PAUSE: { key: ' ', description: 'Play/Pause' },
  STOP: { key: 's', ctrl: true, shift: true, description: 'Stop' },

  // Edit
  UNDO: { key: 'z', ctrl: true, description: 'Undo' },
  REDO_Y: { key: 'y', ctrl: true, description: 'Redo' },
  REDO_Z: { key: 'z', ctrl: true, shift: true, description: 'Redo' },
  CUT: { key: 'x', ctrl: true, description: 'Cut' },
  COPY: { key: 'c', ctrl: true, description: 'Copy' },
  PASTE: { key: 'v', ctrl: true, description: 'Paste' },
  DUPLICATE: { key: 'd', ctrl: true, description: 'Duplicate' },
  DELETE: { key: 'Delete', description: 'Delete' },
  BACKSPACE: { key: 'Backspace', description: 'Delete' },

  // Selection
  SELECT_ALL: { key: 'a', ctrl: true, description: 'Select All' },
  DESELECT: { key: 'Escape', description: 'Deselect' },

  // View
  ZOOM_IN: { key: '=', ctrl: true, description: 'Zoom In' },
  ZOOM_OUT: { key: '-', ctrl: true, description: 'Zoom Out' },
  FIT_TO_SCREEN: { key: '0', ctrl: true, description: 'Fit to Screen' },
  TOGGLE_GRID: { key: 'g', ctrl: true, description: 'Toggle Grid' },

  // Navigation
  NEXT_FRAME: { key: 'ArrowRight', description: 'Next Frame' },
  PREV_FRAME: { key: 'ArrowLeft', description: 'Previous Frame' },
  NEXT_SECOND: { key: 'ArrowRight', shift: true, description: 'Next Second' },
  PREV_SECOND: { key: 'ArrowLeft', shift: true, description: 'Previous Second' },

  // Tools
  SAVE: { key: 's', ctrl: true, description: 'Save' },
  EXPORT: { key: 'e', ctrl: true, description: 'Export' },
  NEW: { key: 'n', ctrl: true, description: 'New' },
  OPEN: { key: 'o', ctrl: true, description: 'Open' },

  // Canvas
  MOVE_UP: { key: 'ArrowUp', description: 'Move Up' },
  MOVE_DOWN: { key: 'ArrowDown', description: 'Move Down' },
  MOVE_LEFT: { key: 'ArrowLeft', description: 'Move Left' },
  MOVE_RIGHT: { key: 'ArrowRight', description: 'Move Right' },
  MOVE_UP_FAST: { key: 'ArrowUp', shift: true, description: 'Move Up (Fast)' },
  MOVE_DOWN_FAST: { key: 'ArrowDown', shift: true, description: 'Move Down (Fast)' },
  MOVE_LEFT_FAST: { key: 'ArrowLeft', shift: true, description: 'Move Left (Fast)' },
  MOVE_RIGHT_FAST: { key: 'ArrowRight', shift: true, description: 'Move Right (Fast)' },

  // Layers
  BRING_TO_FRONT: { key: ']', ctrl: true, shift: true, description: 'Bring to Front' },
  SEND_TO_BACK: { key: '[', ctrl: true, shift: true, description: 'Send to Back' },
  BRING_FORWARD: { key: ']', ctrl: true, description: 'Bring Forward' },
  SEND_BACKWARD: { key: '[', ctrl: true, description: 'Send Backward' },

  // Lock
  LOCK: { key: 'l', ctrl: true, description: 'Lock/Unlock' },

  // Help
  HELP: { key: '/', ctrl: true, description: 'Show Help' },
  SHORTCUTS: { key: '?', ctrl: true, description: 'Show Shortcuts' }
}

export default useKeyboardShortcuts
