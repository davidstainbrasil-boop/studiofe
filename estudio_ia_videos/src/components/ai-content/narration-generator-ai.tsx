'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle,
  FileText,
  Mic,
  Volume2,
  Settings,
  ChevronDown,
  Zap,
  BookOpen,
  Target,
  Users,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NarrationGeneratorProps {
  slideContent: {
    title: string;
    bulletPoints: string[];
    images?: string[];
  };
  nrCode?: string;
  targetAudience?: 'beginner' | 'intermediate' | 'advanced';
  maxDuration?: number; // in seconds
  onGenerate?: (narration: string) => void;
  onApply?: (narration: string) => void;
  className?: string;
}

type ToneOption = 'professional' | 'friendly' | 'formal' | 'educational';
type LengthOption = 'concise' | 'standard' | 'detailed';

const toneOptions: { id: ToneOption; label: string; description: string }[] = [
  { id: 'professional', label: 'Profissional', description: 'Tom objetivo e técnico' },
  { id: 'friendly', label: 'Amigável', description: 'Tom acolhedor e didático' },
  { id: 'formal', label: 'Formal', description: 'Tom institucional e sério' },
  { id: 'educational', label: 'Educacional', description: 'Tom explicativo e paciente' },
];

const lengthOptions: { id: LengthOption; label: string; duration: string }[] = [
  { id: 'concise', label: 'Conciso', duration: '30-45s' },
  { id: 'standard', label: 'Padrão', duration: '45-60s' },
  { id: 'detailed', label: 'Detalhado', duration: '60-90s' },
];

