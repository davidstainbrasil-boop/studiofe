/**
 * Onboarding Wizard Component
 * 4-step wizard para novos usuários
 * 
 * Steps:
 * 1. Boas-vindas + perfil básico
 * 2. Escolha do caso de uso
 * 3. Upload do primeiro PPTX
 * 4. Configuração de voz e conclusão
 * 
 * @module components/onboarding/OnboardingWizard
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface UserProfile {
  name: string;
  role: string;
  company: string;
  teamSize: string;
}

interface UseCase {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface VoiceConfig {
  voiceId: string;
  voiceName: string;
  speed: number;
}

interface OnboardingData {
  profile: UserProfile;
  useCase: string;
  projectId?: string;
  voiceConfig: VoiceConfig;
}

type OnboardingStep = 1 | 2 | 3 | 4;

// ============================================================================
// DATA
// ============================================================================

const useCases: UseCase[] = [
  {
    id: 'sst_training',
    title: 'Treinamentos de SST/NR',
    description: 'Vídeos de segurança do trabalho para compliance regulatório',
    icon: '🦺',
  },
  {
    id: 'corporate_training',
    title: 'Treinamento Corporativo',
    description: 'Capacitação de funcionários, onboarding, processos internos',
    icon: '🏢',
  },
  {
    id: 'elearning',
    title: 'Cursos Online (EAD)',
    description: 'Conteúdo educacional para plataformas de ensino',
    icon: '🎓',
  },
  {
    id: 'sales_marketing',
    title: 'Vendas e Marketing',
    description: 'Vídeos de produto, demonstrações, pitch de vendas',
    icon: '📈',
  },
  {
    id: 'other',
    title: 'Outro',
    description: 'Uso pessoal ou outro tipo de conteúdo',
    icon: '💡',
  },
];

const roles = [
  'Técnico de Segurança',
  'Consultor SST',
  'Coordenador de T&D',
  'Instrutor/Professor',
  'Gerente de RH',
  'Produtor de Conteúdo',
  'Outro',
];

const teamSizes = [
  'Só eu',
  '2-5 pessoas',
  '6-20 pessoas',
  '21-100 pessoas',
  'Mais de 100',
];

const voices = [
  { id: 'maria', name: 'Maria (Feminina, Profissional)', sample: '/voices/maria-sample.mp3' },
  { id: 'joao', name: 'João (Masculino, Autoritário)', sample: '/voices/joao-sample.mp3' },
  { id: 'ana', name: 'Ana (Feminina, Amigável)', sample: '/voices/ana-sample.mp3' },
  { id: 'pedro', name: 'Pedro (Masculino, Jovem)', sample: '/voices/pedro-sample.mp3' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">Passo {currentStep} de {totalSteps}</span>
        <span className="text-sm text-gray-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              index + 1 < currentStep
                ? 'bg-green-500 text-white'
                : index + 1 === currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {index + 1 < currentStep ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-1 mx-2 ${
                index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Step 1: Welcome & Profile
function Step1Welcome({
  profile,
  onUpdate,
  onNext,
}: {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<UserProfile>>({});

  const validate = () => {
    const newErrors: Partial<UserProfile> = {};
    if (!profile.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!profile.role) newErrors.role = 'Selecione sua função';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">👋</div>
        <h1 className="text-3xl font-bold text-gray-900">Bem-vindo ao TécnicoCursos!</h1>
        <p className="mt-2 text-gray-600">
          Vamos configurar sua conta em poucos passos
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Como você gostaria de ser chamado?
          </label>
          <input
            type="text"
            id="name"
            value={profile.name}
            onChange={(e) => onUpdate({ ...profile, name: e.target.value })}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="Seu nome"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Qual é sua função principal?
          </label>
          <select
            id="role"
            value={profile.role}
            onChange={(e) => onUpdate({ ...profile, role: e.target.value })}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.role ? 'border-red-500' : 'border-gray-300'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="">Selecione...</option>
            {roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role}</p>}
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            Empresa ou organização (opcional)
          </label>
          <input
            type="text"
            id="company"
            value={profile.company}
            onChange={(e) => onUpdate({ ...profile, company: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome da empresa"
          />
        </div>

        <div>
          <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">
            Tamanho da equipe que usará a plataforma
          </label>
          <select
            id="teamSize"
            value={profile.teamSize}
            onChange={(e) => onUpdate({ ...profile, teamSize: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {teamSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleNext}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

// Step 2: Use Case Selection
function Step2UseCase({
  selectedUseCase,
  onSelect,
  onNext,
  onBack,
}: {
  selectedUseCase: string;
  onSelect: (useCase: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">O que você vai criar?</h1>
        <p className="mt-2 text-gray-600">
          Isso nos ajuda a personalizar sua experiência
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {useCases.map((useCase) => (
          <button
            key={useCase.id}
            onClick={() => onSelect(useCase.id)}
            className={`p-6 text-left rounded-xl border-2 transition-all ${
              selectedUseCase === useCase.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-3">{useCase.icon}</div>
            <h3 className="font-semibold text-gray-900">{useCase.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{useCase.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!selectedUseCase}
          className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

// Step 3: Upload PPTX
function Step3Upload({
  onUploadComplete,
  onSkip,
  onBack,
}: {
  onUploadComplete: (projectId: string) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file
    if (!file.name.endsWith('.pptx')) {
      setError('Por favor, selecione um arquivo .pptx');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 50MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pptx/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Falha no upload');
      }

      const data = await response.json();
      
      setTimeout(() => {
        onUploadComplete(data.projectId);
      }, 500);
    } catch (err) {
      setError('Erro ao fazer upload. Tente novamente.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload do seu primeiro PPTX</h1>
        <p className="mt-2 text-gray-600">
          Arraste uma apresentação ou escolha um arquivo
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none' : ''}`}
      >
        {isUploading ? (
          <div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">Processando...</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">📤</div>
            <p className="text-gray-900 font-medium">Arraste seu arquivo PPTX aqui</p>
            <p className="text-gray-500 mt-1">ou</p>
            <label className="mt-4 inline-flex items-center px-6 py-3 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="text-gray-700 font-medium">Selecionar arquivo</span>
              <input
                type="file"
                accept=".pptx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <p className="mt-4 text-sm text-gray-500">
              Máximo 50MB • Apenas .pptx
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <button
          onClick={onBack}
          disabled={isUploading}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          onClick={onSkip}
          disabled={isUploading}
          className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Pular por agora
        </button>
      </div>
    </div>
  );
}

// Step 4: Voice Configuration & Completion
function Step4Voice({
  voiceConfig,
  onUpdate,
  onComplete,
  onBack,
}: {
  voiceConfig: VoiceConfig;
  onUpdate: (config: VoiceConfig) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const playVoiceSample = (voiceId: string, sampleUrl: string) => {
    // In production, this would play the actual audio sample
    setIsPlaying(voiceId);
    setTimeout(() => setIsPlaying(null), 2000);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🎙️</div>
        <h1 className="text-3xl font-bold text-gray-900">Escolha sua voz padrão</h1>
        <p className="mt-2 text-gray-600">
          Você pode alterar a qualquer momento em cada projeto
        </p>
      </div>

      <div className="space-y-3">
        {voices.map((voice) => (
          <div
            key={voice.id}
            onClick={() => onUpdate({ ...voiceConfig, voiceId: voice.id, voiceName: voice.name })}
            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
              voiceConfig.voiceId === voice.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  voiceConfig.voiceId === voice.id ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                {voiceConfig.voiceId === voice.id ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-gray-400">🎤</span>
                )}
              </div>
              <span className="font-medium text-gray-900">{voice.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                playVoiceSample(voice.id, voice.sample);
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              {isPlaying === voice.id ? (
                <svg className="w-6 h-6 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Velocidade da fala: {voiceConfig.speed}x
        </label>
        <input
          type="range"
          min="0.75"
          max="1.5"
          step="0.05"
          value={voiceConfig.speed}
          onChange={(e) => onUpdate({ ...voiceConfig, speed: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Mais lento</span>
          <span>Normal</span>
          <span>Mais rápido</span>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onComplete}
          className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Concluir Setup 🎉
        </button>
      </div>
    </div>
  );
}

// Completion Screen
function CompletionScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="text-8xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold text-gray-900">Tudo pronto!</h1>
      <p className="mt-4 text-gray-600 text-lg">
        Sua conta está configurada. Você está pronto para criar seu primeiro vídeo profissional.
      </p>

      <div className="mt-8 p-6 bg-blue-50 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-4">Próximos passos:</h3>
        <ul className="text-left space-y-3">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">1</span>
            <span className="text-gray-700">Faça upload de uma apresentação PPTX</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">2</span>
            <span className="text-gray-700">Configure a narração e avatar</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">3</span>
            <span className="text-gray-700">Gere e baixe seu vídeo em Full HD</span>
          </li>
        </ul>
      </div>

      <button
        onClick={onStart}
        className="mt-8 w-full py-4 px-6 bg-blue-600 text-white font-semibold text-lg rounded-lg hover:bg-blue-700 transition-colors"
      >
        Criar meu primeiro vídeo
        <svg className="inline-block ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isComplete, setIsComplete] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    profile: { name: '', role: '', company: '', teamSize: '' },
    useCase: '',
    voiceConfig: { voiceId: 'maria', voiceName: 'Maria (Feminina, Profissional)', speed: 1.0 },
  });

  const steps = ['Perfil', 'Uso', 'Upload', 'Voz'];

  const handleProfileUpdate = (profile: UserProfile) => {
    setData((prev) => ({ ...prev, profile }));
  };

  const handleUseCaseSelect = (useCase: string) => {
    setData((prev) => ({ ...prev, useCase }));
  };

  const handleUploadComplete = (projectId: string) => {
    setData((prev) => ({ ...prev, projectId }));
    setCurrentStep(4);
  };

  const handleVoiceUpdate = (voiceConfig: VoiceConfig) => {
    setData((prev) => ({ ...prev, voiceConfig }));
  };

  const handleComplete = async () => {
    try {
      // Save onboarding data
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      setIsComplete(true);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      setIsComplete(true); // Continue anyway
    }
  };

  const handleStart = () => {
    if (data.projectId) {
      router.push(`/editor/${data.projectId}`);
    } else {
      router.push('/dashboard');
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <CompletionScreen onStart={handleStart} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <ProgressBar currentStep={currentStep} totalSteps={4} />
        <StepIndicator steps={steps} currentStep={currentStep} />

        {currentStep === 1 && (
          <Step1Welcome
            profile={data.profile}
            onUpdate={handleProfileUpdate}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2UseCase
            selectedUseCase={data.useCase}
            onSelect={handleUseCaseSelect}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3Upload
            onUploadComplete={handleUploadComplete}
            onSkip={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <Step4Voice
            voiceConfig={data.voiceConfig}
            onUpdate={handleVoiceUpdate}
            onComplete={handleComplete}
            onBack={() => setCurrentStep(3)}
          />
        )}
      </div>
    </div>
  );
}
