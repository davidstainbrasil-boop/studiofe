'use client';

import Link from 'next/link';
import {
    ArrowRight,
    Video,
    Type,
    Download,
    CheckCircle2,
    Users,
    ShieldCheck,
    GraduationCap,
    Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">

            {/* 1. HERO SECTION */}
            <section className="relative px-6 py-24 md:py-32 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-200/40 via-transparent to-transparent dark:from-violet-900/20 pointer-events-none" />

                <div className="max-w-4xl mx-auto relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm text-violet-700 dark:border-violet-900 dark:bg-violet-900/30 dark:text-violet-300">
                        <span className="flex h-2 w-2 rounded-full bg-violet-600 mr-2 animate-pulse"></span>
                        VideoStudio 2.0 está no ar
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                        Crie vídeos profissionais de <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                            treinamento com IA
                        </span>
                        <br /> — em minutos.
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        A maneira mais fácil para equipes de treinamento, RH e criadores de cursos transformarem roteiros em conteúdo de vídeo envolvente sem habilidades de edição.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/create">
                            <Button size="lg" className="h-14 px-8 text-lg bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200/50 dark:shadow-none transition-all hover:scale-105">
                                Crie Seu Primeiro Vídeo
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="#how-it-works">
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                Veja como funciona
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Sem edição necessária
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Segurança empresarial
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Comece grátis
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. PRODUCT PREVIEW (Moocked) */}
            <section className="px-6 pb-24">
                <div className="max-w-6xl mx-auto rounded-2xl border-8 border-slate-900/5 dark:border-slate-800/50 shadow-2xl bg-slate-900 aspect-video relative overflow-hidden group">
                    <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            {/* Abstract UI representation */}
                            <div className="w-[800px] h-[500px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl flex overflow-hidden opacity-90 mx-auto">
                                <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-4">
                                    <div className="h-8 bg-violet-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                    <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                                </div>
                                <div className="flex-1 p-8 grid place-content-center bg-slate-50/50">
                                    <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                                        <Play className="fill-white text-white w-8 h-8 ml-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 to-transparent p-8 text-center text-white">
                        <p className="font-medium">Interface simples e limpa projetada para profissionais.</p>
                    </div>
                </div>
            </section>

            {/* 2. HOW IT WORKS */}
            <section id="how-it-works" className="px-6 py-24 bg-white dark:bg-slate-900">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                            Processo Simples em 3 Etapas
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400">
                                <Type className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">1. Escreva seu roteiro</h3>
                            <p className="text-slate-500">Digite seu conteúdo ou cole um documento. Nossa IA pode até ajudar a refiná-lo.</p>
                        </div>

                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">2. Escolha o apresentador</h3>
                            <p className="text-slate-500">Selecione entre diversos avatares de IA para apresentar seu conteúdo profissionalmente.</p>
                        </div>

                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400">
                                <Download className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">3. Exporte o vídeo</h3>
                            <p className="text-slate-500">Obtenha um MP4 de alta qualidade pronto para seu LMS ou canais internos.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WHO IT'S FOR */}
            <section className="px-6 py-24 bg-slate-50 dark:bg-slate-950">
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

            {/* 5. WHY / SOCIAL PROOF (Combined) */}
            <section className="px-6 py-24 bg-white dark:bg-slate-900 text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-3xl font-bold">Por que as equipes mudam para o VideoStudio</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8">
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">10x</div>
                            <div className="text-sm text-slate-500 font-medium">Produção Mais Rápida</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">0</div>
                            <div className="text-sm text-slate-500 font-medium">Habilidades de Edição</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">100%</div>
                            <div className="text-sm text-slate-500 font-medium">Consistência</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">HD</div>
                            <div className="text-sm text-slate-500 font-medium">Qualidade de Exportação</div>
                        </div>
                    </div>

                    <p className="text-slate-500 italic border-t border-slate-100 pt-8 dark:border-slate-800">
                        &quot;Usado para treinamento interno e conteúdo instrucional por equipes inovadoras.&quot;
                    </p>
                </div>
            </section>

            {/* 7. FINAL CTA */}
            <section className="px-6 py-32 bg-slate-900 text-white text-center">
                <div className="max-w-2xl mx-auto space-y-8">
                    <h2 className="text-4xl font-bold">Pronto para criar?</h2>
                    <p className="text-slate-300 text-xl">Crie seu primeiro vídeo de treinamento hoje. Sem necessidade de cartão de crédito para teste.</p>
                    <Link href="/create">
                        <Button size="lg" className="h-16 px-10 text-xl bg-white text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-200">
                            Crie Seu Primeiro Vídeo
                        </Button>
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="px-6 py-12 bg-slate-950 text-slate-500 text-sm text-center border-t border-slate-900">
                <p>© 2026 VideoStudio AI. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}
