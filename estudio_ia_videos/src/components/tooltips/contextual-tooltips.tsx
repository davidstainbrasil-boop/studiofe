'use client';

/**
 * Contextual Tooltips System
 * 
 * Provides contextual help tooltips throughout the application,
 * with smart positioning, keyboard support, and persistence.
 */

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Lightbulb, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Types
type TooltipType = 'info' | 'tip' | 'warning';

interface TooltipConfig {
  id: string;
  title: string;
  content: string;
  type?: TooltipType;
  learnMoreUrl?: string;
  dismissible?: boolean;
}

interface TooltipPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface TooltipsContextValue {
  showTooltip: (config: TooltipConfig, anchorEl: HTMLElement) => void;
  hideTooltip: () => void;
  dismissTooltip: (id: string) => void;
  isDismissed: (id: string) => boolean;
  resetDismissed: () => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

// Storage key for dismissed tooltips
const STORAGE_KEY = 'studio-dismissed-tooltips';
const ENABLED_KEY = 'studio-tooltips-enabled';

// Context
const TooltipsContext = createContext<TooltipsContextValue | null>(null);

// Provider
export function TooltipsProvider({ children }: { children: ReactNode }) {
  const [activeTooltip, setActiveTooltip] = useState<TooltipConfig | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load dismissed tooltips from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
      const enabledStored = localStorage.getItem(ENABLED_KEY);
      if (enabledStored !== null) {
        setEnabled(JSON.parse(enabledStored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save dismissed tooltips
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissedIds]));
    } catch {
      // Ignore localStorage errors
    }
  }, [dismissedIds, mounted]);

  // Save enabled state
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(ENABLED_KEY, JSON.stringify(enabled));
    } catch {
      // Ignore localStorage errors
    }
  }, [enabled, mounted]);

  const calculatePosition = useCallback((anchorEl: HTMLElement): TooltipPosition => {
    const rect = anchorEl.getBoundingClientRect();
    const padding = 12;
    const tooltipWidth = 300;
    const tooltipHeight = 150;

    // Determine best placement
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    let placement: TooltipPosition['placement'] = 'bottom';
    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.bottom + padding;

    // Check if tooltip fits below
    if (spaceBelow < tooltipHeight && spaceAbove > spaceBelow) {
      placement = 'top';
      y = rect.top - tooltipHeight - padding;
    }

    // Horizontal bounds check
    if (x < padding) x = padding;
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = window.innerWidth - tooltipWidth - padding;
    }

    // Check left/right placement for narrow spaces
    if (rect.width < 50) {
      if (spaceRight > tooltipWidth + padding) {
        placement = 'right';
        x = rect.right + padding;
        y = rect.top + rect.height / 2 - tooltipHeight / 2;
      } else if (spaceLeft > tooltipWidth + padding) {
        placement = 'left';
        x = rect.left - tooltipWidth - padding;
        y = rect.top + rect.height / 2 - tooltipHeight / 2;
      }
    }

    return { x, y, placement };
  }, []);

  const showTooltip = useCallback((config: TooltipConfig, anchorEl: HTMLElement) => {
    if (!enabled) return;
    if (dismissedIds.has(config.id)) return;
    
    const pos = calculatePosition(anchorEl);
    setPosition(pos);
    setActiveTooltip(config);
  }, [enabled, dismissedIds, calculatePosition]);

  const hideTooltip = useCallback(() => {
    setActiveTooltip(null);
    setPosition(null);
  }, []);

  const dismissTooltip = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    hideTooltip();
  }, [hideTooltip]);

  const isDismissed = useCallback((id: string) => {
    return dismissedIds.has(id);
  }, [dismissedIds]);

  const resetDismissed = useCallback(() => {
    setDismissedIds(new Set());
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTooltip) {
        hideTooltip();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTooltip, hideTooltip]);

  const value: TooltipsContextValue = {
    showTooltip,
    hideTooltip,
    dismissTooltip,
    isDismissed,
    resetDismissed,
    enabled,
    setEnabled,
  };

  return (
    <TooltipsContext.Provider value={value}>
      {children}
      {mounted && activeTooltip && position && (
        <TooltipPortal
          config={activeTooltip}
          position={position}
          onClose={hideTooltip}
          onDismiss={() => dismissTooltip(activeTooltip.id)}
        />
      )}
    </TooltipsContext.Provider>
  );
}

// Hook
export function useTooltips() {
  const context = useContext(TooltipsContext);
  if (!context) {
    throw new Error('useTooltips must be used within TooltipsProvider');
  }
  return context;
}

