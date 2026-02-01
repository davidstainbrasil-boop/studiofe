'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Video,
  FileText,
  Palette,
  Play,
  Upload,
  Layers,
  CheckCircle2,
  Target,
  Clock,
  Zap,
  Award,
  ArrowRight,
  LightbulbIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  targetSelector?: string; // CSS selector for spotlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingWalkthroughProps {
  userName?: string;
  isFirstVisit?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
  onStepChange?: (stepIndex: number) => void;
  className?: string;
}

// Tour steps configuration
const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Estúdio!',
    description: 'Crie vídeos de treinamento NR profissionais em minutos. Vamos te mostrar como começar.',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'upload',
    title: 'Importe sua apresentação',
    description: 'Comece enviando um arquivo PPTX ou crie um projeto do zero. Suportamos slides com texto, imagens e notas.',
    icon: Upload,
    targetSelector: '#upload-button',
    position: 'bottom',
  },
  {
    id: 'templates',
    title: 'Use templates NR prontos',
    description: 'Temos 21+ templates para todas as NRs. Escolha um template e personalize com seu conteúdo.',
    icon: FileText,
    targetSelector: '#templates-gallery',
    position: 'right',
  },
  {
    id: 'editor',
    title: 'Editor visual intuitivo',
    description: 'Organize seus slides, adicione narrações com IA, e personalize cores e fontes.',
    icon: Layers,
    targetSelector: '#editor-canvas',
    position: 'left',
  },
  {
    id: 'narration',
    title: 'Narração com IA',
    description: 'Gere narrações profissionais automaticamente. Escolha entre diferentes vozes e estilos.',
    icon: Zap,
    targetSelector: '#narration-panel',
    position: 'right',
  },
  {
    id: 'preview',
    title: 'Pré-visualize seu vídeo',
    description: 'Veja como ficará seu vídeo antes de renderizar. Ajuste timing e transições.',
    icon: Play,
    targetSelector: '#preview-player',
    position: 'bottom',
  },
  {
    id: 'export',
    title: 'Exporte em alta qualidade',
    description: 'Renderize em Full HD ou 4K. Exporte para LMS, YouTube ou download direto.',
    icon: Video,
    targetSelector: '#export-button',
    position: 'top',
  },
  {
    id: 'quiz',
    title: 'Adicione quiz de avaliação',
    description: 'Crie questionários para avaliar o aprendizado. Gere certificados automáticos.',
    icon: Award,
    targetSelector: '#quiz-panel',
    position: 'left',
  },
  {
    id: 'complete',
    title: 'Tudo pronto!',
    description: 'Você conhece os recursos principais. Que tal criar seu primeiro vídeo NR agora?',
    icon: CheckCircle2,
    position: 'center',
    action: {
      label: 'Criar meu primeiro vídeo',
      onClick: () => {},
    },
  },
];

// Progress Indicator Component
function ProgressIndicator({ 
  total, 
  current, 
  onStepClick 
}: { 
  total: number; 
  current: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onStepClick?.(i)}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            i === current 
              ? 'w-8 bg-blue-500' 
              : i < current 
                ? 'w-2 bg-blue-500/50 hover:bg-blue-500/70' 
                : 'w-2 bg-zinc-600 hover:bg-zinc-500'
          )}
        />
      ))}
    </div>
  );
}

// Feature Card for Welcome Screen
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-xl"
    >
      <div className="p-2 bg-blue-500/20 rounded-lg">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-sm text-zinc-400 mt-1">{description}</p>
      </div>
    </motion.div>
  );
}

