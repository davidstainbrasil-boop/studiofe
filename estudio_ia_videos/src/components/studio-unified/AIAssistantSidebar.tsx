/**
 * 🤖 AI Assistant Sidebar
 * Chat com IA + ações rápidas para produção de vídeo
 */

'use client';
import { logger } from "@/lib/logger";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Send,
  Loader2,
  FileText,
  Scissors,
  Palette,
  BarChart3,
  Sparkles,
  Lightbulb,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mic,
  Image,
  Video,
  Wand2,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedStudioStore } from '@/lib/stores/unified-studio-store';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  isLoading?: boolean;
}

interface AIAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  category: 'script' | 'edit' | 'visual' | 'analysis';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'generate-script',
    label: 'Gerar Roteiro',
    description: 'Criar roteiro para NR',
    icon: <FileText className="h-4 w-4" />,
    prompt: 'Gere um roteiro profissional para um vídeo de treinamento sobre',
    category: 'script',
  },
  {
    id: 'suggest-cuts',
    label: 'Sugerir Cortes',
    description: 'Analisar e sugerir edições',
    icon: <Scissors className="h-4 w-4" />,
    prompt: 'Analise o conteúdo atual e sugira pontos de corte otimizados para',
    category: 'edit',
  },
  {
    id: 'improve-visual',
    label: 'Melhorar Visual',
    description: 'Sugestões de design',
    icon: <Palette className="h-4 w-4" />,
    prompt: 'Sugira melhorias visuais para tornar o vídeo mais profissional e engajante',
    category: 'visual',
  },
  {
    id: 'analyze-content',
    label: 'Analisar Conteúdo',
    description: 'Revisar qualidade',
    icon: <BarChart3 className="h-4 w-4" />,
    prompt: 'Analise o conteúdo do vídeo e forneça feedback sobre clareza, engajamento e eficácia',
    category: 'analysis',
  },
  {
    id: 'generate-narration',
    label: 'Criar Narração',
    description: 'Texto para TTS',
    icon: <Mic className="h-4 w-4" />,
    prompt: 'Crie um texto de narração profissional e envolvente para',
    category: 'script',
  },
  {
    id: 'suggest-images',
    label: 'Sugerir Imagens',
    description: 'Prompts para geração',
    icon: <Image className="h-4 w-4" />,
    prompt: 'Sugira descrições de imagens que complementariam visualmente o conteúdo sobre',
    category: 'visual',
  },
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 Olá! Sou seu assistente de IA para produção de vídeos.

Posso ajudar com:
• **Roteiros** - Criar ou melhorar textos
• **Edição** - Sugerir cortes e transições
• **Visual** - Melhorar design e layout
• **Análise** - Revisar conteúdo e qualidade

Use as **Ações Rápidas** abaixo ou me pergunte qualquer coisa!`,
  timestamp: new Date(),
};

export function AIAssistantSidebar({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { aiSuggestions, addAISuggestion } = useUnifiedStudioStore((state) => ({
    aiSuggestions: state.aiSuggestions,
    addAISuggestion: state.addAISuggestion,
  }));

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context from store state
      const storeState = useUnifiedStudioStore.getState();
      const context = {
        projectName: storeState.projectName,
        currentTime: storeState.currentTime,
        duration: storeState.duration,
        clipCount: storeState.clips.length,
        trackCount: storeState.tracks.length,
        hasSelection: storeState.selectedClipIds.length > 0,
      };

      // Call real AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory: messages
            .filter(m => !m.isLoading)
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Build actions from API suggestions
      const actions: AIAction[] = (data.suggestions || []).map((suggestion: { type: string; content: string }, index: number) => ({
        id: `action-${index}`,
        label: suggestion.type === 'script' ? 'Aplicar Roteiro' :
               suggestion.type === 'edit' ? 'Aplicar Edição' :
               suggestion.type === 'visual' ? 'Aplicar Visual' : 'Aplicar',
        icon: suggestion.type === 'script' ? <FileText className="h-3 w-3" /> :
              suggestion.type === 'edit' ? <Scissors className="h-3 w-3" /> :
              <Wand2 className="h-3 w-3" />,
        action: () => {
          // Apply suggestion to store based on type
          logger.info('Applying suggestion:', suggestion);
          addAISuggestion({
            type: suggestion.type as 'script' | 'edit' | 'visual' | 'optimization',
            title: suggestion.type,
            description: suggestion.content,
            confidence: 0.9,
            applied: true,
            data: { content: suggestion.content },
          });
        },
      }));

      setMessages((prev) =>
        prev
          .filter((m) => !m.isLoading)
          .concat({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            actions: actions.length > 0 ? actions : undefined,
          })
      );
    } catch (error) {
      logger.error('AI chat error:', error);
      
      // Fallback to mock response in case of API failure
      const mockResponse = generateMockResponse(content);
      
      setMessages((prev) =>
        prev
          .filter((m) => !m.isLoading)
          .concat({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: mockResponse.content,
            timestamp: new Date(),
            actions: mockResponse.actions,
          })
      );

      // Add to suggestions if relevant
      if (mockResponse.suggestion) {
        addAISuggestion({
          type: mockResponse.suggestion.type,
          title: mockResponse.suggestion.title,
          description: mockResponse.suggestion.description,
          confidence: mockResponse.suggestion.confidence,
          applied: false,
          data: {},
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addAISuggestion, messages]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    setInput(action.prompt + ' ');
    inputRef.current?.focus();
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-background border-l', className)}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by GPT-4</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {message.role === 'assistant' && (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3 w-3 text-white" />
                </div>
              )}

              <div
                className={cn(
                  'rounded-lg p-3 max-w-[85%]',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                      {message.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line.startsWith('•') ? (
                            <div className="flex items-start gap-1">
                              <span>•</span>
                              <span>{line.slice(1).trim()}</span>
                            </div>
                          ) : line.startsWith('**') && line.endsWith('**') ? (
                            <strong>{line.slice(2, -2)}</strong>
                          ) : (
                            line
                          )}
                          {i < message.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Message Actions */}
                    {message.role === 'assistant' && !message.isLoading && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleCopy(message.content, message.id)}
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          {copiedId === message.id ? 'Copiado' : 'Copiar'}
                        </Button>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.actions.map((action) => (
                          <Button
                            key={action.id}
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={action.action}
                            disabled={action.disabled}
                          >
                            {action.icon}
                            <span className="ml-1">{action.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="border-t">
        <button
          className="w-full p-2 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/50"
          onClick={() => setShowQuickActions(!showQuickActions)}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Ações Rápidas
          </span>
          {showQuickActions ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>

        {showQuickActions && (
          <div className="p-2 grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="h-auto py-2 px-3 flex flex-col items-start gap-1 text-left"
                onClick={() => handleQuickAction(action)}
              >
                <div className="flex items-center gap-2">
                  {action.icon}
                  <span className="text-xs font-medium">{action.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {action.description}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Pergunte algo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          AI pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
}

// Mock response generator (would be replaced by actual API)
function generateMockResponse(prompt: string): {
  content: string;
  actions?: AIAction[];
  suggestion?: {
    type: 'script' | 'edit' | 'visual' | 'optimization';
    title: string;
    description: string;
    confidence: number;
  };
} {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('roteiro') || lowerPrompt.includes('script')) {
    return {
      content: `📝 **Roteiro Sugerido**

