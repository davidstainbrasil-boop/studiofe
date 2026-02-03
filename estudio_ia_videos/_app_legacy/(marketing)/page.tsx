'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Play,
  CheckCircle,
  Upload,
  Mic,
  Video,
  Sparkles,
  Shield,
  Clock,
  Users,
  Zap,
  Star,
  ChevronDown,
  Menu,
  X,
  FileText,
  Wand2,
  Globe,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// =============================================================================
// Types
// =============================================================================

interface PricingPlan {
  name: string
  price: number
  yearlyPrice: number
  description: string
  features: string[]
  popular?: boolean
  cta: string
}

interface Testimonial {
  name: string
  role: string
  company: string
  content: string
  avatar: string
  rating: number
}

interface FAQ {
  question: string
  answer: string
}

// =============================================================================
// Data
// =============================================================================

const FEATURES = [
  {
    icon: Upload,
    title: 'Upload PPTX → Vídeo',
    description: 'Suba sua apresentação PowerPoint e transforme em vídeo profissional automaticamente.',
  },
  {
    icon: Mic,
    title: 'Narração com IA',
    description: 'Vozes naturais em português brasileiro. Escolha entre 10+ vozes premium.',
  },
  {
    icon: Sparkles,
    title: 'Avatar IA com Lip-Sync',
    description: 'Apresentador virtual que fala sincronizado com a narração. Sem estúdio.',
  },
  {
    icon: FileText,
    title: 'Templates NR Prontos',
    description: '38 templates de Normas Regulamentadoras prontos para usar. NR-1, NR-35, NR-10...',
  },
  {
    icon: Wand2,
    title: 'Edição Simplificada',
    description: 'Timeline intuitiva, drag-and-drop. Zero conhecimento técnico necessário.',
  },
  {
    icon: Clock,
    title: 'Pronto em Minutos',
    description: 'O que levaria semanas com produtora, você faz em 10 minutos.',
  },
]

const PLANS: PricingPlan[] = [
  {
    name: 'Gratuito',
    price: 0,
    yearlyPrice: 0,
    description: 'Perfeito para testar a plataforma',
    features: [
      '1 vídeo por mês',
      'Resolução 720p',
      '5 templates NR básicos',
      '2 vozes TTS',
      'Marca d\'água',
      'Suporte comunidade',
    ],
    cta: 'Começar grátis',
  },
  {
    name: 'Pro',
    price: 97,
    yearlyPrice: 930,
    description: 'Para técnicos e consultores',
    features: [
      '10 vídeos por mês',
      'Resolução Full HD 1080p',
      'Todos os 38 templates NR',
      '10 vozes TTS premium',
      'Avatar IA com lip-sync',
      'Sem marca d\'água',
      'Export SCORM para LMS',
      'Suporte por email',
    ],
    popular: true,
    cta: 'Assinar Pro',
  },
  {
    name: 'Business',
    price: 297,
    yearlyPrice: 2850,
    description: 'Para empresas e equipes',
    features: [
      'Vídeos ilimitados',
      'Resolução até 4K',
      'Templates customizados',
      'Todas as vozes + clonagem',
      'Avatar IA avançado',
      'White-label completo',
      'Acesso à API',
      'Multi-usuário',
      'Suporte prioritário 24/7',
    ],
    cta: 'Falar com vendas',
  },
]

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Carlos Silva',
    role: 'Técnico de Segurança',
    company: 'MetalSul Indústria',
    content: 'Antes eu levava 2 semanas para produzir um vídeo de treinamento. Agora faço em 15 minutos. Economizei R$ 50.000 só esse ano!',
    avatar: '/avatars/carlos.jpg',
    rating: 5,
  },
  {
    name: 'Ana Paula Costa',
    role: 'Consultora SST',
    company: 'SafeWork Consultoria',
    content: 'Atendo 50 clientes e consigo entregar vídeos personalizados para cada um. O ROI foi absurdo.',
    avatar: '/avatars/ana.jpg',
    rating: 5,
  },
  {
    name: 'Roberto Mendes',
    role: 'Coordenador de T&D',
    company: 'Logística Express',
    content: 'Os treinamentos de NR ficaram muito mais engajantes. A taxa de conclusão subiu de 45% para 89%.',
    avatar: '/avatars/roberto.jpg',
    rating: 5,
  },
]

