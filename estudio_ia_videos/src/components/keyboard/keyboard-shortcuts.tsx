'use client';
import { logger } from '@/lib/logger';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Search, Command, X, Settings } from 'lucide-react';

// Types
export interface ShortcutAction {
  id: string;
  keys: string[];
  label: string;
  description?: string;
  category: 'editor' | 'navigation' | 'general' | 'playback';
  action: () => void;
  enabled?: boolean;
}

interface KeyboardShortcutsContextType {
  shortcuts: ShortcutAction[];
  registerShortcut: (shortcut: ShortcutAction) => void;
  unregisterShortcut: (id: string) => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}

// Context
const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

// Default shortcuts
const defaultShortcuts: ShortcutAction[] = [
  // General
  { id: 'save', keys: ['ctrl', 's'], label: 'Salvar', category: 'general', action: () => logger.info('Save'), description: 'Salvar projeto' },
  { id: 'undo', keys: ['ctrl', 'z'], label: 'Desfazer', category: 'general', action: () => logger.info('Undo'), description: 'Desfazer última ação' },
  { id: 'redo', keys: ['ctrl', 'shift', 'z'], label: 'Refazer', category: 'general', action: () => logger.info('Redo'), description: 'Refazer última ação' },
  { id: 'shortcuts', keys: ['ctrl', '/'], label: 'Atalhos', category: 'general', action: () => {}, description: 'Mostrar atalhos de teclado' },
  { id: 'search', keys: ['ctrl', 'k'], label: 'Buscar', category: 'general', action: () => logger.info('Search'), description: 'Busca rápida' },
  
  // Editor
  { id: 'newSlide', keys: ['ctrl', 'n'], label: 'Novo Slide', category: 'editor', action: () => logger.info('New slide'), description: 'Criar novo slide' },
  { id: 'duplicate', keys: ['ctrl', 'd'], label: 'Duplicar', category: 'editor', action: () => logger.info('Duplicate'), description: 'Duplicar seleção' },
  { id: 'delete', keys: ['delete'], label: 'Excluir', category: 'editor', action: () => logger.info('Delete'), description: 'Excluir seleção' },
  { id: 'selectAll', keys: ['ctrl', 'a'], label: 'Selecionar Tudo', category: 'editor', action: () => logger.info('Select all'), description: 'Selecionar todos os elementos' },
  { id: 'copy', keys: ['ctrl', 'c'], label: 'Copiar', category: 'editor', action: () => logger.info('Copy'), description: 'Copiar seleção' },
  { id: 'paste', keys: ['ctrl', 'v'], label: 'Colar', category: 'editor', action: () => logger.info('Paste'), description: 'Colar área de transferência' },
  { id: 'cut', keys: ['ctrl', 'x'], label: 'Recortar', category: 'editor', action: () => logger.info('Cut'), description: 'Recortar seleção' },
  
  // Navigation
  { id: 'prevSlide', keys: ['arrowup'], label: 'Slide Anterior', category: 'navigation', action: () => logger.info('Previous slide'), description: 'Ir para slide anterior' },
  { id: 'nextSlide', keys: ['arrowdown'], label: 'Próximo Slide', category: 'navigation', action: () => logger.info('Next slide'), description: 'Ir para próximo slide' },
  { id: 'firstSlide', keys: ['home'], label: 'Primeiro Slide', category: 'navigation', action: () => logger.info('First slide'), description: 'Ir para primeiro slide' },
  { id: 'lastSlide', keys: ['end'], label: 'Último Slide', category: 'navigation', action: () => logger.info('Last slide'), description: 'Ir para último slide' },
  
  // Playback
  { id: 'playPause', keys: ['space'], label: 'Play/Pause', category: 'playback', action: () => logger.info('Play/Pause'), description: 'Iniciar ou pausar preview' },
  { id: 'preview', keys: ['ctrl', 'p'], label: 'Preview', category: 'playback', action: () => logger.info('Preview'), description: 'Abrir preview em tela cheia' },
  { id: 'export', keys: ['ctrl', 'e'], label: 'Exportar', category: 'playback', action: () => logger.info('Export'), description: 'Exportar vídeo' },
];

// Helper functions
function parseKeyCombo(keys: string[]): string {
  return keys.map(key => {
    switch (key.toLowerCase()) {
      case 'ctrl': return '⌘';
      case 'shift': return '⇧';
      case 'alt': return '⌥';
      case 'enter': return '↵';
      case 'space': return 'Espaço';
      case 'arrowup': return '↑';
      case 'arrowdown': return '↓';
      case 'arrowleft': return '←';
      case 'arrowright': return '→';
      case 'delete': return 'Del';
      case 'backspace': return '⌫';
      case 'escape': return 'Esc';
      case 'home': return 'Home';
      case 'end': return 'End';
      default: return key.toUpperCase();
    }
  }).join(' + ');
}

