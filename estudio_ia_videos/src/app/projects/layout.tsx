'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@lib/utils';
import {
    Home,
    Video,
    FolderKanban,
    Upload,
    Settings,
    BarChart3,
    Users,
    LogOut,
    ChevronLeft,
    Bell,
    Search,
    HelpCircle,
    Sparkles
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { getBrowserClient } from '@lib/supabase/browser';
import { toast } from 'sonner';

const sidebarItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: false },
    { icon: FolderKanban, label: 'Projetos', href: '/projects', active: true },
    { icon: Upload, label: 'Upload PPTX', href: '/pptx', active: false },
    { icon: Video, label: 'Estúdio', href: '/studio', active: false },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', active: false },
    { icon: Users, label: 'Equipe', href: '/team', active: false },
    { icon: Settings, label: 'Configurações', href: '/settings', active: false },
];

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [collapsed, setCollapsed] = useState(false);
    const supabase = getBrowserClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success('Logout realizado com sucesso');
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            {/* Sidebar */}
            <aside className={cn(
                "fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}>
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Video className="w-5 h-5 text-white" />
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white">Studio</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Video Pro</span>
                            </div>
                        )}
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-white")} />
                                {!collapsed && <span className="font-medium">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Upgrade Card */}
                {!collapsed && (
                    <div className="p-3">
                        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-blue-200 dark:border-blue-900">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-slate-900 dark:text-white">Pro Plan</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                Acesso ilimitado a todos os recursos
                            </p>
                            <Button size="sm" className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                                Fazer Upgrade
                            </Button>
                        </div>
                    </div>
                )}

                {/* User Profile */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                                collapsed && "justify-center"
                            )}>
                                <Avatar className="w-9 h-9">
                                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm">
                                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                {!collapsed && (
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                            {user?.user_metadata?.full_name || 'Usuário'}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configurações
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/help">
                                    <HelpCircle className="w-4 h-4 mr-2" />
                                    Ajuda
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content */}
            <main className={cn(
                "flex-1 transition-all duration-300",
                collapsed ? "ml-[72px]" : "ml-[260px]"
            )}>
                {/* Top Bar */}
                <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center px-6 gap-4">
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar projetos, templates..."
                                className="pl-10 bg-slate-100 dark:bg-slate-800 border-0"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-slate-500">
                            <Bell className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-500">
                            <HelpCircle className="w-5 h-5" />
                        </Button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