const FAQS: FAQ[] = [
  {
    question: 'Quanto tempo leva para criar um vídeo?',
    answer: 'Em média, 10-15 minutos para um vídeo de 5 minutos. O upload do PPTX leva segundos, a geração de narração cerca de 30 segundos, e a renderização final de 2-3 minutos.',
  },
  {
    question: 'A narração em português é natural?',
    answer: 'Sim! Usamos a tecnologia mais avançada de TTS (Text-to-Speech) com vozes nativas em português brasileiro. São 10+ vozes diferentes, todas com sotaque natural e entonação realista.',
  },
  {
    question: 'Posso cancelar a assinatura a qualquer momento?',
    answer: 'Sim, você pode cancelar a qualquer momento sem multas. Você mantém acesso até o fim do período pago.',
  },
  {
    question: 'Os vídeos servem para eSocial?',
    answer: 'Sim! Os vídeos gerados são evidências válidas de capacitação. Você pode exportar certificados de conclusão e relatórios para comprovação.',
  },
  {
    question: 'Funciona com qualquer PPTX?',
    answer: 'Sim, suportamos PowerPoint 2013 em diante. O layout, cores, fontes e imagens são preservados. Animações básicas também são convertidas.',
  },
  {
    question: 'Vocês têm API para integração?',
    answer: 'Sim, no plano Business você tem acesso completo à nossa API REST para integrar com seu LMS, ERP ou sistema interno.',
  },
]

const STATS = [
  { value: '10.000+', label: 'Vídeos criados' },
  { value: '500+', label: 'Empresas ativas' },
  { value: '4.9/5', label: 'Avaliação média' },
  { value: '98%', label: 'Satisfação' },
]

