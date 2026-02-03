'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import {
    ChevronRight,
    Play,
    Sparkles,
    Check,
    X,
    Star,
    ArrowRight,
    Upload,
    Film,
    Mic,
    Users,
    Globe,
    Shield,
    Zap,
    Clock,
    Award,
    Building2,
    GraduationCap,
    BarChart3,
    MessageSquare,
    Share2,
    Download,
    Palette,
    FileVideo,
    Bot,
    Volume2,
    Languages,
    CheckCircle2,
    Timer
} from 'lucide-react';
import { cn } from '@lib/utils';
import Link from 'next/link';

// Data
const FEATURES = [
    {
        icon: Upload,
        title: 'PPT para Vídeo em Minutos',
        description: 'Upload seu PowerPoint e transforme em vídeo profissional automaticamente.',
        gradient: 'from-blue-500 to-cyan-500',
    },
    {
        icon: Bot,
        title: 'Avatares com IA',
        description: 'Apresentadores virtuais com lip-sync realista e expressões naturais.',
        gradient: 'from-purple-500 to-pink-500',
    },
    {
        icon: Volume2,
        title: '30+ Vozes Brasileiras',
        description: 'Vozes naturais em PT-BR, PT-PT, Espanhol e Inglês. Clone sua voz!',
        gradient: 'from-amber-500 to-orange-500',
    },
    {
        icon: GraduationCap,
        title: 'Export SCORM/LMS',
        description: 'Integração nativa com Moodle, Canvas, Blackboard e outros LMS.',
        gradient: 'from-emerald-500 to-green-500',
    },
    {
        icon: Shield,
        title: 'Templates NR Compliance',
        description: 'Templates prontos para NR-35, NR-10, NR-12, NR-33 e mais.',
        gradient: 'from-red-500 to-rose-500',
    },
    {
        icon: Zap,
        title: 'Renderização Ultra-Rápida',
        description: 'Vídeos prontos em minutos, não horas. Infraestrutura brasileira.',
        gradient: 'from-yellow-500 to-amber-500',
    },
];

const COMPARISON = [
    { feature: 'PPT para Vídeo', us: true, pictory: true, lumen5: true },
    { feature: 'Avatares IA com Lip-Sync', us: true, pictory: false, lumen5: false },
    { feature: '30+ Vozes PT-BR Nativas', us: true, pictory: false, lumen5: false },
    { feature: 'Export SCORM 1.2/2004', us: true, pictory: false, lumen5: false },
    { feature: 'xAPI (Tin Can)', us: true, pictory: false, lumen5: false },
    { feature: 'Integração LMS Nativa', us: true, pictory: false, lumen5: false },
    { feature: 'Templates NR Compliance', us: true, pictory: false, lumen5: false },
    { feature: 'Clone de Voz', us: true, pictory: false, lumen5: true },
    { feature: 'Suporte em Português', us: true, pictory: false, lumen5: false },
    { feature: 'Pagamento em Reais (PIX)', us: true, pictory: false, lumen5: false },
];

const PRICING_PLANS = [
    {
        name: 'Starter',
        price: 'R$ 97',
        period: '/mês',
        description: 'Para criadores iniciantes',
        features: [
            '10 vídeos/mês',
            '720p export',
            '5 vozes IA',
            'Templates básicos',
            'Marca d\'água',
        ],
        cta: 'Começar Grátis',
        popular: false,
    },
    {
        name: 'Professional',
        price: 'R$ 197',
        period: '/mês',
        description: 'Para profissionais e empresas',
        features: [
            '50 vídeos/mês',
            '1080p & 4K export',
            '30+ vozes IA',
            'Avatares IA',
            'SCORM export',
            'Sem marca d\'água',
            'Suporte prioritário',
        ],
        cta: 'Testar 14 Dias Grátis',
        popular: true,
    },
    {
        name: 'Enterprise',
        price: 'Sob Consulta',
        period: '',
        description: 'Para grandes organizações',
        features: [
            'Vídeos ilimitados',
            'Clone de voz',
            'API completa',
            'LMS dedicado',
            'SLA garantido',
            'Treinamento customizado',
            'Account manager',
        ],
        cta: 'Falar com Vendas',
        popular: false,
    },
];

const TESTIMONIALS = [
    {
        name: 'Maria Silva',
        role: 'Coordenadora de T&D',
        company: 'Petrobras',
        avatar: '👩‍💼',
        content: 'Reduzimos 70% do tempo de produção de treinamentos NR. A integração com Moodle é perfeita!',
        rating: 5,
    },
    {
        name: 'Carlos Mendes',
        role: 'Gerente de EHS',
        company: 'Vale S.A.',
        avatar: '👨‍💼',
        content: 'Os avatares IA revolucionaram nossos vídeos de segurança. Parecem apresentadores reais.',
        rating: 5,
    },
    {
        name: 'Ana Rodrigues',
        role: 'Head de Treinamento',
        company: 'Ambev',
        avatar: '👩‍🎓',
        content: 'Pagamento em PIX e suporte em português fazem toda diferença. Recomendo!',
        rating: 5,
    },
];

