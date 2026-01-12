'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Step1Goal } from './steps/Step1Goal';
import { Step2Script } from './steps/Step2Script';
import { Step3Avatar } from './steps/Step3Avatar';
import { Step4Scenes } from './steps/Step4Scenes';
import { Step5Preview } from './steps/Step5Preview';
import { Step6Export } from './steps/Step6Export';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useEffect } from 'react';

type VideoData = {
    goal?: string;
    script?: string;
    title?: string;
    avatarId?: string;
    voiceId?: string;
    scenes?: any[];
};

export function VideoCreationWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [videoData, setVideoData] = useState<VideoData>({});
    const { isActive, completeOnboarding } = useOnboarding();

    const totalSteps = 6;
    const progress = (currentStep / totalSteps) * 100;

    useEffect(() => {
        // If we reach the final step (Export) and onboarding is active, mark it as complete
        if (currentStep === 6 && isActive) {
            completeOnboarding();
        }
    }, [currentStep, isActive, completeOnboarding]);

    const handleNext = (stepData: Partial<VideoData>) => {
        setVideoData(prev => ({ ...prev, ...stepData }));
        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Logic handled in final step
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            router.back();
        }
    };

    // Contextual hints for onboarding
    const getStepHint = (step: number) => {
        if (!isActive) return null;
        switch (step) {
            case 1: return "Qual o objetivo do seu vídeo?";
            case 2: return "Use IA para gerar ou escreva você mesmo.";
            case 3: return "Escolha quem vai apresentar seu conteúdo.";
            case 4: return "O visual é automático. Ajuste apenas se precisar.";
            case 5: return "Confira se está tudo certo antes de renderizar.";
            case 6: return "Parabéns! Seu primeiro vídeo está sendo criado.";
            default: return null;
        }
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Goal onNext={handleNext} initialValue={videoData.goal} />;
            case 2:
                return <Step2Script onNext={handleNext} initialValue={videoData.script} />;
            case 3:
                return <Step3Avatar onNext={handleNext} initialValue={videoData.avatarId} />;
            case 4:
                return <Step4Scenes onNext={handleNext} />;
            case 5:
                return <Step5Preview onNext={handleNext} />;
            case 6:
                return <Step6Export videoData={videoData} />;
            default:
                return <div>Erro: Passo inválido</div>;
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 h-full flex flex-col">
            {/* Header / Progress */}
            <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-slate-500">
                    <Button variant="ghost" onClick={handleBack} className="hover:bg-slate-100 -ml-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <div className="flex flex-col items-end">
                        <span>Passo {currentStep} de {totalSteps}</span>
                        {getStepHint(currentStep) && (
                            <span className="text-xs text-violet-600 font-medium animate-pulse">
                                💡 {getStepHint(currentStep)}
                            </span>
                        )}
                    </div>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Main Content */}
            <div className="flex-1">
                {renderCurrentStep()}
            </div>

            {/* Footer Instructions (Optional) */}
            {/* <div className="mt-8 flex justify-end">
         Buttons are handled primarily within the Step components for better flow control,
         but global Next/Back could be placed here if uniformity is preferred.
      </div> */}
        </div>
    );
}