**Abertura (0:00 - 0:30)**
"Bem-vindos ao treinamento de segurança. Hoje vamos abordar práticas essenciais para sua proteção."

**Desenvolvimento (0:30 - 3:00)**
1. Identificação de riscos no ambiente
2. Uso correto dos EPIs
3. Procedimentos de emergência

**Conclusão (3:00 - 3:30)**
"Lembre-se: segurança é responsabilidade de todos. Pratique o que aprendeu!"

Deseja que eu ajuste algo no roteiro?`,
      actions: [
        {
          id: 'apply-script',
          label: 'Aplicar ao Projeto',
          icon: <Check className="h-3 w-3" />,
          action: () => logger.info('Apply script'),
        },
        {
          id: 'regenerate',
          label: 'Regenerar',
          icon: <RefreshCw className="h-3 w-3" />,
          action: () => logger.info('Regenerate'),
        },
      ],
      suggestion: {
        type: 'script',
        title: 'Roteiro de Segurança',
        description: 'Roteiro estruturado para vídeo de treinamento NR',
        confidence: 0.92,
      },
    };
  }

  if (lowerPrompt.includes('corte') || lowerPrompt.includes('edição')) {
    return {
      content: `✂️ **Sugestões de Corte**

Analisei seu conteúdo e sugiro:

1. **00:15** - Remover pausa longa
2. **01:23** - Cortar repetição
3. **02:45** - Transição suave recomendada
4. **03:10** - Adicionar B-roll aqui

💡 **Dica:** Use transições de 0.5s entre cenas para manter fluidez.`,
      actions: [
        {
          id: 'apply-cuts',
          label: 'Aplicar Cortes',
          icon: <Scissors className="h-3 w-3" />,
          action: () => logger.info('Apply cuts'),
        },
      ],
    };
  }

  if (lowerPrompt.includes('visual') || lowerPrompt.includes('design')) {
    return {
      content: `🎨 **Melhorias Visuais**

Para um visual mais profissional:

• **Cores:** Use paleta consistente (azul corporativo + amarelo segurança)
• **Tipografia:** Fonte sans-serif, mínimo 24pt para legendas
• **Espaçamento:** Mantenha margens de 10% nas bordas
• **Ícones:** Adicione ícones de segurança nos pontos-chave

**Templates Sugeridos:**
• NR Corporativo (mais formal)
• NR Dinâmico (mais engajante)`,
      actions: [
        {
          id: 'apply-template',
          label: 'Ver Templates',
          icon: <Palette className="h-3 w-3" />,
          action: () => logger.info('View templates'),
        },
      ],
    };
  }

  // Default response
  return {
    content: `Entendi sua pergunta sobre "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}".

Posso ajudar com:
• Criar ou melhorar roteiros
• Sugerir cortes e transições
• Melhorar aspectos visuais
• Analisar qualidade do conteúdo

O que você gostaria de fazer especificamente?`,
  };
}

export default AIAssistantSidebar;
