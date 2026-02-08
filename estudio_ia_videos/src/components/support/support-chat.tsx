'use client';
import { logger } from '@/lib/logger';

/**
 * Support Chat Widget
 * 
 * Floating chat widget for user support with:
 * - Pre-defined quick responses
 * - Message history
 * - FAQ suggestions
 * - Contact form fallback
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  HelpCircle,
  Sparkles,
  Clock,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  buttons?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
}

interface QuickAction {
  id: string;
  label: string;
  response: string;
  followUp?: string[];
}

// Quick actions / FAQ
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'how-to-start',
    label: 'Como criar meu primeiro vídeo?',
    response: 'Para criar seu primeiro vídeo:\n\n1. Clique em "Novo Projeto" no dashboard\n2. Faça upload de um PPTX ou escreva seu roteiro\n3. Escolha uma voz e avatar\n4. Clique em "Exportar"\n\nSeu vídeo estará pronto em minutos!',
    followUp: ['Qual formato de arquivo?', 'Quanto tempo leva?'],
  },
  {
    id: 'supported-formats',
    label: 'Quais formatos são suportados?',
    response: 'Suportamos os seguintes formatos:\n\n📤 Import: PPTX, PDF, TXT, DOC/DOCX\n📥 Export: MP4 (HD/4K), SCORM 1.2/2004, Embed code\n\nO SCORM é ideal para integração com LMS como Moodle e Canvas.',
  },
  {
    id: 'render-time',
    label: 'Quanto tempo demora o render?',
    response: 'O tempo de renderização depende da duração do vídeo:\n\n⏱️ Vídeo de 5 min: ~2-3 minutos\n⏱️ Vídeo de 15 min: ~5-8 minutos\n⏱️ Vídeo de 30 min: ~10-15 minutos\n\nVocê pode acompanhar o progresso em tempo real!',
  },
  {
    id: 'pricing',
    label: 'Quais são os planos e preços?',
    response: 'Oferecemos planos para todos os tamanhos:\n\n🆓 Gratuito: 3 vídeos/mês\n💼 Starter (R$97): 10 vídeos/mês\n🏢 Profissional (R$297): 50 vídeos/mês\n🏭 Enterprise: Ilimitado\n\nTodos incluem narração IA e avatares!',
    followUp: ['Quero testar grátis', 'Falar com vendas'],
  },
  {
    id: 'nr-templates',
    label: 'Vocês têm templates de NR?',
    response: 'Sim! Temos templates prontos para as principais NRs:\n\n📋 NR-10 (Eletricidade)\n📋 NR-12 (Máquinas)\n📋 NR-35 (Trabalho em Altura)\n📋 NR-33 (Espaços Confinados)\n\nTodos já vêm com conteúdo de referência e podem ser customizados.',
  },
  {
    id: 'support-human',
    label: 'Preciso falar com um humano',
    response: 'Sem problemas! Nossa equipe está disponível:\n\n📧 Email: suporte@studiounified.com.br\n💬 WhatsApp: (11) 99999-9999\n⏰ Horário: Seg-Sex, 9h-18h\n\nOu preencha o formulário abaixo e retornaremos em até 2 horas úteis.',
  },
];

// Initial greeting
const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  type: 'bot',
  content: 'Olá! 👋 Sou o assistente do Studio Unified. Como posso ajudar você hoje?',
  timestamp: new Date(),
};

// Storage key
const STORAGE_KEY = 'studio-support-chat';

interface SupportChatProps {
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export function SupportChat({ position = 'bottom-right', className }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const restored = parsed.map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore errors
    }
  }, [messages]);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const handleQuickAction = useCallback((action: QuickAction) => {
    // Add user message
    addMessage({
      type: 'user',
      content: action.label,
    });

    // Simulate typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({
        type: 'bot',
        content: action.response,
        buttons: action.followUp?.map(label => ({
          label,
          action: label.toLowerCase().includes('grátis') ? 'trial' : 
                  label.toLowerCase().includes('vendas') ? 'sales' : 'faq',
        })),
      });
    }, 800 + Math.random() * 500);
  }, [addMessage]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const userInput = input.trim();
    setInput('');

    // Add user message
    addMessage({
      type: 'user',
      content: userInput,
    });

    // Find matching quick action or provide generic response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      // Simple keyword matching
      const lowerInput = userInput.toLowerCase();
      let matched = QUICK_ACTIONS.find(qa => 
        qa.label.toLowerCase().includes(lowerInput) ||
        lowerInput.includes(qa.id.replace('-', ' '))
      );

      if (lowerInput.includes('preço') || lowerInput.includes('plano') || lowerInput.includes('valor')) {
        matched = QUICK_ACTIONS.find(qa => qa.id === 'pricing');
      } else if (lowerInput.includes('nr') || lowerInput.includes('template')) {
        matched = QUICK_ACTIONS.find(qa => qa.id === 'nr-templates');
      } else if (lowerInput.includes('tempo') || lowerInput.includes('demora')) {
        matched = QUICK_ACTIONS.find(qa => qa.id === 'render-time');
      } else if (lowerInput.includes('formato') || lowerInput.includes('arquivo')) {
        matched = QUICK_ACTIONS.find(qa => qa.id === 'supported-formats');
      } else if (lowerInput.includes('humano') || lowerInput.includes('atendente') || lowerInput.includes('suporte')) {
        matched = QUICK_ACTIONS.find(qa => qa.id === 'support-human');
        setShowContactForm(true);
      }

      if (matched) {
        addMessage({
          type: 'bot',
          content: matched.response,
          buttons: matched.followUp?.map(label => ({
            label,
            action: 'faq',
          })),
        });
      } else {
        addMessage({
          type: 'bot',
          content: 'Não tenho certeza sobre isso. Posso te ajudar com:\n\n• Como criar vídeos\n• Formatos suportados\n• Preços e planos\n• Templates NR\n\nOu você pode falar com nossa equipe de suporte!',
          buttons: [
            { label: 'Falar com suporte', action: 'support' },
          ],
        });
        setShowContactForm(true);
      }
    }, 1000 + Math.random() * 500);
  }, [input, addMessage]);

  const handleButtonClick = useCallback((button: { label: string; action: string; url?: string }) => {
    if (button.url) {
      window.open(button.url, '_blank');
      return;
    }

    if (button.action === 'support' || button.action === 'sales') {
      setShowContactForm(true);
      addMessage({
        type: 'bot',
        content: 'Por favor, preencha o formulário abaixo e nossa equipe entrará em contato em breve!',
      });
      return;
    }

    if (button.action === 'trial') {
      window.location.href = '/register';
      return;
    }

    // Treat as a new question
    const action = QUICK_ACTIONS.find(qa => 
      qa.label.toLowerCase().includes(button.label.toLowerCase())
    );
    if (action) {
      handleQuickAction(action);
    }
  }, [addMessage, handleQuickAction]);

  const clearHistory = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setShowContactForm(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const positionClasses = position === 'bottom-right' 
    ? 'right-4 bottom-4' 
    : 'left-4 bottom-4';

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg flex items-center justify-center',
              'hover:shadow-xl transition-shadow',
              positionClasses,
              className
            )}
          >
            <MessageCircle className="w-6 h-6" />
            {/* Notification dot */}
            <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-50 w-[380px] h-[560px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700',
              positionClasses,
              className
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Suporte Studio</h3>
                  <div className="flex items-center gap-1 text-xs text-violet-200">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    Online agora
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearHistory}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-xs"
                  title="Limpar histórico"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'bot' && (
                    <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-violet-600" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      message.type === 'user'
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Buttons */}
                    {message.buttons && message.buttons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.buttons.map((btn, i) => (
                          <button
                            key={i}
                            onClick={() => handleButtonClick(btn)}
                            className="text-xs bg-white/90 dark:bg-slate-700 text-violet-600 dark:text-violet-400 px-3 py-1.5 rounded-full hover:bg-white dark:hover:bg-slate-600 transition-colors flex items-center gap-1"
                          >
                            {btn.label}
                            {btn.url && <ExternalLink className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && !showContactForm && (
              <div className="px-4 pb-2">
                <p className="text-xs text-slate-500 mb-2">Perguntas frequentes:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.slice(0, 3).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Form */}
            {showContactForm && (
              <ContactForm onClose={() => setShowContactForm(false)} />
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isTyping}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Contact Form Component
function ContactForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, send to /api/support/ticket
    logger.info('Support ticket:', formData);

    setIsSubmitting(false);
    setIsSubmitted(true);

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-900">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Mensagem enviada! Responderemos em breve.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Seu nome"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          className="text-sm"
        />
        <Input
          type="email"
          placeholder="Seu email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
          className="text-sm"
        />
        <textarea
          placeholder="Como podemos ajudar?"
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          required
          className="w-full text-sm border rounded-md p-2 resize-none h-20 bg-white dark:bg-slate-900"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="flex-1 bg-violet-600 hover:bg-violet-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Enviando
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SupportChat;
