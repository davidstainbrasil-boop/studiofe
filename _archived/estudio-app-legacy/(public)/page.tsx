/**
 * Landing Page Component
 * Página de vendas pública com hero, features, pricing, testimonials, FAQ, CTA
 * 
 * @module app/(public)/page
 */

import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TécnicoCursos - Do PowerPoint ao Vídeo Profissional em 10 Minutos',
  description: 'Transforme suas apresentações em vídeos de treinamento profissionais com narração por IA. Ideal para técnicos de segurança, consultores SST e empresas.',
  keywords: ['video de treinamento', 'NR', 'segurança do trabalho', 'SST', 'pptx para video', 'TTS', 'IA'],
  openGraph: {
    title: 'TécnicoCursos - Vídeos de Treinamento com IA',
    description: 'Do PowerPoint ao Vídeo em 10 minutos. Narração por IA em português.',
    type: 'website',
    locale: 'pt_BR',
  },
};

// ============================================================================
// DATA
// ============================================================================

const features = [
  {
    icon: '📤',
    title: 'Upload de PowerPoint',
    description: 'Arraste e solte seu PPTX. Preservamos layout, cores, imagens e notas do apresentador.',
  },
  {
    icon: '🎙️',
    title: 'Narração por IA',
    description: 'Vozes naturais em português brasileiro. Ajuste velocidade e entonação.',
  },
  {
    icon: '👤',
    title: 'Avatar com Lip-Sync',
    description: 'Apresentador virtual com sincronização labial realista. 10+ avatares disponíveis.',
  },
  {
    icon: '🎬',
    title: 'Renderização Rápida',
    description: '5 minutos de vídeo em menos de 3 minutos. Full HD ou 4K.',
  },
  {
    icon: '📋',
    title: 'Templates NR Prontos',
    description: 'NR-35, NR-10, NR-6 e mais. Conteúdo técnico validado e atualizado.',
  },
  {
    icon: '🎓',
    title: 'Export para LMS',
    description: 'SCORM 1.2/2004, xAPI, LTI. Integração direta com Moodle, Totara, etc.',
  },
];

const plans = [
  {
    name: 'Gratuito',
    price: '0',
    period: 'para sempre',
    description: 'Perfeito para experimentar',
    features: [
      '1 vídeo por mês',
      'Até 5 minutos por vídeo',
      'Resolução 720p',
      '1GB de armazenamento',
      'Marca d\'água TécnicoCursos',
    ],
    cta: 'Começar Grátis',
    href: '/auth/signup',
    popular: false,
  },
  {
    name: 'Pro',
    price: '97',
    period: '/mês',
    description: 'Para profissionais de SST',
    features: [
      '10 vídeos por mês',
      'Até 30 minutos por vídeo',
      'Full HD (1080p)',
      '10GB de armazenamento',
      'Sem marca d\'água',
      'Suporte prioritário',
      'Templates NR premium',
      'Export SCORM',
    ],
    cta: 'Assinar Pro',
    href: '/auth/signup?plan=pro',
    popular: true,
    savings: 'Economize R$ 194/ano no plano anual',
  },
  {
    name: 'Business',
    price: '297',
    period: '/mês',
    description: 'Para consultorias e empresas',
    features: [
      '50 vídeos por mês',
      'Vídeos ilimitados em duração',
      'Resolução 4K',
      '100GB de armazenamento',
      'White-label completo',
      'Até 5 membros da equipe',
      'API completa',
      'LMS Integration',
      'Suporte dedicado',
    ],
    cta: 'Assinar Business',
    href: '/auth/signup?plan=business',
    popular: false,
    savings: 'Economize R$ 594/ano no plano anual',
  },
];

const testimonials = [
  {
    name: 'Carlos Silva',
    role: 'Técnico de Segurança',
    company: 'Construtech Ltda',
    image: '/avatars/testimonial-1.jpg',
    content: 'Antes levava 2 semanas para produzir um vídeo de NR-35. Agora faço em 15 minutos. Meu chefe ficou impressionado com a qualidade.',
    rating: 5,
  },
  {
    name: 'Mariana Oliveira',
    role: 'Sócia-proprietária',
    company: 'SST Consultoria',
    image: '/avatars/testimonial-2.jpg',
    content: 'O white-label foi game changer. Entrego vídeos com a marca do cliente e eles acham que tenho uma produtora interna.',
    rating: 5,
  },
  {
    name: 'Roberto Mendes',
    role: 'Coordenador de T&D',
    company: 'Construtora ABC',
    image: '/avatars/testimonial-3.jpg',
    content: 'A integração SCORM com nosso Moodle funciona perfeitamente. Conseguimos padronizar treinamentos em 15 obras.',
    rating: 5,
  },
];

