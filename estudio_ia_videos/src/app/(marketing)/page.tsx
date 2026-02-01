
import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowRight,
    Video,
    Type,
    Download,
    CheckCircle2,
    Users,
    ShieldCheck,
    GraduationCap,
    Play,
    Star,
    Zap,
    Clock,
    Globe,
    Lock,
    Mic,
    Sparkles,
    FileText,
    Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Testimonials data
const TESTIMONIALS = [
    {
        name: 'Mariana Silva',
        role: 'Coordenadora de T&D',
        company: 'Petrobras',
        avatar: '/avatars/testimonial-1.png',
        quote: 'Reduzimos o tempo de produção de treinamentos de 2 semanas para 2 dias. A qualidade impressionou até a diretoria.',
        rating: 5,
    },
    {
        name: 'Carlos Oliveira',
        role: 'Gerente de RH',
        company: 'Vale S.A.',
        avatar: '/avatars/testimonial-2.png',
        quote: 'Nossos treinamentos de NR agora têm 94% de taxa de conclusão. Os funcionários realmente assistem e aprendem.',
        rating: 5,
    },
    {
        name: 'Ana Paula Costa',
        role: 'Especialista em Compliance',
        company: 'Itaú Unibanco',
        avatar: '/avatars/testimonial-3.png',
        quote: 'A ferramenta perfeita para manter todos atualizados sobre políticas. Fácil de usar e resultados profissionais.',
        rating: 5,
    },
];

// Features for grid
const FEATURES = [
    {
        icon: Zap,
        title: 'Renderização Rápida',
        description: 'Vídeos prontos em minutos, não horas. Nossa infraestrutura otimizada processa em tempo recorde.',
    },
    {
        icon: Mic,
        title: 'Vozes Naturais IA',
        description: '30+ vozes em português brasileiro com entonação natural. Escolha o tom ideal para seu público.',
    },
    {
        icon: Users,
        title: 'Avatares Profissionais',
        description: 'Apresentadores virtuais realistas que representam sua marca com profissionalismo.',
    },
    {
        icon: Lock,
        title: 'Segurança Empresarial',
        description: 'Criptografia de ponta, RLS no banco, e conformidade LGPD. Seu conteúdo protegido.',
    },
    {
        icon: Globe,
        title: 'Export Múltiplos Formatos',
        description: 'MP4, SCORM, embed para LMS. Integração direta com Moodle, Canvas, e mais.',
    },
    {
        icon: Sparkles,
        title: 'Templates NR Prontos',
        description: 'Biblioteca completa de templates para NR-10, NR-12, NR-35 e outras normas regulamentadoras.',
    },
];

// Stats
const STATS = [
    { value: '10.000+', label: 'Vídeos criados' },
    { value: '500+', label: 'Empresas ativas' },
    { value: '98%', label: 'Satisfação' },
    { value: '< 5min', label: 'Tempo médio' },
];

export const metadata = {
    title: 'Studio Unified - Edição de Vídeo com IA para Cursos',
    description: 'Transforme apresentações e roteiros em vídeos de treinamento profissionais em minutos. Ideal para RH, T&D e criadores de cursos.',
};

