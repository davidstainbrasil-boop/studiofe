'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Book,
  Video,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Play,
  FileText,
  Mic,
  Download,
  Settings,
  Shield,
  Zap,
  ExternalLink,
  Mail,
  MessageSquare,
  Clock,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  popular?: boolean;
}

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  readTime: string;
  href?: string;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail?: string;
  href?: string;
}

const FAQS: FAQ[] = [
  {
    id: 'import-pptx',
    question: 'Quais formatos de arquivo posso importar?',
    answer: 'O Estúdio IA suporta arquivos PowerPoint (.pptx e .ppt). O sistema extrai automaticamente textos, imagens, notas do apresentador e layout dos slides.',
    category: 'Importação',
    popular: true,
  },
  {
    id: 'voice-options',
    question: 'Quantas vozes estão disponíveis para narração?',
    answer: 'Oferecemos mais de 20 vozes diferentes em português brasileiro, incluindo vozes masculinas e femininas. Você pode ajustar velocidade, tom e pausas.',
    category: 'Narração',
    popular: true,
  },
  {
    id: 'export-formats',
    question: 'Em quais formatos posso exportar meu vídeo?',
    answer: 'O formato principal é MP4 (H.264). No plano Profissional, você também pode exportar em SCORM 1.2/2004 para integração com LMS.',
    category: 'Exportação',
    popular: true,
  },
  {
    id: 'video-duration',
    question: 'Qual é a duração máxima de um vídeo?',
    answer: 'Plano Starter: até 10 minutos por vídeo. Plano Profissional: até 30 minutos. Plano Empresarial: sem limite de duração.',
    category: 'Limites',
  },
  {
    id: 'nr-templates',
    question: 'O que são os templates NR?',
    answer: 'Templates NR são modelos pré-configurados baseados nas Normas Regulamentadoras do Ministério do Trabalho. Incluem estrutura de conteúdo, textos e imagens adaptáveis.',
    category: 'Templates',
    popular: true,
  },
  {
    id: 'branding',
    question: 'Posso adicionar minha logo e cores da empresa?',
    answer: 'Sim! Você pode personalizar logo, cores, fontes e até adicionar intro/outro padronizados. No plano Empresarial, também oferecemos white-label completo.',
    category: 'Personalização',
  },
  {
    id: 'collaboration',
    question: 'Posso compartilhar projetos com minha equipe?',
    answer: 'Sim, no plano Profissional você pode convidar até 3 membros. No plano Empresarial, não há limite de usuários e oferecemos gerenciamento de equipes.',
    category: 'Colaboração',
  },
  {
    id: 'render-time',
    question: 'Quanto tempo leva para renderizar um vídeo?',
    answer: 'O tempo de renderização depende da duração e complexidade do vídeo. Em média, um vídeo de 5 minutos leva cerca de 2-3 minutos para ser processado.',
    category: 'Performance',
  },
  {
    id: 'cancel-subscription',
    question: 'Como cancelo minha assinatura?',
    answer: 'Você pode cancelar a qualquer momento em Configurações > Assinatura > Gerenciar Plano. O acesso continua até o fim do período pago.',
    category: 'Pagamento',
  },
  {
    id: 'data-security',
    question: 'Meus dados estão seguros?',
    answer: 'Sim! Usamos criptografia de ponta a ponta, servidores seguros na AWS e seguimos a LGPD. Seus arquivos são armazenados de forma privada e nunca compartilhados.',
    category: 'Segurança',
  },
];

const ARTICLES: Article[] = [
  {
    id: 'getting-started',
    title: 'Primeiros Passos',
    description: 'Aprenda o básico do Estúdio IA em 5 minutos',
    category: 'Início',
    icon: Zap,
    readTime: '5 min',
  },
  {
    id: 'import-guide',
    title: 'Guia de Importação',
    description: 'Como preparar seu PPTX para melhores resultados',
    category: 'Importação',
    icon: FileText,
    readTime: '8 min',
  },
  {
    id: 'voice-setup',
    title: 'Configurando Narração',
    description: 'Escolha a voz perfeita e ajuste os parâmetros',
    category: 'Narração',
    icon: Mic,
    readTime: '6 min',
  },
  {
    id: 'timeline-mastery',
    title: 'Dominando a Timeline',
    description: 'Dicas avançadas de edição e transições',
    category: 'Edição',
    icon: Play,
    readTime: '10 min',
  },
  {
    id: 'export-options',
    title: 'Opções de Exportação',
    description: 'MP4, SCORM e outras configurações',
    category: 'Exportação',
    icon: Download,
    readTime: '7 min',
  },
  {
    id: 'account-settings',
    title: 'Configurações da Conta',
    description: 'Perfil, notificações e preferências',
    category: 'Conta',
    icon: Settings,
    readTime: '4 min',
  },
  {
    id: 'security-privacy',
    title: 'Segurança e Privacidade',
    description: 'Como protegemos seus dados',
    category: 'Segurança',
    icon: Shield,
    readTime: '5 min',
  },
];