// Tooltip Portal Component
function TooltipPortal({
  config,
  position,
  onClose,
  onDismiss,
}: {
  config: TooltipConfig;
  position: TooltipPosition;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const Icon = config.type === 'tip' ? Lightbulb : config.type === 'warning' ? AlertCircle : Info;
  const iconColor = config.type === 'tip' 
    ? 'text-amber-500' 
    : config.type === 'warning' 
    ? 'text-orange-500' 
    : 'text-violet-500';

  const getAnimationProps = () => {
    switch (position.placement) {
      case 'top':
        return { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };
      case 'bottom':
        return { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } };
      case 'left':
        return { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 } };
      case 'right':
        return { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } };
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        {...getAnimationProps()}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'fixed z-[100] w-[300px] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700',
          'overflow-hidden'
        )}
        style={{ left: position.x, top: position.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconColor)} />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">{config.title}</h4>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {config.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          {config.learnMoreUrl ? (
            <a
              href={config.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Saiba mais →
            </a>
          ) : (
            <span />
          )}
          
          {config.dismissible !== false && (
            <button
              onClick={onDismiss}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Não mostrar novamente
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Tooltip Trigger Component
interface TooltipTriggerProps {
  tooltip: TooltipConfig;
  children?: ReactNode;
  className?: string;
  showOnHover?: boolean;
  showOnClick?: boolean;
  iconSize?: 'sm' | 'md' | 'lg';
}

export function TooltipTrigger({
  tooltip,
  children,
  className,
  showOnHover = false,
  showOnClick = true,
  iconSize = 'sm',
}: TooltipTriggerProps) {
  const { showTooltip, hideTooltip, isDismissed } = useTooltips();
  
  if (isDismissed(tooltip.id)) {
    return children || null;
  }

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!showOnClick) return;
    e.preventDefault();
    e.stopPropagation();
    showTooltip(tooltip, e.currentTarget);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!showOnHover) return;
    showTooltip(tooltip, e.currentTarget);
  };

  const handleMouseLeave = () => {
    if (!showOnHover) return;
    hideTooltip();
  };

  if (children) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {children}
        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="text-slate-400 hover:text-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 rounded"
        >
          <HelpCircle className={sizes[iconSize]} />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'text-slate-400 hover:text-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 rounded',
        className
      )}
    >
      <HelpCircle className={sizes[iconSize]} />
    </button>
  );
}

// Pre-defined tooltips for common features
export const EDITOR_TOOLTIPS = {
  timeline: {
    id: 'editor-timeline',
    title: 'Timeline do Vídeo',
    content: 'Arraste os slides para reordenar. Clique em um slide para editá-lo. Use Ctrl+Z para desfazer alterações.',
    type: 'info' as TooltipType,
    learnMoreUrl: '/ajuda#timeline',
  },
  tts: {
    id: 'editor-tts',
    title: 'Narração com IA',
    content: 'Selecione uma voz e digite o texto. O áudio será gerado automaticamente e sincronizado com o slide.',
    type: 'tip' as TooltipType,
    learnMoreUrl: '/ajuda#tts',
  },
  avatar: {
    id: 'editor-avatar',
    title: 'Avatar Virtual',
    content: 'Escolha um apresentador virtual para seu vídeo. O avatar vai sincronizar os lábios com a narração.',
    type: 'info' as TooltipType,
  },
  export: {
    id: 'editor-export',
    title: 'Exportar Vídeo',
    content: 'Exporte em MP4 para uso geral, SCORM para LMS, ou gere um código embed para websites.',
    type: 'tip' as TooltipType,
  },
  templates: {
    id: 'editor-templates',
    title: 'Templates NR',
    content: 'Use nossos templates prontos para treinamentos de NR-10, NR-12, NR-35 e outras normas. Já vêm com conteúdo de referência.',
    type: 'tip' as TooltipType,
    learnMoreUrl: '/ajuda#templates',
  },
  music: {
    id: 'editor-music',
    title: 'Música de Fundo',
    content: 'Adicione música de fundo ao seu vídeo. O volume é ajustado automaticamente durante a narração.',
    type: 'info' as TooltipType,
  },
  preview: {
    id: 'editor-preview',
    title: 'Preview do Slide',
    content: 'Visualize como ficará cada slide antes de exportar. Use as teclas ← → para navegar.',
    type: 'info' as TooltipType,
  },
  renderQueue: {
    id: 'editor-render-queue',
    title: 'Fila de Renderização',
    content: 'Seus vídeos são processados em ordem. Você pode continuar editando enquanto aguarda.',
    type: 'info' as TooltipType,
  },
};

// Settings Component
export function TooltipsSettings() {
  const { enabled, setEnabled, resetDismissed } = useTooltips();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Dicas Contextuais</p>
          <p className="text-sm text-slate-500">Mostrar dicas de ajuda na interface</p>
        </div>
        <Button
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEnabled(!enabled)}
        >
          {enabled ? 'Ativado' : 'Desativado'}
        </Button>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <p className="font-medium">Resetar Dicas</p>
          <p className="text-sm text-slate-500">Mostrar todas as dicas novamente</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetDismissed}>
          Resetar
        </Button>
      </div>
    </div>
  );
}