function matchesKeyCombo(event: KeyboardEvent, keys: string[]): boolean {
  const pressedKeys: string[] = [];
  
  if (event.ctrlKey || event.metaKey) pressedKeys.push('ctrl');
  if (event.shiftKey) pressedKeys.push('shift');
  if (event.altKey) pressedKeys.push('alt');
  
  // Add the main key
  const mainKey = event.key.toLowerCase();
  if (!['control', 'shift', 'alt', 'meta'].includes(mainKey)) {
    pressedKeys.push(mainKey);
  }
  
  // Normalize keys
  const normalizedTarget = keys.map(k => k.toLowerCase()).sort();
  const normalizedPressed = pressedKeys.sort();
  
  return normalizedTarget.length === normalizedPressed.length &&
    normalizedTarget.every((key, i) => key === normalizedPressed[i]);
}

// Provider Component
export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>(defaultShortcuts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // Register/unregister shortcuts
  const registerShortcut = useCallback((shortcut: ShortcutAction) => {
    setShortcuts(prev => {
      const existing = prev.findIndex(s => s.id === shortcut.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = shortcut;
        return updated;
      }
      return [...prev, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);

  // Update shortcuts modal shortcut
  useEffect(() => {
    const shortcutsShortcut = shortcuts.find(s => s.id === 'shortcuts');
    if (shortcutsShortcut) {
      registerShortcut({
        ...shortcutsShortcut,
        action: () => setIsModalOpen(true),
      });
    }
  }, [registerShortcut, shortcuts]);

  // Handle keyboard events
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Still allow Escape and some shortcuts
        if (event.key !== 'Escape' && !event.ctrlKey && !event.metaKey) {
          return;
        }
      }

      // Check shortcuts
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;
        
        if (matchesKeyCombo(event, shortcut.keys)) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isEnabled]);

  // Escape to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  return (
    <KeyboardShortcutsContext.Provider value={{
      shortcuts,
      registerShortcut,
      unregisterShortcut,
      isModalOpen,
      openModal: () => setIsModalOpen(true),
      closeModal: () => setIsModalOpen(false),
      isEnabled,
      setIsEnabled,
    }}>
      {children}
      <KeyboardShortcutsModal />
    </KeyboardShortcutsContext.Provider>
  );
}

// Hook
export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
}

// Custom hook to register a shortcut on mount
export function useShortcut(
  id: string,
  keys: string[],
  action: () => void,
  options?: {
    label?: string;
    description?: string;
    category?: ShortcutAction['category'];
    enabled?: boolean;
  }
) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut({
      id,
      keys,
      label: options?.label || id,
      description: options?.description,
      category: options?.category || 'general',
      action,
      enabled: options?.enabled,
    });

    return () => unregisterShortcut(id);
  }, [id, keys, action, options, registerShortcut, unregisterShortcut]);
}

// Keyboard Shortcuts Modal
function KeyboardShortcutsModal() {
  const { shortcuts, isModalOpen, closeModal } = useKeyboardShortcuts();
  const [search, setSearch] = useState('');

  const categories = [
    { id: 'general', label: 'Geral', icon: Command },
    { id: 'editor', label: 'Editor', icon: Keyboard },
    { id: 'navigation', label: 'Navegação', icon: Search },
    { id: 'playback', label: 'Reprodução', icon: Settings },
  ];

  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.label.toLowerCase().includes(search.toLowerCase()) ||
    shortcut.description?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedShortcuts = categories.map(cat => ({
    ...cat,
    shortcuts: filteredShortcuts.filter(s => s.category === cat.id),
  })).filter(cat => cat.shortcuts.length > 0);

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={closeModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] md:max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Atalhos de Teclado
                    </h2>
                    <p className="text-sm text-gray-500">
                      Pressione <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> para fechar
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar atalhos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {groupedShortcuts.length > 0 ? (
                <div className="space-y-6">
                  {groupedShortcuts.map(category => (
                    <div key={category.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <category.icon className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                          {category.label}
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {category.shortcuts.map(shortcut => (
                          <div
                            key={shortcut.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shortcut.label}
                              </p>
                              {shortcut.description && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {shortcut.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, index) => (
                                <React.Fragment key={key}>
                                  {index > 0 && <span className="text-gray-400">+</span>}
                                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 min-w-[24px] text-center">
                                    {parseKeyCombo([key])}
                                  </kbd>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500">Nenhum atalho encontrado</p>
                  <p className="text-sm text-gray-400">Tente buscar por outro termo</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 text-center">
                Use <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">⌘</kbd> no Mac ou <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Ctrl</kbd> no Windows/Linux
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default KeyboardShortcutsProvider;