const faqs = [
  {
    question: 'Quanto tempo leva para criar um vídeo?',
    answer: 'Um vídeo de 5 minutos leva em média 10-15 minutos, incluindo upload do PPTX, configuração de voz e renderização.',
  },
  {
    question: 'Posso usar minhas próprias apresentações?',
    answer: 'Sim! Basta fazer upload do seu arquivo PPTX. Preservamos layout, cores, imagens e até as notas do apresentador que viram narração.',
  },
  {
    question: 'As vozes de IA parecem naturais?',
    answer: 'Utilizamos a tecnologia ElevenLabs, líder mundial em TTS. As vozes em português brasileiro são extremamente naturais.',
  },
  {
    question: 'Funciona com LMS corporativo?',
    answer: 'Sim! Exportamos em SCORM 1.2, SCORM 2004 e xAPI. Compatível com Moodle, Totara, Cornerstone e outros.',
  },
  {
    question: 'O conteúdo das NRs está atualizado?',
    answer: 'Nossos templates são revisados trimestralmente por profissionais de SST para garantir conformidade com as normas vigentes.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, sem multa ou fidelidade. Você mantém acesso até o fim do período pago e pode baixar todos seus vídeos.',
  },
];

const stats = [
  { value: '5.000+', label: 'Vídeos Criados' },
  { value: '500+', label: 'Técnicos de SST' },
  { value: '10 min', label: 'Tempo Médio' },
  { value: '4.9/5', label: 'Avaliação' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Do PowerPoint ao Vídeo Profissional em{' '}
              <span className="text-yellow-400">10 Minutos</span>
            </h1>
            <p className="mt-6 text-xl lg:text-2xl text-blue-100">
              Transforme suas apresentações em vídeos de treinamento com narração por IA.
              Ideal para NRs, SST e treinamentos corporativos.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg bg-yellow-400 text-gray-900 hover:bg-yellow-300 transition-colors shadow-lg"
              >
                Começar Grátis
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg border-2 border-white text-white hover:bg-white hover:text-blue-700 transition-colors"
              >
                <svg className="mr-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                Ver Demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-blue-200">
              ✓ Sem cartão de crédito &nbsp; ✓ 1 vídeo grátis por mês &nbsp; ✓ Cancele quando quiser
            </p>
          </div>
          <div className="mt-12 lg:mt-0">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Preview do Editor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="bg-white py-12 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-600">{stat.value}</div>
              <div className="mt-1 text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Tudo que você precisa para criar vídeos profissionais
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Do upload do PowerPoint ao vídeo finalizado em minutos. Sem conhecimento técnico necessário.
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { number: '1', title: 'Upload seu PPTX', description: 'Arraste e solte sua apresentação' },
    { number: '2', title: 'Configure a narração', description: 'Escolha a voz e ajuste o tom' },
    { number: '3', title: 'Adicione avatar', description: 'Selecione um apresentador virtual' },
    { number: '4', title: 'Gere seu vídeo', description: 'Baixe em Full HD ou 4K' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Como Funciona
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            4 passos simples para criar seu vídeo de treinamento
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-blue-200" />
              )}
              <div className="relative text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Planos para todos os tamanhos
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Comece grátis, upgrade quando precisar
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-8 lg:gap-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-sm ${
                plan.popular ? 'ring-2 ring-blue-600 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Mais Popular
                  </span>
                </div>
              )}
              <div className="p-8">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">R$ {plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                {plan.savings && (
                  <p className="mt-2 text-sm text-green-600">{plan.savings}</p>
                )}
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block w-full py-3 px-4 rounded-lg text-center font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-12 text-center text-gray-600">
          Precisa de mais? <Link href="/contato" className="text-blue-600 hover:underline">Fale conosco</Link> sobre o plano Enterprise.
        </p>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            O que nossos clientes dizem
          </h2>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="bg-gray-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 italic">&ldquo;{testimonial.content}&rdquo;</p>
              <div className="mt-6 flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Perguntas Frequentes
          </h2>
        </div>
        <div className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group bg-white rounded-lg shadow-sm"
            >
              <summary className="flex justify-between items-center cursor-pointer p-6 text-lg font-semibold text-gray-900">
                {faq.question}
                <svg
                  className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold">
          Pronto para criar vídeos profissionais?
        </h2>
        <p className="mt-4 text-xl text-blue-100">
          Comece agora com 1 vídeo grátis por mês. Sem cartão de crédito.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/signup"
            className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg bg-white text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
          >
            Criar Conta Grátis
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-2xl font-bold text-white">TécnicoCursos</div>
            <p className="mt-4 text-sm">
              Transformando apresentações em vídeos profissionais com IA desde 2024.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="hover:text-white">Funcionalidades</Link></li>
              <li><Link href="#pricing" className="hover:text-white">Preços</Link></li>
              <li><Link href="/templates" className="hover:text-white">Templates NR</Link></li>
              <li><Link href="/integracao" className="hover:text-white">Integrações</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/ajuda" className="hover:text-white">Central de Ajuda</Link></li>
              <li><Link href="/tutoriais" className="hover:text-white">Tutoriais</Link></li>
              <li><Link href="/contato" className="hover:text-white">Contato</Link></li>
              <li><Link href="/status" className="hover:text-white">Status do Sistema</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
              <li><Link href="/privacidade" className="hover:text-white">Privacidade</Link></li>
              <li><Link href="/lgpd" className="hover:text-white">LGPD</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm">© 2024 TécnicoCursos. Todos os direitos reservados.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">
              <span className="sr-only">LinkedIn</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="#" className="hover:text-white">
              <span className="sr-only">YouTube</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="#" className="hover:text-white">
              <span className="sr-only">Instagram</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
