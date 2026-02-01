'use client';

/**
 * Editor Keyboard Shortcuts
 * 
 * Default shortcuts for the video editor.
 */

import { useEffect } from 'react';
import { useShortcuts } from './shortcuts-provider';

interface EditorShortcutsProps {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onNextSlide?: () => void;
  onPrevSlide?: () => void;
  onFirstSlide?: () => void;
  onLastSlide?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onPreview?: () => void;
  onExport?: () => void;
  onNewSlide?: () => void;
}

export function useEditorShortcuts({
  onSave,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onSelectAll,
  onDeselect,
  onPlay,
  onPause,
  onStop,
  onNextSlide,
  onPrevSlide,
  onFirstSlide,
  onLastSlide,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onPreview,
  onExport,
  onNewSlide,
}: EditorShortcutsProps) {
  const { registerShortcut, setContext } = useShortcuts();

  useEffect(() => {
    setContext('editor');
    return () => setContext(null);
  }, [setContext]);

  useEffect(() => {
    const shortcuts = [
      // File operations
      {
        id: 'save',
        keys: ['cmd', 's'],
        description: 'Salvar projeto',
        category: 'file' as const,
        action: onSave || (() => {}),
        context: 'editor',
      },
      {
        id: 'export',
        keys: ['cmd', 'e'],
        description: 'Exportar vídeo',
        category: 'file' as const,
        action: onExport || (() => {}),
        context: 'editor',
      },

      // Editing
      {
        id: 'undo',
        keys: ['cmd', 'z'],
        description: 'Desfazer',
        category: 'editing' as const,
        action: onUndo || (() => {}),
        context: 'editor',
      },
      {
        id: 'redo',
        keys: ['cmd', 'shift', 'z'],
        description: 'Refazer',
        category: 'editing' as const,
        action: onRedo || (() => {}),
        context: 'editor',
      },
      {
        id: 'copy',
        keys: ['cmd', 'c'],
        description: 'Copiar',
        category: 'editing' as const,
        action: onCopy || (() => {}),
        context: 'editor',
      },
      {
        id: 'paste',
        keys: ['cmd', 'v'],
        description: 'Colar',
        category: 'editing' as const,
        action: onPaste || (() => {}),
        context: 'editor',
      },
      {
        id: 'delete',
        keys: ['backspace'],
        description: 'Excluir selecionado',
        category: 'editing' as const,
        action: onDelete || (() => {}),
        context: 'editor',
      },
      {
        id: 'duplicate',
        keys: ['cmd', 'd'],
        description: 'Duplicar',
        category: 'editing' as const,
        action: onDuplicate || (() => {}),
        context: 'editor',
      },
      {
        id: 'select-all',
        keys: ['cmd', 'a'],
        description: 'Selecionar tudo',
        category: 'editing' as const,
        action: onSelectAll || (() => {}),
        context: 'editor',
      },
      {
        id: 'deselect',
        keys: ['escape'],
        description: 'Desmarcar seleção',
        category: 'editing' as const,
        action: onDeselect || (() => {}),
        context: 'editor',
      },
      {
        id: 'new-slide',
        keys: ['cmd', 'n'],
        description: 'Novo slide',
        category: 'editing' as const,
        action: onNewSlide || (() => {}),
        context: 'editor',
      },

      // Playback
      {
        id: 'play-pause',
        keys: ['space'],
        description: 'Play/Pause',
        category: 'playback' as const,
        action: () => {
          if (onPlay || onPause) {
            // Toggle based on current state would need state access
            onPlay?.();
          }
        },
        context: 'editor',
      },
      {
        id: 'stop',
        keys: ['s'],
        description: 'Parar',
        category: 'playback' as const,
        action: onStop || (() => {}),
        context: 'editor',
      },
      {
        id: 'preview',
        keys: ['cmd', 'p'],
        description: 'Visualizar',
        category: 'playback' as const,
        action: onPreview || (() => {}),
        context: 'editor',
      },

      // Navigation
      {
        id: 'next-slide',
        keys: ['arrowright'],
        description: 'Próximo slide',
        category: 'navigation' as const,
        action: onNextSlide || (() => {}),
        context: 'editor',
      },
      {
        id: 'prev-slide',
        keys: ['arrowleft'],
        description: 'Slide anterior',
        category: 'navigation' as const,
        action: onPrevSlide || (() => {}),
        context: 'editor',
      },
      {
        id: 'first-slide',
        keys: ['cmd', 'arrowleft'],
        description: 'Primeiro slide',
        category: 'navigation' as const,
        action: onFirstSlide || (() => {}),
        context: 'editor',
      },
      {
        id: 'last-slide',
        keys: ['cmd', 'arrowright'],
        description: 'Último slide',
        category: 'navigation' as const,
        action: onLastSlide || (() => {}),
        context: 'editor',
      },
      {
        id: 'zoom-in',
        keys: ['cmd', '='],
        description: 'Aumentar zoom',
        category: 'navigation' as const,
        action: onZoomIn || (() => {}),
        context: 'editor',
      },
      {
        id: 'zoom-out',
        keys: ['cmd', '-'],
        description: 'Diminuir zoom',
        category: 'navigation' as const,
        action: onZoomOut || (() => {}),
        context: 'editor',
      },
      {
        id: 'zoom-fit',
        keys: ['cmd', '0'],
        description: 'Ajustar à tela',
        category: 'navigation' as const,
        action: onZoomFit || (() => {}),
        context: 'editor',
      },
    ];

    const unsubscribes = shortcuts.map(s => registerShortcut(s));
    return () => unsubscribes.forEach(fn => fn());
  }, [
    registerShortcut,
    onSave, onUndo, onRedo, onCopy, onPaste, onDelete, onDuplicate,
    onSelectAll, onDeselect, onPlay, onPause, onStop, onNextSlide,
    onPrevSlide, onFirstSlide, onLastSlide, onZoomIn, onZoomOut,
    onZoomFit, onPreview, onExport, onNewSlide,
  ]);
}

export default useEditorShortcuts;