// Welcome Modal Component
function WelcomeModal({
  userName,
  onStart,
  onSkip,
}: {
  userName?: string;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700 
                   rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
      >
        {/* Header with animation */}
        <div className="relative p-8 pb-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full 
                       bg-gradient-to-br from-blue-500 to-purple-600"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white mb-2"
          >
            {userName ? `Olá, ${userName}!` : 'Bem-vindo!'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400"
          >
            Vamos criar vídeos de treinamento NR incríveis juntos
          </motion.p>
        </div>

        {/* Features */}
        <div className="px-8 py-4 space-y-3">
          <FeatureCard
            icon={Video}
            title="Crie vídeos profissionais"
            description="Templates prontos para todas as NRs, do NR-1 ao NR-38"
            delay={0.5}
          />
          <FeatureCard
            icon={Zap}
            title="Narração com IA"
            description="Vozes naturais em português, geradas automaticamente"
            delay={0.6}
          />
          <FeatureCard
            icon={Award}
            title="Quiz e Certificados"
            description="Avalie o aprendizado e emita certificados válidos"
            delay={0.7}
          />
        </div>

        {/* Actions */}
        <div className="p-8 pt-4 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Pular tour
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 
                       hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-semibold 
                       transition-all shadow-lg shadow-blue-500/20"
          >
            Começar Tour
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Tour Step Modal Component
function TourStepModal({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: {
  step: TourStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const Icon = step.icon;
  const isLast = currentIndex === totalSteps - 1;
  const isFirst = currentIndex === 0;

  // Calculate position based on step config
  const getPositionClasses = () => {
    if (step.position === 'center' || !step.targetSelector) {
      return 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
    // In real implementation, this would calculate position based on target element
    return 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
  };

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onSkip}
      />

      {/* Step Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          'z-50 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl',
          getPositionClasses()
        )}
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-xl 
                       bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4"
          >
            <Icon className="w-7 h-7 text-blue-400" />
          </motion.div>

          {/* Content */}
          <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
          <p className="text-zinc-400 leading-relaxed">{step.description}</p>

          {/* Tip */}
          {step.id !== 'welcome' && step.id !== 'complete' && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-blue-500/10 rounded-lg">
              <LightbulbIcon className="w-4 h-4 text-blue-400 mt-0.5" />
              <p className="text-sm text-blue-300">
                Dica: Clique em qualquer lugar fora para pular o tour
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {/* Progress */}
          <ProgressIndicator total={totalSteps} current={currentIndex} />

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            {isLast ? (
              <button
                onClick={step.action?.onClick || onComplete}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 
                           hover:from-blue-500 hover:to-purple-500 rounded-lg text-white font-medium transition-all"
              >
                {step.action?.label || 'Começar'}
                <Sparkles className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1 px-5 py-2 bg-blue-600 hover:bg-blue-500 
                           rounded-lg text-white font-medium transition-colors"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Main Component
export function OnboardingWalkthrough({
  userName,
  isFirstVisit = true,
  onComplete,
  onSkip,
  onStepChange,
  className,
}: OnboardingWalkthroughProps) {
  const [showWelcome, setShowWelcome] = useState(isFirstVisit);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isActive, setIsActive] = useState(false);

  // Start tour
  const startTour = useCallback(() => {
    setShowWelcome(false);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  // Skip tour
  const skipTour = useCallback(() => {
    setShowWelcome(false);
    setIsActive(false);
    setCurrentStep(-1);
    onSkip?.();
  }, [onSkip]);

  // Complete tour
  const completeTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(-1);
    onComplete?.();
  }, [onComplete]);

  // Navigate steps
  const goToNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
      onStepChange?.(currentStep + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour, onStepChange]);

  const goToPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      onStepChange?.(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') skipTour();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, goToNext, goToPrev, skipTour]);

  if (!showWelcome && !isActive) return null;

  return (
    <AnimatePresence mode="wait">
      {showWelcome && (
        <WelcomeModal
          key="welcome"
          userName={userName}
          onStart={startTour}
          onSkip={skipTour}
        />
      )}
      {isActive && currentStep >= 0 && currentStep < tourSteps.length && (
        <TourStepModal
          key={`step-${currentStep}`}
          step={tourSteps[currentStep]}
          currentIndex={currentStep}
          totalSteps={tourSteps.length}
          onNext={goToNext}
          onPrev={goToPrev}
          onSkip={skipTour}
          onComplete={completeTour}
        />
      )}
    </AnimatePresence>
  );
}

// Export steps for external use
export { tourSteps };
export type { TourStep };
export default OnboardingWalkthrough;
