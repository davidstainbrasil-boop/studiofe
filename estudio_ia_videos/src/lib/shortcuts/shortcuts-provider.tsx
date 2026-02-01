'use client';

/**
 * Global Keyboard Shortcuts System
 * 
 * Provides application-wide keyboard shortcuts with:
 * - Context-aware shortcuts
 * - Shortcut registry
 * - Help modal
 * - Customizable bindings
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Keyboard,
  Search,
  Command,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
export interface Shortcut {
  id: string;
  keys: string[]; // e.g., ['ctrl', 'shift', 's'] or ['cmd', 's']
  description: string;
  category: 'navigation' | 'editing' | 'playback' | 'file' | 'general';
  action: () => void;
  context?: string; // Optional context where shortcut is active
  enabled?: boolean;
}

interface ShortcutsContextType {
  shortcuts: Shortcut[];
  registerShortcut: (shortcut: Shortcut) => () => void;
  unregisterShortcut: (id: string) => void;
  setContext: (context: string | null) => void;
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

// Platform detection
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Format key for display
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    ctrl: isMac ? '⌃' : 'Ctrl',
    cmd: isMac ? '⌘' : 'Ctrl',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift',
    enter: '↵',
    backspace: '⌫',
    delete: '⌦',
    escape: 'Esc',
    space: '␣',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  };
  
  return keyMap[key.toLowerCase()] || key.toUpperCase();
}

// Check if event matches shortcut
function matchesShortcut(event: KeyboardEvent, keys: string[]): boolean {
  const modifiers = {
    ctrl: event.ctrlKey,
    cmd: event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };

  const pressedKey = event.key.toLowerCase();
  const requiredModifiers = keys.filter(k => ['ctrl', 'cmd', 'alt', 'shift'].includes(k));
  const requiredKey = keys.find(k => !['ctrl', 'cmd', 'alt', 'shift'].includes(k));

  // Check all required modifiers are pressed
  for (const mod of requiredModifiers) {
    // Handle cmd/ctrl cross-platform
    if (mod === 'cmd' || mod === 'ctrl') {
      if (!modifiers.ctrl && !modifiers.cmd) return false;
    } else if (!modifiers[mod as keyof typeof modifiers]) {
      return false;
    }
  }

  // Check no extra modifiers are pressed
  for (const [mod, pressed] of Object.entries(modifiers)) {
    if (pressed && !requiredModifiers.includes(mod) && 
        !(mod === 'ctrl' && requiredModifiers.includes('cmd')) &&
        !(mod === 'cmd' && requiredModifiers.includes('ctrl'))) {
      return false;
    }
  }

  // Check the main key
  return requiredKey?.toLowerCase() === pressedKey;
}

// Provider Component
export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [currentContext, setCurrentContext] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  // Register a shortcut
  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setShortcuts(prev => {
      // Replace if exists, add if new
      const exists = prev.find(s => s.id === shortcut.id);
      if (exists) {
        return prev.map(s => s.id === shortcut.id ? shortcut : s);
      }
      return [...prev, shortcut];
    });

    // Return unregister function
    return () => {
      setShortcuts(prev => prev.filter(s => s.id !== shortcut.id));
    };
  }, []);

  // Unregister a shortcut
  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);

  // Handle keydown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Still allow some shortcuts like Escape
        if (event.key !== 'Escape') return;
      }

      // Check each shortcut
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        if (shortcut.context && shortcut.context !== currentContext) continue;
        
        if (matchesShortcut(event, shortcut.keys)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentContext]);

  // Register default shortcuts
  useEffect(() => {
    const defaultShortcuts: Shortcut[] = [
      {
        id: 'help',
        keys: ['shift', '?'],
        description: 'Mostrar atalhos de teclado',
        category: 'general',
        action: () => setIsHelpOpen(true),
      },
      {
        id: 'close-help',
        keys: ['escape'],
        description: 'Fechar diálogo',
        category: 'general',
        action: () => setIsHelpOpen(false),
      },
    ];

    defaultShortcuts.forEach(s => registerShortcut(s));
  }, [registerShortcut]);

  return (
    <ShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        setContext: setCurrentContext,
        isHelpOpen,
        openHelp: () => setIsHelpOpen(true),
        closeHelp: () => setIsHelpOpen(false),
      }}
    >
      {children}
      <ShortcutsHelpDialog
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        shortcuts={shortcuts}
      />
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider');
  }
  return context;
}

// Hook for registering shortcuts
export function useShortcut(shortcut: Omit<Shortcut, 'action'> & { action: () => void }) {
  const { registerShortcut } = useShortcuts();

  useEffect(() => {
    return registerShortcut(shortcut);
  }, [shortcut.id, shortcut.keys.join(','), shortcut.context, registerShortcut]);
}

// Shortcuts Help Dialog
interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Shortcut[];
}

function ShortcutsHelpDialog({ open, onOpenChange, shortcuts }: ShortcutsHelpDialogProps) {
  const [search, setSearch] = useState('');

  const categories = {
    file: { label: 'Arquivo', icon: '📁' },
    editing: { label: 'Edição', icon: '✏️' },
    playback: { label: 'Reprodução', icon: '▶️' },
    navigation: { label: 'Navegação', icon: '🧭' },
    general: { label: 'Geral', icon: '⚙️' },
  };

  const filteredShortcuts = shortcuts.filter(s =>
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.keys.join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar atalhos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <span>{categories[category as keyof typeof categories]?.icon}</span>
                {categories[category as keyof typeof categories]?.label || category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="font-mono text-xs px-2 py-0.5"
                        >
                          {formatKey(key)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedShortcuts).length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Keyboard className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum atalho encontrado</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t text-xs text-slate-500 flex items-center gap-2">
          <Badge variant="outline" className="font-mono">Shift</Badge>
          <span>+</span>
          <Badge variant="outline" className="font-mono">?</Badge>
          <span>para abrir esta ajuda</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsProvider;
