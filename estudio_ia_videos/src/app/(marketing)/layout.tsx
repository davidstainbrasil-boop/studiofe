
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Video, Sparkles } from 'lucide-react';
import { MarketingMobileMenu } from '@/components/layout/MarketingMobileMenu';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl dark:border-slate-800/60 shadow-sm">
                <div className="container flex h-18 items-center justify-between py-4">
                    {/* Logo com hover elegante */}
                    <Link href="/" className="group flex items-center gap-2.5 font-bold text-xl text-slate-900 dark:text-white transition-transform hover:scale-[1.02]">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all duration-300 group-hover:scale-105">
                            <Video className="h-5 w-5" />
                        </div>
                        <span className="tracking-tight">Studio<span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Unified</span></span>
                    </Link>
                    
                    {/* Nav com indicadores de hover */}
                    <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                        <Link href="#features" className="relative px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/50">
                            Recursos
                        </Link>
                        <Link href="#how-it-works" className="relative px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/50">
                            Como Funciona
                        </Link>
                        <Link href="/blog" className="relative px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/50">
                            Blog
                        </Link>
                    </nav>
                    
                    {/* CTAs premium */}
                    <div className="flex items-center gap-3">
                        <MarketingMobileMenu />
                        <div className="hidden md:flex items-center gap-3">
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="font-medium text-slate-700 hover:text-violet-600 hover:bg-violet-50 transition-all">
                                    Entrar
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105 font-semibold">
                                    <Sparkles className="mr-1.5 h-4 w-4" />
                                    Começar Grátis
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    );
}
