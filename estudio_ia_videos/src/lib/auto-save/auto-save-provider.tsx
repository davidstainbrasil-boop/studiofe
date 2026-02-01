'use client';

/**
 * Auto-Save System
 * 
 * Provides automatic saving functionality with visual feedback.
 * Debounces saves and tracks save status.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AutoSaveContextType {
  status: SaveStatus;
  lastSaved: Date | null;
  errorMessage: string | null;
  isDirty: boolean;
  
  // Actions
  markDirty: () => void;
  save: () => Promise<void>;
  forceSave: () => Promise<void>;
}

interface AutoSaveProviderProps {
  children: ReactNode;
  saveFunction: () => Promise<void>;
  debounceMs?: number;
  autoSaveEnabled?: boolean;
}

const AutoSaveContext = createContext<AutoSaveContextType | null>(null);

export function AutoSaveProvider({
  children,
  saveFunction,
  debounceMs = 2000,
  autoSaveEnabled = true,
}: AutoSaveProviderProps) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Perform save
  const performSave = useCallback(async () => {
    if (!isOnline) {
      setStatus('offline');
      return;
    }

    try {
      setStatus('saving');
      setErrorMessage(null);
      
      await saveFunction();
      
      setStatus('saved');
      setLastSaved(new Date());
      setIsDirty(false);
      
      // Reset to idle after showing "saved" for a moment
      setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s));
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao salvar');
    }
  }, [saveFunction, isOnline]);

  // Mark content as dirty (changed)
  const markDirty = useCallback(() => {
    setIsDirty(true);
    
    if (!autoSaveEnabled) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(performSave, debounceMs);
  }, [autoSaveEnabled, debounceMs, performSave]);

  // Manual save
  const save = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  // Force save (bypass debounce)
  const forceSave = save;

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      if (isDirty) {
        performSave();
      } else {
        setStatus('idle');
      }
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isDirty, performSave]);

  // Save before unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AutoSaveContext.Provider
      value={{
        status,
        lastSaved,
        errorMessage,
        isDirty,
        markDirty,
        save,
        forceSave,
      }}
    >
      {children}
    </AutoSaveContext.Provider>
  );
}

export function useAutoSave() {
  const context = useContext(AutoSaveContext);
  if (!context) {
    throw new Error('useAutoSave must be used within AutoSaveProvider');
  }
  return context;
}

// Save Status Indicator Component
interface SaveStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function SaveStatusIndicator({ className, showLabel = true }: SaveStatusIndicatorProps) {
  const { status, lastSaved, errorMessage, isDirty } = useAutoSave();

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes === 0) return 'agora';
    if (minutes === 1) return 'há 1 minuto';
    if (minutes < 60) return `há ${minutes} minutos`;
    return lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    idle: {
      icon: isDirty ? Cloud : Check,
      text: isDirty ? 'Alterações pendentes' : `Salvo ${formatLastSaved()}`,
      color: isDirty ? 'text-amber-600' : 'text-slate-500',
      bgColor: isDirty ? 'bg-amber-50' : 'bg-transparent',
    },
    saving: {
      icon: Loader2,
      text: 'Salvando...',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      animate: true,
    },
    saved: {
      icon: Check,
      text: 'Salvo',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    error: {
      icon: AlertCircle,
      text: errorMessage || 'Erro ao salvar',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    offline: {
      icon: CloudOff,
      text: 'Offline',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status + (isDirty ? '-dirty' : '')}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
          config.bgColor,
          config.color,
          className
        )}
      >
        <Icon
          className={cn(
            'w-3.5 h-3.5',
            'animate' in config && config.animate && 'animate-spin'
          )}
        />
        {showLabel && <span>{config.text}</span>}
      </motion.div>
    </AnimatePresence>
  );
}

export default AutoSaveProvider;
