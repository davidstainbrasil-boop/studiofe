'use client';
import { logger } from '@/lib/logger';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileUp,
  LayoutTemplate,
  Mic,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Play,
  Volume2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
  userId: string;
}

export interface OnboardingData {
  creationMethod: 'pptx' | 'template' | null;
  selectedTemplate?: string;
  uploadedFile?: File;
  selectedVoice: string;
}

const STEPS = [
  { id: 1, title: 'Método de Criação', icon: FileUp },
  { id: 2, title: 'Selecionar Conteúdo', icon: LayoutTemplate },
  { id: 3, title: 'Escolher Voz', icon: Mic },
  { id: 4, title: 'Gerar Vídeo', icon: Sparkles },
];

const NR_TEMPLATES = [
  { id: 'nr-01', name: 'NR-01', title: 'Disposições Gerais e GRO', duration: '5 min' },
  { id: 'nr-05', name: 'NR-05', title: 'CIPA', duration: '8 min' },
  { id: 'nr-06', name: 'NR-06', title: 'EPI', duration: '6 min' },
  { id: 'nr-10', name: 'NR-10', title: 'Segurança em Eletricidade', duration: '10 min' },
  { id: 'nr-12', name: 'NR-12', title: 'Máquinas e Equipamentos', duration: '12 min' },
  { id: 'nr-17', name: 'NR-17', title: 'Ergonomia', duration: '7 min' },
  { id: 'nr-23', name: 'NR-23', title: 'Proteção Contra Incêndios', duration: '8 min' },
  { id: 'nr-35', name: 'NR-35', title: 'Trabalho em Altura', duration: '9 min' },
];

const VOICE_OPTIONS = [
  { id: 'rachel', name: 'Rachel', gender: 'Feminino', accent: 'Brasileiro', sample: '/voices/rachel-sample.mp3' },
  { id: 'antonio', name: 'Antônio', gender: 'Masculino', accent: 'Brasileiro', sample: '/voices/antonio-sample.mp3' },
  { id: 'julia', name: 'Júlia', gender: 'Feminino', accent: 'Brasileiro', sample: '/voices/julia-sample.mp3' },
  { id: 'pedro', name: 'Pedro', gender: 'Masculino', accent: 'Brasileiro', sample: '/voices/pedro-sample.mp3' },
];

