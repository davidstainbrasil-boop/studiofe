'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FolderOpen,
    Video,
    FileVideo,
    BarChart3,
    Settings,
    LogOut,
    Sparkles,
    Upload,
    Bot,
    Volume2,
    Download,
    Palette,
    GraduationCap,
    Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Projetos', icon: FolderOpen },
    { href: '/media', label: 'Biblioteca', icon: FileVideo },
    { href: '/dashboard/render', label: 'Renders', icon: Video },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

const createItems = [
    { href: '/ppt-to-video', label: 'PPT → Vídeo', icon: Upload, badge: 'Novo' },
    { href: '/studio-pro', label: 'Editor Pro', icon: Wand2 },
    { href: '/ai-avatars', label: 'AI Avatars', icon: Bot, badge: 'IA' },
    { href: '/voice-studio', label: 'Voice Studio', icon: Volume2, badge: '30+' },
];

const toolsItems = [
    { href: '/templates', label: 'Templates NR', icon: GraduationCap },
    { href: '/brand-kit', label: 'Brand Kit', icon: Palette },
    { href: '/export-pro', label: 'Export SCORM', icon: Download },
];

export function SidebarContent() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                        TécnicoCursos
                    </span>
                </div>

                <Link href="/ppt-to-video">
                    <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/20">
                        <Upload className="w-4 h-4 mr-2" />
                        PPT → Vídeo
                    </Button>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
                {/* Main Navigation */}
                <div className="space-y-1">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Principal
                    </p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <Separator className="bg-slate-200 dark:bg-slate-700" />

                {/* Create Tools */}
                <div className="space-y-1">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Criar
                    </p>
                    {createItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500")} />
                                {item.label}
                                {item.badge && (
                                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                        {item.badge}
                                    </Badge>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <Separator className="bg-slate-200 dark:bg-slate-700" />

                {/* Tools */}
                <div className="space-y-1">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Ferramentas
                    </p>
                    {toolsItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
                        pathname === '/settings' && "bg-slate-100 dark:bg-slate-800"
                    )}
                >
                    <Settings className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    Configurações
                </Link>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    <LogOut className="w-5 h-5" />
                    Sair
                </button>
            </div>
        </div>
    );
}

export function Sidebar() {
    return (
        <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-screen sticky top-0">
            <SidebarContent />
        </aside>
    );
}
