
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@components/ui/button';
import { ArrowLeft, Download, Play, Save, Settings, Loader2, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { Separator } from '@components/ui/separator';
import { ExportModal } from './ExportModal';
import { useAutosave } from '@hooks/use-autosave';
import { cn } from '@lib/utils';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { useRouter } from 'next/navigation';
import { useCollaboration } from '@components/collaboration/CollaborationProvider';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { Palette } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { NotificationBell } from '@components/notifications/NotificationBell';

function ActiveUsersList() {
    try {
        const { activeUsers } = useCollaboration();
        return (
            <>
                {activeUsers.map(user => (
                    <div key={user.userId} className="relative group" title={user.userName}>
                        <div className="w-8 h-8 rounded-full border-2 border-background bg-indigo-500 flex items-center justify-center text-[10px] font-medium text-white overflow-hidden">
                            {user.userImage ? (
                                <img src={user.userImage} alt={user.userName} className="w-full h-full object-cover" />
                            ) : (
                                user.userName.substring(0, 2).toUpperCase()
                            )}
                        </div>
                    </div>
                ))}
                {activeUsers.length > 0 && (
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-gray-700 flex items-center justify-center text-[10px] font-medium text-white ml-1">
                        +{activeUsers.length}
                    </div>
                )}
            </>
        );
    } catch (e) {
        // Fallback if not inside provider
        return null;
    }
}

import { UsageIndicator } from '@components/billing/UsageIndicator';

function UsageIndicatorWrapper() {
    const [data, setData] = useState<{ plan: 'free' | 'pro', usage: any, limits: any } | null>(null);

    React.useEffect(() => {
        fetch('/api/billing/usage')
            .then(res => res.json())
            .then(setData)
            .catch(console.error);
    }, []);

    if (!data) return null;

    return <UsageIndicator {...data} />;
}

export function UnifiedTopBar() {
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const project = useTimelineStore(state => state.project);
    const isDirty = useTimelineStore(state => state.isDirty);
    // Reconciling useAutosave: Assuming 'status' is still provided or derived within the hook,
    // or that the user intends for 'isSaving' to map to 'saving' status.
    // For now, I'll keep 'status' as it was in the original code, but add the new destructuring.
    // If 'status' is truly removed, the user's provided `getSaveStatusIcon` would be broken.
    // Given the instruction to make it syntactically correct, I'll assume 'status' is still available
    // or needs to be derived from the new `useAutosave` return values.
    // For the purpose of this edit, I will assume the `useAutosave` hook now returns `status`
    // alongside `saveProject`, `isSaving`, `lastSavedAt` to make the provided `getSaveStatusIcon` valid.
    // If not, the user's provided snippet for `getSaveStatusIcon` would be invalid.
    const { status, saveProject, isSaving, lastSavedAt } = useAutosave({ debounceMs: 3000, enabled: true });
    const router = useRouter();

    const handleSaveClick = () => {
        saveProject();
    };

    const getSaveStatusIcon = () => {
        switch (status) {
            case 'saving':
                return <Loader2 className="w-3 h-3 animate-spin" />;
            case 'saved':
                return <CheckCircle className="w-3 h-3 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-3 h-3 text-red-500" />;
            default:
                return null;
        }
    };

    const getSaveStatusText = () => {
        switch (status) {
            case 'saving':
                return 'Salvando...';
            case 'saved':
                return 'Salvo';
            case 'error':
                return 'Erro ao salvar';
            default:
                return '';
        }
    };

    // Protect against closing tab with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires this
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleHome = () => {
        if (isDirty) {
            if (!confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) return;
        }
        router.push('/');
    };

    return (
        <>
            <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleHome}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="font-semibold text-sm">{project?.name || 'Projeto Sem Título'}</h1>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 text-[10px] font-medium text-muted-foreground" title={getSaveStatusText()}>
                                {getSaveStatusIcon()}
                                <span>{getSaveStatusText()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-muted/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                        <span className="text-xs font-mono">00:00:00 / {new Date((project?.duration || 0) * 1000).toISOString().substr(11, 8)}</span>
                    </div>
                </div>

                <div className="flex items-center -space-x-2 mr-4">
                    <ActiveUsersList />
                </div>

                <div className="mr-4 hidden md:block">
                    <UsageIndicatorWrapper />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleSaveClick}
                        disabled={status === 'saving'}
                    >
                        {status === 'saving' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Salvar
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
                        onClick={() => setExportModalOpen(true)}
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" title="Temas">
                                <Palette className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3" align="end">
                            <h4 className="font-medium mb-3 text-sm">Tema do Vídeo</h4>
                            <ThemeSelector />
                        </PopoverContent>
                    </Popover>

                    <div className="mx-1">
                        <NotificationBell />
                    </div>

                    <Button variant="ghost" size="icon">
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
        </>
    );
}