export function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
  userId,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    creationMethod: null,
    selectedVoice: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.creationMethod !== null;
      case 2:
        return data.creationMethod === 'pptx' 
          ? !!data.uploadedFile 
          : !!data.selectedTemplate;
      case 3:
        return !!data.selectedVoice;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData({ ...data, uploadedFile: file });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Mark onboarding as completed
      await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      onComplete(data);
      
      // Redirect to editor with the data
      if (data.creationMethod === 'template' && data.selectedTemplate) {
        router.push(`/studio-pro?template=${data.selectedTemplate}&voice=${data.selectedVoice}`);
      } else {
        router.push(`/studio-pro?voice=${data.selectedVoice}`);
      }
    } catch (error) {
      logger.error('Erro ao completar onboarding:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playVoiceSample = (voiceId: string) => {
    // TODO: Implementar reprodução de áudio
    setPlayingVoice(voiceId);
    setTimeout(() => setPlayingVoice(null), 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Progress Header */}
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-xl">
              Crie seu primeiro vídeo
            </DialogTitle>
            <Badge variant="outline">
              Passo {currentStep} de {STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = currentStep > step.id;
              
              return (
                <div 
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2",
                    index < STEPS.length - 1 && "flex-1"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isComplete && "bg-green-500 text-white",
                    isActive && "bg-violet-600 text-white",
                    !isActive && !isComplete && "bg-slate-100 text-slate-400"
                  )}>
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2",
                      isComplete ? "bg-green-500" : "bg-slate-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="py-6 overflow-y-auto max-h-[50vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Creation Method */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <DialogDescription className="text-center mb-6">
                    Como você quer criar seu vídeo?
                  </DialogDescription>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        data.creationMethod === 'pptx' && "ring-2 ring-violet-500 bg-violet-50"
                      )}
                      onClick={() => setData({ ...data, creationMethod: 'pptx' })}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <FileUp className="w-8 h-8 text-orange-600" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Upload PPTX</h3>
                        <p className="text-sm text-slate-500">
                          Transforme sua apresentação existente em vídeo narrado automaticamente
                        </p>
                      </CardContent>
                    </Card>

                    <Card 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        data.creationMethod === 'template' && "ring-2 ring-violet-500 bg-violet-50"
                      )}
                      onClick={() => setData({ ...data, creationMethod: 'template' })}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <LayoutTemplate className="w-8 h-8 text-violet-600" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Template Pronto</h3>
                        <p className="text-sm text-slate-500">
                          Use um de nossos templates NR prontos e personalize com sua marca
                        </p>
                        <Badge variant="secondary" className="mt-3">
                          Recomendado para iniciantes
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Step 2: Content Selection */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {data.creationMethod === 'pptx' ? (
                    <>
                      <DialogDescription className="text-center mb-6">
                        Faça upload do seu arquivo PowerPoint
                      </DialogDescription>
                      
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-violet-400 transition-colors">
                        <input
                          type="file"
                          accept=".pptx"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="pptx-upload"
                        />
                        <label htmlFor="pptx-upload" className="cursor-pointer">
                          <FileUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                          {data.uploadedFile ? (
                            <div>
                              <p className="font-medium text-green-600 mb-1">
                                <Check className="w-4 h-4 inline mr-1" />
                                {data.uploadedFile.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                Clique para trocar o arquivo
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium mb-1">
                                Arraste seu arquivo aqui ou clique para selecionar
                              </p>
                              <p className="text-sm text-slate-500">
                                Suportamos arquivos .pptx até 50MB
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <DialogDescription className="text-center mb-6">
                        Escolha um template de treinamento NR
                      </DialogDescription>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {NR_TEMPLATES.map((template) => (
                          <Card
                            key={template.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              data.selectedTemplate === template.id && "ring-2 ring-violet-500 bg-violet-50"
                            )}
                            onClick={() => setData({ ...data, selectedTemplate: template.id })}
                          >
                            <CardContent className="p-4">
                              <Badge variant="outline" className="mb-2">
                                {template.name}
                              </Badge>
                              <p className="text-sm font-medium mb-1">{template.title}</p>
                              <p className="text-xs text-slate-500">{template.duration}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Voice Selection */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <DialogDescription className="text-center mb-6">
                    Escolha a voz para narração
                  </DialogDescription>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {VOICE_OPTIONS.map((voice) => (
                      <Card
                        key={voice.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          data.selectedVoice === voice.id && "ring-2 ring-violet-500 bg-violet-50"
                        )}
                        onClick={() => setData({ ...data, selectedVoice: voice.id })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{voice.name}</p>
                              <p className="text-sm text-slate-500">
                                {voice.gender} • {voice.accent}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                playVoiceSample(voice.id);
                              }}
                            >
                              {playingVoice === voice.id ? (
                                <Volume2 className="w-5 h-5 text-violet-600 animate-pulse" />
                              ) : (
                                <Play className="w-5 h-5" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Generate */}
              {currentStep === 4 && (
                <div className="text-center space-y-6">
                  <DialogDescription className="mb-6">
                    Tudo pronto! Revise suas escolhas e gere seu vídeo.
                  </DialogDescription>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4 text-left">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-slate-500">Método</span>
                          <span className="font-medium">
                            {data.creationMethod === 'pptx' ? 'Upload PPTX' : 'Template NR'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-slate-500">Conteúdo</span>
                          <span className="font-medium">
                            {data.creationMethod === 'pptx' 
                              ? data.uploadedFile?.name 
                              : NR_TEMPLATES.find(t => t.id === data.selectedTemplate)?.name
                            }
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                          <span className="text-slate-500">Voz</span>
                          <span className="font-medium">
                            {VOICE_OPTIONS.find(v => v.id === data.selectedVoice)?.name}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-6">
                    <Sparkles className="w-12 h-12 text-violet-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">
                      Pronto para criar seu vídeo!
                    </h3>
                    <p className="text-sm text-slate-600">
                      Nosso sistema vai processar seu conteúdo, gerar narração com IA 
                      e criar um vídeo profissional em poucos minutos.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Vídeo
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