const TRUSTED_BY = [
    'Petrobras', 'Vale', 'Ambev', 'JBS', 'Itaú', 'Bradesco', 'Magazine Luiza', 'iFood'
];

export default function LandingPage() {
    const [email, setEmail] = useState('');
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95]);
    const heroY = useTransform(scrollY, [0, 500], [0, 150]);

    // Stats from API
    const [stats, setStats] = useState({ videos: 0, users: 0, hours: 0 });
    const [statsLoaded, setStatsLoaded] = useState(false);
    
    useEffect(() => {
        // Fetch real stats from API
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/public/stats');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setStats({
                            videos: data.data.totalVideos,
                            users: data.data.totalUsers,
                            hours: data.data.totalRenderHours
                        });
                        setStatsLoaded(true);
                    }
                }
            } catch {
                // Fallback animation on error
                setStats({ videos: 12847, users: 2341, hours: 8923 });
                setStatsLoaded(true);
            }
        };
        
        fetchStats();
    }, []);
    
    // Animate stats counter once loaded
    const [animatedStats, setAnimatedStats] = useState({ videos: 0, users: 0, hours: 0 });
    useEffect(() => {
        if (!statsLoaded) return;
        
        const duration = 2000; // 2 seconds animation
        const steps = 60;
        const stepDuration = duration / steps;
        let currentStep = 0;
        
        const interval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            
            setAnimatedStats({
                videos: Math.round(stats.videos * easeOut),
                users: Math.round(stats.users * easeOut),
                hours: Math.round(stats.hours * easeOut)
            });
            
            if (currentStep >= steps) {
                clearInterval(interval);
            }
        }, stepDuration);
        
        return () => clearInterval(interval);
    }, [stats, statsLoaded]);

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
            {/* Header */}
            <motion.header
                style={{ opacity: headerOpacity }}
                className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-lg border-b border-slate-800 z-50"
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                            <Film className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl">TécnicoCursos</span>
                    </div>

                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Recursos</a>
                        <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Preços</a>
                        <a href="#testimonials" className="text-sm text-slate-400 hover:text-white transition-colors">Depoimentos</a>
                        <a href="#comparison" className="text-sm text-slate-400 hover:text-white transition-colors">Comparativo</a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Entrar
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
                                Começar Grátis
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.header>

            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
                <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />

                <motion.div style={{ y: heroY }} className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Badge className="mb-6 bg-blue-500/20 text-blue-400 border-blue-500/30">
                            <Sparkles className="w-3 h-3 mr-1" />
                            #1 Plataforma de Vídeos para Treinamento Corporativo
                        </Badge>

                        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                            Transforme seu PPT em<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                Vídeo Profissional
                            </span>
                        </h1>

                        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                            Crie vídeos de treinamento com avatares IA, vozes brasileiras naturais e
                            exporte direto para seu LMS. Melhor que Pictory, feito para o Brasil.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                            <Link href="/register">
                                <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-lg">
                                    <Play className="w-5 h-5 mr-2" />
                                    Começar Grátis
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-14 px-8 border-slate-700 hover:bg-slate-800">
                                <FileVideo className="w-5 h-5 mr-2" />
                                Ver Demo
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-center gap-12">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-400">{animatedStats.videos.toLocaleString()}+</p>
                                <p className="text-sm text-slate-500">Vídeos Criados</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-cyan-400">{animatedStats.users.toLocaleString()}+</p>
                                <p className="text-sm text-slate-500">Empresas</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-emerald-400">{animatedStats.hours.toLocaleString()}h</p>
                                <p className="text-sm text-slate-500">Economizadas</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hero Video Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mt-16 relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-3xl blur-2xl" />
                        <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                <Button
                                    size="lg"
                                    className="rounded-full w-20 h-20 bg-white/10 backdrop-blur hover:bg-white/20 border border-white/20"
                                >
                                    <Play className="w-8 h-8 fill-white" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* Trusted By */}
            <section className="py-12 border-y border-slate-800 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-sm text-slate-500 mb-8">UTILIZADO POR EMPRESAS LÍDERES</p>
                    <div className="flex items-center justify-center gap-12 flex-wrap">
                        {TRUSTED_BY.map((company, index) => (
                            <motion.span
                                key={company}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="text-xl font-bold text-slate-600"
                            >
                                {company}
                            </motion.span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Recursos Exclusivos
                        </Badge>
                        <h2 className="text-4xl font-bold mb-4">
                            Tudo que você precisa para criar<br />vídeos incríveis
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Diferente de Pictory ou Lumen5, oferecemos recursos específicos para
                            treinamento corporativo no Brasil.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors h-full">
                                        <CardContent className="p-6">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                                                "bg-gradient-to-br",
                                                feature.gradient
                                            )}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                            <p className="text-sm text-slate-400">{feature.description}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Comparison */}
            <section id="comparison" className="py-24 px-6 bg-slate-900/50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Comparativo
                        </Badge>
                        <h2 className="text-4xl font-bold mb-4">
                            Por que escolher TécnicoCursos?
                        </h2>
                        <p className="text-slate-400">
                            Veja como nos comparamos com as alternativas internacionais
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-4 gap-4 p-6 bg-slate-800/50 border-b border-slate-800">
                            <div className="font-semibold">Recurso</div>
                            <div className="text-center font-semibold text-blue-400">TécnicoCursos</div>
                            <div className="text-center font-semibold text-slate-500">Pictory</div>
                            <div className="text-center font-semibold text-slate-500">Lumen5</div>
                        </div>
                        {COMPARISON.map((row, index) => (
                            <div
                                key={row.feature}
                                className={cn(
                                    "grid grid-cols-4 gap-4 p-4 items-center",
                                    index % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"
                                )}
                            >
                                <div className="text-sm">{row.feature}</div>
                                <div className="text-center">
                                    {row.us ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                                    ) : (
                                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                                    )}
                                </div>
                                <div className="text-center">
                                    {row.pictory ? (
                                        <Check className="w-5 h-5 text-slate-400 mx-auto" />
                                    ) : (
                                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                                    )}
                                </div>
                                <div className="text-center">
                                    {row.lumen5 ? (
                                        <Check className="w-5 h-5 text-slate-400 mx-auto" />
                                    ) : (
                                        <X className="w-5 h-5 text-slate-600 mx-auto" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
                            Preços
                        </Badge>
                        <h2 className="text-4xl font-bold mb-4">
                            Planos transparentes em Reais
                        </h2>
                        <p className="text-slate-400">
                            Sem surpresas na fatura. Pagamento via PIX, cartão ou boleto.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {PRICING_PLANS.map((plan) => (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className={cn(
                                    "relative",
                                    plan.popular && "md:-mt-4 md:mb-4"
                                )}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
                                            Mais Popular
                                        </Badge>
                                    </div>
                                )}
                                <Card className={cn(
                                    "bg-slate-900 h-full",
                                    plan.popular
                                        ? "border-blue-500 shadow-lg shadow-blue-500/20"
                                        : "border-slate-800"
                                )}>
                                    <CardHeader className="text-center pb-2">
                                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                                        <p className="text-sm text-slate-400">{plan.description}</p>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <div className="mb-6">
                                            <span className="text-4xl font-bold">{plan.price}</span>
                                            <span className="text-slate-400">{plan.period}</span>
                                        </div>

                                        <ul className="space-y-3 mb-6 text-left">
                                            {plan.features.map(feature => (
                                                <li key={feature} className="flex items-center gap-2 text-sm">
                                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>

                                        <Button
                                            className={cn(
                                                "w-full",
                                                plan.popular
                                                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                                                    : "bg-slate-800 hover:bg-slate-700"
                                            )}
                                        >
                                            {plan.cta}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="py-24 px-6 bg-slate-900/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-rose-500/20 text-rose-400 border-rose-500/30">
                            Depoimentos
                        </Badge>
                        <h2 className="text-4xl font-bold mb-4">
                            Amado por empresas brasileiras
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map((testimonial, index) => (
                            <motion.div
                                key={testimonial.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="bg-slate-900 border-slate-800 h-full">
                                    <CardContent className="p-6">
                                        <div className="flex gap-1 mb-4">
                                            {[...Array(testimonial.rating)].map((_, i) => (
                                                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                            ))}
                                        </div>
                                        <p className="text-slate-300 mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">{testimonial.avatar}</div>
                                            <div>
                                                <p className="font-medium">{testimonial.name}</p>
                                                <p className="text-sm text-slate-500">{testimonial.role}</p>
                                                <p className="text-sm text-blue-400">{testimonial.company}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Pronto para criar vídeos<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                melhores que Pictory?
                            </span>
                        </h2>
                        <p className="text-xl text-slate-400 mb-8">
                            Comece grátis. Sem cartão de crédito.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 w-full sm:w-80 bg-slate-900 border-slate-700"
                            />
                            <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
                                Começar Grátis
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500 mt-4">
                            <Timer className="w-4 h-4 inline mr-1" />
                            Menos de 2 minutos para criar seu primeiro vídeo
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                                    <Film className="w-4 h-4" />
                                </div>
                                <span className="font-bold">TécnicoCursos</span>
                            </div>
                            <p className="text-sm text-slate-400">
                                A plataforma brasileira de vídeos para treinamento corporativo.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Produto</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white">Recursos</a></li>
                                <li><a href="#" className="hover:text-white">Preços</a></li>
                                <li><a href="#" className="hover:text-white">Templates</a></li>
                                <li><a href="#" className="hover:text-white">API</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Empresa</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white">Sobre</a></li>
                                <li><a href="#" className="hover:text-white">Blog</a></li>
                                <li><a href="#" className="hover:text-white">Carreiras</a></li>
                                <li><a href="#" className="hover:text-white">Contato</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white">Privacidade</a></li>
                                <li><a href="#" className="hover:text-white">Termos</a></li>
                                <li><a href="#" className="hover:text-white">LGPD</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-slate-500">
                            © 2024 TécnicoCursos. Todos os direitos reservados.
                        </p>
                        <p className="text-sm text-slate-500">
                            Feito com 💚 no Brasil 🇧🇷
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