const VIDEO_TUTORIALS: VideoTutorial[] = [
  {
    id: 'quick-start',
    title: 'Quick Start: Seu primeiro vídeo em 3 minutos',
    description: 'Tutorial rápido mostrando o fluxo completo',
    duration: '3:24',
  },
  {
    id: 'pptx-tips',
    title: 'Dicas para preparar seu PowerPoint',
    description: 'Boas práticas de formatação para melhor resultado',
    duration: '5:12',
  },
  {
    id: 'voice-advanced',
    title: 'Narração avançada com IA',
    description: 'Ajustes de velocidade, pausas e ênfase',
    duration: '7:45',
  },
  {
    id: 'timeline-edit',
    title: 'Edição na Timeline',
    description: 'Cortes, transições e sincronização',
    duration: '8:30',
  },
  {
    id: 'nr-templates',
    title: 'Usando Templates NR',
    description: 'Como personalizar templates de segurança',
    duration: '6:15',
  },
];

interface HelpCenterProps {
  className?: string;
  variant?: 'full' | 'modal' | 'sidebar';
}

export function HelpCenter({ className, variant = 'full' }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter FAQs based on search
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const query = searchQuery.toLowerCase();
    return FAQS.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter articles based on search
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return ARTICLES;
    const query = searchQuery.toLowerCase();
    return ARTICLES.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Popular FAQs
  const popularFAQs = FAQS.filter((faq) => faq.popular);

  // FAQ categories
  const faqCategories = [...new Set(FAQS.map((faq) => faq.category))];

  return (
    <div className={cn('max-w-6xl mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Central de Ajuda</h1>
        <p className="text-slate-600">
          Encontre respostas, tutoriais e suporte para o Estúdio IA
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl mx-auto mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar artigos, tutoriais e perguntas frequentes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-lg"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setSearchQuery('')}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Quick Links */}
      {!searchQuery && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickLink icon={Book} label="Guia de Início" href="#getting-started" />
          <QuickLink icon={Video} label="Vídeo Tutoriais" href="#tutorials" />
          <QuickLink icon={HelpCircle} label="FAQ" href="#faq" />
          <QuickLink icon={MessageCircle} label="Suporte" href="#contact" />
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <Book className="w-4 h-4" />
            Artigos
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Tutoriais
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6" id="faq">
          {/* Popular Questions */}
          {!searchQuery && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Perguntas Populares
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {popularFAQs.map((faq) => (
                  <Card key={faq.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">{faq.question}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2">{faq.answer}</p>
                      <Badge variant="secondary" className="mt-2">
                        {faq.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All FAQs */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Todas as Perguntas'}
            </h2>

            {/* Category filters */}
            {!searchQuery && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Todas
                </Button>
                {faqCategories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}

            <Accordion type="single" collapsible className="space-y-2">
              {filteredFAQs
                .filter((faq) => !selectedCategory || faq.category === selectedCategory)
                .map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                        <span>{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8 text-slate-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>

            {filteredFAQs.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma pergunta encontrada para "{searchQuery}"</p>
                <Button variant="link" onClick={() => setSearchQuery('')}>
                  Limpar busca
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-6" id="articles">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => {
              const Icon = article.icon;
              return (
                <Card
                  key={article.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                        <Icon className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{article.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {article.category}
                          </Badge>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.readTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{article.description}</p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-violet-600">
                      Ler artigo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Book className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum artigo encontrado para "{searchQuery}"</p>
              <Button variant="link" onClick={() => setSearchQuery('')}>
                Limpar busca
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Video Tutorials Tab */}
        <TabsContent value="videos" className="space-y-6" id="tutorials">
          <div className="grid gap-6 md:grid-cols-2">
            {VIDEO_TUTORIALS.map((video) => (
              <Card
                key={video.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="relative aspect-video bg-slate-900">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Play className="w-8 h-8 text-white fill-current" />
                    </div>
                  </div>
                  <Badge className="absolute bottom-2 right-2 bg-black/70">
                    {video.duration}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-1">{video.title}</h3>
                  <p className="text-sm text-slate-600">{video.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Section */}
      <div className="mt-12 border-t pt-8" id="contact">
        <h2 className="text-xl font-semibold text-center mb-6">
          Não encontrou o que procurava?
        </h2>
        <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Email</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Resposta em até 24 horas úteis
                </p>
                <Button variant="link" className="p-0 h-auto">
                  suporte@estudioiavideos.com.br
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Chat ao Vivo</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Disponível seg-sex, 9h-18h
                </p>
                <Button variant="link" className="p-0 h-auto text-green-600">
                  Iniciar conversa
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Quick Link component
function QuickLink({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
    >
      <Icon className="w-5 h-5 text-violet-600" />
      <span className="font-medium">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
    </a>
  );
}

// Floating Help Button
export function FloatingHelpButton({ onClick }: { onClick?: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-violet-600 text-white shadow-lg flex items-center justify-center hover:bg-violet-700 transition-colors z-50"
      aria-label="Abrir ajuda"
    >
      <HelpCircle className="w-6 h-6" />
    </motion.button>
  );
}
