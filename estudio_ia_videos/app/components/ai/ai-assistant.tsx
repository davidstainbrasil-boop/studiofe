

/**
 * 🤖 IA Assistant - Assistente Inteligente Contextual
 * ChatGPT-like interface integrada ao sistema
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Send,
  Mic,
  MicOff,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Zap,
  BookOpen,
  Shield,
  Video,
  Users,
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    topic: string;
    nr?: string;
    confidence: number;
    suggestions?: string[];
  };
  feedback?: 'positive' | 'negative';
  actions?: ChatAction[];
}

interface ChatAction {
  id: string;
  label: string;
  type: 'template' | 'edit' | 'export' | 'learn';
  icon: React.ComponentType<{ className?: string }>;
}

interface AICapability {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string[];
  category: 'creation' | 'analysis' | 'optimization' | 'compliance';
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const aiCapabilities: AICapability[] = [
    {
      id: 'nr-specialist',
      name: 'Especialista em NRs',
      description: 'Conhecimento profundo em Normas Regulamentadoras brasileiras',
      icon: Shield,
      category: 'compliance',
      examples: [
        'Quais são os requisitos da NR-12 para proteção de máquinas?',
        'Como implementar um programa de LTCAT conforme NR-15?',
        'Diferenças entre NR-06 e NR-35 para EPIs em altura'
      ]
    },
    {
      id: 'video-creator',
      name: 'Criador de Vídeos',
      description: 'Assistente especializado em criação de conteúdo audiovisual',
      icon: Video,
      category: 'creation',
      examples: [
        'Crie um roteiro para treinamento de NR-10',
        'Sugira animações para explicar uso de EPIs',
        'Como estruturar um vídeo de 10 minutos sobre primeiros socorros?'
      ]
    },
    {
      id: 'content-optimizer',
      name: 'Otimizador de Conteúdo',
      description: 'Melhora e personaliza conteúdo para diferentes públicos',
      icon: TrendingUp,
      category: 'optimization',
      examples: [
        'Adapte este conteúdo para operadores de máquinas',
        'Torne esta explicação mais didática para iniciantes',
        'Otimize este texto para melhor retenção'
      ]
    },
    {
      id: 'compliance-auditor',
      name: 'Auditor de Compliance',
      description: 'Verifica conformidade e sugere melhorias regulamentares',
      icon: CheckCircle,
      category: 'compliance',
      examples: [
        'Analise este treinamento para compliance MTE',
        'Verifique se atende aos requisitos da NR-01',
        'Sugira melhorias para auditoria fiscal'
      ]
    },
    {
      id: 'learning-designer',
      name: 'Designer Instrucional',
      description: 'Projeta experiências de aprendizagem eficazes',
      icon: BookOpen,
      category: 'creation',
      examples: [
        'Crie um quiz interativo sobre segurança elétrica',
        'Estruture um curso progressivo de 40 horas',
        'Desenvolva casos práticos para consolidação'
      ]
    },
    {
      id: 'data-analyst',
      name: 'Analista de Dados',
      description: 'Interpreta métricas e sugere otimizações baseadas em dados',
      icon: Target,
      category: 'analysis',
      examples: [
        'Analise as métricas de engajamento do último curso',
        'Identifique pontos de maior abandono nos vídeos',
        'Sugira melhorias baseadas no feedback dos usuários'
      ]
    }
  ];

  useEffect(() => {
    // Mensagem de boas-vindas
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: 'Olá! Sou seu assistente especializado em segurança do trabalho e criação de vídeos educacionais. Posso ajudar com:\n\n• Interpretação de Normas Regulamentadoras\n• Criação de roteiros e conteúdos\n• Otimização de treinamentos\n• Verificação de compliance\n• Análise de performance\n\nComo posso ajudá-lo hoje?',
        timestamp: new Date(),
        context: {
          topic: 'welcome',
          confidence: 100,
          suggestions: [
            'Crie um roteiro para NR-35',
            'Analise compliance do meu projeto',
            'Otimize este conteúdo para mobile',
            'Explique a NR-12 de forma simples'
          ]
        },
        actions: [
          { id: 'templates', label: 'Ver Templates', type: 'template', icon: Video },
          { id: 'compliance', label: 'Check Compliance', type: 'edit', icon: Shield },
          { id: 'learn', label: 'Aprender NRs', type: 'learn', icon: BookOpen }
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  useEffect(() => {
    // Auto-scroll para última mensagem
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simular resposta da IA
    setTimeout(() => {
      const assistantResponse = generateAIResponse(inputMessage);
      setMessages(prev => [...prev, assistantResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const generateAIResponse = (userInput: string): ChatMessage => {
    // Lógica simplificada de resposta baseada em palavras-chave
    const input = userInput.toLowerCase();
    
    let response = '';
    let context: { confidence: number; relatedTopics?: string[] } = { confidence: 85 };
    let actions: ChatAction[] = [];

    if (input.includes('nr-12') || input.includes('máquina')) {
      response = `📋 **NR-12 - Segurança em Máquinas e Equipamentos**

A NR-12 estabelece referências técnicas, princípios fundamentais e medidas de proteção para garantir a saúde e a integridade física dos trabalhadores.

**Principais Requisitos:**
• Arranjo físico e instalações adequadas
• Dispositivos de proteção (fixas e móveis)
• Sistemas de segurança e comandos
• Procedimentos de trabalho e manutenção

**Para seu vídeo, recomendo:**
• Demonstrações práticas com máquinas reais
• Casos de acidentes (anonimizados)
• Quiz interativo sobre dispositivos de proteção
• Certificação ao final

Posso criar um roteiro detalhado para seu treinamento?`;

      context = {
        topic: 'NR-12',
        nr: 'NR-12',
        confidence: 95,
        suggestions: ['Crie roteiro NR-12', 'Templates de máquinas', 'Casos práticos']
      };

      actions = [
        { id: 'create-script', label: 'Criar Roteiro', type: 'template', icon: Video },
        { id: 'machine-templates', label: 'Templates Máquinas', type: 'template', icon: Settings },
        { id: 'compliance-check', label: 'Check Compliance', type: 'edit', icon: Shield }
      ];

    } else if (input.includes('nr-10') || input.includes('elétric')) {
      response = `⚡ **NR-10 - Segurança em Instalações e Serviços em Eletricidade**

A NR-10 é fundamental para profissionais que trabalham com eletricidade, estabelecendo requisitos e condições mínimas.

**Pontos Críticos:**
• Análise de riscos elétricos
• Medidas de controle (EPC/EPI)
• Procedimentos de trabalho
• Capacitação e autorização

**Sugestões para seu treinamento:**
• Simulações de situações de risco
• Demonstração de EPIs específicos
• Procedimentos de desenergização
• Casos reais de acidentes elétricos

Quer que eu desenvolva um módulo específico?`;

      context = {
        topic: 'NR-10',
        nr: 'NR-10',
        confidence: 93,
        suggestions: ['Roteiro NR-10', 'Simulações elétricas', 'EPIs específicos']
      };

    } else if (input.includes('roteiro') || input.includes('script')) {
      response = `🎬 **Criação de Roteiro Especializado**

Para criar um roteiro eficaz, preciso entender:

1. **Público-alvo:** Operadores, supervisores, técnicos?
2. **Duração desejada:** 5, 10, 20 minutos?
3. **Tipo de conteúdo:** Teórico, prático, misto?
4. **NR específica:** Qual norma abordar?

**Estrutura recomendada:**
• Abertura atrativa (30s)
• Contextualização do risco (2-3min)
• Demonstrações práticas (60% do tempo)
• Exercícios/Quiz (15% do tempo)
• Fechamento e certificação (30s)

Me dê mais detalhes e criarei um roteiro personalizado!`;

      actions = [
        { id: 'script-wizard', label: 'Assistente de Roteiro', type: 'template', icon: Sparkles },
        { id: 'view-examples', label: 'Ver Exemplos', type: 'learn', icon: BookOpen }
      ];

    } else if (input.includes('compliance') || input.includes('auditoria')) {
      response = `🛡️ **Análise de Compliance Regulamentário**

Para garantir 100% de conformidade, verifico:

**Aspectos Obrigatórios:**
✅ Conteúdo atualizado conforme legislação
✅ Carga horária mínima atendida
✅ Registro de participantes
✅ Certificação válida
✅ Material didático aprovado

**Recomendações:**
• Mantenha logs de acesso detalhados
• Implemente avaliações periódicas
• Documente todas as atividades
• Prepare relatórios para fiscalização

Quer que eu analise um projeto específico?`;

      context = {
        topic: 'compliance',
        confidence: 98,
        suggestions: ['Analisar projeto atual', 'Gerar relatório', 'Check automático']
      };

    } else if (input.includes('mobile') || input.includes('responsiv')) {
      response = `📱 **Otimização para Mobile**

O Mobile Studio já está otimizado, mas posso sugerir melhorias:

**Boas Práticas Mobile:**
• Vídeos curtos (máx 5min por módulo)
• Interface touch-friendly
• Carregamento offline
• Controles simples
• Texto legível em telas pequenas

**Formatos Recomendados:**
• Resolução: 720p (equilíbrio qualidade/tamanho)
• Formato: MP4 H.264
• Taxa de bits adaptativa
• Subtítulos automáticos

Quer que eu otimize um projeto específico para mobile?`;

    } else {
      // Resposta genérica inteligente
      response = `🤔 Entendi sua questão sobre "${userInput}".

Como especialista em segurança do trabalho e criação de conteúdo, posso ajudar de várias formas:

**Áreas de Especialidade:**
• 📋 Normas Regulamentadoras (NR-01 a NR-37)
• 🎥 Criação de vídeos educacionais
• 🛡️ Compliance e auditoria
• 📊 Análise de performance
• 🎯 Otimização de conteúdo

**Exemplos do que posso fazer:**
"Crie um roteiro para NR-35"
"Analise o compliance deste projeto"
"Otimize este conteúdo para iniciantes"
"Sugira melhorias baseadas em dados"

Pode reformular sua pergunta ou escolher uma das opções acima?`;

      context = {
        topic: 'general',
        confidence: 70,
        suggestions: [
          'Crie um roteiro para NR-35',
          'Analise compliance do projeto',
          'Otimize conteúdo para iniciantes',
          'Sugira templates relevantes'
        ]
      };
    }

    return {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content: response,
      timestamp: new Date(),
      context,
      actions
    };
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    
    toast.success(
      feedback === 'positive' 
        ? 'Feedback positivo registrado!' 
        : 'Feedback negativo registrado. Vamos melhorar!'
    );
  };

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    if (!isListening) {
      toast.success('Ouvindo... Fale agora');
      // Aqui integraria com Web Speech API
    } else {
      toast('Gravação interrompida');
    }
  };

  const handleActionClick = (action: ChatAction) => {
    toast(`Executando: ${action.label}`);
    // Aqui integraria com as funcionalidades correspondentes
  };

  const handleCapabilitySelect = (capability: AICapability) => {
    setSelectedCapability(capability.id);
    const exampleMessage = capability.examples[Math.floor(Math.random() * capability.examples.length)];
    setInputMessage(exampleMessage);
    inputRef.current?.focus();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">IA Assistant</h1>
              <p className="text-sm text-gray-600">Especialista em Segurança do Trabalho</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Online
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                    
                    {/* Message Bubble */}
                    <div className={`rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-white border shadow-sm'
                    }`}>
                      
                      {/* Message Content */}
                      <div className="prose prose-sm max-w-none">
                        {message.content.split('\n').map((line, i) => (
                          <div key={i} className={message.type === 'user' ? 'text-white' : ''}>
                            {line || <br />}
                          </div>
                        ))}
                      </div>

                      {/* Context & Confidence */}
                      {message.context && message.type === 'assistant' && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              {message.context.nr && (
                                <Badge variant="outline">{message.context.nr}</Badge>
                              )}
                              <span className="text-gray-500">
                                {message.context.topic}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className="text-gray-600">
                                {message.context.confidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {message.actions.map((action) => (
                              <Button
                                key={action.id}
                                onClick={() => handleActionClick(action)}
                                size="sm"
                                variant="outline"
                                className="h-8"
                              >
                                <action.icon className="h-3 w-3 mr-1" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Meta */}
                    <div className={`flex items-center mt-2 space-x-2 text-xs text-gray-500 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <Clock className="h-3 w-3" />
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      
                      {/* Feedback Buttons (apenas para assistant) */}
                      {message.type === 'assistant' && (
                        <div className="flex items-center space-x-1 ml-3">
                          <Button
                            onClick={() => handleFeedback(message.id, 'positive')}
                            size="sm"
                            variant="ghost"
                            className={`h-6 w-6 p-0 ${
                              message.feedback === 'positive' ? 'text-green-600' : 'text-gray-400'
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleFeedback(message.id, 'negative')}
                            size="sm"
                            variant="ghost"
                            className={`h-6 w-6 p-0 ${
                              message.feedback === 'negative' ? 'text-red-600' : 'text-gray-400'
                            }`}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-400"
                            onClick={() => navigator.clipboard.writeText(message.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    {message.context?.suggestions && message.type === 'assistant' && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-2">Sugestões:</div>
                        <div className="flex flex-wrap gap-2">
                          {message.context.suggestions.map((suggestion, i) => (
                            <Button
                              key={i}
                              onClick={() => setInputMessage(suggestion)}
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs bg-gray-50 hover:bg-gray-100"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border shadow-sm rounded-lg p-4 max-w-xs">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">IA está pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={scrollRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-white p-4 flex-shrink-0">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Pergunte sobre NRs, criação de vídeos, compliance..."
                    className="flex-1 border-none p-0 focus-visible:ring-0"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button
                    onClick={handleVoiceToggle}
                    size="sm"
                    variant={isListening ? "default" : "ghost"}
                    className="p-2"
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar - AI Capabilities */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium mb-4">Especialidades da IA</h3>
            <div className="space-y-3">
              {aiCapabilities.map((capability) => (
                <Card
                  key={capability.id}
                  className={`cursor-pointer transition-all ${
                    selectedCapability === capability.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleCapabilitySelect(capability)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        capability.category === 'compliance' ? 'bg-green-100 text-green-600' :
                        capability.category === 'creation' ? 'bg-blue-100 text-blue-600' :
                        capability.category === 'analysis' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        <capability.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{capability.name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {capability.description}
                        </div>
                        <Badge 
                          variant="outline" 
                          className="mt-2 text-xs"
                        >
                          {capability.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

