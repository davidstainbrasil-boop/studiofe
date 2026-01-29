import { useState, useCallback } from 'react';

export interface ImportStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export interface ImportSlide {
  slideNumber: number;
  title: string;
  thumbnailUrl: string;
  duration: number;
  selected: boolean;
}

export interface ImportConfig {
  slideDuration: number;
  transition: string;
  addAudio: boolean;
}

export interface ImportResult {
  success: boolean;
  projectId?: string;
  clipsCreated?: number;
}

export function usePPTXImport() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  
  const [steps, setSteps] = useState<ImportStep[]>([
    { id: 1, title: 'Upload', description: 'Envie seu arquivo PPTX', status: 'active' },
    { id: 2, title: 'Análise', description: 'Processando slides', status: 'pending' },
    { id: 3, title: 'Configuração', description: 'Ajuste os detalhes', status: 'pending' },
    { id: 4, title: 'Conversão', description: 'Gerando timeline', status: 'pending' },
    { id: 5, title: 'Conclusão', description: 'Pronto para editar', status: 'pending' },
  ]);

  const [slides, setSlides] = useState<ImportSlide[]>([]);
  
  const [config, setConfig] = useState<ImportConfig>({
    slideDuration: 5,
    transition: 'fade',
    addAudio: false,
  });

  const [error, setError] = useState<string | null>(null);

  const updateStepStatus = (index: number, status: ImportStep['status']) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, status } : step));
  };

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      updateStepStatus(currentStep, 'completed');
      updateStepStatus(currentStep + 1, 'active');
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      updateStepStatus(currentStep, 'pending');
      updateStepStatus(currentStep - 1, 'active');
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const analyzeSlides = useCallback(async () => {
    setIsProcessing(true);
    updateStepStatus(1, 'completed');
    updateStepStatus(2, 'active');
    setCurrentStep(2);
    setIsProcessing(false);
  }, []);

  const updateConfig = useCallback((updates: Partial<ImportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleSlideSelection = useCallback((slideNumber: number) => {
    setSlides(prev => prev.map(s => 
      s.slideNumber === slideNumber ? { ...s, selected: !s.selected } : s
    ));
  }, []);

  const updateSlideDuration = useCallback((slideNumber: number, duration: number) => {
    setSlides(prev => prev.map(s => 
      s.slideNumber === slideNumber ? { ...s, duration } : s
    ));
  }, []);

  const convertToTimeline = useCallback(async (): Promise<ImportResult> => {
    setIsProcessing(true);
    try {
      updateStepStatus(3, 'completed');
      updateStepStatus(4, 'active');
      setCurrentStep(4);
      
      const result: ImportResult = {
        success: true,
        projectId: 'generated-project-id',
        clipsCreated: slides.filter(s => s.selected).length
      };
      setResult(result);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [slides]);

  const uploadPPTX = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null); // Clear previous errors
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const settings = {
          slideDuration: config.slideDuration,
          addAudio: config.addAudio
      };
      formData.append('settings', JSON.stringify(settings));

      const res = await fetch('/api/pptx', { 
          method: 'POST', 
          body: formData,
      });
      
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Falha no upload');
      }

      const data = await res.json();
      
      updateStepStatus(0, 'completed');
      updateStepStatus(1, 'active');
      setCurrentStep(1);
      
      if (data.slides) {
          setSlides(data.slides);
      }
      
      return { id: data.projectId };
    } catch (err) {
      updateStepStatus(0, 'error');
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setError(msg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [config]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setSteps(prev => prev.map((s, i) => ({
      ...s,
      status: i === 0 ? 'active' : 'pending'
    })));
    setSlides([]);
    setResult(null);
    setError(null);
    setConfig({
      slideDuration: 5,
      transition: 'fade',
      addAudio: false,
    });
  }, []);

  return {
    steps,
    currentStep,
    slides,
    config,
    isProcessing,
    result,
    error, // Exposed error
    nextStep,
    prevStep,
    uploadPPTX,
    analyzeSlides,
    updateConfig,
    toggleSlideSelection,
    updateSlideDuration,
    convertToTimeline,
    reset,
  };
}