export function NarrationGeneratorAI({
  slideContent,
  nrCode,
  targetAudience = 'intermediate',
  maxDuration,
  onGenerate,
  onApply,
  className,
}: NarrationGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [narration, setNarration] = useState<string>('');
  const [tone, setTone] = useState<ToneOption>('professional');
  const [length, setLength] = useState<LengthOption>('standard');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate word count and duration
  useEffect(() => {
    const words = narration.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
    // Average speaking rate: 150 words per minute
    setEstimatedDuration(Math.round((words / 150) * 60));
  }, [narration]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setFeedback(null);

    try {
      // Simulated API call - in production, this would call an AI service
      const response = await fetch('/api/ai/generate-narration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: slideContent,
          nrCode,
          tone,
          length,
          targetAudience,
          maxDuration,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar narração');
      }

      const data = await response.json();
      setNarration(data.narration);
      onGenerate?.(data.narration);
    } catch (err) {
      // Fallback to mock generation for demo
      const mockNarration = generateMockNarration(slideContent, nrCode, tone, length);
      setNarration(mockNarration);
      onGenerate?.(mockNarration);
    } finally {
      setIsGenerating(false);
    }
  }, [slideContent, nrCode, tone, length, targetAudience, maxDuration, onGenerate]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(narration);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [narration]);

  const handleApply = useCallback(() => {
    onApply?.(narration);
  }, [narration, onApply]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className={cn('flex flex-col bg-zinc-900 text-white rounded-2xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Gerador de Narração com IA</h2>
            <p className="text-sm text-zinc-400">
              Gere narração automática para seus slides
            </p>
          </div>
        </div>

        {/* Slide Preview */}
        <div className="p-4 bg-zinc-800 rounded-xl">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-2">{slideContent.title}</h3>
              <ul className="space-y-1">
                {slideContent.bulletPoints.slice(0, 3).map((point, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                    <span className="text-zinc-600">•</span>
                    <span className="line-clamp-1">{point}</span>
                  </li>
                ))}
                {slideContent.bulletPoints.length > 3 && (
                  <li className="text-xs text-zinc-500">
                    +{slideContent.bulletPoints.length - 3} mais pontos
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-b border-zinc-800">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center justify-between w-full text-sm"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-400" />
            <span>Configurações de Geração</span>
          </div>
          <ChevronDown className={cn(
            'h-4 w-4 text-zinc-400 transition-transform',
            showSettings && 'rotate-180'
          )} />
        </button>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                {/* Tone Selection */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Tom da Narração</label>
                  <div className="grid grid-cols-2 gap-2">
                    {toneOptions.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setTone(option.id)}
                        className={cn(
                          'p-3 rounded-lg text-left transition-colors',
                          tone === option.id
                            ? 'bg-purple-500/20 border-2 border-purple-500'
                            : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-600'
                        )}
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-zinc-400">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length Selection */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Duração</label>
                  <div className="flex gap-2">
                    {lengthOptions.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setLength(option.id)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg text-sm transition-colors',
                          length === option.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        )}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs opacity-70">{option.duration}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context Info */}
                <div className="flex gap-4 text-sm text-zinc-500">
                  {nrCode && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {nrCode}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {targetAudience === 'beginner' ? 'Iniciante' : 
                     targetAudience === 'intermediate' ? 'Intermediário' : 'Avançado'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate Button */}
      {!narration && (
        <div className="p-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl
                       font-semibold hover:opacity-90 transition-opacity disabled:opacity-50
                       flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando narração...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Gerar Narração com IA
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Processamento rápido
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Otimizado para treinamentos
            </div>
          </div>
        </div>
      )}

      {/* Generated Narration */}
      {narration && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full">
                <FileText className="h-4 w-4 text-zinc-400" />
                <span>{wordCount} palavras</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full">
                <Clock className="h-4 w-4 text-zinc-400" />
                <span>~{estimatedDuration}s</span>
              </div>
            </div>

            {/* Narration Text */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full h-48 p-4 bg-zinc-800 border border-zinc-700 rounded-xl
                           text-sm resize-none focus:outline-none focus:border-purple-500"
                placeholder="A narração gerada aparecerá aqui..."
              />
              
              {/* Feedback */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    feedback === 'up'
                      ? 'bg-green-500/20 text-green-400'
                      : 'hover:bg-zinc-700 text-zinc-400'
                  )}
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    feedback === 'down'
                      ? 'bg-red-500/20 text-red-400'
                      : 'hover:bg-zinc-700 text-zinc-400'
                  )}
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300">
                  Dica: Você pode editar o texto gerado antes de aplicar. 
                  Ajuste o tom e a linguagem conforme necessário.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg
                         hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
              Regenerar
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg
                         hover:bg-zinc-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </button>
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-2 py-2 
                         bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg
                         font-semibold hover:opacity-90 transition-opacity"
            >
              <Volume2 className="h-4 w-4" />
              Aplicar ao Slide
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock generation for demo purposes
function generateMockNarration(
  content: { title: string; bulletPoints: string[] },
  nrCode?: string,
  tone: ToneOption = 'professional',
  length: LengthOption = 'standard'
): string {
  const intro = tone === 'friendly' 
    ? `Olá! Vamos falar sobre ${content.title}.`
    : tone === 'formal'
    ? `Apresentamos a seguir o conteúdo sobre ${content.title}.`
    : `Neste módulo, abordaremos ${content.title}.`;

  const nrIntro = nrCode 
    ? `Este conteúdo está de acordo com a ${nrCode}, norma regulamentadora que estabelece requisitos essenciais para a segurança no trabalho.`
    : '';

  const points = content.bulletPoints
    .slice(0, length === 'concise' ? 2 : length === 'standard' ? 3 : content.bulletPoints.length)
    .map((point, i) => {
      if (tone === 'educational') {
        return `É importante entender que ${point.toLowerCase()}`;
      }
      return i === 0 ? `Primeiramente, ${point.toLowerCase()}` : point;
    })
    .join('. ');

  const conclusion = tone === 'friendly'
    ? 'Lembre-se: sua segurança é prioridade!'
    : 'Estes são os pontos fundamentais para garantir a segurança no ambiente de trabalho.';

  return `${intro} ${nrIntro} ${points}. ${conclusion}`;
}

export default NarrationGeneratorAI;
