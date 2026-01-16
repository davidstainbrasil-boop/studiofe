
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md dark:border-slate-900">
                <div className="container flex h-16 items-center justify-between py-4">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
                            <Video className="h-5 w-5" />
                        </div>
                        <span>Studio<span className="text-violet-600">Unified</span></span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
                        <Link href="#features" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Recursos</Link>
                        <Link href="#how-it-works" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Como Funciona</Link>
                        <Link href="#" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Blog</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">Entrar</Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm" className="bg-violet-600 hover:bg-violet-700">Começar Grátis</Button>
                        </Link>
                    </div>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    );
}