export default function MarketingPage() {
    return (
        <div className="flex flex-col gap-0 pb-0">

            {/* 1. HERO SECTION */}
            {/* 1. HERO SECTION */}
            <section className="relative px-6 py-24 md:py-32 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-200/40 via-transparent to-transparent dark:from-violet-900/20 pointer-events-none" />
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
                </div>

                <div className="max-w-4xl mx-auto relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center rounded-full border border-violet-200 bg-white/50 backdrop-blur-sm px-3 py-1 text-sm text-violet-700 shadow-sm dark:border-violet-900 dark:bg-violet-900/30 dark:text-violet-300 transition-transform hover:scale-105">
                        <span className="flex h-2 w-2 rounded-full bg-violet-600 mr-2 animate-pulse"></span>
                        VideoStudio 3.0 está no ar
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] drop-shadow-sm">
                        Crie vídeos profissionais de <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 animate-text-shimmer bg-[length:200%_auto]">
                            treinamento com IA
                        </span>
                        <br /> — em minutos.
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        A maneira mais fácil para equipes de treinamento, RH e criadores de cursos transformarem roteiros em conteúdo de vídeo envolvente sem habilidades de edição.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/register">
                            <Button size="lg" variant="premium" className="h-14 px-8 text-lg rounded-full">
                                Crie Seu Primeiro Vídeo
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="#how-it-works">
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full hover:bg-slate-50 dark:hover:bg-slate-800">
                                Veja como funciona
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-8 flex items-center justify-center gap-8 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-violet-500" /> Sem edição necessária
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-violet-500" /> Segurança empresarial
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-violet-500" /> Comece grátis
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. PRODUCT PREVIEW (Mocked) */}
            <section className="px-6 pb-24">
                <div className="max-w-6xl mx-auto rounded-xl border border-slate-200 shadow-2xl bg-white aspect-video relative overflow-hidden group dark:bg-slate-900 dark:border-slate-800">
                    <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                        {/* Simple UI Placeholder */}
                        <div className="text-center opacity-50">
                            <Video className="w-24 h-24 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-400 font-medium">Preview da Interface de Edição</p>
                        </div>
                    </div>
                    {(process.env.NODE_ENV === 'development') && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* In valid environment, maybe show a real image */}
                        </div>
                    )}
                </div>
            </section>

            {/* 2. HOW IT WORKS */}
            {/* 2. HOW IT WORKS */}
            <section id="how-it-works" className="px-6 py-24 bg-slate-50/50 dark:bg-slate-900/50 relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="max-w-5xl mx-auto relative">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight">
                            Processo Simples em 3 Etapas
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="group text-center space-y-4 p-6 rounded-2xl transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                                <Type className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">1. Escreva seu roteiro</h3>
                            <p className="text-slate-500">Digite seu conteúdo ou cole um documento. Nossa IA pode até ajudar a refiná-lo.</p>
                        </div>

                        <div className="group text-center space-y-4 p-6 rounded-2xl transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">2. Escolha o apresentador</h3>
                            <p className="text-slate-500">Selecione entre diversos avatares de IA para apresentar seu conteúdo profissionalmente.</p>
                        </div>

                        <div className="group text-center space-y-4 p-6 rounded-2xl transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                                <Download className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">3. Exporte o vídeo</h3>
                            <p className="text-slate-500">Obtenha um MP4 de alta qualidade pronto para seu LMS ou canais internos.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WHO IT'S FOR */}
            <section id="features" className="px-6 py-24 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold">Feito para Profissionais</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="border-none shadow-lg">
                            <CardContent className="p-8 space-y-4">
                                <GraduationCap className="w-10 h-10 text-violet-600" />
                                <h3 className="text-xl font-bold">Equipes de Treinamento</h3>
                                <p className="text-slate-500">Escale sua produção de conteúdo de T&D sem contratar agências externas ou editores de vídeo.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg">
                            <CardContent className="p-8 space-y-4">
                                <ShieldCheck className="w-10 h-10 text-indigo-600" />
                                <h3 className="text-xl font-bold">RH e Compliance</h3>
                                <p className="text-slate-500">Mantenha as políticas de trabalho atualizadas com vídeos envolventes que os funcionários realmente assistem.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg">
                            <CardContent className="p-8 space-y-4">
                                <Video className="w-10 h-10 text-pink-600" />
                                <h3 className="text-xl font-bold">Criadores de Cursos</h3>
                                <p className="text-slate-500">Transforme seus cursos baseados em texto em conteúdo de vídeo premium para aumentar o valor.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* 5. STATS SECTION */}
            <section className="px-6 py-16 bg-white dark:bg-slate-900">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {STATS.map((stat, index) => (
                            <div key={index} className="text-center">
                                <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                                    {stat.value}
                                </p>
                                <p className="text-slate-500 mt-2">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. FEATURES GRID */}
            <section className="px-6 py-24 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4 px-4 py-1 text-violet-600 border-violet-200">
                            Recursos Poderosos
                        </Badge>
                        <h2 className="text-3xl md:text-4xl font-bold">
                            Tudo que você precisa para{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                                vídeos profissionais
                            </span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <Card key={index} className="border border-slate-200/50 bg-white/50 backdrop-blur-sm hover:shadow-lg hover:border-violet-200 transition-all group">
                                    <CardContent className="p-6">
                                        <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Icon className="w-6 h-6 text-violet-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                        <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 7. TESTIMONIALS */}
            <section className="px-6 py-24 bg-white dark:bg-slate-950">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4 px-4 py-1 text-violet-600 border-violet-200">
                            Depoimentos
                        </Badge>
                        <h2 className="text-3xl md:text-4xl font-bold">
                            Empresas que confiam no{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                                Studio Unified
                            </span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {TESTIMONIALS.map((testimonial, index) => (
                            <Card key={index} className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-violet-200 dark:text-violet-900">
                                    <Quote className="w-12 h-12" />
                                </div>
                                <CardContent className="p-8 relative z-10">
                                    {/* Rating */}
                                    <div className="flex gap-1 mb-4">
                                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    
                                    {/* Quote */}
                                    <p className="text-slate-600 dark:text-slate-300 mb-6 italic leading-relaxed">
                                        &ldquo;{testimonial.quote}&rdquo;
                                    </p>
                                    
                                    {/* Author */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{testimonial.name}</p>
                                            <p className="text-xs text-slate-500">{testimonial.role}, {testimonial.company}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Company logos placeholder */}
                    <div className="mt-16 text-center">
                        <p className="text-sm text-slate-400 mb-6">Confiado por empresas líderes do Brasil</p>
                        <div className="flex flex-wrap items-center justify-center gap-8 opacity-50 grayscale">
                            {['Petrobras', 'Vale', 'Itaú', 'Bradesco', 'Ambev'].map((company) => (
                                <div key={company} className="px-4 py-2 text-slate-400 font-semibold text-lg">
                                    {company}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 8. FINAL CTA */}
            <section className="px-6 py-32 bg-slate-900 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-transparent to-transparent pointer-events-none"></div>
                <div className="max-w-2xl mx-auto space-y-8 relative z-10">
                    <h2 className="text-4xl font-bold tracking-tight">Pronto para criar?</h2>
                    <p className="text-slate-300 text-xl font-light">Crie seu primeiro vídeo de treinamento hoje. Sem necessidade de cartão de crédito para teste.</p>
                    <Link href="/register">
                        <Button size="lg" className="h-16 px-10 text-xl bg-white text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-200 rounded-full shadow-2xl hover:scale-105 transition-transform">
                            Crie Seu Primeiro Vídeo
                        </Button>
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="px-6 py-12 bg-slate-950 text-slate-500 text-sm text-center border-t border-slate-900">
                <p>© 2026 Studio Unified. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}
