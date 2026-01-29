'use client';

import Link from 'next/link';
import { Menu, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet';

export function MarketingMobileMenu() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
                        <Video className="h-5 w-5" />
                    </div>
                    <span>Studio<span className="text-violet-600">Unified</span></span>
                </div>
                <nav className="mt-8 flex flex-col gap-4 text-base text-slate-700 dark:text-slate-300">
                    <Link href="#features" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                        Recursos
                    </Link>
                    <Link href="#how-it-works" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                        Como Funciona
                    </Link>
                    <Link href="/blog" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                        Blog
                    </Link>
                </nav>
                <div className="mt-8 flex flex-col gap-3">
                    <Link href="/login">
                        <Button variant="outline" className="w-full">Entrar</Button>
                    </Link>
                    <Link href="/register">
                        <Button className="w-full bg-violet-600 hover:bg-violet-700">Começar Grátis</Button>
                    </Link>
                </div>
            </SheetContent>
        </Sheet>
    );
}
