/**
 * PPTXToVideoWizard - Container principal do fluxo de 3 passos
 *
 * Gerencia a navegação entre os steps e exibe o progresso
 */
'use client';

import { usePPTXToVideo } from './hooks/usePPTXToVideo';
import { Step1Upload } from './steps/Step1Upload';
import { Step2Customize } from './steps/Step2Customize';
import { Step3Generate } from './steps/Step3Generate';
import { cn } from '@/lib/utils';
import { Upload, Palette, Video, Check } from 'lucide-react';

const STEPS = [
  {
    id: 'upload' as const,
    title: 'Upload',
    description: 'Envie seu PPTX',
    icon: Upload,
  },
  {
    id: 'customize' as const,
    title: 'Personalizar',
    description: 'Avatar, voz e mais',
    icon: Palette,
  },
  {
    id: 'generate' as const,
    title: 'Gerar',
    description: 'Crie seu vídeo',
    icon: Video,
  },
];

export function PPTXToVideoWizard() {
  const wizard = usePPTXToVideo();

  return (
    <div className="space-y-8">
      {/* Steps Indicator */}
      <div className="flex items-center justify-center">
        {STEPS.map((step, index) => {
          const isActive = wizard.currentStep === step.id;
          const isCompleted = wizard.completedSteps.includes(step.id);
          const isPast = STEPS.findIndex((s) => s.id === wizard.currentStep) > index;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => (isCompleted || isPast) && wizard.goToStep(step.id)}
                  disabled={!isCompleted && !isPast}
                  className={cn(
                    'relative flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all duration-300',
                    isActive && 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/30',
                    isCompleted && !isActive && 'border-green-500 bg-green-500 text-white',
                    !isActive && !isCompleted && 'border-muted-foreground/30 bg-muted/50 text-muted-foreground',
                    (isCompleted || isPast) && 'cursor-pointer hover:scale-105'
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-6 h-6" />
                  )}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </button>
                <div className="mt-3 text-center">
                  <div
                    className={cn(
                      'font-medium text-sm',
                      isActive && 'text-blue-500',
                      isCompleted && !isActive && 'text-green-500',
                      !isActive && !isCompleted && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 sm:w-24 h-0.5 mx-2 sm:mx-4 transition-colors duration-300',
                    isPast || isCompleted ? 'bg-green-500' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {wizard.currentStep === 'upload' && <Step1Upload wizard={wizard} />}
        {wizard.currentStep === 'customize' && <Step2Customize wizard={wizard} />}
        {wizard.currentStep === 'generate' && <Step3Generate wizard={wizard} />}
      </div>

      {/* Error Display */}
      {wizard.error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-center">
          {wizard.error}
        </div>
      )}
    </div>
  );
}