// =============================================================================
// Components
// =============================================================================

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">Estúdio IA</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm hover:text-violet-600 transition-colors">
              Recursos
            </a>
            <a href="#pricing" className="text-sm hover:text-violet-600 transition-colors">
              Preços
            </a>
            <a href="#testimonials" className="text-sm hover:text-violet-600 transition-colors">
              Depoimentos
            </a>
            <a href="#faq" className="text-sm hover:text-violet-600 transition-colors">
              FAQ
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pb-4 border-t"
            >
              <div className="flex flex-col gap-4 pt-4">
                <a href="#features" className="text-sm" onClick={() => setMobileMenuOpen(false)}>
                  Recursos
                </a>
                <a href="#pricing" className="text-sm" onClick={() => setMobileMenuOpen(false)}>
                  Preços
                </a>
                <a href="#testimonials" className="text-sm" onClick={() => setMobileMenuOpen(false)}>
                  Depoimentos
                </a>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Entrar</Button>
                </Link>
                <Link href="/register">
                  <Button className="w-full">Começar grátis</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-100/50 to-transparent" />
      
      {/* Floating elements */}
      <motion.div
        className="absolute top-1/4 left-10 w-20 h-20 bg-violet-200 rounded-full blur-3xl"
        animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 5 }}
      />
      <motion.div
        className="absolute bottom-1/4 right-20 w-32 h-32 bg-purple-200 rounded-full blur-3xl"
        animate={{ y: [0, -20, 0], scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 7 }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-violet-100 text-violet-700 hover:bg-violet-100">
              <Sparkles className="w-3 h-3 mr-1" />
              Novo: Avatar IA com Lip-Sync
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Do PowerPoint ao{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">
                Vídeo Profissional
              </span>{' '}
              em 10 Minutos
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              Transforme suas apresentações PPTX em vídeos de treinamento com narração IA, 
              avatares e templates NR prontos. Sem estúdio. Sem editor de vídeo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-lg px-8"
                >
                  Criar meu primeiro vídeo grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg">
                <Play className="mr-2 h-5 w-5" />
                Ver demonstração
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Setup em 2 minutos</span>
              </div>
            </div>
          </motion.div>

          {/* Right - Video Demo */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-white">
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="h-8 w-8 text-white ml-1" />
                  </motion.div>
                  <p className="text-white/80 text-sm">Ver como funciona</p>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              className="absolute -left-4 top-1/4 bg-white rounded-lg shadow-lg p-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold">Vídeo pronto!</p>
                  <p className="text-muted-foreground text-xs">Em 12 minutos</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -right-4 bottom-1/4 bg-white rounded-lg shadow-lg p-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                  <Award className="h-4 w-4 text-violet-600" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold">NR-35 Completo</p>
                  <p className="text-muted-foreground text-xs">Template usado</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {STATS.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-violet-600">{stat.value}</div>
              <div className="text-muted-foreground text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4">Recursos</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo que você precisa para criar vídeos incríveis
          </h2>
          <p className="text-muted-foreground text-lg">
            Ferramentas profissionais com a simplicidade que você merece
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-2xl border bg-white hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-violet-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Suba seu PPTX',
      description: 'Arraste sua apresentação PowerPoint. Layout, cores e imagens são preservados.',
      icon: Upload,
    },
    {
      number: '02',
      title: 'Escolha a voz',
      description: 'Selecione entre 10+ vozes naturais em português. O texto é extraído automaticamente.',
      icon: Mic,
    },
    {
      number: '03',
      title: 'Personalize',
      description: 'Adicione avatar, ajuste timings, escolha transições. Tudo visual e intuitivo.',
      icon: Wand2,
    },
    {
      number: '04',
      title: 'Exporte',
      description: 'Clique em renderizar e baixe seu vídeo profissional em minutos.',
      icon: Video,
    },
  ]

  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4">Como Funciona</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            4 passos para seu vídeo profissional
          </h2>
          <p className="text-muted-foreground text-lg">
            Simples assim. Sem curva de aprendizado.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-violet-300 to-transparent" />
              )}
              
              <div className="relative bg-white rounded-2xl p-6 shadow-sm border">
                <div className="text-5xl font-bold text-violet-100 absolute top-4 right-4">
                  {step.number}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mb-4">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4">Preços</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Planos que cabem no seu bolso
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Comece grátis. Escale conforme sua necessidade.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={cn('text-sm', !annual && 'font-semibold')}>Mensal</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={cn(
                'relative h-7 w-14 rounded-full transition-colors',
                annual ? 'bg-violet-600' : 'bg-slate-200'
              )}
            >
              <motion.div
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
                animate={{ left: annual ? 'calc(100% - 24px)' : '4px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={cn('text-sm', annual && 'font-semibold')}>
              Anual
              <Badge variant="secondary" className="ml-2 text-[10px]">-20%</Badge>
            </span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              className={cn(
                'relative rounded-2xl border p-8',
                plan.popular 
                  ? 'border-violet-500 shadow-xl scale-105 bg-white' 
                  : 'border-slate-200 bg-white'
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600">
                  Mais popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  R$ {annual ? Math.round(plan.yearlyPrice / 12) : plan.price}
                </span>
                <span className="text-muted-foreground">/mês</span>
                {annual && plan.yearlyPrice > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {plan.yearlyPrice}/ano cobrado anualmente
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button
                  className={cn(
                    'w-full',
                    plan.popular
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'
                      : ''
                  )}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4">Depoimentos</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-muted-foreground text-lg">
            Milhares de profissionais já transformaram suas apresentações em vídeos
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-2xl p-6 border shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role} • {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4">FAQ</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Perguntas frequentes
          </h2>
          <p className="text-muted-foreground text-lg">
            Tire suas dúvidas sobre a plataforma
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, index) => (
            <motion.div
              key={index}
              className="border rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-6 pb-4 text-muted-foreground">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-violet-600 to-purple-700">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para criar seu primeiro vídeo?
          </h2>
          <p className="text-violet-100 text-lg mb-8">
            Junte-se a milhares de profissionais que já economizam tempo e dinheiro
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 text-lg px-8">
                Começar grátis agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                <Play className="mr-2 h-5 w-5" />
                Ver demonstração
              </Button>
            </Link>
          </div>

          <p className="text-violet-200 text-sm mt-6">
            ✓ Sem cartão de crédito &nbsp;&nbsp; ✓ 1 vídeo grátis &nbsp;&nbsp; ✓ Cancele quando quiser
          </p>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 bg-slate-900 text-slate-400">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">Estúdio IA</span>
            </div>
            <p className="text-sm">
              Transforme apresentações em vídeos profissionais com IA.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Preços</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Templates NR</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">LGPD</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            © 2026 Estúdio IA Vídeos. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Globe className="h-4 w-4" />
            <span className="text-sm">Português (Brasil)</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// =============================================================================
// Main Landing Page
// =============================================================================

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  )
}
