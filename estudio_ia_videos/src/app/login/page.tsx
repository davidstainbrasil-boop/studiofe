import { Metadata } from 'next';
import { Suspense } from 'react';
import { EnhancedAuthForm } from '@components/auth/enhanced-auth-form';
import { Sparkles, Video, ShieldCheck, Zap, Users, Loader2, Star, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Login | Estúdio IA de Vídeos',
    description: 'Acesse sua conta para criar vídeos profissionais com IA',
};

// Loading fallback for the login form
function LoginFormFallback() {
    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
                <p className="text-muted-foreground">Entre com suas credenciais para acessar o estúdio</p>
            </div>
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Left Column - Branding & Testimonial - Premium Visual */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r overflow-hidden">
                {/* Background Layers */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
                
                {/* Floating Elements */}
                <div className="absolute top-1/4 right-12 w-20 h-20 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl rotate-12 backdrop-blur-sm border border-white/10" />
                <div className="absolute bottom-1/3 left-8 w-16 h-16 bg-gradient-to-br from-pink-500/20 to-violet-500/20 rounded-xl -rotate-6 backdrop-blur-sm border border-white/10" />

                {/* Logo */}
                <div className="relative z-20 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                        <Video className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Estúdio IA de Vídeos</span>
                </div>

                {/* Main Testimonial */}
                <div className="relative z-20 mt-auto">
                    <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>
                    <blockquote className="space-y-3">
                        <p className="text-xl font-medium leading-relaxed text-white/90">
                            &ldquo;Esta plataforma revolucionou a forma como criamos treinamentos de segurança.
                            A geração automática a partir de PPTX economiza semanas de trabalho.&rdquo;
                        </p>
                        <footer className="flex items-center gap-3 pt-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center font-bold">
                                DT
                            </div>
                            <div>
                                <p className="font-semibold text-white">Dev Team</p>
                                <p className="text-sm text-zinc-400">MVP v2.4</p>
                            </div>
                        </footer>
                    </blockquote>
                </div>

                {/* Feature Highlights - Premium Cards */}
                <div className="relative z-20 mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-10">
                    <div className="group space-y-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold">IA Generativa</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">Avatares e Vozes realistas com tecnologia de ponta</p>
                    </div>
                    <div className="group space-y-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                                <Zap className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold">Render Rápido</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">Pipeline FFmpeg otimizado para máxima performance</p>
                    </div>
                    <div className="group space-y-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-green-500/20 text-green-300">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold">Seguro</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">RBAC e RLS integrados para proteção total</p>
                    </div>
                </div>
            </div>

            {/* Right Column - Login Form */}
            <div className="lg:p-8 flex items-center justify-center">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
                    <Suspense fallback={<LoginFormFallback />}>
                        <EnhancedAuthForm mode="login" />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
