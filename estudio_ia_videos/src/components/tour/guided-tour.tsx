'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Video,
  Mic,
  Layout,
  Download,
  Play,
  MousePointer,
  Keyboard,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  target: string; // CSS selector or element ID
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon?: React.ComponentType<{ className?: string }>;
  action?: string; // Optional action text
  highlight?: boolean;
}

const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Bem-vindo ao Estúdio IA! 🎬',
    content: 'Vamos fazer um tour rápido para você conhecer as principais funcionalidades. Leva menos de 2 minutos!',
    position: 'bottom',
    icon: Sparkles,
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    title: 'Menu Lateral',
    content: 'Aqui você acessa seus projetos, templates NR, configurações e muito mais.',
    position: 'right',
    icon: Layout,
  },
  {
    id: 'upload',
    target: '[data-tour="upload"]',
    title: 'Importar PPTX',
    content: 'Arraste seu PowerPoint aqui ou clique para selecionar. O sistema extrai automaticamente textos, imagens e notas.',
    position: 'bottom',
    icon: Video,
    highlight: true,
  },
  {
    id: 'timeline',
    target: '[data-tour="timeline"]',
    title: 'Timeline',
    content: 'Organize seus slides, ajuste durações e adicione transições. Arraste para reordenar!',
    position: 'top',
    icon: Play,
  },
  {
    id: 'voice',
    target: '[data-tour="voice"]',
    title: 'Narração com IA',
    content: 'Escolha uma voz, ajuste a velocidade e gere áudio automaticamente a partir do texto dos slides.',
    position: 'left',
    icon: Mic,
  },
  {
    id: 'preview',
    target: '[data-tour="preview"]',
    title: 'Preview em Tempo Real',
    content: 'Veja como seu vídeo vai ficar antes de exportar. Use a barra de espaço para play/pause.',
    position: 'left',
    icon: Play,
  },
  {
    id: 'export',
    target: '[data-tour="export"]',
    title: 'Exportar Vídeo',
    content: 'Quando estiver satisfeito, clique aqui para renderizar e baixar seu vídeo em MP4.',
    position: 'bottom',
    icon: Download,
    highlight: true,
  },
  {
    id: 'shortcuts',
    target: 'body',
    title: 'Atalhos de Teclado',
    content: 'Ctrl+S = Salvar • Ctrl+Z = Desfazer • Espaço = Play/Pause • ← → = Navegar slides',
    position: 'bottom',
    icon: Keyboard,
  },
  {
    id: 'done',
    target: 'body',
    title: 'Pronto para começar! 🚀',
    content: 'Você já sabe o básico. Comece importando um PPTX ou escolha um template NR pronto.',
    position: 'bottom',
    icon: Check,
  },
];

interface GuidedTourProps {
  steps?: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  storageKey?: string;
}

export function GuidedTour({
  steps = DEFAULT_TOUR_STEPS,
  onComplete,
  onSkip,
  autoStart = false,
  storageKey = 'editor-tour-completed',
}: GuidedTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if tour was already completed
    if (autoStart && typeof window !== 'undefined') {
      const completed = localStorage.getItem(storageKey);
      if (!completed) {
        // Small delay to let the page render
        setTimeout(() => setIsActive(true), 1000);
      }
    }
  }, [autoStart, storageKey]);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Update target element position
  useEffect(() => {
    if (!isActive || !step) return;

    const updatePosition = () => {
      if (step.target === 'body') {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(step.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, step, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
    onComplete?.();
  }, [onComplete, storageKey]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
    onSkip?.();
  }, [onSkip, storageKey]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleNext, handlePrev, handleSkip]);

  // Start tour manually
  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  // Reset tour (for settings)
  const resetTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  if (!mounted || !isActive) {
    return null;
  }

  const getTooltipPosition = () => {
    if (!targetRect) {
      // Center of screen for body target
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 360;
    const tooltipHeight = 200;

    switch (step.position) {
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2),
        };
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2),
        };
      case 'left':
        return {
          top: targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2),
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          top: targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2),
          left: targetRect.right + padding,
        };
      default:
        return {};
    }
  };

  const Icon = step.icon;

  return createPortal(
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[9998]"
            onClick={handleSkip}
          />

          {/* Highlight box */}
          {targetRect && step.highlight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
                borderRadius: 8,
              }}
            />
          )}

          {/* Spotlight on target */}
          {targetRect && !step.highlight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed z-[9999] pointer-events-none bg-transparent"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                borderRadius: 8,
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[10000] w-[360px]"
            style={getTooltipPosition()}
          >
            <Card className="shadow-2xl border-violet-200">
              <CardContent className="p-5">
                {/* Progress */}
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="text-xs">
                    {currentStep + 1} de {steps.length}
                  </Badge>
                  <Progress value={progress} className="w-24 h-1.5" />
                </div>

                {/* Icon + Title */}
                <div className="flex items-start gap-3 mb-3">
                  {Icon && (
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-violet-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{step.content}</p>
                  </div>
                </div>

                {/* Action hint */}
                {step.action && (
                  <div className="bg-slate-50 rounded-lg p-2 mb-4 flex items-center gap-2 text-sm">
                    <MousePointer className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{step.action}</span>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-slate-500"
                  >
                    Pular tour
                  </Button>

                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleNext}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {currentStep === steps.length - 1 ? (
                        'Concluir'
                      ) : (
                        <>
                          Próximo
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Hook to control tour from anywhere
export function useTour(storageKey = 'editor-tour-completed') {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(storageKey);
      setShouldShow(!completed);
    }
  }, [storageKey]);

  const startTour = () => setShouldShow(true);
  
  const resetTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
      setShouldShow(true);
    }
  };

  const completeTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
      setShouldShow(false);
    }
  };

  return { shouldShow, startTour, resetTour, completeTour };
}

// Export steps for customization
export { DEFAULT_TOUR_STEPS };
